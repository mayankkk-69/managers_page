-- =========================================================
-- TABLE: attendance_master
-- Purpose: Comprehensive attendance record table for the
--          Manager Dashboard. Pulls & stores data from:
--          attendance, users, shifts, leave_requests, holidays
--
-- Run this in phpMyAdmin → crm database
-- =========================================================

CREATE TABLE IF NOT EXISTS `attendance_master` (

  -- ── PRIMARY KEY ─────────────────────────────────────────
  `id`                          INT(11) NOT NULL AUTO_INCREMENT,
  `attendance_id`               INT(11) DEFAULT NULL COMMENT 'FK to attendance.id',
  `record_date`                 DATE NOT NULL COMMENT 'Date of attendance',

  -- ── EMPLOYEE SNAPSHOT ────────────────────────────────────
  `user_id`                     INT(11) NOT NULL,
  `employee_name`               VARCHAR(255) NOT NULL,
  `employee_role`               VARCHAR(150) DEFAULT NULL COMMENT 'e.g. HR Manager, Site Engineer',
  `designation`                 VARCHAR(150) DEFAULT NULL,
  `department`                  VARCHAR(100) DEFAULT NULL COMMENT 'e.g. IT, HR, Finance',
  `employee_email`              VARCHAR(255) DEFAULT NULL,
  `employee_phone`              VARCHAR(20) DEFAULT NULL,
  `manager_id`                  INT(11) DEFAULT NULL COMMENT 'FK to users.id of manager',
  `manager_name`                VARCHAR(255) DEFAULT NULL,

  -- ── SHIFT / SCHEDULE ─────────────────────────────────────
  `shift_name`                  VARCHAR(100) DEFAULT NULL,
  `scheduled_shift_start`       TIME DEFAULT '09:00:00',
  `scheduled_shift_end`         TIME DEFAULT '18:00:00',
  `weekly_off_days`             VARCHAR(100) DEFAULT NULL COMMENT 'e.g. Sunday, Saturday',
  `is_weekly_off`               TINYINT(1) DEFAULT 0,
  `is_holiday`                  TINYINT(1) DEFAULT 0,
  `holiday_name`                VARCHAR(255) DEFAULT NULL,

  -- ── ATTENDANCE STATUS ─────────────────────────────────────
  `attendance_status`           ENUM('present','absent','late','half_day','on_leave','holiday','not_marked') DEFAULT 'not_marked',
  `is_late_arrival`             TINYINT(1) DEFAULT 0,
  `late_arrival_minutes`        INT(11) DEFAULT 0 COMMENT 'How many minutes late',
  `is_early_exit`               TINYINT(1) DEFAULT 0,
  `early_exit_minutes`          INT(11) DEFAULT 0 COMMENT 'How many minutes early',

  -- ── PUNCH IN DETAILS ─────────────────────────────────────
  `punch_in_time`               TIME DEFAULT NULL,
  `punch_in_date`               DATE DEFAULT NULL,
  `punch_in_latitude`           DECIMAL(10,8) DEFAULT NULL,
  `punch_in_longitude`          DECIMAL(11,8) DEFAULT NULL,
  `punch_in_accuracy_meters`    FLOAT DEFAULT NULL,
  `punch_in_address`            TEXT DEFAULT NULL,
  `punch_in_ip_address`         VARCHAR(45) DEFAULT NULL,
  `punch_in_device_info`        TEXT DEFAULT NULL,
  `punch_in_photo_path`         VARCHAR(500) DEFAULT NULL,
  `punch_in_within_geofence`    TINYINT(1) DEFAULT NULL COMMENT '1=inside, 0=outside',
  `punch_in_outside_reason`     TEXT DEFAULT NULL,

  -- ── PUNCH OUT DETAILS ─────────────────────────────────────
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
  `auto_punch_out`              TINYINT(1) DEFAULT 0 COMMENT '1 = system auto-punched out',

  -- ── GEOFENCE ─────────────────────────────────────────────
  `geofence_id`                 INT(11) DEFAULT NULL,
  `distance_from_geofence_m`   DECIMAL(10,2) DEFAULT NULL COMMENT 'Distance in meters',

  -- ── CALCULATED HOURS ─────────────────────────────────────
  `total_working_hours`         TIME DEFAULT NULL,
  `total_overtime_hours`        TIME DEFAULT NULL,
  `scheduled_hours`             DECIMAL(5,2) DEFAULT 9.00 COMMENT 'Expected hours for shift',
  `actual_hours_decimal`        DECIMAL(5,2) DEFAULT NULL COMMENT 'e.g. 8.5 = 8h 30m',
  `productivity_percentage`     DECIMAL(5,2) DEFAULT NULL COMMENT '(actual/scheduled) * 100',

  -- ── LEAVE INFO (if on leave) ──────────────────────────────
  `on_leave`                    TINYINT(1) DEFAULT 0,
  `leave_type`                  VARCHAR(100) DEFAULT NULL COMMENT 'e.g. Casual, Sick, Compensate',
  `leave_duration`              ENUM('full_day','half_day','short_leave') DEFAULT NULL,
  `leave_request_id`            INT(11) DEFAULT NULL,

  -- ── MISSING PUNCH HANDLING ────────────────────────────────
  `missing_punch_in`            TINYINT(1) DEFAULT 0,
  `missing_punch_in_reason`     TEXT DEFAULT NULL,
  `missing_punch_out`           TINYINT(1) DEFAULT 0,
  `missing_punch_out_reason`    TEXT DEFAULT NULL,
  `missing_punch_approval`      ENUM('pending','approved','rejected') DEFAULT 'pending',

  -- ── OVERTIME ─────────────────────────────────────────────
  `overtime_status`             ENUM('pending','submitted','approved','rejected','paid','expired','resubmitted') DEFAULT 'pending',
  `overtime_reason`             TEXT DEFAULT NULL,
  `overtime_approved_by_id`     INT(11) DEFAULT NULL,
  `overtime_approved_by_name`   VARCHAR(255) DEFAULT NULL,
  `overtime_actioned_at`        DATETIME DEFAULT NULL,

  -- ── WORK CONTENT ──────────────────────────────────────────
  `work_report`                 TEXT DEFAULT NULL,
  `manager_remarks`             TEXT DEFAULT NULL,
  `manager_comments`            TEXT DEFAULT NULL,

  -- ── APPROVAL ─────────────────────────────────────────────
  `approval_status`             ENUM('pending','approved','rejected') DEFAULT 'pending',
  `approved_by_id`              INT(11) DEFAULT NULL,
  `approved_by_name`            VARCHAR(255) DEFAULT NULL,
  `approval_timestamp`          DATETIME DEFAULT NULL,
  `waved_off`                   TINYINT(1) DEFAULT 0 COMMENT '1 = Late penalty waived',

  -- ── META ─────────────────────────────────────────────────
  `synced_at`                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at`                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- ── INDEXES ─────────────────────────────────────────────
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`, `record_date`),
  KEY `idx_record_date` (`record_date`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_attendance_status` (`attendance_status`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_department` (`department`),
  KEY `idx_manager_id` (`manager_id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Master attendance table for Manager Dashboard — synced from attendance + users + shifts + leaves';
