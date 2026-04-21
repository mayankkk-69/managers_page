<?php
/* ============================================================
   API: get_attendance.php
   Fetches data from attendance_master table for a given date.
   Falls back to live query if attendance_master is empty/missing.

   Query Params:
     ?date=YYYY-MM-DD  (defaults to today)
   ============================================================ */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
date_default_timezone_set('Asia/Kolkata');

/* ── DB Connection ────────────────────────────────────── */
try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=crm;charset=utf8mb4",
        'root', '',
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit;
}

/* ── Input Validation ─────────────────────────────────── */
$rawDate = $_GET['date'] ?? date('Y-m-d');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDate)) {
    $rawDate = date('Y-m-d');
}
$targetDate = $rawDate;
$today      = date('Y-m-d');

/* Block future dates */
if ($targetDate > $today) {
    echo json_encode([
        'success'   => true,
        'date'      => $targetDate,
        'count'     => 0,
        'employees' => [],
        'message'   => 'No records: selected date is in the future.',
        'source'    => 'blocked',
    ]);
    exit;
}

/* ── Avatar Gradient Palette ──────────────────────────── */
$AVATAR_GRADIENTS = [
    ['#667eea','#764ba2'],['#11998e','#38ef7d'],
    ['#f093fb','#f5576c'],['#f7971e','#ffd200'],
    ['#4facfe','#00f2fe'],['#43e97b','#38f9d7'],
    ['#fa709a','#fee140'],['#a18cd1','#fbc2eb'],
    ['#fda085','#f6d365'],['#89f7fe','#66a6ff'],
];

/* ── Try attendance_master first ──────────────────────── */
$source = 'attendance_master';
$employees = [];
$gradIdx = 0;

