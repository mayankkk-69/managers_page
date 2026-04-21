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

// ── Task list ────────────────────────────────────────────
$taskQ = $conn->prepare("
    SELECT
        pss.id,
        pss.title as substage_name,
        pss.status,
        pss.start_date,
        pss.end_date,
        pss.updated_at,
        CONCAT('Stage ', ps.stage_number) as stage_name,
        p.title as project_name
    FROM project_substages pss
    JOIN project_stages ps ON ps.id = pss.stage_id
    JOIN projects p        ON p.id  = ps.project_id
    WHERE pss.assigned_to  = ?
      AND pss.deleted_at   IS NULL
      AND ps.deleted_at    IS NULL
      AND p.deleted_at     IS NULL
      AND (
          (pss.updated_at >= {$since} AND pss.updated_at <= {$until})
          OR pss.status NOT IN ('completed', 'rejected')
      )
    ORDER BY pss.updated_at DESC
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

    if ($row['status'] === 'completed') {
        $done++;
        $completedAt = $row['updated_at'];
        $deadline    = $row['end_date'];
        if ($completedAt && $deadline && $completedAt != '0000-00-00 00:00:00' && $deadline != '0000-00-00 00:00:00') {
            $diff = (int)round((strtotime($completedAt) - strtotime($deadline)) / 86400);
            if ($diff <= 0) {
                $onTime++;
            } else {
                $late++;
                $daysSum += $diff;
                $lateCount++;
            }
        } else {
            $onTime++;
        }
    }
}

$avgDaysOver = $lateCount > 0 ? round($daysSum / $lateCount, 1) : 0;

// ── Trend data ────────────────────────────────────────────
$trend = buildTrend($conn, $target_user_id, $range, $custom_from, $custom_to);

// ── Response ─────────────────────────────────────────────
echo json_encode([
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
                    SUM(CASE WHEN updated_at <= end_date THEN 1 ELSE 0 END) as ot,
                    SUM(CASE WHEN updated_at >  end_date THEN 1 ELSE 0 END) as lt
                FROM project_substages
                WHERE assigned_to = ?
                  AND status = 'completed'
                  AND DATE(updated_at) = CURDATE()
                  AND HOUR(updated_at) = ?
                  AND deleted_at IS NULL
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
                    SUM(CASE WHEN updated_at <= end_date THEN 1 ELSE 0 END) as ot,
                    SUM(CASE WHEN updated_at >  end_date THEN 1 ELSE 0 END) as lt
                FROM project_substages
                WHERE assigned_to = ?
                  AND status = 'completed'
                  AND DATE(updated_at) = ?
                  AND deleted_at IS NULL
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
                        SUM(CASE WHEN updated_at <= end_date THEN 1 ELSE 0 END) as ot,
                        SUM(CASE WHEN updated_at >  end_date THEN 1 ELSE 0 END) as lt
                    FROM project_substages
                    WHERE assigned_to = ?
                      AND status = 'completed'
                      AND DATE(updated_at) BETWEEN ? AND ?
                      AND deleted_at IS NULL
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
                        SUM(CASE WHEN updated_at <= end_date THEN 1 ELSE 0 END) as ot,
                        SUM(CASE WHEN updated_at >  end_date THEN 1 ELSE 0 END) as lt
                    FROM project_substages
                    WHERE assigned_to = ?
                      AND status = 'completed'
                      AND DATE(updated_at) = ?
                      AND deleted_at IS NULL
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
                SUM(CASE WHEN updated_at <= end_date THEN 1 ELSE 0 END) as ot,
                SUM(CASE WHEN updated_at >  end_date THEN 1 ELSE 0 END) as lt
            FROM project_substages
            WHERE assigned_to = ?
              AND status = 'completed'
              AND DATE(updated_at) BETWEEN ? AND ?
              AND deleted_at IS NULL
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
