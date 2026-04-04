/* ======================================================
   ATTENDANCE RECORD DASHBOARD — APP.JS
   Interactive logic: data, rendering, filters, drawer,
   inline edits, pagination, toasts, animations.
   ====================================================== */

'use strict';

/* ── AVATAR GRADIENT PALETTES ─────────────────────── */
const AVATAR_GRADIENTS = [
  ['#667eea', '#764ba2'], ['#11998e', '#38ef7d'],
  ['#f093fb', '#f5576c'], ['#f7971e', '#ffd200'],
  ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'], ['#a18cd1', '#fbc2eb'],
  ['#fda085', '#f6d365'], ['#89f7fe', '#66a6ff'],
];

/* ── MOCK EMPLOYEE DATA ───────────────────────────── */
const EMPLOYEES = [
  { id: 'EMP001', name: 'Aarav Sharma',    role: 'Software Engineer',      dept: 'it',      status: 'present', checkIn: '09:02', checkOut: '18:15', schedule: ['09:00', '18:00'] },
  { id: 'EMP002', name: 'Priya Mehta',     role: 'HR Specialist',           dept: 'hr',      status: 'present', checkIn: '08:55', checkOut: '18:00', schedule: ['09:00', '18:00'] },
  { id: 'EMP003', name: 'Rohit Verma',     role: 'Sales Executive',         dept: 'sales',   status: 'late',    checkIn: '10:22', checkOut: '',       schedule: ['09:00', '18:00'] },
  { id: 'EMP004', name: 'Sunita Rao',      role: 'Finance Analyst',         dept: 'finance', status: 'absent',  checkIn: '',      checkOut: '',       schedule: ['09:00', '18:00'] },
  { id: 'EMP005', name: 'Karan Patel',     role: 'DevOps Engineer',         dept: 'it',      status: 'present', checkIn: '09:10', checkOut: '18:05', schedule: ['09:00', '18:00'] },
  { id: 'EMP006', name: 'Neha Joshi',      role: 'Operations Manager',      dept: 'ops',     status: 'leave',   checkIn: '',      checkOut: '',       schedule: ['09:00', '18:00'] },
  { id: 'EMP007', name: 'Vikram Singh',    role: 'Sales Manager',           dept: 'sales',   status: 'present', checkIn: '08:48', checkOut: '17:58', schedule: ['09:00', '18:00'] },
  { id: 'EMP008', name: 'Divya Nair',      role: 'UI/UX Designer',          dept: 'it',      status: 'late',    checkIn: '10:05', checkOut: '',       schedule: ['09:00', '18:00'] },
  { id: 'EMP009', name: 'Arjun Kapoor',    role: 'Accountant',              dept: 'finance', status: 'present', checkIn: '09:00', checkOut: '18:00', schedule: ['09:00', '18:00'] },
  { id: 'EMP010', name: 'Meena Krishnan',  role: 'Recruitment Specialist',  dept: 'hr',      status: 'present', checkIn: '09:05', checkOut: '18:10', schedule: ['09:00', '18:00'] },
  { id: 'EMP011', name: 'Sameer Gupta',    role: 'Backend Developer',       dept: 'it',      status: 'absent',  checkIn: '',      checkOut: '',       schedule: ['09:00', '18:00'] },
  { id: 'EMP012', name: 'Ananya Das',      role: 'Customer Relations',      dept: 'ops',     status: 'present', checkIn: '08:58', checkOut: '18:00', schedule: ['09:00', '18:00'] },
  { id: 'EMP013', name: 'Rajesh Kumar',    role: 'Finance Head',            dept: 'finance', status: 'late',    checkIn: '09:45', checkOut: '',       schedule: ['09:00', '18:00'] },
  { id: 'EMP014', name: 'Pooja Iyer',      role: 'Sales Associate',         dept: 'sales',   status: 'leave',   checkIn: '',      checkOut: '',       schedule: ['09:00', '18:00'] },
  { id: 'EMP015', name: 'Manish Tiwari',   role: 'IT Support',              dept: 'it',      status: 'present', checkIn: '09:01', checkOut: '18:00', schedule: ['09:00', '18:00'] },
  { id: 'EMP016', name: 'Shalini Bose',    role: 'HR Manager',              dept: 'hr',      status: 'present', checkIn: '08:50', checkOut: '17:55', schedule: ['09:00', '18:00'] },
  { id: 'EMP017', name: 'Deepak Mishra',   role: 'Operations Analyst',      dept: 'ops',     status: 'absent',  checkIn: '',      checkOut: '',       schedule: ['09:00', '18:00'] },
  { id: 'EMP018', name: 'Kavita Reddy',    role: 'Frontend Developer',      dept: 'it',      status: 'present', checkIn: '09:08', checkOut: '18:12', schedule: ['09:00', '18:00'] },
];

