<?php
session_start();
// Include database connection (adjusting path since we are in a subdirectory)
require_once '../config/db_connect.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: ../login.php');
    exit;
}

// Check if user has the correct role
$allowed_roles = ['Senior Manager (Studio)', 'Senior Manager (Site)', 'HR'];
if (!in_array($_SESSION['role'], $allowed_roles)) {
    // Redirect to unauthorized page or login page
    header('Location: ../unauthorized.php');
    exit;
}

// Get current user ID from session
$user_id = $_SESSION['user_id'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Overtime Dashboard | Enterprise</title>
    <meta name="description" content="Enterprise overtime approval and monitoring dashboard for real-time employee activity tracking.">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Icons -->
    <script src="https://unpkg.com/@phosphor-icons/web"></script>

    <!-- Global Design System -->
    <link rel="stylesheet" href="assets/css/global.css">

    <!-- Component CSS (pre-loaded to prevent FOUC) -->
    <link rel="stylesheet" href="components/header/header.css">
    <link rel="stylesheet" href="components/filters/filters.css">
    <link rel="stylesheet" href="components/metrics/metrics.css">
    <link rel="stylesheet" href="components/table/table.css">
    <link rel="stylesheet" href="components/modal/modal.css">

    <!-- Responsive Layouts -->
    <link rel="stylesheet" href="assets/css/mobile.css"  media="screen and (max-width: 768px)">
    <link rel="stylesheet" href="assets/css/desktop.css" media="screen and (min-width: 769px)">
</head>
<body>

    <div class="dashboard-container" id="app-root">
        <!-- Components Mount Here -->
        <div id="header-mount"></div>
        <div id="filters-mount"></div>
        <div id="metrics-mount"></div>
        <div id="table-mount"></div>
    </div>

    <!-- Main JS Orchestrator -->
    <script src="app.js" type="module"></script>
</body>
</html>
