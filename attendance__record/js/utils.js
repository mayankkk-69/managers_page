/* ======================================================
   JS: utils.js
   Pure helper functions — formatting, calculations
   and small DOM utilities. No side-effects.
   ====================================================== */

'use strict';

/**
 * Get initials from a full name (max 2 chars).
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Format a HH:MM 24-hour time string into 12-hour AM/PM.
 * Returns '—' if the value is empty or null.
 * @param {string} t  e.g. "14:30"
 * @returns {string}  e.g. "2:30 PM"
 */
function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Calculate hours worked between two HH:MM strings.
 * Returns an object with raw minutes, a display label and
 * a percentage (relative to a 9-hour working day).
 * Returns null if either time is missing or the result is negative.
 * @param {string} inT   e.g. "09:00"
 * @param {string} outT  e.g. "18:00"
 * @returns {{ raw: number, label: string, pct: number }|null}
 */
function calcHours(inT, outT) {
  if (!inT || !outT) return null;
  const [ih, im] = inT.split(':').map(Number);
  const [oh, om] = outT.split(':').map(Number);
  const mins = (oh * 60 + om) - (ih * 60 + im);
  if (mins <= 0) return null;
  const hrs = Math.floor(mins / 60);
  const mn  = mins % 60;
  return {
    raw:   mins,
    label: `${hrs}h ${mn}m`,
    pct:   Math.min((mins / 540) * 100, 100), // 540 min = 9 h = 100 %
  };
}

/**
 * Map a department key to a readable label.
 * @param {string} key  e.g. "it"
 * @returns {string}    e.g. "IT"
 */
function deptLabel(key) {
  const MAP = {
    it:      'IT',
    sales:   'Sales',
    hr:      'HR',
    finance: 'Finance',
    ops:     'Operations',
  };
  return MAP[key] || key;
}

/**
 * Capitalise the first letter of a string.
 * @param {string} s
 * @returns {string}
 */
function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/**
 * Animate an element's inner text counter from its current
 * value to a target number over a given duration (ms).
 * @param {HTMLElement} el
 * @param {number}      target
 * @param {number}      [duration=800]
 */
function animateNumber(el, target, duration = 800) {
  const start     = parseInt(el.textContent) || 0;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * p);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/**
 * Generate a 3-day attendance history for an employee
 * (mock — derived deterministically from the employee ID).
 * @param {string} empId  e.g. "EMP003"
 * @returns {Array<{ date: string, status: string, label: string }>}
 */
function getHistory(empId) {
  const statuses = ['present', 'present', 'late', 'absent', 'leave'];
  const labels   = {
    present: 'Present — 9:00 AM to 6:00 PM',
    late:    'Late Arrival — 10:17 AM',
    absent:  'Absent — No record',
    leave:   'On Leave — Approved',
  };
  const now = new Date();
  return [-3, -2, -1].map(d => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const s = statuses[Math.abs(empId.charCodeAt(3) + d) % statuses.length];
    return {
      date:   date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      status: s,
      label:  labels[s],
    };
  }).reverse();
}

/**
 * Shorthand for document.getElementById.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $id(id) {
  return document.getElementById(id);
}
