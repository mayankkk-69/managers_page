/* ======================================================
   JS: toast.js
   Toast notification system.
   Exposes: showToast(type, title, msg)
   ====================================================== */

'use strict';

/* Icon name per toast type (Feather Icons) */
const TOAST_ICONS = {
  success: 'check-circle',
  error:   'alert-circle',
  info:    'info',
};

/**
 * Display a toast notification.
 * @param {'success'|'error'|'info'} type
 * @param {string} title  - Bold heading text
 * @param {string} [msg]  - Optional sub-text
 */
function showToast(type = 'info', title, msg) {
  const container = $id('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');

  toast.innerHTML = `
    <div class="toast-icon">
      <i data-feather="${TOAST_ICONS[type] || 'info'}"></i>
    </div>
    <div class="toast-content">
      <p class="toast-title">${title}</p>
      ${msg ? `<p class="toast-msg">${msg}</p>` : ''}
    </div>
  `;

  container.appendChild(toast);
  feather.replace({ 'stroke-width': 2.2 });

  /* Auto-dismiss after 3.5 s */
  setTimeout(() => {
    toast.classList.add('exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3500);
}
