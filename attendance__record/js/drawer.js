/* ======================================================
   JS: drawer.js
   Manager's Attendance Override Panel.
   - Opens when a table row is clicked
   - Populates punch times and status
   - Saves changes + logs an audit entry (manager ID + timestamp + reason)
   ====================================================== */

'use strict';

/* ── In-memory Audit Log (keyed by employee ID) ──────
   In production this will be submitted to a PHP API
   which writes to the DB audit table.
   ───────────────────────────────────────────────────── */
const auditLog = {}; // { 'EMP001': [ { time, manager, oldIn, newIn, ... } ] }

/* ── Open Drawer ──────────────────────────────────── */
/**
 * Open the edit drawer for a specific employee.
 * Populates all fields with that employee's current data.
 * @param {string} empId  e.g. "EMP003"
 */
function openDrawer(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  state.activeEmpId = empId;
  const [gFrom, gTo] = AVATAR_GRADIENTS[emp._gradIdx];

  /* Profile header */
  const avatar = $id('drawerAvatar');
  if (avatar) {
    avatar.textContent      = getInitials(emp.name);
    avatar.style.background = `linear-gradient(135deg,${gFrom},${gTo})`;
  }
  const nameEl = $id('drawerEmpName');   if (nameEl)  nameEl.textContent  = emp.name;
  const roleEl = $id('drawerEmpRole');   if (roleEl)  roleEl.textContent  = emp.role;
  const deptEl = $id('drawerDeptLabel'); if (deptEl)  deptEl.textContent  = deptLabel(emp.dept);

  /* Today's punch overview (read-only) */
  const si = $id('drawerScheduledIn');  if (si)  si.textContent  = fmtTime(emp.schedule[0]);
  const so = $id('drawerScheduledOut'); if (so)  so.textContent  = fmtTime(emp.schedule[1]);
  const ai = $id('drawerActualIn');
  const ao = $id('drawerActualOut');
  if (ai) ai.textContent = emp.checkIn  ? fmtTime(emp.checkIn)  : 'Not punched in';
  if (ao) ao.textContent = emp.checkOut ? fmtTime(emp.checkOut) : 'Not punched out';

  /* Colour-code "not punched" text */
  if (ai) ai.className = emp.checkIn  ? 'stat-item-value' : 'stat-item-value absent-val';
  if (ao) ao.className = emp.checkOut ? 'stat-item-value' : 'stat-item-value absent-val';

  /* Status radios */
  document.querySelectorAll('input[name="editStatus"]').forEach(r => {
    r.checked = r.value === emp.status;
  });
  document.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('selected'));
  const selOpt = document.querySelector(`.opt-${emp.status}`);
  if (selOpt) selOpt.classList.add('selected');

  /* Time override inputs — pre-fill with current values */
  const ci = $id('editCheckIn');  if (ci)  ci.value  = emp.checkIn  || '';
  const co = $id('editCheckOut'); if (co)  co.value  = emp.checkOut || '';

  /* Clear remarks */
  const reason = $id('editReason'); if (reason) reason.value = '';

  /* History timeline */
  renderTimeline(emp);

  /* Audit log for this employee */
  renderAuditLog(empId);

  /* Show overlay and slide panel */
  const overlay = $id('drawerOverlay');
  const drawer  = $id('editDrawer');
  if (overlay) overlay.classList.add('open');
  if (drawer)  {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }

  document.body.style.overflow = 'hidden';

  /* Focus the close button for accessibility */
  const closeBtn = $id('drawerClose');
  if (closeBtn) setTimeout(() => closeBtn.focus(), 50);

  feather.replace({ 'stroke-width': 2 });
}