/* Attach a gradient index to each employee once */
EMPLOYEES.forEach((e, i) => { e._gradIdx = i % AVATAR_GRADIENTS.length; });

/* Generate random history for last 3 days */
function getHistory(empId) {
  const statuses = ['present', 'present', 'late', 'absent', 'leave'];
  const labels = { present: 'Present — 9:00 AM to 6:00 PM', late: 'Late Arrival — 10:17 AM', absent: 'Absent — No record', leave: 'On Leave — Approved' };
  const now = new Date();
  return [-3, -2, -1].map(d => {
    const date = new Date(now); date.setDate(date.getDate() + d);
    const s = statuses[Math.abs(empId.charCodeAt(3) + d) % statuses.length];
    return { date: date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }), status: s, label: labels[s] };
  }).reverse();
}

/* ── STATE ────────────────────────────────────────── */
const state = {
  employees: JSON.parse(JSON.stringify(EMPLOYEES)), // deep copy (working set)
  filtered: [],
  searchQuery: '',
  selectedDept: 'all',
  selectedStatus: 'all',
  sortKey: null,
  sortDir: 'asc',
  currentPage: 1,
  rowsPerPage: 10,
  activeEmpId: null,
  openStatusFor: null,
};

/* ── DOM REFS ─────────────────────────────────────── */
const $ = id => document.getElementById(id);
const els = {
  searchInput:        $('searchInput'),
  datePicker:         $('datePicker'),
  statusFilter:       $('statusFilter'),
  deptChips:          $('deptChips'),
  tableBody:          $('tableBody'),
  tableSubtitle:      $('tableSubtitle'),
  paginationInfo:     $('paginationInfo'),
  pageNumbers:        $('pageNumbers'),
  pagePrev:           $('pagePrev'),
  pageNext:           $('pageNext'),
  drawerOverlay:      $('drawerOverlay'),
  editDrawer:         $('editDrawer'),
  drawerAvatar:       $('drawerAvatar'),
  drawerEmpName:      $('drawerEmpName'),
  drawerEmpRole:      $('drawerEmpRole'),
  drawerDeptLabel:    $('drawerDeptLabel'),
  drawerScheduledIn:  $('drawerScheduledIn'),
  drawerScheduledOut: $('drawerScheduledOut'),
  drawerActualIn:     $('drawerActualIn'),
  drawerActualOut:    $('drawerActualOut'),
  drawerTimeline:     $('drawerTimeline'),
  drawerClose:        $('drawerClose'),
  drawerCancelBtn:    $('drawerCancelBtn'),
  drawerSaveBtn:      $('drawerSaveBtn'),
  editCheckIn:        $('editCheckIn'),
  editCheckOut:       $('editCheckOut'),
  editReason:         $('editReason'),
  toastContainer:     $('toastContainer'),
  statusPopup:        $('statusPopup'),
  selectAll:          $('selectAll'),
  refreshBtn:         $('refreshBtn'),
  exportBtn:          $('exportBtn'),
  markAllPresentBtn:  $('markAllPresentBtn'),
  headerDate:         $('headerDate'),
};

