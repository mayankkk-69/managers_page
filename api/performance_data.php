<?php
/**
 * api/performance_data.php
 * Returns JSON with stats, task list, trend data and employee list.
 */
header('Content-Type: application/json');
session_start();
require_once '../../config/db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Unauthorized']); exit();
}

date_default_timezone_set('Asia/Kolkata');
$conn->query("SET time_zone = '+05:30'");

$session_user_id = (int)$_SESSION['user_id'];
$range           = $_GET['range'] ?? 'month';

// Requested user_id (admin/manager can view others)
$target_user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : $session_user_id;

// ── Date range ──────────────────────────────────────────
$custom_from = null;
$custom_to   = null;
$until       = 'NOW()';

switch ($range) {
    case 'day':
        $since = 'DATE_SUB(NOW(), INTERVAL 1 DAY)';
        break;
    case 'week':
        $since = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
    case 'quarter':
        $since = 'DATE_SUB(NOW(), INTERVAL 3 MONTH)';
        break;
    case 'custom':
        $custom_from = isset($_GET['from']) ? date('Y-m-d', strtotime($_GET['from'])) : date('Y-m-d');
        $custom_to   = isset($_GET['to'])   ? date('Y-m-d', strtotime($_GET['to']))   : date('Y-m-d');
        $since       = "'{$custom_from} 00:00:00'";
        $until       = "'{$custom_to} 23:59:59'";
        break;
    default: // month
        $since = 'DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        break;
}

// ── Get current user role ───────────────────────────────
$roleQ = $conn->prepare("SELECT role FROM users WHERE id = ?");
$roleQ->bind_param("i", $session_user_id);
$roleQ->execute();
$roleRow = $roleQ->get_result()->fetch_assoc();
$role    = strtolower($roleRow['role'] ?? '');
$isAdmin = ($role === 'admin');
$isMgr   = (strpos($role, 'manager') !== false);

// ── Employee list (for admins/managers) ─────────────────
$employees = [];
if ($isAdmin || $isMgr) {
    $empQ = $conn->query("SELECT id, username as name FROM users WHERE deleted_at IS NULL ORDER BY username ASC");
    while ($row = $empQ->fetch_assoc()) {
        $employees[] = $row;
    }
    // Default to first employee if not specified
    if ($target_user_id === $session_user_id && !isset($_GET['user_id']) && count($employees) > 0) {
        $target_user_id = (int)$employees[0]['id'];
    }
} else {
    // Non-admin can only see their own data
    $target_user_id = $session_user_id;
}