try {
    /* Check if attendance_master table exists */
    $check = $pdo->query("SHOW TABLES LIKE 'attendance_master'")->fetch();

    if ($check) {
        /* Check if data exists for this date */
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM attendance_master WHERE record_date = :d");
        $countStmt->execute([':d' => $targetDate]);
        $countInMaster = (int)$countStmt->fetchColumn();

        if ($countInMaster > 0) {
            /* ── Fetch from attendance_master (full detail) ── */
            $stmt = $pdo->prepare("
                SELECT *
                FROM attendance_master
                WHERE record_date = :d
                ORDER BY employee_name ASC
            ");
            $stmt->execute([':d' => $targetDate]);
            $rows = $stmt->fetchAll();

            $deptMap = [
                'information technology' => 'it', 'it' => 'it',
                'human resources' => 'hr', 'hr' => 'hr',
                'sales' => 'sales', 'finance' => 'finance',
                'operations' => 'ops', 'ops' => 'ops',
                'marketing' => 'marketing', 'admin' => 'admin',
            ];

            foreach ($rows as $row) {
                $rawDept = strtolower(trim($row['department'] ?? 'other'));
                $dept    = $deptMap[$rawDept] ?? 'other';

                /* Map attendance_master status to dashboard status */
                $status = $row['attendance_status'];
                if ($status === 'on_leave') $status = 'leave';
                if ($status === 'not_marked') $status = 'absent';

                $employees[] = [
                    // Identifiers
                    'id'                    => 'U' . str_pad($row['user_id'], 3, '0', STR_PAD_LEFT),
                    'userId'                => (int)$row['user_id'],
                    'attendanceId'          => $row['attendance_id'],

                    // Employee Info
                    'name'                  => $row['employee_name'],
                    'role'                  => $row['employee_role'] ?: ($row['designation'] ?: 'Employee'),
                    'designation'           => $row['designation'],
                    'dept'                  => $dept,
                    'department'            => $row['department'],
                    'email'                 => $row['employee_email'],
                    'phone'                 => $row['employee_phone'],

                    // Manager
                    'managerId'             => $row['manager_id'],
                    'managerName'           => $row['manager_name'],

                    // Shift
                    'shiftName'             => $row['shift_name'],
                    'schedule'              => [$row['scheduled_shift_start'], $row['scheduled_shift_end']],
                    'weeklyOffDays'         => $row['weekly_off_days'],
                    'isWeeklyOff'           => (bool)$row['is_weekly_off'],
                    'isHoliday'             => (bool)$row['is_holiday'],
                    'holidayName'           => $row['holiday_name'],

                    // Attendance Status
                    'status'                => $status,
                    'isLate'                => (bool)$row['is_late_arrival'],
                    'lateMinutes'           => (int)$row['late_arrival_minutes'],
                    'isEarlyExit'           => (bool)$row['is_early_exit'],
                    'earlyExitMinutes'      => (int)$row['early_exit_minutes'],

                    // Punch In
                    'checkIn'               => $row['punch_in_time'] ? substr($row['punch_in_time'], 0, 5) : '',
                    'punchInLat'            => $row['punch_in_latitude'],
                    'punchInLng'            => $row['punch_in_longitude'],
                    'punchInAccuracy'       => $row['punch_in_accuracy_meters'],
                    'punchInAddress'        => $row['punch_in_address'],
                    'punchInIP'             => $row['punch_in_ip_address'],
                    'punchInDevice'         => $row['punch_in_device_info'],
                    'punchInPhoto'          => $row['punch_in_photo_path'],
                    'punchInGeofence'       => $row['punch_in_within_geofence'],
                    'punchInOutsideReason'  => $row['punch_in_outside_reason'],

                    // Punch Out
                    'checkOut'              => $row['punch_out_time'] ? substr($row['punch_out_time'], 0, 5) : '',
                    'punchOutLat'           => $row['punch_out_latitude'],
                    'punchOutLng'           => $row['punch_out_longitude'],
                    'punchOutAccuracy'      => $row['punch_out_accuracy_meters'],
                    'punchOutAddress'       => $row['punch_out_address'],
                    'punchOutIP'            => $row['punch_out_ip_address'],
                    'punchOutDevice'        => $row['punch_out_device_info'],
                    'punchOutPhoto'         => $row['punch_out_photo_path'],
                    'punchOutGeofence'      => $row['punch_out_within_geofence'],
                    'punchOutOutsideReason' => $row['punch_out_outside_reason'],
                    'autoPunchOut'          => (bool)$row['auto_punch_out'],

                    // Geofence
                    'geofenceId'            => $row['geofence_id'],
                    'distanceFromGeofence'  => $row['distance_from_geofence_m'],

                    // Hours
                    'workingHours'          => $row['total_working_hours'],
                    'overtimeHours'         => $row['total_overtime_hours'],
                    'scheduledHours'        => $row['scheduled_hours'],
                    'actualHoursDecimal'    => $row['actual_hours_decimal'],
                    'productivityPct'       => $row['productivity_percentage'],

                    // Leave
                    'onLeave'               => (bool)$row['on_leave'],
                    'leaveType'             => $row['leave_type'],
                    'leaveDuration'         => $row['leave_duration'],
                    'leaveRequestId'        => $row['leave_request_id'],

                    // Missing Punch
                    'missingPunchIn'        => (bool)$row['missing_punch_in'],
                    'missingPunchInReason'  => $row['missing_punch_in_reason'],
                    'missingPunchOut'       => (bool)$row['missing_punch_out'],
                    'missingPunchOutReason' => $row['missing_punch_out_reason'],
                    'missingPunchApproval'  => $row['missing_punch_approval'],

                    // Overtime
                    'overtimeStatus'        => $row['overtime_status'],
                    'overtimeReason'        => $row['overtime_reason'],
                    'overtimeApprovedById'  => $row['overtime_approved_by_id'],
                    'overtimeApprovedBy'    => $row['overtime_approved_by_name'],
                    'overtimeActionedAt'    => $row['overtime_actioned_at'],

                    // Content
                    'workReport'            => $row['work_report'],
                    'managerRemarks'        => $row['manager_remarks'],
                    'managerComments'       => $row['manager_comments'],

                    // Approval
                    'approval'              => $row['approval_status'],
                    'approvedById'          => $row['approved_by_id'],
                    'approvedBy'            => $row['approved_by_name'],
                    'approvalTimestamp'     => $row['approval_timestamp'],
                    'wavedOff'              => (bool)$row['waved_off'],

                    // UI
                    '_gradIdx'              => $gradIdx % count($AVATAR_GRADIENTS),
                ];
                $gradIdx++;
            }

        } else {
            /* attendance_master exists but no data for date → trigger sync then retry */
            $source = 'live_fallback_no_master_data';
            $employees = fetchFromLiveTables($pdo, $targetDate, $AVATAR_GRADIENTS);
        }
    } else {
        /* Table doesn't exist yet → fall back to live query */
        $source = 'live_fallback_no_table';
        $employees = fetchFromLiveTables($pdo, $targetDate, $AVATAR_GRADIENTS);
    }
} catch (PDOException $e) {
    $source = 'live_fallback_error';
    $employees = fetchFromLiveTables($pdo, $targetDate, $AVATAR_GRADIENTS);
}

/* ── Final Response ───────────────────────────────────── */
echo json_encode([
    'success'   => true,
    'date'      => $targetDate,
    'count'     => count($employees),
    'employees' => $employees,
    'source'    => $source,
]);

/* ============================================================
   FALLBACK: Live JOIN query (before sync_attendance_master runs)
   ============================================================ */
function fetchFromLiveTables(PDO $pdo, string $targetDate, array $AVATAR_GRADIENTS): array {
    $sql = "
        SELECT
            u.id                                        AS user_id,
            u.username                                  AS name,
            COALESCE(u.designation, u.role, 'Employee') AS role,
            LOWER(COALESCE(u.department, 'other'))      AS dept,
            a.date,
            TIME_FORMAT(a.punch_in,  '%H:%i')           AS checkIn,
            TIME_FORMAT(a.punch_out, '%H:%i')           AS checkOut,
            TIME_FORMAT(a.shift_time,'%H:%i')           AS scheduleStart,
            a.status,
            a.approval_status,
            a.overtime_hours,
            a.working_hours,
            a.remarks,
            a.work_report,
            a.manager_comments
        FROM users u
        LEFT JOIN attendance a ON a.user_id = u.id AND a.date = :d
        WHERE u.role NOT IN ('Admin','Senior Manager (Studio)','Senior Manager (Site)','HR')
          AND (u.status IS NULL OR u.status != 'inactive')
        ORDER BY u.username ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':d' => $targetDate]);
    $rows = $stmt->fetchAll();

    $deptMap = [
        'information technology' => 'it', 'it' => 'it',
        'human resources' => 'hr', 'hr' => 'hr',
        'sales' => 'sales', 'finance' => 'finance',
        'operations' => 'ops', 'ops' => 'ops',
    ];

    $employees = [];
    $gradIdx   = 0;
    $today     = date('Y-m-d');

    foreach ($rows as $row) {
        /* Skip future dates — no data */
        if ($targetDate > $today) continue;

        $status = 'absent';
        if ($row['date'] !== null) {
            $dbStatus = $row['status'] ?? 'absent';
            if ($dbStatus === 'present') {
                if (!empty($row['checkIn']) && !empty($row['scheduleStart'])) {
                    $punchIn   = strtotime($row['checkIn']);
                    $shiftTime = strtotime($row['scheduleStart']);
                    $status = ($punchIn > ($shiftTime + 300)) ? 'late' : 'present';
                } else {
                    $status = 'present';
                }
            } elseif ($dbStatus === 'leave')   { $status = 'leave'; }
            elseif ($dbStatus === 'holiday')   { $status = 'leave'; }
            elseif ($dbStatus === 'half_day')  { $status = 'present'; }
            else { $status = 'absent'; }
        }

        $rawDept = strtolower(trim($row['dept'] ?? 'other'));
        $dept    = $deptMap[$rawDept] ?? 'other';
        $schedStart = $row['scheduleStart'] ?: '09:00';

        $employees[] = [
            'id'           => 'U' . str_pad($row['user_id'], 3, '0', STR_PAD_LEFT),
            'userId'       => (int)$row['user_id'],
            'name'         => $row['name'],
            'role'         => $row['role'],
            'dept'         => $dept,
            'status'       => $status,
            'checkIn'      => $row['checkIn']  ?? '',
            'checkOut'     => $row['checkOut'] ?? '',
            'schedule'     => [$schedStart, '18:00'],
            'approval'     => $row['approval_status'] ?? 'pending',
            'workingHours' => $row['working_hours']   ?? '',
            'overtimeHours'=> $row['overtime_hours']  ?? '',
            'managerRemarks'=> $row['remarks']        ?? '',
            'workReport'   => $row['work_report']     ?? '',
            '_gradIdx'     => $gradIdx % count($AVATAR_GRADIENTS),
        ];
        $gradIdx++;
    }
    return $employees;
}
