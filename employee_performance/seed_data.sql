-- ============================================================
-- SEED DATA FOR NIKHIL KATOCH (user_id = 31)
-- Inserts realistic tasks using existing projects & stages
-- Safe to re-run (INSERT IGNORE)
-- ============================================================

-- ── 1. CREATE 3 PROJECTS FOR NIKHIL ─────────────────────
INSERT IGNORE INTO projects
    (id, title, description, project_type, status, client_name,
     created_by, assigned_to, start_date, end_date, created_at)
VALUES
    (8010, 'Kapoor Residence - Brand Identity', 
     'Full graphic design and branding package for a luxury residence project.', 
     'Residential', 'active', 'Mr. Kapoor', 1, 31, '2026-01-10', '2026-06-30', NOW()),
    
    (8011, 'Nexus Office - Marketing Collateral', 
     'Design of marketing materials for the Nexus commercial launch campaign.', 
     'Commercial', 'active', 'Nexus Corp', 1, 31, '2026-02-01', '2026-07-31', NOW()),
    
    (8012, 'Skyline Villas - Social Media Kit', 
     'Social media graphics, brochures and digital assets for villa project.', 
     'Residential', 'completed', 'Skyline Developers', 1, 31, '2025-10-01', '2026-02-28', NOW());


-- ── 2. CREATE STAGES FOR NIKHIL'S PROJECTS ──────────────
INSERT IGNORE INTO project_stages
    (id, project_id, stage_number, assigned_to, start_date, end_date, status, created_at)
VALUES
    -- Kapoor Residence stages
    (7010, 8010, 1, 31, '2026-01-10', '2026-02-20', 'completed', NOW()),
    (7011, 8010, 2, 31, '2026-02-21', '2026-04-15', 'in_progress', NOW()),
    (7012, 8010, 3, 31, '2026-04-16', '2026-06-30', 'pending', NOW()),

    -- Nexus Office stages
    (7013, 8011, 1, 31, '2026-02-01', '2026-03-31', 'completed', NOW()),
    (7014, 8011, 2, 31, '2026-04-01', '2026-07-31', 'in_progress', NOW()),

    -- Skyline Villas stages
    (7015, 8012, 1, 31, '2025-10-01', '2025-12-15', 'completed', NOW()),
    (7016, 8012, 2, 31, '2025-12-16', '2026-02-28', 'completed', NOW());


-- ── 3. SUBSTAGES (TASKS) FOR NIKHIL ─────────────────────
-- Legend: on-time = completed before/on end_date | late = completed after end_date

INSERT IGNORE INTO project_substages
    (id, stage_id, substage_number, title, assigned_to,
     start_date, end_date, status, updated_at, created_at)