/* ── UTILITIES ────────────────────────────────────── */
function getInitials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${ampm}`;
}

function calcHours(inT, outT) {
  if (!inT || !outT) return null;
  const [ih, im] = inT.split(':').map(Number);
  const [oh, om] = outT.split(':').map(Number);
  const mins = (oh * 60 + om) - (ih * 60 + im);
  if (mins <= 0) return null;
  const hrs = Math.floor(mins / 60);
  const mn  = mins % 60;
  return { raw: mins, label: `${hrs}h ${mn}m`, pct: Math.min((mins / 540) * 100, 100) }; // 9h = 100%
}

function deptLabel(key) {
  return { it: 'IT', sales: 'Sales', hr: 'HR', finance: 'Finance', ops: 'Operations' }[key] || key;
}

/* ── LIVE DATE/TIME HEADER ───────────────────────── */
function updateHeaderDate() {
  const now = new Date();
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  els.headerDate.innerHTML = `<strong>${now.toLocaleDateString('en-IN', opts)}</strong>`;
}
updateHeaderDate();

/* Set today's date as default in date picker */
els.datePicker.value = new Date().toISOString().split('T')[0];

/* ── KPI COMPUTATION ─────────────────────────────── */
function computeKPI(list) {
  const total   = list.length;
  const present = list.filter(e => e.status === 'present').length;
  const absent  = list.filter(e => e.status === 'absent').length;
  const late    = list.filter(e => e.status === 'late').length;
  const leave   = list.filter(e => e.status === 'leave').length;
  return { total, present, absent, late, leave };
}

function animateNumber(el, target, duration = 800) {
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * p);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderKPI() {
  const kpi = computeKPI(state.employees);

  animateNumber($('kpiTotalVal'),   kpi.total);
  animateNumber($('kpiPresentVal'), kpi.present);
  animateNumber($('kpiAbsentVal'),  kpi.absent);
  animateNumber($('kpiLateVal'),    kpi.late);
  animateNumber($('kpiLeaveVal'),   kpi.leave);

  // Trends (mock)
  $('kpiPresentTrend').textContent = `↑ ${Math.round((kpi.present/kpi.total)*100)}% attendance rate`;
  $('kpiAbsentTrend').textContent  = kpi.absent > 0 ? `↑ ${kpi.absent} absent today` : '✓ No absences';
  $('kpiLateTrend').textContent    = kpi.late > 0   ? `⚠ ${kpi.late} late arrivals` : '✓ None late';
  $('kpiLeaveTrend').textContent   = `${kpi.leave} on approved leave`;

  // Bar widths
  setTimeout(() => {
    $('kpiPresentBar').style.width = `${(kpi.present / kpi.total) * 100}%`;
    $('kpiAbsentBar').style.width  = `${(kpi.absent  / kpi.total) * 100}%`;
    $('kpiLateBar').style.width    = `${(kpi.late    / kpi.total) * 100}%`;
    $('kpiLeaveBar').style.width   = `${(kpi.leave   / kpi.total) * 100}%`;
  }, 100);
}

/* ── FILTER & SORT ───────────────────────────────── */
function applyFilters() {
  let list = [...state.employees];

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(e => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
  }

  if (state.selectedDept !== 'all') list = list.filter(e => e.dept === state.selectedDept);
  if (state.selectedStatus !== 'all') list = list.filter(e => e.status === state.selectedStatus);

  if (state.sortKey) {
    list.sort((a, b) => {
      let av = a[state.sortKey] || '';
      let bv = b[state.sortKey] || '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return state.sortDir === 'asc' ? -1 : 1;
      if (av > bv) return state.sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }

  state.filtered = list;
  state.currentPage = 1;
}

/* ── TABLE RENDERING ─────────────────────────────── */
function renderTable() {
  applyFilters();
  const { filtered, currentPage, rowsPerPage } = state;
  const start = (currentPage - 1) * rowsPerPage;
  const end   = start + rowsPerPage;
  const page  = filtered.slice(start, end);
  const total = filtered.length;

  /* Table subtitle */
  const dateStr = els.datePicker.value
    ? new Date(els.datePicker.value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'today';
  els.tableSubtitle.textContent = `Showing ${total} employee${total !== 1 ? 's' : ''} for ${dateStr}`;

  /* Pagination info */
  const shownStart = total === 0 ? 0 : start + 1;
  const shownEnd   = Math.min(end, total);
  els.paginationInfo.innerHTML = `Showing <strong>${shownStart}–${shownEnd}</strong> of <strong>${total}</strong> employees`;

  /* Clear body */
  els.tableBody.innerHTML = '';

  if (page.length === 0) {
    els.tableBody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-feather="search"></i>
          </div>
          <p class="empty-state-title">No employees found</p>
          <p class="empty-state-text">Try adjusting your search or filter criteria.</p>
        </div>
      </td></tr>`;
    feather.replace();
    renderPagination(total);
    return;
  }

  page.forEach((emp, idx) => {
    const [gFrom, gTo] = AVATAR_GRADIENTS[emp._gradIdx];
    const hrs = calcHours(emp.checkIn, emp.checkOut);
    const delay = (idx * 0.04).toFixed(2);

    const row = document.createElement('tr');
    row.className = 'data-row';
    row.dataset.empId = emp.id;
    row.style.animationDelay = `${delay}s`;

    row.innerHTML = `
      <td>
        <input type="checkbox" class="row-checkbox" data-id="${emp.id}" aria-label="Select ${emp.name}" />
      </td>
      <td>
        <div class="emp-cell">
          <div class="emp-avatar-wrap">
            <div class="emp-avatar" style="background:linear-gradient(135deg,${gFrom},${gTo});"
                 aria-hidden="true">${getInitials(emp.name)}</div>
            <span class="status-dot" style="background:var(--${emp.status}-dot);"
                  title="${emp.status}" aria-hidden="true"></span>
          </div>
          <div class="emp-info">
            <p class="emp-name">${emp.name}</p>
            <p class="emp-id">${emp.id} &bull; ${emp.role}</p>
          </div>
        </div>
      </td>
      <td style="font-size:0.82rem;color:var(--text-secondary);font-weight:500;">${deptLabel(emp.dept)}</td>
      <td style="position:relative;">
        <span class="status-badge ${emp.status}" role="button" tabindex="0"
              data-id="${emp.id}" title="Click to change status"
              aria-label="Status: ${emp.status}. Click to edit.">
          ${emp.status.charAt(0).toUpperCase() + emp.status.slice(1) === 'Leave' ? 'On Leave' : emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
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
          <p class="actual">${fmtTime(emp.checkOut)}</p>
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
          : `<span style="color:var(--text-muted);font-size:0.8rem;">—</span>`
        }
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-row-action edit-btn" data-id="${emp.id}" title="Edit attendance" aria-label="Edit ${emp.name} attendance">
            <i data-feather="edit-2"></i>
          </button>
          <button class="btn-row-action" title="View profile" aria-label="View ${emp.name} profile">
            <i data-feather="eye"></i>
          </button>
          <button class="btn-row-action danger" title="Flag issue" aria-label="Flag issue for ${emp.name}">
            <i data-feather="flag"></i>
          </button>
        </div>
      </td>
    `;
    els.tableBody.appendChild(row);
  });

  /* Replace feather icons inside newly rendered rows */
  feather.replace({ 'stroke-width': 2 });

  /* Animate progress bars after paint */
  requestAnimationFrame(() => {
    document.querySelectorAll('.hours-fill[data-pct]').forEach(el => {
      setTimeout(() => { el.style.width = el.dataset.pct + '%'; }, 200);
    });
  });

  /* Bind inline events */
  bindTableEvents();
  renderPagination(total);
}

