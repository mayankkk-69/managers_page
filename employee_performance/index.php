<?php
session_start();
require_once '../config/db_connect.php';

date_default_timezone_set('Asia/Kolkata');

// Auth check
if (!isset($_SESSION['user_id'])) {
    header('Location: ../login.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Employee Performance | Connect</title>
    <meta name="description" content="Track individual employee task performance, completion rates and deadline extensions.">

    <!-- Font -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- CSS — load order matters -->
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/summary.css">
    <link rel="stylesheet" href="css/task_table.css">
    <link rel="stylesheet" href="css/charts.css">
    <link rel="stylesheet" href="css/modal.css">
    <link rel="stylesheet" href="css/mobile.css">  <!-- always last -->

    <!-- Sidebar Integration -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
    <script>window.SIDEBAR_BASE_PATH = '../studio_users/';</script>
    <script src="../studio_users/components/sidebar-loader.js" defer></script>
    <link rel="stylesheet" href="../studio_users/components/sidebar.css">
    <link rel="stylesheet" href="../studio_users/header.css">
    <link rel="stylesheet" href="css/sidebar_layout.css">
</head>
<body class="el-1">

<div class="dashboard-container">
    <div id="sidebar-mount"></div>

    <main class="main-content">
        <div class="app-wrap">
            <div id="section-header"></div>
            <div id="section-summary"></div>
            <div id="section-charts"></div>
            <div id="section-task-table"></div>
        </div>
    </main>
</div>

<!-- Task Detail Modal -->
<div class="task-modal-overlay" id="taskModalOverlay" role="dialog" aria-modal="true" aria-labelledby="tmTitle">
    <div class="task-modal">
        <div class="tm-header">
            <div class="tm-header-left">
                <div class="tm-eyebrow"><i class="fa-solid fa-list-check"></i> Task Detail</div>
                <div class="tm-title" id="tmTitle">—</div>
            </div>
            <button class="tm-close" id="tmCloseBtn" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="tm-body">
            <div class="tm-grid">
                <div class="tm-field">
                    <span class="tm-field-label">Project</span>
                    <span class="tm-field-value" id="tmProject"><i class="fa-solid fa-folder-open"></i> —</span>
                </div>
                <div class="tm-field">
                    <span class="tm-field-label">Stage</span>
                    <span class="tm-field-value" id="tmStage"><i class="fa-solid fa-layer-group"></i> —</span>
                </div>
                <div class="tm-field">
                    <span class="tm-field-label">Start Date</span>
                    <span class="tm-field-value" id="tmStart"><i class="fa-regular fa-calendar"></i> —</span>
                </div>
                <div class="tm-field">
                    <span class="tm-field-label">Deadline</span>
                    <span class="tm-field-value" id="tmDeadline"><i class="fa-regular fa-calendar-xmark"></i> —</span>
                </div>
                <div class="tm-field">
                    <span class="tm-field-label">Completed On</span>
                    <span class="tm-field-value" id="tmCompleted"><i class="fa-solid fa-circle-check"></i> —</span>
                </div>
                <div class="tm-field">
                    <span class="tm-field-label">Status</span>
                    <span class="tm-field-value" id="tmStatus">—</span>
                </div>
            </div>

            <!-- Extension highlight -->
            <div class="tm-extension-row" id="tmExtRow">
                <i id="tmExtIcon" class="fa-solid fa-circle-check"></i>
                <span id="tmExtText">On Time</span>
                <span class="tm-ext-days" id="tmExtDays"></span>
            </div>

            <!-- Timeline bar -->
            <div class="tm-timeline">
                <div class="tm-timeline-label">
                    <span>Start</span>
                    <span id="tmTimelineCaption">Progress</span>
                    <span>Deadline</span>
                </div>
                <div class="tm-timeline-bar-wrap">
                    <div class="tm-timeline-bar-fill" id="tmTimelineBar" style="width: 0%"></div>
                </div>
                <div class="tm-timeline-dates">
                    <span id="tmTimelineStart">—</span>
                    <span id="tmTimelineEnd">—</span>
                </div>
            </div>
        </div>
        <div class="tm-footer">
            <button class="tm-footer-close-btn" id="tmFooterClose">Close</button>
        </div>
    </div>
</div>

<!-- Main orchestrator — loads everything -->
<script src="js/main.js"></script>

</body>
</html>
