<?php
// ——————————————————————————————————————————
// index.php — Main Shell
// Components are included server-side via PHP,
// avoiding any fetch() 403 Forbidden issues on XAMPP.
// ——————————————————————————————————————————
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Attendance Record — Manager Dashboard</title>
  <meta name="description" content="Manager dashboard to view, monitor and edit employee attendance records in real time." />

  <!-- ── CSS FILES (one per section) ── -->
  <link rel="stylesheet" href="css/variables.css" />
  <link rel="stylesheet" href="css/base.css" />
  <link rel="stylesheet" href="css/header.css" />
  <link rel="stylesheet" href="css/kpi.css" />
  <link rel="stylesheet" href="css/control-bar.css" />
  <link rel="stylesheet" href="css/table.css" />
  <link rel="stylesheet" href="css/drawer.css" />
  <link rel="stylesheet" href="css/toast.css" />
  <link rel="stylesheet" href="css/animations.css" />
  <!-- Desktop overrides (≥ 769px) — loaded for all, mobile overrides below -->
  <link rel="stylesheet" href="css/desktop.css" />
  <!-- Mobile overrides (≤ 768px) -->
  <link rel="stylesheet" href="css/mobile.css" />
  <link rel="stylesheet" href="css/kpi-modal.css" />

  <!-- Feather Icons -->
  <script src="https://unpkg.com/feather-icons/dist/feather.min.js"></script>
  
  <!-- html2pdf for PDF Export -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>

  <!-- ══════════════════════════════════════════════
       SECTION: Header
       PHP include replaces fetch() — no 403 errors
  ══════════════════════════════════════════════════ -->
  <?php include 'components/header.html'; ?>

  <!-- ══════════════════════════════════════════════
       MAIN CONTENT AREA
  ══════════════════════════════════════════════════ -->
  <main class="main-wrapper" id="mainContent" role="main">

    <!-- SECTION: KPI Metric Cards -->
    <?php include 'components/kpi-cards.html'; ?>

    <!-- SECTION: Filter / Control Bar -->
    <?php include 'components/control-bar.html'; ?>

    <!-- SECTION: Attendance Table -->
    <?php include 'components/attendance-table.html'; ?>

  </main>

  <!-- ══════════════════════════════════════════════
       SECTION: Edit Drawer (outside main)
  ══════════════════════════════════════════════════ -->
  <?php include 'components/edit-drawer.html'; ?>

  <!-- ══════════════════════════════════════════════
       SECTION: Toast Notifications (outside main)
  ══════════════════════════════════════════════════ -->
  <?php include 'components/toast.html'; ?>
  
  <!-- ══════════════════════════════════════════════
       SECTION: KPI Drill-down Modal
  ══════════════════════════════════════════════════ -->
  <?php include 'components/kpi-modal.html'; ?>

  <!-- ── JS FILES (order matters — data first, main last) ── -->
  <script src="js/data.js"></script>
  <script src="js/utils.js"></script>
  <script src="js/toast.js"></script>
  <script src="js/kpi.js"></script>
  <script src="js/filters.js"></script>
  <script src="js/table.js"></script>
  <script src="js/drawer.js"></script>
  <script src="js/main.js"></script>

</body>
</html>
