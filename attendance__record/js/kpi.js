/* ======================================================
   JS: kpi.js
   KPI metric cards rendering logic.
   Reads from state.filtered, updates card values,
   trend labels and progress bar widths.
   ====================================================== */

'use strict';

const KPI_MODAL_META = {
  all:     { title: 'All Selected Employees', chip: 'Team Overview',   timeHeader: 'Shift Status' },
  present: { title: 'Present Employees',      chip: 'Present Today',   timeHeader: 'Punch In' },
  absent:  { title: 'Absent Employees',       chip: 'Needs Attention', timeHeader: 'Attendance' },
  late:    { title: 'Late Arrivals',          chip: 'Late Today',      timeHeader: 'Punch In' },
  leave:   { title: 'Employees On Leave',     chip: 'Approved Leave',  timeHeader: 'Leave Status' },
};

/**
 * Tally counts for each attendance status.
 * @param {Array} list - employee array to count
 * @returns {{ total, present, absent, late, leave }}
 */
function computeKPI(list) {
  return {
    total:   list.length,
    present: list.filter(e => e.status === 'present').length,
    absent:  list.filter(e => e.status === 'absent').length,
    late:    list.filter(e => e.status === 'late').length,
    leave:   list.filter(e => e.status === 'leave').length,
  };
}

/**
 * (Re-)render all 5 KPI cards with latest employee data.
 * Animates counter numbers, updates trend pills and
 * triggers progress bar width transitions.
 */
function renderKPI() {
  const kpi = computeKPI(state.filtered);

  animateNumber($id('kpiTotalVal'),   kpi.total);
  animateNumber($id('kpiPresentVal'), kpi.present);
  animateNumber($id('kpiAbsentVal'),  kpi.absent);
  animateNumber($id('kpiLateVal'),    kpi.late);
  animateNumber($id('kpiLeaveVal'),   kpi.leave);

  const rate = kpi.total > 0 ? Math.round((kpi.present / kpi.total) * 100) : 0;
  $id('kpiTotalTrend').textContent   = `${kpi.total} registered employees`;
  $id('kpiPresentTrend').textContent = `Up ${rate}% attendance rate`;
  $id('kpiAbsentTrend').textContent  = kpi.absent > 0 ? `Up ${kpi.absent} absent today` : 'No absences';
  $id('kpiLateTrend').textContent    = kpi.late > 0 ? `${kpi.late} late arrivals` : 'None late';
  $id('kpiLeaveTrend').textContent   = `${kpi.leave} on approved leave`;

  bindKpiCardClick('kpiTotal', 'all');
  bindKpiCardClick('kpiPresent', 'present');
  bindKpiCardClick('kpiAbsent', 'absent');
  bindKpiCardClick('kpiLate', 'late');
  bindKpiCardClick('kpiLeave', 'leave');

  setTimeout(() => {
    if (kpi.total === 0) return;
    $id('kpiTotalBar').style.width   = '100%';
    $id('kpiPresentBar').style.width = `${(kpi.present / kpi.total) * 100}%`;
    $id('kpiAbsentBar').style.width  = `${(kpi.absent / kpi.total) * 100}%`;
    $id('kpiLateBar').style.width    = `${(kpi.late / kpi.total) * 100}%`;
    $id('kpiLeaveBar').style.width   = `${(kpi.leave / kpi.total) * 100}%`;
  }, 150);
}

/**
 * Click handler to drill-down into specific KPI categories.
 */
function bindKpiCardClick(id, type) {
  const el = $id(id);
  if (!el || el.dataset.kpiBound === 'true') return;

  el.dataset.kpiBound = 'true';
  el.addEventListener('click', () => {
    openKpiModal(type);
  });
}

function getKpiModalTimeText(emp) {
  if (emp.status === 'absent') return 'Not Punched In';
  if (emp.status === 'leave') return 'On Leave';
  return fmtTime(emp.checkIn);
}