/* ── TABLE EVENTS ────────────────────────────────── */
function bindTableEvents() {
  /* Edit button → open drawer */
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openDrawer(btn.dataset.id);
    });
  });

  /* Status badge → inline popup */
  document.querySelectorAll('.status-badge').forEach(badge => {
    badge.addEventListener('click', e => {
      e.stopPropagation();
      toggleStatusPopup(badge, badge.dataset.id);
    });
    badge.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleStatusPopup(badge, badge.dataset.id);
      }
    });
  });
}

/* ── INLINE STATUS POPUP ─────────────────────────── */
let popupAnchorId = null;

function toggleStatusPopup(anchorEl, empId) {
  const popup = els.statusPopup;

  if (popup.classList.contains('open') && popupAnchorId === empId) {
    closeStatusPopup();
    return;
  }

  popupAnchorId = empId;
  const rect = anchorEl.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.top  = `${rect.bottom + 6}px`;
  popup.style.left = `${rect.left}px`;

  document.body.appendChild(popup);
  requestAnimationFrame(() => popup.classList.add('open'));
}

function closeStatusPopup() {
  els.statusPopup.classList.remove('open');
  popupAnchorId = null;
}

els.statusPopup.querySelectorAll('.status-popup-item').forEach(item => {
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

document.addEventListener('click', e => {
  if (!els.statusPopup.contains(e.target) && !e.target.classList.contains('status-badge')) {
    closeStatusPopup();
  }
});

/* ── PAGINATION ──────────────────────────────────── */
function renderPagination(total) {
  const pages = Math.ceil(total / state.rowsPerPage);
  const cur   = state.currentPage;

  els.pagePrev.disabled = cur <= 1;
  els.pageNext.disabled = cur >= pages || pages === 0;

  els.pageNumbers.innerHTML = '';
  const buildBtn = (n) => {
    const btn = document.createElement('button');
    btn.className = `page-btn${n === cur ? ' active' : ''}`;
    btn.textContent = n;
    btn.setAttribute('aria-label', `Page ${n}`);
    if (n === cur) btn.setAttribute('aria-current', 'page');
    btn.addEventListener('click', () => { state.currentPage = n; renderTable(); });
    return btn;
  };

  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) els.pageNumbers.appendChild(buildBtn(i));
  } else {
    [1, 2].forEach(n => els.pageNumbers.appendChild(buildBtn(n)));
    if (cur > 4) els.pageNumbers.insertAdjacentHTML('beforeend', `<span style="color:var(--text-muted);padding:0 4px;align-self:center;">…</span>`);
    for (let i = Math.max(3, cur - 1); i <= Math.min(pages - 2, cur + 1); i++) els.pageNumbers.appendChild(buildBtn(i));
    if (cur < pages - 3) els.pageNumbers.insertAdjacentHTML('beforeend', `<span style="color:var(--text-muted);padding:0 4px;align-self:center;">…</span>`);
    [pages - 1, pages].forEach(n => els.pageNumbers.appendChild(buildBtn(n)));
  }
}