/* ── Close Drawer ─────────────────────────────────── */
function closeDrawer() {
  const overlay = $id('drawerOverlay');
  const drawer  = $id('editDrawer');
  if (overlay) overlay.classList.remove('open');
  if (drawer)  {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  state.activeEmpId        = null;
  document.body.style.overflow = '';
}

/* ── Timeline Renderer ────────────────────────────── */
function renderTimeline(emp) {
  const timeline = $id('drawerTimeline');
  if (!timeline) return;

  const history = getHistory(emp.id);
  const iconMap = { present: 'check', absent: 'x', late: 'clock', leave: 'briefcase' };

  timeline.innerHTML = history.map(h => `
    <div class="timeline-item">
      <div class="timeline-dot ${h.status}" aria-hidden="true">
        <i data-feather="${iconMap[h.status] || 'circle'}"></i>
      </div>
      <div class="timeline-body">
        <p class="timeline-date">${h.date}</p>
        <p class="timeline-status">${h.label}</p>
      </div>
    </div>
  `).join('');
}

/* ── Audit Log Renderer ───────────────────────────── */
/**
 * Display previously recorded audit entries for this employee.
 * @param {string} empId
 */
function renderAuditLog(empId) {
  const container = $id('drawerAuditLog');
  if (!container) return;

  const entries = auditLog[empId] || [];

  if (entries.length === 0) {
    container.innerHTML = `<p class="audit-empty">No manual changes recorded for today.</p>`;
    return;
  }

  container.innerHTML = entries.map(entry => `
    <div class="audit-entry">
      <div class="audit-entry-header">
        <span class="audit-manager">
          <i data-feather="user" style="width:11px;height:11px;"></i>
          ${entry.manager}
        </span>
        <span class="audit-time">${entry.time}</span>
      </div>
      <div class="audit-entry-detail">
        ${entry.changes.map(c => `<p>${c}</p>`).join('')}
      </div>
      ${entry.reason ? `<p class="audit-reason">"${entry.reason}"</p>` : ''}
    </div>
  `).join('');

  feather.replace({ 'stroke-width': 2 });
}

/* ── Bind Drawer Events ───────────────────────────── */
function initDrawer() {
  /* Status option click to highlight the card */
  document.querySelectorAll('.status-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  /* Close triggers */
  const drawerClose = $id('drawerClose');
  const cancelBtn   = $id('drawerCancelBtn');
  const overlay     = $id('drawerOverlay');

  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (cancelBtn)   cancelBtn.addEventListener('click',   closeDrawer);
  if (overlay)     overlay.addEventListener('click',     closeDrawer);

  /* Escape key closes drawer */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });

  /* ── Save & Log ─────────────────────────────── */
  const saveBtn = $id('drawerSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const emp = state.employees.find(e => e.id === state.activeEmpId);
      if (!emp) return;

      /* Read form values */
      const selectedStatusEl = document.querySelector('input[name="editStatus"]:checked');
      const ci       = $id('editCheckIn');
      const co       = $id('editCheckOut');
      const reasonEl = $id('editReason');

      const newStatus  = selectedStatusEl ? selectedStatusEl.value : emp.status;
      const newCheckIn = ci  && ci.value  ? ci.value  : emp.checkIn;
      const newCheckOut= co  && co.value  ? co.value  : emp.checkOut;
      const reason     = reasonEl ? reasonEl.value.trim() : '';

      /* Require a reason before saving */
      if (!reason) {
        reasonEl.style.borderColor = 'var(--absent-dot)';
        reasonEl.focus();
        showToast('error', 'Reason Required', 'Please enter a reason before saving to the audit log.');
        return;
      }
      reasonEl.style.borderColor = '';

      /* Build change summary */
      const changes = [];
      if (newStatus !== emp.status)     changes.push(`Status: <strong>${cap(emp.status)}</strong> → <strong>${cap(newStatus)}</strong>`);
      if (newCheckIn !== emp.checkIn)   changes.push(`Punch In: <strong>${fmtTime(emp.checkIn)}</strong> → <strong>${fmtTime(newCheckIn)}</strong>`);
      if (newCheckOut !== emp.checkOut) changes.push(`Punch Out: <strong>${fmtTime(emp.checkOut)}</strong> → <strong>${fmtTime(newCheckOut)}</strong>`);

      if (changes.length === 0) {
        showToast('info', 'No Changes', 'No values were modified.');
        closeDrawer();
        return;
      }

      /* Apply changes to working state */
      emp.status   = newStatus;
      emp.checkIn  = newCheckIn;
      emp.checkOut = newCheckOut;

      /* Record audit entry (in-memory; replace with API call when DB ready) */
      if (!auditLog[emp.id]) auditLog[emp.id] = [];
      auditLog[emp.id].unshift({
        time:    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        manager: 'Manager (RK)', // Replace with session manager name from PHP
        changes,
        reason,
      });

      /* Button success feedback */
      saveBtn.innerHTML = `<i data-feather="check" style="width:13px;height:13px;"></i> Saved!`;
      saveBtn.style.background = 'linear-gradient(135deg,#11998e,#38ef7d)';
      feather.replace({ 'stroke-width': 2 });

      setTimeout(() => {
        saveBtn.innerHTML       = `<i data-feather="save" style="width:13px;height:13px;"></i> Save &amp; Log Change`;
        saveBtn.style.background = '';
        feather.replace({ 'stroke-width': 2 });
        closeDrawer();
        renderTable();
        renderKPI();
        showToast('success', 'Attendance Corrected', `${emp.name}'s record updated and change logged.`);
      }, 900);
    });
  }
}