function buildKpiModalRow(emp) {
  const tr = document.createElement('tr');
  const [from, to] = AVATAR_GRADIENTS[emp._gradIdx % AVATAR_GRADIENTS.length];

  tr.innerHTML = `
    <td>
      <div class="kpi-modal-employee">
        <span class="kpi-modal-avatar" style="background:linear-gradient(135deg, ${from}, ${to});">
          ${getInitials(emp.name)}
        </span>
        <span class="kpi-modal-employee-text">
          <span class="kpi-modal-employee-name">${emp.name}</span>
          <span class="kpi-modal-employee-role">${emp.role}</span>
        </span>
      </div>
    </td>
    <td>${emp.id}</td>
    <td><span class="kpi-modal-dept">${deptLabel(emp.dept)}</span></td>
    <td class="time-cell">${getKpiModalTimeText(emp)}</td>
  `;

  return tr;
}

/**
 * Opens the KPI drill down modal and populates data.
 */
function openKpiModal(type) {
  const overlay = $id('kpiOverlay');
  const modal = $id('kpiModal');
  const body = $id('kpiModalBody');
  const empty = $id('kpiModalEmpty');
  const title = $id('kpiModalTitle');
  const subtitle = $id('kpiModalSubtitle');
  const typeChip = $id('kpiModalTypeChip');
  const countChip = $id('kpiModalCountChip');
  const timeHeader = $id('kpiModalTimeHeader');

  if (!overlay || !modal || !body || !empty || !title || !subtitle) return;

  let list = [];
  if (type === 'all') list = state.filtered;
  else list = state.filtered.filter(emp => emp.status === type);

  const meta = KPI_MODAL_META[type] || KPI_MODAL_META.all;
  title.textContent = meta.title;
  subtitle.textContent = `Showing ${list.length} record(s)`;
  if (typeChip) typeChip.textContent = meta.chip;
  if (countChip) countChip.textContent = `${list.length} ${list.length === 1 ? 'record' : 'records'}`;
  if (timeHeader) timeHeader.textContent = meta.timeHeader;

  body.innerHTML = '';
  if (list.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    list.forEach(emp => body.appendChild(buildKpiModalRow(emp)));
  }

  // Render the mini KPI cards for easy navigation
  renderKpiModalCards(type);

  overlay.setAttribute('aria-hidden', 'false');
  modal.setAttribute('aria-hidden', 'false');
  overlay.classList.add('open');
  modal.classList.add('open');
  modal.focus();

  if (window.feather) feather.replace();
}

/* Modal Close Handlers */
document.addEventListener('DOMContentLoaded', () => {
  const overlay = $id('kpiOverlay');
  const modal = $id('kpiModal');
  const closeBtn = $id('kpiModalClose');

  function closeModal() {
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
      closeModal();
    }
  });
});

/**
 * Renders the mini KPI cards inside the modal to allow switching tabs
 */
function renderKpiModalCards(activeType) {
  const container = $id('kpiModalCards');
  if (!container) return;

  const kpi = computeKPI(state.filtered);
  
  const cardsData = [
    { type: 'all', label: 'All', count: kpi.total, icon: 'users', color: '#0f766e' },
    { type: 'present', label: 'Present', count: kpi.present, icon: 'check-circle', color: '#059669' },
    { type: 'absent', label: 'Absent', count: kpi.absent, icon: 'x-circle', color: '#e11d48' },
    { type: 'late', label: 'Late', count: kpi.late, icon: 'clock', color: '#d97706' },
    { type: 'leave', label: 'On Leave', count: kpi.leave, icon: 'calendar', color: '#4f46e5' }
  ];

  container.innerHTML = cardsData.map(c => `
    <div class="kpi-modal-card ${c.type === activeType ? 'active' : ''}" onclick="openKpiModal('${c.type}')" style="--card-color: ${c.color}">
      <div class="kpi-modal-card-icon"><i data-feather="${c.icon}"></i></div>
      <div class="kpi-modal-card-info">
        <span class="kpi-modal-card-val">${c.count}</span>
        <span class="kpi-modal-card-label">${c.label}</span>
      </div>
    </div>
  `).join('');
  
  if (window.feather) feather.replace();
}
