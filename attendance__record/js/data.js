/* ======================================================
   JS: data.js
   Live data loader — fetches attendance records from
   the PHP API (api/get_attendance.php) which queries
   the `crm` database (attendance + users tables).

   All other JS files read from the shared `state` object.
   ====================================================== */

'use strict';

/* ── Avatar Gradient Palette ─────────────────────── */
const AVATAR_GRADIENTS = [
  ['#667eea', '#764ba2'], ['#11998e', '#38ef7d'],
  ['#f093fb', '#f5576c'], ['#f7971e', '#ffd200'],
  ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'], ['#a18cd1', '#fbc2eb'],
  ['#fda085', '#f6d365'], ['#89f7fe', '#66a6ff'],
];

/* ── Shared Application State ────────────────────── */
const state = {
  employees:      [],   // live working dataset (populated from DB)
  filtered:       [],   // result after filters/sort
  searchQuery:    '',
  selectedDept:   'all',
  selectedStatus: 'all',
  sortKey:        null,
  sortDir:        'asc',
  currentPage:    1,
  rowsPerPage:    10,
  activeEmpId:    null,     // employee currently in the drawer
  openStatusFor:  null,     // employee whose status popup is open
  isLoading:      false,    // true while fetching from DB
  currentDate:    new Date().toISOString().split('T')[0], // YYYY-MM-DD
};

/* ── API Config ──────────────────────────────────── */
const API_BASE = 'api/get_attendance.php';

/* ── Loading Overlay Helpers ─────────────────────── */
function showLoadingOverlay() {
  let overlay = document.getElementById('dbLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dbLoadingOverlay';
    overlay.innerHTML = `
      <div class="db-loading-spinner">
        <div class="db-spinner-ring"></div>
        <p class="db-loading-text">Fetching from Database…</p>
      </div>
    `;
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background:rgba(10,14,26,0.75);
      backdrop-filter:blur(4px);
      display:flex; align-items:center; justify-content:center;
    `;
    // Inject spinner styles once
    if (!document.getElementById('dbSpinnerStyle')) {
      const style = document.createElement('style');
      style.id = 'dbSpinnerStyle';
      style.textContent = `
        .db-loading-spinner { text-align:center; }
        .db-spinner-ring {
          width:52px; height:52px; border-radius:50%;
          border:4px solid rgba(99,102,241,0.2);
          border-top-color:#6366f1;
          animation:dbSpin .8s linear infinite;
          margin:0 auto 14px;
        }
        @keyframes dbSpin { to { transform:rotate(360deg); } }
        .db-loading-text {
          color:#a5b4fc; font-size:0.9rem; font-family:inherit; margin:0;
          letter-spacing:.5px;
        }
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  state.isLoading = true;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('dbLoadingOverlay');
  if (overlay) overlay.style.display = 'none';
  state.isLoading = false;
}

/* ── Core: Fetch Attendance Data from DB ─────────── */
/**
 * Fetches employee attendance for a given date from the PHP API.
 * Updates state.employees and re-renders all UI sections.
 *
 * @param {string} date - YYYY-MM-DD format
 * @returns {Promise<void>}
 */
async function fetchAttendanceData(date) {
  if (!date) date = state.currentDate;
  state.currentDate = date;

  showLoadingOverlay();

  try {
    const url = `${API_BASE}?date=${encodeURIComponent(date)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    if (!json.success) {
      throw new Error(json.error || 'Unknown API error');
    }

    /* Populate state with live DB data */
    state.employees = json.employees || [];

    /* Re-apply current filters and re-render everything */
    applyFilters();
    renderKPI();
    renderTable();

    /* Show success toast */
    const d = new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    showToast(
      'success',
      'Data Loaded',
      `${json.count} record(s) loaded for ${d}`
    );

  } catch (err) {
    console.error('[AttendanceDashboard] Fetch error:', err);
    showToast('error', 'Load Failed', err.message || 'Could not fetch data from database.');
    /* Keep whatever data was already in state */
  } finally {
    hideLoadingOverlay();
  }
}
