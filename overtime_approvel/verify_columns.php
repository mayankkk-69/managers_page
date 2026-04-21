<?php
require_once '../config.php';

try {
    $pdo = getDBConnection();
    
    // Check for necessary columns in attendance table
    $columns_to_check = ['overtime_status', 'overtime_approved_by', 'overtime_actioned_at', 'manager_comments', 'overtime_hours'];
    
    echo "<h3>Column Check in attendance table:</h3>";
    foreach ($columns_to_check as $col) {
        $check = $pdo->query("SHOW COLUMNS FROM attendance LIKE '$col'")->fetch();
        if ($check) {
            echo "Column <b>$col</b>: Found ({$check['Type']})<br>";
        } else {
            echo "Column <b>$col</b>: <b style='color:red'>MISSING</b><br>";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