// ── Task list (Now from detailed performance table) ─────
$taskQ = $conn->prepare("
    SELECT
        epr.id,
        epr.task_title as substage_name,
        'completed' as status,
        epr.status as perf_status,
        epr.start_date,
        epr.final_deadline as end_date,
        epr.completion_date as updated_at,
        epr.delay_days,
        p.title as project_name,
        epr.extension_count
    FROM employee_performance_records epr
    LEFT JOIN projects p ON p.id = epr.project_id
    WHERE epr.user_id = ?
    ORDER BY epr.completion_date DESC
");
$taskQ->bind_param("i", $target_user_id);
$taskQ->execute();
$taskRows = $taskQ->get_result();

$tasks   = [];
$total   = 0;
$done    = 0;
$onTime  = 0;
$late    = 0;
$daysSum = 0;
$lateCount = 0;

while ($row = $taskRows->fetch_assoc()) {
    $tasks[] = $row;
    $total++;
    $done++; // Every record in this table is a completed task

    if ($row['status'] === 'on_time') {
        $onTime++;
    } else if ($row['status'] === 'late') {
        $late++;
        $daysSum += (int)$row['delay_days'];
        $lateCount++;
    }
}

$avgDaysOver = $lateCount > 0 ? round($daysSum / $lateCount, 1) : 0;

// Check total count regardless of user
$totalRecords = $conn->query("SELECT COUNT(*) FROM employee_performance_records")->fetch_row()[0];
$firstRecord = $conn->query("SELECT * FROM employee_performance_records LIMIT 1")->fetch_assoc();

// ── Trend data ────────────────────────────────────────────
$trend = buildTrend($conn, $target_user_id, $range, $custom_from, $custom_to);

// ── Response ─────────────────────────────────────────────
echo json_encode([
    'debug' => [
        'target_user_id' => $target_user_id,
        'since' => $since,
        'until' => $until,
        'total_db_records' => $totalRecords,
        'sample_record' => $firstRecord
    ],
    'stats' => [
        'total'       => $total,
        'done'        => $done,
        'onTime'      => $onTime,
        'late'        => $late,
        'avgDaysOver' => $avgDaysOver
    ],
    'tasks'     => $tasks,
    'trends'    => $trend,
    'employees' => $employees
]);

// ── Trend Builder ─────────────────────────────────────────
function buildTrend($conn, $uid, $range, $from = null, $to = null) {

    // ── Day: hourly buckets for today ────────────────────
    if ($range === 'day') {
        $labels    = [];
        $onTimeArr = [];
        $lateArr   = [];
        for ($h = 8; $h <= 20; $h++) {
            $labels[] = sprintf('%02d:00', $h);
            $q = $conn->prepare("
                SELECT
                    SUM(CASE WHEN status = 'on_time' THEN 1 ELSE 0 END) as ot,
                    SUM(CASE WHEN status = 'late'    THEN 1 ELSE 0 END) as lt
                FROM employee_performance_records
                WHERE user_id = ?
                  AND DATE(completion_date) = CURDATE()
                  AND HOUR(completion_date) = ?
            ");
            $q->bind_param("ii", $uid, $h);
            $q->execute();
            $r = $q->get_result()->fetch_assoc();
            $onTimeArr[] = (int)($r['ot'] ?? 0);
            $lateArr[]   = (int)($r['lt'] ?? 0);
        }
        return ['labels' => $labels, 'onTime' => $onTimeArr, 'late' => $lateArr];
    }

    // ── Week: daily buckets for last 7 days ──────────────
    if ($range === 'week') {
        $labels    = [];
        $onTimeArr = [];
        $lateArr   = [];
        for ($i = 6; $i >= 0; $i--) {
            $day      = date('Y-m-d', strtotime("-{$i} days"));
            $labels[] = date('D', strtotime($day));
            $q = $conn->prepare("
                SELECT
                    SUM(CASE WHEN status = 'on_time' THEN 1 ELSE 0 END) as ot,
                    SUM(CASE WHEN status = 'late'    THEN 1 ELSE 0 END) as lt
                FROM employee_performance_records
                WHERE user_id = ?
                  AND DATE(completion_date) = ?
            ");
            $q->bind_param("is", $uid, $day);
            $q->execute();
            $r = $q->get_result()->fetch_assoc();
            $onTimeArr[] = (int)($r['ot'] ?? 0);
            $lateArr[]   = (int)($r['lt'] ?? 0);
        }
        return ['labels' => $labels, 'onTime' => $onTimeArr, 'late' => $lateArr];
    }

    // ── Custom: daily buckets between from → to ───────────
    if ($range === 'custom' && $from && $to) {
        $labels    = [];
        $onTimeArr = [];
        $lateArr   = [];
        $current   = strtotime($from);
        $end       = strtotime($to);
        $diffDays  = (int)(($end - $current) / 86400) + 1;

        // If range > 60 days use weekly buckets, else daily
        if ($diffDays > 60) {
            // Weekly buckets
            $ptr = $current;
            while ($ptr <= $end) {
                $wStart   = date('Y-m-d', $ptr);
                $wEnd     = date('Y-m-d', min($ptr + 6 * 86400, $end));
                $labels[] = date('d M', $ptr);
                $q = $conn->prepare("
                    SELECT
                        SUM(CASE WHEN status = 'on_time' THEN 1 ELSE 0 END) as ot,
                        SUM(CASE WHEN status = 'late'    THEN 1 ELSE 0 END) as lt
                    FROM employee_performance_records
                    WHERE user_id = ?
                      AND DATE(completion_date) BETWEEN ? AND ?
                ");
                $q->bind_param("iss", $uid, $wStart, $wEnd);
                $q->execute();
                $r = $q->get_result()->fetch_assoc();
                $onTimeArr[] = (int)($r['ot'] ?? 0);
                $lateArr[]   = (int)($r['lt'] ?? 0);
                $ptr += 7 * 86400;
            }
        } else {
            // Daily buckets
            for ($ptr = $current; $ptr <= $end; $ptr += 86400) {
                $day      = date('Y-m-d', $ptr);
                $labels[] = date('d M', $ptr);
                $q = $conn->prepare("
                    SELECT
                        SUM(CASE WHEN status = 'on_time' THEN 1 ELSE 0 END) as ot,
                        SUM(CASE WHEN status = 'late'    THEN 1 ELSE 0 END) as lt
                    FROM employee_performance_records
                    WHERE user_id = ?
                      AND DATE(completion_date) = ?
                ");
                $q->bind_param("is", $uid, $day);
                $q->execute();
                $r = $q->get_result()->fetch_assoc();
                $onTimeArr[] = (int)($r['ot'] ?? 0);
                $lateArr[]   = (int)($r['lt'] ?? 0);
            }
        }
        return ['labels' => $labels, 'onTime' => $onTimeArr, 'late' => $lateArr];
    }

    // ── Month / Quarter: weekly buckets ──────────────────
    $weeks     = ($range === 'quarter') ? 12 : 4;
    $labels    = [];
    $onTimeArr = [];
    $lateArr   = [];

    for ($i = $weeks - 1; $i >= 0; $i--) {
        $start    = date('Y-m-d', strtotime("-{$i} weeks monday"));
        $end      = date('Y-m-d', strtotime("-{$i} weeks sunday"));
        $labels[] = 'W' . date('W', strtotime($start));
        $q = $conn->prepare("
            SELECT
                SUM(CASE WHEN status = 'on_time' THEN 1 ELSE 0 END) as ot,
                SUM(CASE WHEN status = 'late'    THEN 1 ELSE 0 END) as lt
            FROM employee_performance_records
            WHERE user_id = ?
              AND DATE(completion_date) BETWEEN ? AND ?
        ");
        $q->bind_param("iss", $uid, $start, $end);
        $q->execute();
        $r = $q->get_result()->fetch_assoc();
        $onTimeArr[] = (int)($r['ot'] ?? 0);
        $lateArr[]   = (int)($r['lt'] ?? 0);
    }

    return ['labels' => $labels, 'onTime' => $onTimeArr, 'late' => $lateArr];
}
?>
