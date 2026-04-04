<?php
/* ============================================================
   sync_attendance_master.php
   
   PURPOSE:
   - Creates the `attendance_master` table if it doesn't exist
   - Syncs data from: attendance + users + shifts + leave_requests
     + holidays + geofence_locations
   - Fills every column with real data from the database
   - Can be called via browser OR via cron job
   
   HOW TO RUN:
   Open in browser: http://localhost/connect-main/manager_pages/attendance__record/api/sync_attendance_master.php
   OR pass a date: ?date=2025-03-01
   OR sync all:    ?sync_all=1
   ============================================================ */

header('Content-Type: application/json');
date_default_timezone_set('Asia/Kolkata');

/* ── DB Connection ────────────────────────────────────── */
$pdo = new PDO(
    "mysql:host=localhost;dbname=crm;charset=utf8mb4",
    'root', '',
    [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]
);

$log = [];

/* ============================================================
   STEP 1: Create the attendance_master table
   ============================================================ */
$createSQL = "
CREATE TABLE IF NOT EXISTS `attendance_master` (
  `id`                          INT(11) NOT NULL AUTO_INCREMENT,
  `attendance_id`               INT(11) DEFAULT NULL,
  `record_date`                 DATE NOT NULL,
  `user_id`                     INT(11) NOT NULL,
  `employee_name`               VARCHAR(255) NOT NULL,
  `employee_role`               VARCHAR(150) DEFAULT NULL,
  `designation`                 VARCHAR(150) DEFAULT NULL,
  `department`                  VARCHAR(100) DEFAULT NULL,
  `employee_email`              VARCHAR(255) DEFAULT NULL,
  `employee_phone`              VARCHAR(20) DEFAULT NULL,
  `manager_id`                  INT(11) DEFAULT NULL,
  `manager_name`                VARCHAR(255) DEFAULT NULL,
  `shift_name`                  VARCHAR(100) DEFAULT NULL,
  `scheduled_shift_start`       TIME DEFAULT '09:00:00',
  `scheduled_shift_end`         TIME DEFAULT '18:00:00',
  `weekly_off_days`             VARCHAR(100) DEFAULT NULL,
  `is_weekly_off`               TINYINT(1) DEFAULT 0,
  `is_holiday`                  TINYINT(1) DEFAULT 0,
  `holiday_name`                VARCHAR(255) DEFAULT NULL,
  `attendance_status`           ENUM('present','absent','late','half_day','on_leave','holiday','not_marked') DEFAULT 'not_marked',
  `is_late_arrival`             TINYINT(1) DEFAULT 0,
  `late_arrival_minutes`        INT(11) DEFAULT 0,
  `is_early_exit`               TINYINT(1) DEFAULT 0,
  `early_exit_minutes`          INT(11) DEFAULT 0,
  `punch_in_time`               TIME DEFAULT NULL,
  `punch_in_date`               DATE DEFAULT NULL,
  `punch_in_latitude`           DECIMAL(10,8) DEFAULT NULL,
  `punch_in_longitude`          DECIMAL(11,8) DEFAULT NULL,
  `punch_in_accuracy_meters`    FLOAT DEFAULT NULL,
  `punch_in_address`            TEXT DEFAULT NULL,
  `punch_in_ip_address`         VARCHAR(45) DEFAULT NULL,
  `punch_in_device_info`        TEXT DEFAULT NULL,
  `punch_in_photo_path`         VARCHAR(500) DEFAULT NULL,
  `punch_in_within_geofence`    TINYINT(1) DEFAULT NULL,
  `punch_in_outside_reason`     TEXT DEFAULT NULL,
  `punch_out_time`              TIME DEFAULT NULL,
  `punch_out_date`              DATE DEFAULT NULL,
  `punch_out_latitude`          DECIMAL(10,8) DEFAULT NULL,
  `punch_out_longitude`         DECIMAL(11,8) DEFAULT NULL,
  `punch_out_accuracy_meters`   FLOAT DEFAULT NULL,
  `punch_out_address`           TEXT DEFAULT NULL,
  `punch_out_ip_address`        VARCHAR(45) DEFAULT NULL,
  `punch_out_device_info`       TEXT DEFAULT NULL,
  `punch_out_photo_path`        VARCHAR(500) DEFAULT NULL,
  `punch_out_within_geofence`   TINYINT(1) DEFAULT NULL,
  `punch_out_outside_reason`    TEXT DEFAULT NULL,
  `auto_punch_out`              TINYINT(1) DEFAULT 0,
  `geofence_id`                 INT(11) DEFAULT NULL,
  `distance_from_geofence_m`   DECIMAL(10,2) DEFAULT NULL,
  `total_working_hours`         TIME DEFAULT NULL,
  `total_overtime_hours`        TIME DEFAULT NULL,
  `scheduled_hours`             DECIMAL(5,2) DEFAULT 9.00,
  `actual_hours_decimal`        DECIMAL(5,2) DEFAULT NULL,
  `productivity_percentage`     DECIMAL(5,2) DEFAULT NULL,
  `on_leave`                    TINYINT(1) DEFAULT 0,
  `leave_type`                  VARCHAR(100) DEFAULT NULL,
  `leave_duration`              ENUM('full_day','half_day','short_leave') DEFAULT NULL,
  `leave_request_id`            INT(11) DEFAULT NULL,
  `missing_punch_in`            TINYINT(1) DEFAULT 0,
  `missing_punch_in_reason`     TEXT DEFAULT NULL,
  `missing_punch_out`           TINYINT(1) DEFAULT 0,
  `missing_punch_out_reason`    TEXT DEFAULT NULL,
  `missing_punch_approval`      ENUM('pending','approved','rejected') DEFAULT 'pending',
  `overtime_status`             ENUM('pending','submitted','approved','rejected','paid','expired','resubmitted') DEFAULT 'pending',
  `overtime_reason`             TEXT DEFAULT NULL,
  `overtime_approved_by_id`     INT(11) DEFAULT NULL,
  `overtime_approved_by_name`   VARCHAR(255) DEFAULT NULL,
  `overtime_actioned_at`        DATETIME DEFAULT NULL,
  `work_report`                 TEXT DEFAULT NULL,
  `manager_remarks`             TEXT DEFAULT NULL,
  `manager_comments`            TEXT DEFAULT NULL,
  `approval_status`             ENUM('pending','approved','rejected') DEFAULT 'pending',
  `approved_by_id`              INT(11) DEFAULT NULL,
  `approved_by_name`            VARCHAR(255) DEFAULT NULL,
  `approval_timestamp`          DATETIME DEFAULT NULL,
  `waved_off`                   TINYINT(1) DEFAULT 0,
  `synced_at`                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at`                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`, `record_date`),
  KEY `idx_record_date` (`record_date`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_attendance_status` (`attendance_status`),
  KEY `idx_department` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Master attendance table synced from attendance + users + shifts + leaves';
";

$pdo->exec($createSQL);
$log[] = "✅ attendance_master table created/verified.";


/* ============================================================
   STEP 2: Determine sync date range
   ============================================================ */
$syncAll = isset($_GET['sync_all']) && $_GET['sync_all'] == '1';

if ($syncAll) {
    // Sync all dates found in attendance table
    $dates = $pdo->query("SELECT DISTINCT `date` FROM `attendance` ORDER BY `date` ASC")
                 ->fetchAll(PDO::FETCH_COLUMN);
    $log[] = "📅 Sync all mode: found " . count($dates) . " distinct dates.";
} else {
    $rawDate = $_GET['date'] ?? date('Y-m-d');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDate)) {
        $rawDate = date('Y-m-d');
    }
    $dates = [$rawDate];
    $log[] = "📅 Syncing single date: $rawDate";
}


/* ============================================================
   STEP 3: Pre-load lookup data (holidays + users + managers)
   ============================================================ */

/* Holidays lookup: date => name */
$holidays = [];
try {
    $hRows = $pdo->query("SELECT `date`, `name` FROM `holidays`")->fetchAll();
    foreach ($hRows as $h) {
        $holidays[$h['date']] = $h['name'];
    }
    $log[] = "📅 Loaded " . count($holidays) . " holidays.";
} catch (Exception $e) {
    $log[] = "⚠️ holidays table not found or error: " . $e->getMessage();
}

/* Users with manager names */
$usersSQL = "
    SELECT
        u.id, u.username, u.email, u.phone,
        COALESCE(u.designation, '') AS designation,
        COALESCE(u.role, '')        AS role,
        COALESCE(u.department, '')  AS department,
        u.manager_id,
        m.username                  AS manager_name
    FROM users u
    LEFT JOIN users m ON m.id = u.manager_id
    WHERE u.role NOT IN ('Admin','HR','Senior Manager (Studio)','Senior Manager (Site)')
      AND (u.status IS NULL OR u.status != 'inactive')
";
$allUsers = $pdo->query($usersSQL)->fetchAll();
$userMap  = [];
foreach ($allUsers as $u) {
    $userMap[$u['id']] = $u;
}
$log[] = "👥 Loaded " . count($userMap) . " employee profiles.";

/* Shifts lookup: user_id => shift data (from user_shifts join shifts) */
$shiftsMap = [];
try {
    $shiftRows = $pdo->query("
        SELECT us.user_id, s.name AS shift_name,
               s.start_time, s.end_time, s.weekly_offs
        FROM user_shifts us
        JOIN shifts s ON s.id = us.shift_id
        WHERE us.status = 'active'
    ")->fetchAll();
    foreach ($shiftRows as $sr) {
        $shiftsMap[$sr['user_id']] = $sr;
    }
    $log[] = "⏰ Loaded " . count($shiftsMap) . " shift assignments.";
} catch (Exception $e) {
    $log[] = "⚠️ Shifts table not found: " . $e->getMessage();
}

/* Leave requests lookup: user_id + date => leave info */
$leaveMap = [];
try {
    $leaveRows = $pdo->query("
        SELECT lr.user_id, lr.start_date, lr.end_date,
               lt.name AS leave_type_name,
               lr.duration_type, lr.id AS leave_request_id,
               lr.status
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.status = 'approved'
    ")->fetchAll();
    foreach ($leaveRows as $lv) {
        $start = new DateTime($lv['start_date']);
        $end   = new DateTime($lv['end_date']);
        $interval = new DateInterval('P1D');
        $dateRange = new DatePeriod($start, $interval, $end->modify('+1 day'));
        foreach ($dateRange as $d) {
            $key = $lv['user_id'] . '_' . $d->format('Y-m-d');
            $leaveMap[$key] = $lv;
        }
    }
    $log[] = "🌿 Loaded leave records covering " . count($leaveMap) . " user-date pairs.";
} catch (Exception $e) {
    $log[] = "⚠️ Leave requests table not found: " . $e->getMessage();
}

/* Overtime approvers name lookup */
$approverMap = [];
try {
    $approvers = $pdo->query("SELECT id, username FROM users")->fetchAll();
    foreach ($approvers as $ap) {
        $approverMap[$ap['id']] = $ap['username'];
    }
} catch (Exception $e) {}


/* ============================================================
   STEP 4: Sync each date
   ============================================================ */
$totalInserted = 0;
$totalUpdated  = 0;

foreach ($dates as $targetDate) {

    /* Fetch raw attendance for this date */
    $attRows = $pdo->prepare("
        SELECT * FROM attendance WHERE `date` = :d
    ");
    $attRows->execute([':d' => $targetDate]);
    $attByUser = [];
    foreach ($attRows->fetchAll() as $row) {
        $attByUser[$row['user_id']] = $row;
    }

    /* Process each user */
    foreach ($userMap as $userId => $user) {
        $att      = $attByUser[$userId] ?? null;
        $shift    = $shiftsMap[$userId] ?? null;
        $leaveKey = $userId . '_' . $targetDate;
        $leave    = $leaveMap[$leaveKey] ?? null;
        $holiday  = $holidays[$targetDate] ?? null;

        /* ── Shift data ────────────────────────────── */
        $shiftName    = $shift['shift_name']  ?? 'Default Shift';
        $shiftStart   = $shift['start_time']  ?? ($att['shift_time'] ?? '09:00:00');
        $shiftEnd     = $shift['end_time']    ?? '18:00:00';
        $weeklyOffs   = $shift['weekly_offs'] ?? ($att['weekly_offs'] ?? null);
        $isWeeklyOff  = $att['is_weekly_off'] ?? 0;
        $isHoliday    = $holiday ? 1 : 0;

        /* ── Scheduled hours (decimal) ─────────────── */
        $scheduledHours = 9.00; // default
        if ($shiftStart && $shiftEnd) {
            $s = strtotime($shiftStart);
            $e = strtotime($shiftEnd);
            if ($e > $s) {
                $scheduledHours = round(($e - $s) / 3600, 2);
            }
        }

        /* ── Status calculation ────────────────────── */
        $status         = 'not_marked';
        $isLate         = 0;
        $lateMinutes    = 0;
        $isEarlyExit    = 0;
        $earlyExitMins  = 0;
        $actualHrsDec   = null;
        $productivityPct = null;
        $onLeave        = 0;
        $leaveType      = null;
        $leaveDuration  = null;
        $leaveReqId     = null;

        if ($isHoliday) {
            $status = 'holiday';
        } elseif ($isWeeklyOff) {
            $status = 'holiday';
        } elseif ($leave) {
            $status       = 'on_leave';
            $onLeave      = 1;
            $leaveType    = $leave['leave_type_name'];
            $leaveDuration= $leave['duration_type'] ?? 'full_day';
            $leaveReqId   = $leave['leave_request_id'];
        } elseif ($att) {
            $dbStatus = $att['status'] ?? 'present';

            if ($dbStatus === 'absent') {
                $status = 'absent';
            } elseif ($dbStatus === 'leave') {
                $status  = 'on_leave';
                $onLeave = 1;
            } elseif ($dbStatus === 'half_day') {
                $status = 'half_day';
            } elseif ($dbStatus === 'holiday') {
                $status = 'holiday';
            } else {
                // present — check for lateness
                if (!empty($att['punch_in']) && !empty($shiftStart)) {
                    $punchInSec  = strtotime($att['punch_in']);
                    $shiftStartSec = strtotime($shiftStart);
                    $GRACE = 5 * 60; // 5 min grace
                    if ($punchInSec > ($shiftStartSec + $GRACE)) {
                        $status       = 'late';
                        $isLate       = 1;
                        $lateMinutes  = (int)(($punchInSec - $shiftStartSec) / 60);
                    } else {
                        $status = 'present';
                    }
                } else {
                    $status = 'present';
                }
            }

            /* Early exit check */
            if (!empty($att['punch_out']) && !empty($shiftEnd)) {
                $punchOutSec = strtotime($att['punch_out']);
                $shiftEndSec = strtotime($shiftEnd);
                if ($punchOutSec < $shiftEndSec) {
                    $isEarlyExit    = 1;
                    $earlyExitMins  = (int)(($shiftEndSec - $punchOutSec) / 60);
                }
            }

            /* Actual hours decimal */
            if (!empty($att['working_hours'])) {
                list($wh, $wm) = explode(':', $att['working_hours']);
                $actualHrsDec  = round((int)$wh + (int)$wm / 60, 2);
                $productivityPct = $scheduledHours > 0
                    ? min(round(($actualHrsDec / $scheduledHours) * 100, 2), 100)
                    : null;
            }
        } elseif ($targetDate <= date('Y-m-d')) {
            // Past date with no record = absent
            $status = 'absent';
        }

        /* ── Build overtime approved name ──────────── */
        $otApprovedById   = $att['overtime_approved_by'] ?? null;
        $otApprovedByName = $otApprovedById ? ($approverMap[$otApprovedById] ?? null) : null;

        /* ── Build approval info ────────────────────── */
        $approvedById = $att['manager_id'] ?? null;
        $approvedByName = $approvedById ? ($approverMap[$approvedById] ?? null) : null;

        /* ── Missing punch flags ────────────────────── */
        $missingPunchIn  = empty($att['punch_in'])  && $status === 'present' ? 1 : 0;
        $missingPunchOut = empty($att['punch_out']) && $status === 'present' ? 1 : 0;

        /* ── UPSERT into attendance_master ─────────── */
        $upsert = $pdo->prepare("
            INSERT INTO attendance_master (
                attendance_id, record_date, user_id,
                employee_name, employee_role, designation, department,
                employee_email, employee_phone, manager_id, manager_name,
                shift_name, scheduled_shift_start, scheduled_shift_end,
                weekly_off_days, is_weekly_off, is_holiday, holiday_name,
                attendance_status, is_late_arrival, late_arrival_minutes,
                is_early_exit, early_exit_minutes,
                punch_in_time, punch_in_date,
                punch_in_latitude, punch_in_longitude, punch_in_accuracy_meters,
                punch_in_address, punch_in_ip_address, punch_in_device_info,
                punch_in_photo_path, punch_in_within_geofence, punch_in_outside_reason,
                punch_out_time, punch_out_date,
                punch_out_latitude, punch_out_longitude, punch_out_accuracy_meters,
                punch_out_address, punch_out_ip_address, punch_out_device_info,
                punch_out_photo_path, punch_out_within_geofence, punch_out_outside_reason,
                auto_punch_out, geofence_id, distance_from_geofence_m,
                total_working_hours, total_overtime_hours,
                scheduled_hours, actual_hours_decimal, productivity_percentage,
                on_leave, leave_type, leave_duration, leave_request_id,
                missing_punch_in, missing_punch_in_reason,
                missing_punch_out, missing_punch_out_reason, missing_punch_approval,
                overtime_status, overtime_reason,
                overtime_approved_by_id, overtime_approved_by_name, overtime_actioned_at,
                work_report, manager_remarks, manager_comments,
                approval_status, approved_by_id, approved_by_name, approval_timestamp,
                waved_off
            ) VALUES (
                :attendance_id, :record_date, :user_id,
                :employee_name, :employee_role, :designation, :department,
                :employee_email, :employee_phone, :manager_id, :manager_name,
                :shift_name, :scheduled_shift_start, :scheduled_shift_end,
                :weekly_off_days, :is_weekly_off, :is_holiday, :holiday_name,
                :attendance_status, :is_late_arrival, :late_arrival_minutes,
                :is_early_exit, :early_exit_minutes,
                :punch_in_time, :punch_in_date,
                :punch_in_latitude, :punch_in_longitude, :punch_in_accuracy_meters,
                :punch_in_address, :punch_in_ip_address, :punch_in_device_info,
                :punch_in_photo_path, :punch_in_within_geofence, :punch_in_outside_reason,
                :punch_out_time, :punch_out_date,
                :punch_out_latitude, :punch_out_longitude, :punch_out_accuracy_meters,
                :punch_out_address, :punch_out_ip_address, :punch_out_device_info,
                :punch_out_photo_path, :punch_out_within_geofence, :punch_out_outside_reason,
                :auto_punch_out, :geofence_id, :distance_from_geofence_m,
                :total_working_hours, :total_overtime_hours,
                :scheduled_hours, :actual_hours_decimal, :productivity_percentage,
                :on_leave, :leave_type, :leave_duration, :leave_request_id,
                :missing_punch_in, :missing_punch_in_reason,
                :missing_punch_out, :missing_punch_out_reason, :missing_punch_approval,
                :overtime_status, :overtime_reason,
                :overtime_approved_by_id, :overtime_approved_by_name, :overtime_actioned_at,
                :work_report, :manager_remarks, :manager_comments,
                :approval_status, :approved_by_id, :approved_by_name, :approval_timestamp,
                :waved_off
            )
            ON DUPLICATE KEY UPDATE
                attendance_id            = VALUES(attendance_id),
                employee_name            = VALUES(employee_name),
                employee_role            = VALUES(employee_role),
                designation              = VALUES(designation),
                department               = VALUES(department),
                employee_email           = VALUES(employee_email),
                employee_phone           = VALUES(employee_phone),
                manager_id               = VALUES(manager_id),
                manager_name             = VALUES(manager_name),
                shift_name               = VALUES(shift_name),
                scheduled_shift_start    = VALUES(scheduled_shift_start),
                scheduled_shift_end      = VALUES(scheduled_shift_end),
                weekly_off_days          = VALUES(weekly_off_days),
                is_weekly_off            = VALUES(is_weekly_off),
                is_holiday               = VALUES(is_holiday),
                holiday_name             = VALUES(holiday_name),
                attendance_status        = VALUES(attendance_status),
                is_late_arrival          = VALUES(is_late_arrival),
                late_arrival_minutes     = VALUES(late_arrival_minutes),
                is_early_exit            = VALUES(is_early_exit),
                early_exit_minutes       = VALUES(early_exit_minutes),
                punch_in_time            = VALUES(punch_in_time),
                punch_in_date            = VALUES(punch_in_date),
                punch_in_latitude        = VALUES(punch_in_latitude),
                punch_in_longitude       = VALUES(punch_in_longitude),
                punch_in_accuracy_meters = VALUES(punch_in_accuracy_meters),
                punch_in_address         = VALUES(punch_in_address),
                punch_in_ip_address      = VALUES(punch_in_ip_address),
                punch_in_device_info     = VALUES(punch_in_device_info),
                punch_in_photo_path      = VALUES(punch_in_photo_path),
                punch_in_within_geofence = VALUES(punch_in_within_geofence),
                punch_in_outside_reason  = VALUES(punch_in_outside_reason),
                punch_out_time           = VALUES(punch_out_time),
                punch_out_date           = VALUES(punch_out_date),
                punch_out_latitude       = VALUES(punch_out_latitude),
                punch_out_longitude      = VALUES(punch_out_longitude),
                punch_out_accuracy_meters= VALUES(punch_out_accuracy_meters),
                punch_out_address        = VALUES(punch_out_address),
                punch_out_ip_address     = VALUES(punch_out_ip_address),
                punch_out_device_info    = VALUES(punch_out_device_info),
                punch_out_photo_path     = VALUES(punch_out_photo_path),
                punch_out_within_geofence= VALUES(punch_out_within_geofence),
                punch_out_outside_reason = VALUES(punch_out_outside_reason),
                auto_punch_out           = VALUES(auto_punch_out),
                geofence_id              = VALUES(geofence_id),
                distance_from_geofence_m = VALUES(distance_from_geofence_m),
                total_working_hours      = VALUES(total_working_hours),
                total_overtime_hours     = VALUES(total_overtime_hours),
                scheduled_hours          = VALUES(scheduled_hours),
                actual_hours_decimal     = VALUES(actual_hours_decimal),
                productivity_percentage  = VALUES(productivity_percentage),
                on_leave                 = VALUES(on_leave),
                leave_type               = VALUES(leave_type),
                leave_duration           = VALUES(leave_duration),
                leave_request_id         = VALUES(leave_request_id),
                missing_punch_in         = VALUES(missing_punch_in),
                missing_punch_in_reason  = VALUES(missing_punch_in_reason),
                missing_punch_out        = VALUES(missing_punch_out),
                missing_punch_out_reason = VALUES(missing_punch_out_reason),
                missing_punch_approval   = VALUES(missing_punch_approval),
                overtime_status          = VALUES(overtime_status),
                overtime_reason          = VALUES(overtime_reason),
                overtime_approved_by_id  = VALUES(overtime_approved_by_id),
                overtime_approved_by_name= VALUES(overtime_approved_by_name),
                overtime_actioned_at     = VALUES(overtime_actioned_at),
                work_report              = VALUES(work_report),
                manager_remarks          = VALUES(manager_remarks),
                manager_comments         = VALUES(manager_comments),
                approval_status          = VALUES(approval_status),
                approved_by_id           = VALUES(approved_by_id),
                approved_by_name         = VALUES(approved_by_name),
                approval_timestamp       = VALUES(approval_timestamp),
                waved_off                = VALUES(waved_off),
                synced_at                = CURRENT_TIMESTAMP
        ");

        $upsert->execute([
            ':attendance_id'             => $att['id'] ?? null,
            ':record_date'               => $targetDate,
            ':user_id'                   => $userId,
            ':employee_name'             => $user['username'],
            ':employee_role'             => $user['role'],
            ':designation'               => $user['designation'],
            ':department'                => $user['department'],
            ':employee_email'            => $user['email'],
            ':employee_phone'            => $user['phone'] ?? null,
            ':manager_id'                => $user['manager_id'],
            ':manager_name'              => $user['manager_name'],
            ':shift_name'                => $shiftName,
            ':scheduled_shift_start'     => $shiftStart,
            ':scheduled_shift_end'       => $shiftEnd,
            ':weekly_off_days'           => $weeklyOffs,
            ':is_weekly_off'             => $isWeeklyOff,
            ':is_holiday'                => $isHoliday,
            ':holiday_name'              => $holiday,
            ':attendance_status'         => $status,
            ':is_late_arrival'           => $isLate,
            ':late_arrival_minutes'      => $lateMinutes,
            ':is_early_exit'             => $isEarlyExit,
            ':early_exit_minutes'        => $earlyExitMins,
            ':punch_in_time'             => $att['punch_in'] ?? null,
            ':punch_in_date'             => $att['punch_in'] ? $targetDate : null,
            ':punch_in_latitude'         => $att['punch_in_latitude'] ?? null,
            ':punch_in_longitude'        => $att['punch_in_longitude'] ?? null,
            ':punch_in_accuracy_meters'  => $att['punch_in_accuracy'] ?? null,
            ':punch_in_address'          => $att['address'] ?? null,
            ':punch_in_ip_address'       => $att['ip_address'] ?? null,
            ':punch_in_device_info'      => $att['device_info'] ?? null,
            ':punch_in_photo_path'       => $att['punch_in_photo'] ?? null,
            ':punch_in_within_geofence'  => $att['within_geofence'] ?? null,
            ':punch_in_outside_reason'   => $att['punch_in_outside_reason'] ?? null,
            ':punch_out_time'            => $att['punch_out'] ?? null,
            ':punch_out_date'            => $att['punch_out'] ? $targetDate : null,
            ':punch_out_latitude'        => $att['punch_out_latitude'] ?? null,
            ':punch_out_longitude'       => $att['punch_out_longitude'] ?? null,
            ':punch_out_accuracy_meters' => $att['punch_out_accuracy'] ?? null,
            ':punch_out_address'         => $att['punch_out_address'] ?? null,
            ':punch_out_ip_address'      => $att['ip_address'] ?? null,
            ':punch_out_device_info'     => $att['device_info'] ?? null,
            ':punch_out_photo_path'      => $att['punch_out_photo'] ?? null,
            ':punch_out_within_geofence' => null,
            ':punch_out_outside_reason'  => $att['punch_out_outside_reason'] ?? null,
            ':auto_punch_out'            => $att['auto_punch_out'] ?? 0,
            ':geofence_id'               => $att['geofence_id'] ?? null,
            ':distance_from_geofence_m'  => $att['distance_from_geofence'] ?? null,
            ':total_working_hours'       => $att['working_hours'] ?? null,
            ':total_overtime_hours'      => $att['overtime_hours'] ?? null,
            ':scheduled_hours'           => $scheduledHours,
            ':actual_hours_decimal'      => $actualHrsDec,
            ':productivity_percentage'   => $productivityPct,
            ':on_leave'                  => $onLeave,
            ':leave_type'                => $leaveType,
            ':leave_duration'            => $leaveDuration,
            ':leave_request_id'          => $leaveReqId,
            ':missing_punch_in'          => $missingPunchIn,
            ':missing_punch_in_reason'   => $att['missing_punch_in_reason'] ?? null,
            ':missing_punch_out'         => $missingPunchOut,
            ':missing_punch_out_reason'  => $att['missing_punch_out_reason'] ?? null,
            ':missing_punch_approval'    => $att['missing_punch_approval_status'] ?? 'pending',
            ':overtime_status'           => $att['overtime_status'] ?? 'pending',
            ':overtime_reason'           => $att['overtime_reason'] ?? null,
            ':overtime_approved_by_id'   => $otApprovedById,
            ':overtime_approved_by_name' => $otApprovedByName,
            ':overtime_actioned_at'      => $att['overtime_actioned_at'] ?? null,
            ':work_report'               => $att['work_report'] ?? null,
            ':manager_remarks'           => $att['remarks'] ?? null,
            ':manager_comments'          => $att['manager_comments'] ?? null,
            ':approval_status'           => $att['approval_status'] ?? 'pending',
            ':approved_by_id'            => $approvedById,
            ':approved_by_name'          => $approvedByName,
            ':approval_timestamp'        => $att['approval_timestamp'] ?? null,
            ':waved_off'                 => $att['waved_off'] ?? 0,
        ]);

        $rowCount = $upsert->rowCount();
        if ($rowCount == 1) $totalInserted++;
        else $totalUpdated++;
    }

    $log[] = "✅ Date $targetDate — processed " . count($userMap) . " employees.";
}

/* ── Final Response ───────────────────────────────────── */
echo json_encode([
    'success'        => true,
    'inserted'       => $totalInserted,
    'updated'        => $totalUpdated,
    'dates_synced'   => count($dates),
    'employees'      => count($userMap),
    'log'            => $log,
    'synced_at'      => date('Y-m-d H:i:s'),
]);