VALUES

    -- ── Kapoor Residence / Stage 1 (all completed, mix) ──
    (6100, 7010, 1, 'Brand Discovery Workshop',
     31, '2026-01-10', '2026-01-18', 'completed', '2026-01-17 10:00:00', NOW()),   -- on time

    (6101, 7010, 2, 'Moodboard & Color Palette',
     31, '2026-01-18', '2026-01-28', 'completed', '2026-01-28 16:00:00', NOW()),   -- on time

    (6102, 7010, 3, 'Logo Design - v1',
     31, '2026-01-28', '2026-02-07', 'completed', '2026-02-11 09:00:00', NOW()),   -- 4 days late

    (6103, 7010, 4, 'Logo Design - Final Approved',
     31, '2026-02-07', '2026-02-20', 'completed', '2026-02-19 15:00:00', NOW()),   -- on time

    -- ── Kapoor Residence / Stage 2 (in progress + late + active) ──
    (6104, 7011, 1, 'Business Card Design',
     31, '2026-02-21', '2026-03-05', 'completed', '2026-03-09 11:00:00', NOW()),   -- 4 days late

    (6105, 7011, 2, 'Letterhead & Stationery Pack',
     31, '2026-03-05', '2026-03-20', 'completed', '2026-03-20 17:00:00', NOW()),   -- on time

    (6106, 7011, 3, 'Brand Guidelines Document',
     31, '2026-03-20', '2026-04-05', 'completed', '2026-04-14 10:00:00', NOW()),   -- 9 days late

    (6107, 7011, 4, 'Social Media Profile Templates',
     31, '2026-04-05', '2026-04-15', 'in_progress', NOW(), NOW()),                  -- currently active, deadline passed → overdue

    -- ── Kapoor Residence / Stage 3 (all upcoming) ──
    (6108, 7012, 1, 'Print-ready Files Packaging',
     31, '2026-04-16', '2026-05-05', 'pending', NOW(), NOW()),

    (6109, 7012, 2, 'Digital Asset Delivery',
     31, '2026-05-06', '2026-05-25', 'pending', NOW(), NOW()),

    (6110, 7012, 3, 'Client Training on Brand Usage',
     31, '2026-05-26', '2026-06-15', 'pending', NOW(), NOW()),

    (6111, 7012, 4, 'Final Handover & Sign-off',
     31, '2026-06-16', '2026-06-30', 'pending', NOW(), NOW()),

    -- ── Nexus Office / Stage 1 (completed, mostly on time) ──
    (6112, 7013, 1, 'Campaign Brief & Strategy',
     31, '2026-02-01', '2026-02-12', 'completed', '2026-02-11 14:00:00', NOW()),   -- on time

    (6113, 7013, 2, 'Brochure Design - Draft',
     31, '2026-02-12', '2026-02-25', 'completed', '2026-02-28 09:00:00', NOW()),   -- 3 days late

    (6114, 7013, 3, 'Brochure Design - Final',
     31, '2026-02-25', '2026-03-12', 'completed', '2026-03-12 17:00:00', NOW()),   -- on time

    (6115, 7013, 4, 'Hoarding & Banner Design',
     31, '2026-03-12', '2026-03-31', 'completed', '2026-03-30 16:00:00', NOW()),   -- on time

    -- ── Nexus Office / Stage 2 (active with overdue) ──
    (6116, 7014, 1, 'Digital Ad Creatives - Set 1',
     31, '2026-04-01', '2026-04-14', 'in_progress', NOW(), NOW()),   -- overdue (deadline was Apr 14)

    (6117, 7014, 2, 'Email Newsletter Template',
     31, '2026-04-15', '2026-05-10', 'pending', NOW(), NOW()),

    (6118, 7014, 3, 'Presentation Deck Design',
     31, '2026-05-11', '2026-06-05', 'pending', NOW(), NOW()),

    (6119, 7014, 4, 'Video Thumbnail & Reels Kit',
     31, '2026-06-06', '2026-07-31', 'pending', NOW(), NOW()),

    -- ── Skyline Villas / Stage 1 (all completed on time) ──
    (6120, 7015, 1, 'Project Logo & Tagline',
     31, '2025-10-01', '2025-10-15', 'completed', '2025-10-14 12:00:00', NOW()),   -- on time

    (6121, 7015, 2, 'Brochure Photography Selection',
     31, '2025-10-15', '2025-10-30', 'completed', '2025-10-29 10:00:00', NOW()),   -- on time

    (6122, 7015, 3, 'Brochure Layout Design',
     31, '2025-10-30', '2025-11-20', 'completed', '2025-11-19 15:00:00', NOW()),   -- on time

    (6123, 7015, 4, 'Signage & Wayfinding Design',
     31, '2025-11-20', '2025-12-15', 'completed', '2025-12-20 11:00:00', NOW()),   -- 5 days late

    -- ── Skyline Villas / Stage 2 (completed) ──
    (6124, 7016, 1, 'Instagram Post Template Pack',
     31, '2025-12-16', '2026-01-05', 'completed', '2026-01-05 17:00:00', NOW()),   -- on time

    (6125, 7016, 2, 'Facebook Ads Creatives',
     31, '2026-01-06', '2026-01-20', 'completed', '2026-01-19 09:00:00', NOW()),   -- on time

    (6126, 7016, 3, 'WhatsApp Broadcast Kit',
     31, '2026-01-20', '2026-02-05', 'completed', '2026-02-10 14:00:00', NOW()),   -- 5 days late

    (6127, 7016, 4, 'Final Digital Pack & Backup',
     31, '2026-02-10', '2026-02-28', 'completed', '2026-02-27 16:00:00', NOW());   -- on time


-- ── VERIFY ───────────────────────────────────────────────
SELECT 'Nikhil Katoch seed data inserted!' as status;

SELECT
    u.username,
    COUNT(pss.id) as total_tasks,
    SUM(pss.status = 'completed') as completed,
    SUM(pss.status = 'in_progress') as active,
    SUM(pss.status = 'pending') as pending
FROM users u
JOIN project_substages pss ON pss.assigned_to = u.id
WHERE u.id = 31 AND pss.deleted_at IS NULL
GROUP BY u.username;
