<?php
/**
 * API to update overtime approval status in database
 */
$configPath = realpath(__DIR__ . '/../../config.php');
if (!$configPath) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Config file not found']);
    exit;
}
require_once $configPath;

// Check if user is logged in
if (!isLoggedIn()) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['attendance_id']) || !isset($data['status'])) {
    echo json_encode(['success' => false, 'message' => 'Missing attendance_id or status']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Begin transaction
    $pdo->beginTransaction();
    
    // Status mapping from frontend to DB
    $statusMap = [
        'Approved' => 'approved',
        'Rejected' => 'rejected'
    ];
    
    $newStatus = isset($statusMap[$data['status']]) ? $statusMap[$data['status']] : 'pending';
    
    // Update attendance table
    $query = "
        UPDATE attendance 
        SET 
            overtime_status = :status,
            overtime_approved_by = :approver_id,
            overtime_actioned_at = CURRENT_TIMESTAMP,
            manager_comments = :comments,
            overtime_hours = :ot_hours
        WHERE id = :id
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([
        ':status' => $newStatus,
        ':approver_id' => $_SESSION['user_id'],
        ':comments' => isset($data['comments']) ? $data['comments'] : NULL,
        ':ot_hours' => isset($data['otHours']) ? $data['otHours'] : NULL,
        ':id' => $data['attendance_id']
    ]);
    
    // Update overtime_notifications status to 'actioned' (2)
    $query_update_notif = "
        UPDATE overtime_notifications 
        SET 
            status = 2,
            manager_response = :comments,
            actioned_at = CURRENT_TIMESTAMP
        WHERE overtime_id = :id AND manager_id = :manager_id
    ";
    
    $stmt_notif = $pdo->prepare($query_update_notif);
    $stmt_notif->execute([
        ':comments' => isset($data['comments']) ? $data['comments'] : NULL,
        ':id' => $data['attendance_id'],
        ':manager_id' => $_SESSION['user_id']
    ]);
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Overtime status updated successfully'
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Error in update_overtime.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
