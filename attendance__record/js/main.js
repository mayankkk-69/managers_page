/* ======================================================
   JS: main.js
   Application entry point.
   Components are included server-side by PHP (index.php),
   so no fetch() calls are needed for HTML components.

   1. Initialises Feather icons.
   2. Sets the live date in the header.
   3. Calls init functions from each section JS file.
   4. Triggers initial DB fetch for today's attendance.
   ====================================================== */

'use strict';

/**
 * Set the live date string in the header.
 */
function initHeaderDate() {
  const el = document.getElementById('headerDate');
  if (!el) return;
  const now  = new Date();
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  el.innerHTML = `<strong>${now.toLocaleDateString('en-IN', opts)}</strong>`;
}

/**
 * Bootstrap the entire application.
 * Components are already in the DOM (injected by PHP),
 * so we just init each module then fetch live DB data.
 */
async function init() {
  /* 1. Render Feather icons (all components are already in DOM) */
  feather.replace({ 'stroke-width': 2 });

  /* 2. Set live date in header */
  initHeaderDate();

  /* 3. Set today's date as default in date picker */
  const datePicker = document.getElementById('datePicker');
  const today = new Date().toISOString().split('T')[0];
  if (datePicker) {
    datePicker.value = today;
  }

  /* 4. Initialise each section module (order matters) */
  initFilters();   // filters.js — search, date, chips, sort
  initTable();     // table.js  — pagination, bulk actions, status popup
  initDrawer();    // drawer.js — open/close/save

  /* 5. Fetch live attendance data from DB for today */
  await fetchAttendanceData(today);
}

/* ── Start when DOM is fully loaded ──────────────── */
document.addEventListener('DOMContentLoaded', init);
