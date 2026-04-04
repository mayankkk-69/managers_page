/* ======================================================
   JS: table.js
   Attendance table rendering, row generation, pagination,
   inline status popup and bulk action controls.
   ====================================================== */

'use strict';

/* ── Inline Status Popup State ───────────────────── */
let popupAnchorId = null;

/* ── Render Table ─────────────────────────────────── */
/**
 * Apply filters, then render the current page of rows.
 * Also updates the subtitle, pagination info and controls.
 */
function renderTable() {

  const { filtered, currentPage, rowsPerPage } = state;
  const start = (currentPage - 1) * rowsPerPage;
  const end   = start + rowsPerPage;
  const page  = filtered.slice(start, end);
  const total = filtered.length;

  /* Subtitle */
  const datePicker = $id('datePicker');
  const dateStr = datePicker && datePicker.value
    ? new Date(datePicker.value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'today';
  const subtitle = $id('tableSubtitle');
  if (subtitle) subtitle.textContent = `Showing ${total} employee${total !== 1 ? 's' : ''} for ${dateStr}`;

  /* Pagination info */
  const shownStart = total === 0 ? 0 : start + 1;
  const shownEnd   = Math.min(end, total);
  const pagInfo = $id('paginationInfo');
  if (pagInfo) pagInfo.innerHTML = `Showing <strong>${shownStart}–${shownEnd}</strong> of <strong>${total}</strong> employees`;

  /* Clear tbody */
  const tbody = $id('tableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  /* Empty state */
  if (page.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-state-icon"><i data-feather="search"></i></div>
          <p class="empty-state-title">No employees found</p>
          <p class="empty-state-text">Try adjusting your search or filter criteria.</p>
        </div>
      </td></tr>`;
    feather.replace();
    renderPagination(total);
    return;
  }

  /* Build rows */
  page.forEach((emp, idx) => {
    const [gFrom, gTo] = AVATAR_GRADIENTS[emp._gradIdx];
    const hrs    = calcHours(emp.checkIn, emp.checkOut);
    const delay  = (idx * 0.04).toFixed(2);
    const label  = emp.status === 'leave' ? 'On Leave' : cap(emp.status);

    const row = document.createElement('tr');
    row.className = 'data-row';
    row.dataset.empId = emp.id;
    row.style.animationDelay = `${delay}s`;

    /* Make the whole row clickable — cursor set in CSS */
    row.title = `Click to view or edit ${emp.name}'s attendance`;

    row.innerHTML = `
      <td>
        <div class="emp-cell">
          <div class="emp-avatar-wrap">
            <div class="emp-avatar"
                 style="background:linear-gradient(135deg,${gFrom},${gTo});"
                 aria-hidden="true">${getInitials(emp.name)}</div>
            <span class="status-dot"
                  style="background:var(--${emp.status}-dot);"
                  title="${emp.status}" aria-hidden="true"></span>
          </div>
          <div class="emp-info">
            <p class="emp-name">${emp.name}</p>
            <p class="emp-id">${emp.id} &bull; ${emp.role}</p>
          </div>
        </div>
      </td>
      <td style="font-size:0.82rem;color:var(--text-secondary);font-weight:500;">${deptLabel(emp.dept)}</td>
      <td>
        <span class="status-badge ${emp.status}"
              aria-label="Status: ${emp.status}">
          ${label}
        </span>
      </td>
      <td>
        <div class="shift-time">
          <p class="actual">${fmtTime(emp.checkIn)}</p>
          <p class="scheduled">Sched. ${fmtTime(emp.schedule[0])}</p>
        </div>
      </td>
      <td>
        <div class="shift-time">
          <p class="actual">${emp.checkOut ? fmtTime(emp.checkOut) : '<span class="not-punched">Not punched out</span>'}</p>
          <p class="scheduled">Sched. ${fmtTime(emp.schedule[1])}</p>
        </div>
      </td>
      <td>
        ${hrs
          ? `<div class="hours-cell">
               <div class="hours-bar" aria-hidden="true">
                 <div class="hours-fill" style="width:0%" data-pct="${hrs.pct.toFixed(1)}"></div>
               </div>
               <span class="hours-text">${hrs.label}</span>
             </div>`
          : `<span class="not-punched">—</span>`
        }
      </td>
    `;
    tbody.appendChild(row);
  });

  feather.replace({ 'stroke-width': 2 });

  /* Animate hours bars after paint */
  requestAnimationFrame(() => {
    document.querySelectorAll('.hours-fill[data-pct]').forEach(el => {
      setTimeout(() => { el.style.width = el.dataset.pct + '%'; }, 200);
    });
  });

  bindRowEvents();
  renderPagination(total);
}

/* ── Bind Per-Row Events ──────────────────────────── */
function bindRowEvents() {
  /* Click anywhere on a row to open the drawer */
  document.querySelectorAll('.data-row').forEach(row => {
    row.addEventListener('click', () => {
      openDrawer(row.dataset.empId);
    });
  });
}

/* ── Inline Status Popup ──────────────────────────── */
function toggleStatusPopup(anchorEl, empId) {
  const popup = $id('statusPopup');
  if (!popup) return;

  if (popup.classList.contains('open') && popupAnchorId === empId) {
    closeStatusPopup();
    return;
  }

  popupAnchorId = empId;
  const rect = anchorEl.getBoundingClientRect();
  popup.style.top  = `${rect.bottom + 6}px`;
  popup.style.left = `${rect.left}px`;

  requestAnimationFrame(() => popup.classList.add('open'));
}

function closeStatusPopup() {
  const popup = $id('statusPopup');
  if (popup) popup.classList.remove('open');
  popupAnchorId = null;
}

/* Popup item click handler — attached in initTable() */
function initStatusPopup() {
  const popup = $id('statusPopup');
  if (!popup) return;

  popup.querySelectorAll('.status-popup-item').forEach(item => {
    item.addEventListener('click', () => {
      if (!popupAnchorId) return;
      const emp = state.employees.find(e => e.id === popupAnchorId);
      if (!emp) return;
      const oldStatus = emp.status;
      emp.status = item.dataset.val;
      closeStatusPopup();
      renderTable();
      renderKPI();
      showToast('success', 'Status Updated', `${emp.name}: ${cap(oldStatus)} → ${cap(emp.status)}`);
    });
  });

  /* Close popup on outside click */
  document.addEventListener('click', e => {
    if (!popup.contains(e.target) && !e.target.classList.contains('status-badge')) {
      closeStatusPopup();
    }
  });
}

/* ── Pagination ───────────────────────────────────── */
function renderPagination(total) {
  const pages  = Math.ceil(total / state.rowsPerPage);
  const cur    = state.currentPage;
  const prev   = $id('pagePrev');
  const next   = $id('pageNext');
  const nums   = $id('pageNumbers');

  if (prev) prev.disabled = cur <= 1;
  if (next) next.disabled = cur >= pages || pages === 0;

  if (!nums) return;
  nums.innerHTML = '';

  const mkBtn = (n) => {
    const btn = document.createElement('button');
    btn.className = `page-btn${n === cur ? ' active' : ''}`;
    btn.textContent = n;
    btn.setAttribute('aria-label', `Page ${n}`);
    if (n === cur) btn.setAttribute('aria-current', 'page');
    btn.addEventListener('click', () => { state.currentPage = n; renderTable(); });
    return btn;
  };

  const ellipsis = () => {
    const s = document.createElement('span');
    s.textContent = '…';
    s.style.cssText = 'color:var(--text-muted);padding:0 4px;align-self:center;';
    return s;
  };

  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) nums.appendChild(mkBtn(i));
  } else {
    [1, 2].forEach(n => nums.appendChild(mkBtn(n)));
    if (cur > 4) nums.appendChild(ellipsis());
    for (let i = Math.max(3, cur - 1); i <= Math.min(pages - 2, cur + 1); i++) nums.appendChild(mkBtn(i));
    if (cur < pages - 3) nums.appendChild(ellipsis());
    [pages - 1, pages].forEach(n => nums.appendChild(mkBtn(n)));
  }
}

