<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../config/db_connect.php';

echo "Database connection status:<br>";
if ($conn->connect_error) {
    echo "MySQLi Connection failed: " . $conn->connect_error . "<br>";
} else {
    echo "MySQLi Connection successful!<br>";
}

if ($pdo) {
    echo "PDO Connection successful!<br>";
} else {
    echo "PDO Connection failed!<br>";
}

echo "<br>Testing a simple query on project_substages:<br>";
$res = $conn->query("SELECT COUNT(*) as count FROM project_substages");
if ($res) {
    $row = $res->fetch_assoc();
    echo "Count: " . $row['count'] . "<br>";
} else {
    echo "Query failed: " . $conn->error . "<br>";
}
?>