els.pagePrev.addEventListener('click', () => { if (state.currentPage > 1) { state.currentPage--; renderTable(); } });
els.pageNext.addEventListener('click', () => {
  const pages = Math.ceil(state.filtered.length / state.rowsPerPage);
  if (state.currentPage < pages) { state.currentPage++; renderTable(); }
});

/* ── SORT ────────────────────────────────────────── */
document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = key;
      state.sortDir = 'asc';
    }
    document.querySelectorAll('th.sortable').forEach(t => {
      t.classList.remove('sort-asc', 'sort-desc');
      t.setAttribute('aria-sort', 'none');
    });
    th.classList.add(`sort-${state.sortDir}`);
    th.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
    renderTable();
  });
});

/* ── FILTER EVENTS ───────────────────────────────── */
let searchDebounce;
els.searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.searchQuery = els.searchInput.value.trim();
    renderTable();
  }, 250);
});

els.statusFilter.addEventListener('change', () => {
  state.selectedStatus = els.statusFilter.value;
  renderTable();
});

els.datePicker.addEventListener('change', () => {
  renderTable();
  showToast('info', 'Date Changed', `Viewing records for ${new Date(els.datePicker.value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`);
});

els.deptChips.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    els.deptChips.querySelectorAll('.chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
    chip.classList.add('active');
    chip.setAttribute('aria-pressed', 'true');
    state.selectedDept = chip.dataset.dept;
    renderTable();
  });
});