/* ── CSV Export ───────────────────────────────────── */
function exportCSV() {
  const datePicker = $id('datePicker');
  const headers = ['Employee ID', 'Name', 'Department', 'Role', 'Status', 'Check-In', 'Check-Out'];
  const rows = state.filtered.map(e => [
    e.id, e.name, deptLabel(e.dept), e.role, e.status, e.checkIn || '—', e.checkOut || '—'
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${c}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `attendance_${(datePicker && datePicker.value) || 'today'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('success', 'Exported', 'Attendance CSV file downloaded.');
}

/* ── Init Table Controls ──────────────────────────── */
/**
 * Bind bulk actions and pagination nav buttons.
 * Called once by main.js after components are injected.
 */
function initTable() {
  /* Pagination nav */
  const prev = $id('pagePrev');
  const next = $id('pageNext');

  if (prev) {
    prev.addEventListener('click', () => {
      if (state.currentPage > 1) { state.currentPage--; renderTable(); }
    });
  }

  if (next) {
    next.addEventListener('click', () => {
      const pages = Math.ceil(state.filtered.length / state.rowsPerPage);
      if (state.currentPage < pages) { state.currentPage++; renderTable(); }
    });
  }

  /* Refresh button (handles both old table button and new header button if present) */
  const refreshBtns = [$id('refreshBtn'), $id('headerRefreshBtn')].filter(Boolean);
  refreshBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const icon = btn.querySelector('i, svg');
      if (icon) {
        icon.style.transition  = 'transform 0.5s ease';
        icon.style.transform   = 'rotate(360deg)';
      }
      setTimeout(() => {
        applyFilters();
        renderTable(); 
        renderKPI();
        if (icon) icon.style.transform = '';
        showToast('success', 'Refreshed', 'Attendance data is up to date.');
      }, 600);
    });
  });

  /* Print */
  const printBtn = $id('printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  /* Mark all present (for current filtered set) */
  const markBtn = $id('markAllPresentBtn');
  if (markBtn) {
    markBtn.addEventListener('click', () => {
      state.filtered.forEach(fe => {
        const emp = state.employees.find(e => e.id === fe.id);
        if (emp) {
          emp.status  = 'present';
          emp.checkIn = emp.checkIn || '09:00';
        }
      });
      renderTable(); renderKPI();
      showToast('success', 'Bulk Update', `${state.filtered.length} employees marked as Present.`);
    });
  }

  /* Export CSV */
  const exportBtn = $id('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportCSV);
  }

  /* Export PDF */
  const exportPdfBtn = $id('exportPdfBtn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      const element = document.getElementById('attendanceTable');
      if (!element) return;
      
      const opt = {
        margin:       10,
        filename:     `attendance-record-${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      showToast('info', 'Exporting PDF', 'Please wait while we generate your PDF...');
      html2pdf().set(opt).from(element).save();
    });
  }

  /* Init inline status popup */
  initStatusPopup();
}
