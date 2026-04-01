<?php
/**
 * API to fetch overtime approval data from database using original dashboard tables (attendance, users, overtime_requests)
 */
$configPath = realpath(__DIR__ . '/../../config.php');
if (!$configPath) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Config file not found. Checked: ' . __DIR__ . '/../../config.php']);
    exit;
}
require_once $configPath;

// Check if user is logged in
if (!isLoggedIn()) {
    // DEVELOPMENT BYPASS
    if ($_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $_SERVER['REMOTE_ADDR'] === '::1') {
        $_SESSION['user_id'] = 11; 
        $_SESSION['role'] = 'Senior Manager (Studio)';
    } else {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
}

$manager_id = $_SESSION['user_id'];
$manager_role = $_SESSION['role'] ?? '';

// Determine location filter implicitly by role for backward compatibility
$filter_location = 'studio'; // Default
if (strpos(strtolower($manager_role), 'site') !== false) {
    $filter_location = 'site';
}

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    // Add location filter based on roles exactly like old dashboard
    $where_conditions = ["u.id != :manager_id"];
    if ($filter_location === 'studio') {
        $where_conditions[] = "u.role NOT IN ('Site Supervisor', 'Site Coordinator', 'Sales', 'Graphic Designer', 'Social Media Marketing', 'Purchase Manager')";
    } else if ($filter_location === 'site') {
        $where_conditions[] = "u.role IN ('Site Supervisor', 'Site Coordinator', 'Sales', 'Graphic Designer', 'Social Media Marketing', 'Purchase Manager')";
    }
    
    $where_clause = "WHERE " . implode(" AND ", $where_conditions);
    
    // Exact logic from the old overtime_dashboard / fetch_employee_overtime_data.php
    $query = "
        SELECT 
            a.id as attendance_id,
            u.username as employee,
            u.id as employeeId,
            u.role as role,
            a.date as date,
            a.punch_in as punchIn,
            a.punch_out as punchOut,
            a.overtime_hours,
            a.work_report as workReport,
            a.overtime_status,
            s.start_time as startTime,
            s.end_time as endTime,
            s.shift_name as shift,
            CASE 
                WHEN a.punch_out IS NULL OR s.end_time IS NULL THEN 0
                WHEN TIME(a.punch_out) <= TIME(s.end_time) THEN 0
                ELSE TIMESTAMPDIFF(SECOND, 
                    STR_TO_DATE(CONCAT(a.date, ' ', s.end_time), '%Y-%m-%d %H:%i:%s'),
                    STR_TO_DATE(CONCAT(a.date, ' ', a.punch_out), '%Y-%m-%d %H:%i:%s')
                )
            END as overtime_seconds,
            CASE 
                WHEN a.date < '2025-10-01' THEN 
                    COALESCE(onot.message, 'System deployment and testing')
                ELSE 
                    COALESCE(oreq.overtime_description, 'Generated automatically')
            END as otReport,
            oreq.overtime_hours as submitted_ot_hours,
            oreq.status as oreq_status,
            oreq.submitted_at as submittedAt,
            oreq.actioned_at as actionedAt,
            oreq.id as request_id,
            oreq.manager_comments as managerComment
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN user_shifts us ON u.id = us.user_id AND a.date BETWEEN us.effective_from AND COALESCE(us.effective_to, '9999-12-31')
        LEFT JOIN shifts s ON us.shift_id = s.id
        LEFT JOIN overtime_requests oreq ON a.id = oreq.attendance_id
        LEFT JOIN overtime_notifications onot ON a.id = onot.overtime_id
        $where_clause
        HAVING overtime_seconds >= 5400
        ORDER BY a.date DESC
        LIMIT 100
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([':manager_id' => $manager_id]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $formattedData = array_map(function($row) {
        
        $oct2025 = new DateTime('2025-10-01');
        $rowDate = new DateTime($row['date']);
        
        // Match status logic from fetch_employee_overtime_data.php
        $status = ucfirst($row['overtime_status'] ?? 'Pending');
        
        if ($rowDate >= $oct2025 && !empty($row['submitted_ot_hours'])) {
            if (!empty($row['oreq_status'])) {
                $status = ucfirst($row['oreq_status']);
            } else {
                $status = 'Submitted';
            }
        } else if ($rowDate >= $oct2025 && empty($row['submitted_ot_hours'])) {
            $status = 'Pending';
        }

        // Calculate OT hours 
        $overtime_minutes = $row['overtime_seconds'] / 60;
        $finalOtHours = 0;
        if ($overtime_minutes > 0) {
            if ($overtime_minutes < 90) {
                $finalOtHours = 1.5;
            } else {
                $finalOtHours = ($overtime_minutes - 90) / 60;
                $finalOtHours = floor($finalOtHours * 2) / 2 + 1.5; 
            }
        }
        
        return [
            'employee' => $row['employee'],
            'date' => $row['date'],
            'endTime' => $row['endTime'] ? date('g:i A', strtotime($row['endTime'])) : '—',
            'punchOut' => $row['punchOut'] ? date('g:i A', strtotime($row['punchOut'])) : '—',
            'otHours' => number_format($finalOtHours, 1),
            'submittedOt' => !empty($row['submitted_ot_hours']) ? number_format(floatval($row['submitted_ot_hours']), 1) : number_format($finalOtHours, 1),
            'workReport' => !empty($row['workReport']) && trim($row['workReport']) !== '' ? $row['workReport'] : 'No work report submitted for this date',
            'otReport' => !empty($row['otReport']) ? $row['otReport'] : 'System deployment and testing',
            'status' => $status,
            'employeeId' => $row['employeeId'],
            'role' => $row['role'],
            'shift' => $row['shift'] ?: 'Standard Shift',
            'startTime' => $row['startTime'] ? date('g:i A', strtotime($row['startTime'])) : '—',
            'punchIn' => $row['punchIn'] ? date('g:i A', strtotime($row['punchIn'])) : '—',
            'submittedAt' => !empty($row['submittedAt']) ? date('M j, Y g:i A', strtotime($row['submittedAt'])) : '—',
            'actionedAt' => !empty($row['actionedAt']) ? date('M j, Y g:i A', strtotime($row['actionedAt'])) : '—',
            'otDescription' => $row['otReport'],
            'otReason' => $row['otReport'],
            'managerComment' => $row['managerComment'] ?: '',
            'attendance_id' => $row['attendance_id'],
            'notification_id' => $row['request_id'] // Using request_id as notification_id for backward compatibility with frontend actions
        ];
    }, $results);

    echo json_encode([
        'success' => true,
        'data' => $formattedData
    ]);

} catch (Exception $e) {
    error_log("Error in fetch_overtime.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