/* ── SELECT ALL ──────────────────────────────────── */
els.selectAll.addEventListener('change', () => {
  document.querySelectorAll('.row-checkbox').forEach(cb => { cb.checked = els.selectAll.checked; });
});

/* ── HEADER ACTION BUTTONS ───────────────────────── */
els.refreshBtn.addEventListener('click', () => {
  els.refreshBtn.querySelector('i').style.animation = 'none';
  els.refreshBtn.querySelector('i').style.transform = 'rotate(360deg)';
  els.refreshBtn.querySelector('i').style.transition = 'transform 0.5s ease';
  setTimeout(() => {
    renderTable(); renderKPI();
    els.refreshBtn.querySelector('i').style.transform = '';
    showToast('success', 'Refreshed', 'Attendance data is up to date.');
  }, 600);
});

els.markAllPresentBtn.addEventListener('click', () => {
  const filtered = state.filtered;
  filtered.forEach(fe => {
    const emp = state.employees.find(e => e.id === fe.id);
    if (emp) { emp.status = 'present'; emp.checkIn = emp.checkIn || '09:00'; }
  });
  renderTable(); renderKPI();
  showToast('success', 'Bulk Update', `${filtered.length} employees marked as Present.`);
});

els.exportBtn.addEventListener('click', () => {
  exportCSV();
});

