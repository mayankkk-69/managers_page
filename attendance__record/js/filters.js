/* ======================================================
   JS: filters.js
   All filter/search/sort control bar event bindings.
   Reads from and writes to the shared `state` object,
   then triggers table and KPI re-renders.
   ====================================================== */

'use strict';

/* ── Apply All Active Filters to state.employees ─── */
/**
 * Filter and sort state.employees based on current state
 * flags, writing the result into state.filtered.
 * Always resets pagination to page 1.
 */
function applyFilters() {
  let list = [...state.employees];

  /* Text search — name or ID */
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
    );
  }

  /* Department chip filter */
  if (state.selectedDept !== 'all') {
    list = list.filter(e => e.dept === state.selectedDept);
  }

  /* Status dropdown filter */
  if (state.selectedStatus !== 'all') {
    list = list.filter(e => e.status === state.selectedStatus);
  }

  /* Column sort */
  if (state.sortKey) {
    list.sort((a, b) => {
      let av = a[state.sortKey] || '';
      let bv = b[state.sortKey] || '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return state.sortDir === 'asc' ? -1 :  1;
      if (av > bv) return state.sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }

  state.filtered    = list;
  state.currentPage = 1;
}

/* ── Bind All Filter Control Events ──────────────── */
/**
 * Called once by main.js after components are injected.
 * Wires up search, date picker, status dropdown,
 * department chips and sortable column headers.
 */
function initFilters() {
  const searchInput  = $id('searchInput');
  const datePicker   = $id('datePicker');
  const statusFilter = $id('statusFilter');
  const deptChips    = $id('deptChips');

  /* Set today's date as default */
  if (datePicker) {
    datePicker.value = new Date().toISOString().split('T')[0];
  }

  /* ── Search (debounced 250 ms) ───────────────── */
  let searchDebounce;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        state.searchQuery = searchInput.value.trim();
        applyFilters();
        renderKPI();
        renderTable();
      }, 250);
    });
  }

  /* ── Date Picker ─────────────────────────────── */
  if (datePicker) {
    datePicker.addEventListener('change', () => {
      const selectedDate = datePicker.value;
      if (selectedDate) {
        // Re-fetch from DB for the newly selected date
        fetchAttendanceData(selectedDate);
      }
    });
  }

  /* ── Status Dropdown ─────────────────────────── */
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      state.selectedStatus = statusFilter.value;
      applyFilters();
      renderKPI();
      renderTable();
    });
  }

  /* ── Department Chips ────────────────────────── */
  if (deptChips) {
    deptChips.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        deptChips.querySelectorAll('.chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
        state.selectedDept = chip.dataset.dept;
        applyFilters();
        renderKPI();
        renderTable();
      });
    });
  }

  /* ── Sortable Column Headers ─────────────────── */
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = 'asc';
      }
      /* Reset aria-sort on all headers then set active one */
      document.querySelectorAll('th.sortable').forEach(t => {
        t.classList.remove('sort-asc', 'sort-desc');
        t.setAttribute('aria-sort', 'none');
      });
      th.classList.add(`sort-${state.sortDir}`);
      th.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
      applyFilters();
      renderTable();
    });
  });
}