/* ── CSV EXPORT ──────────────────────────────────── */
function exportCSV() {
  const headers = ['Employee ID', 'Name', 'Department', 'Role', 'Status', 'Check-In', 'Check-Out'];
  const rows = state.filtered.map(e => [e.id, e.name, deptLabel(e.dept), e.role, e.status, e.checkIn || '—', e.checkOut || '—']);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `attendance_${els.datePicker.value || 'today'}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('success', 'Exported', 'Attendance CSV file downloaded.');
}

/* ── DRAWER ──────────────────────────────────────── */
function openDrawer(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  state.activeEmpId = empId;
  const [gFrom, gTo] = AVATAR_GRADIENTS[emp._gradIdx];

  /* Populate header */
  els.drawerAvatar.textContent = getInitials(emp.name);
  els.drawerAvatar.style.background = `linear-gradient(135deg,${gFrom},${gTo})`;
  els.drawerEmpName.textContent    = emp.name;
  els.drawerEmpRole.textContent    = emp.role;
  els.drawerDeptLabel.textContent  = deptLabel(emp.dept);

  /* Today stats */
  els.drawerScheduledIn.textContent  = fmtTime(emp.schedule[0]);
  els.drawerScheduledOut.textContent = fmtTime(emp.schedule[1]);
  els.drawerActualIn.textContent     = fmtTime(emp.checkIn);
  els.drawerActualOut.textContent    = fmtTime(emp.checkOut);

  /* Status radio */
  document.querySelectorAll('input[name="editStatus"]').forEach(r => { r.checked = r.value === emp.status; });
  /* Update option highlight */
  document.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('selected'));
  const selOpt = document.querySelector(`.opt-${emp.status}`);
  if (selOpt) selOpt.classList.add('selected');

  /* Times */
  els.editCheckIn.value  = emp.checkIn  || '';
  els.editCheckOut.value = emp.checkOut || '';
  els.editReason.value   = '';

  /* Timeline */
  renderTimeline(emp);

  /* Open */
  els.drawerOverlay.classList.add('open');
  els.editDrawer.classList.add('open');
  els.editDrawer.setAttribute('aria-hidden', 'false');
  els.drawerClose.focus();
  document.body.style.overflow = 'hidden';

  feather.replace({ 'stroke-width': 2 });
}

function closeDrawer() {
  els.drawerOverlay.classList.remove('open');
  els.editDrawer.classList.remove('open');
  els.editDrawer.setAttribute('aria-hidden', 'true');
  state.activeEmpId = null;
  document.body.style.overflow = '';
}

function renderTimeline(emp) {
  const history = getHistory(emp.id);
  const icons = { present: 'check', absent: 'x', late: 'clock', leave: 'briefcase' };
  els.drawerTimeline.innerHTML = history.map(h => `
    <div class="timeline-item">
      <div class="timeline-dot ${h.status}" aria-hidden="true">
        <i data-feather="${icons[h.status] || 'circle'}"></i>
      </div>
      <div class="timeline-body">
        <p class="timeline-date">${h.date}</p>
        <p class="timeline-status">${h.label}</p>
      </div>
    </div>
  `).join('');
}

/* Status option click to highlight */
document.querySelectorAll('.status-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
  });
});

/* Close drawer events */
els.drawerClose.addEventListener('click', closeDrawer);
els.drawerCancelBtn.addEventListener('click', closeDrawer);
els.drawerOverlay.addEventListener('click', closeDrawer);

/* Escape key closes drawer */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeDrawer(); closeStatusPopup(); }
});

/* Save from drawer */
els.drawerSaveBtn.addEventListener('click', () => {
  const emp = state.employees.find(e => e.id === state.activeEmpId);
  if (!emp) return;

  const selectedStatus = document.querySelector('input[name="editStatus"]:checked')?.value;
  if (selectedStatus) emp.status = selectedStatus;
  if (els.editCheckIn.value)  emp.checkIn  = els.editCheckIn.value;
  if (els.editCheckOut.value) emp.checkOut = els.editCheckOut.value;

  /* Button feedback animation */
  els.drawerSaveBtn.innerHTML = `<i data-feather="check" style="width:13px;height:13px;"></i> Saved!`;
  els.drawerSaveBtn.style.background = 'linear-gradient(135deg,#11998e,#38ef7d)';
  feather.replace({ 'stroke-width': 2 });

  setTimeout(() => {
    els.drawerSaveBtn.innerHTML = `<i data-feather="save" style="width:13px;height:13px;"></i> Save Changes`;
    els.drawerSaveBtn.style.background = '';
    feather.replace({ 'stroke-width': 2 });
    closeDrawer();
    renderTable();
    renderKPI();
    showToast('success', 'Changes Saved', `${emp.name}'s attendance updated successfully.`);
  }, 900);
});

/* ── TOAST ───────────────────────────────────────── */
const TOAST_ICONS = {
  success: 'check-circle',
  error:   'alert-circle',
  info:    'info',
};

function showToast(type = 'info', title, msg) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="toast-icon"><i data-feather="${TOAST_ICONS[type] || 'info'}"></i></div>
    <div class="toast-content">
      <p class="toast-title">${title}</p>
      ${msg ? `<p class="toast-msg">${msg}</p>` : ''}
    </div>
  `;
  els.toastContainer.appendChild(toast);
  feather.replace({ 'stroke-width': 2.2 });

  /* Auto remove */
  setTimeout(() => {
    toast.classList.add('exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3500);
}

/* ── HELPERS ─────────────────────────────────────── */
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

/* ── BOOT ────────────────────────────────────────── */
(function init() {
  /* Wait for DOM + Feather to be ready */
  setTimeout(() => {
    feather.replace({ 'stroke-width': 2 });
    renderKPI();
    renderTable();
    showToast('info', 'Dashboard Ready', 'Attendance data loaded for today.');
  }, 600); /* small delay to let skeleton shimmer show briefly */
})();
