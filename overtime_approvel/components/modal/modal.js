// components/modal/modal.js

/* ─────────────────────────────────────────────────────
   Modal state
   ───────────────────────────────────────────────────── */
let backdrop = null;

function getInitials(name) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function badgeHTML(status) {
    const cls = status ? status.toLowerCase() : '';
    return `<span class="modal-badge ${cls}">${status || '—'}</span>`;
}
        
/* ─────────────────────────────────────────────────────
   Build modal HTML from a data row
   ───────────────────────────────────────────────────── */
function buildModal(row) {
    const initials     = getInitials(row.employee);
    const dateFormatted = formatDate(row.date);

    // Helper: render a label/value pair
    const field = (label, value, cls = '') =>
        `<div class="modal-row">
            <span class="modal-label">${label}</span>
            <span class="modal-value ${cls}">${value ?? '—'}</span>
         </div>`;

    // OT submitted value
    const submittedOtDisplay = row.submittedOt !== 'N/A'
        ? `<span class="modal-ot-big">${row.submittedOt}h</span>`
        : `<span style="color:#cbd5e1">—</span>`;

    return `
    <div class="modal-backdrop" id="detail-modal" role="dialog" aria-modal="true">
        <div class="modal-dialog">

            <!-- ── HEADER ── -->
            <div class="modal-header">
                <div class="modal-header-left">
                    <div class="modal-avatar">${initials}</div>
                    <div class="modal-title-group">
                        <h3>${row.employee}</h3>
                        <p>${row.employeeId ?? ''} &nbsp;·&nbsp; ${row.role ?? ''}</p>
                    </div>
                </div>
                <button class="modal-close" id="modal-close-btn" title="Close" aria-label="Close">
                    <i class="ph ph-x"></i>
                </button>
            </div>

            <!-- ── BODY ── -->
            <div class="modal-body">

                <!-- Row 1: Employee + Date -->
                <div class="modal-grid-2">

                    <div class="modal-section">
                        <div class="modal-section-title">
                            <i class="ph ph-user-circle"></i> Employee Information
                        </div>
                        ${field('Name', row.employee)}
                        ${field('Employee ID', row.employeeId)}
                        ${field('Role', row.role)}
                    </div>

                    <div class="modal-section">
                        <div class="modal-section-title">
                            <i class="ph ph-calendar-blank"></i> Date Information
                        </div>
                        ${field('Date', dateFormatted)}
                        ${field('Submitted', row.submittedAt ?? '—')}
                        ${field('Actioned', row.actionedAt ?? '—')}
                    </div>

                </div>

                <!-- Row 2: Shift + OT -->
                <div class="modal-grid-2">

                    <div class="modal-section">
                        <div class="modal-section-title">
                            <i class="ph ph-clock"></i> Shift Information
                        </div>
                        ${field('Shift', row.shift)}
                        ${field('Start Time', row.startTime)}
                        ${field('End Time', row.endTime)}
                    </div>

                    <div class="modal-section">
                        <div class="modal-section-title">
                            <i class="ph ph-timer"></i> Overtime Information
                        </div>
                        ${field('Calculated Hours', `<span class="modal-ot-big">${row.otHours}h</span>`)}
                        <div class="modal-row">
                            <span class="modal-label">Approved OT</span>
                            <span class="modal-value">${submittedOtDisplay}</span>
                        </div>
                        <div class="modal-row">
                            <span class="modal-label">Status</span>
                            <span class="modal-value">${badgeHTML(row.status)}</span>
                        </div>
                    </div>

                </div>

                <!-- Punch Info — full width -->
                <div class="modal-section">
                    <div class="modal-section-title">
                        <i class="ph ph-fingerprint"></i> Punch Information
                    </div>
                    <div class="modal-grid-2">
                        <div>${field('Punch In', row.punchIn ?? '—')}</div>
                        <div>${field('Punch Out', row.punchOut)}</div>
                    </div>
                </div>

                <!-- Work Report -->
                <div class="modal-text-section">
                    <div class="modal-section-title">
                        <i class="ph ph-file-text"></i> Work Report
                    </div>
                    ${row.workReport && !row.workReport.startsWith('No work report')
                        ? `<p class="modal-text-body">${row.workReport}</p>`
                        : `<p class="modal-text-empty">No work report submitted for this date.</p>`
                    }
                </div>

                <!-- Overtime Description -->
                <div class="modal-text-section">
                    <div class="modal-section-title">
                        <i class="ph ph-note-pencil"></i> Overtime Description
                    </div>
                    ${row.otDescription
                        ? `<p class="modal-text-body">${row.otDescription}</p>`
                        : `<p class="modal-text-empty">No description provided.</p>`
                    }
                </div>

                <!-- Overtime Reason -->
                <div class="modal-text-section">
                    <div class="modal-section-title">
                        <i class="ph ph-chat-circle-text"></i> Overtime Reason
                    </div>
                    ${row.otReason
                        ? `<p class="modal-text-body">${row.otReason}</p>`
                        : `<p class="modal-text-empty">No reason provided.</p>`
                    }
                </div>

                <!-- Manager Comments -->
                <div class="modal-text-section">
                    <div class="modal-section-title">
                        <i class="ph ph-chats"></i> Manager Comments
                    </div>
                    ${row.managerComment
                        ? `<p class="modal-text-body">${row.managerComment}</p>`
                        : `<p class="modal-text-empty">No comments yet.</p>`
                    }
                </div>

            </div><!-- /modal-body -->

            <!-- ── FOOTER ── -->
            <div class="modal-footer">
                <button class="modal-btn modal-btn-close" id="modal-footer-close">
                    <i class="ph ph-x-circle"></i> Close
                </button>
                <button class="modal-btn modal-btn-reject" id="modal-footer-reject">
                    <i class="ph ph-x"></i> Reject
                </button>
                <button class="modal-btn modal-btn-approve" id="modal-footer-approve">
                    <i class="ph ph-check"></i> Approve
                </button>
            </div>

        </div><!-- /modal-dialog -->
    </div><!-- /modal-backdrop -->`;
}

/* ─────────────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────────────── */
export function openDetailModal(row) {
    // Remove existing modal if any
    closeDetailModal();

    // Inject into body
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildModal(row);
    backdrop = wrapper.firstElementChild;
    document.body.appendChild(backdrop);

    // Trigger open animation on next frame
    requestAnimationFrame(() => backdrop.classList.add('is-open'));

    // Wire close triggers
    const closeFn = () => closeDetailModal();
    document.getElementById('modal-close-btn')?.addEventListener('click', closeFn);
    document.getElementById('modal-footer-close')?.addEventListener('click', closeFn);

    // Clicking the backdrop outside the dialog also closes
    backdrop.addEventListener('click', e => {
        if (e.target === backdrop) closeFn();
    });

    // Escape key
    const onKey = e => { if (e.key === 'Escape') closeFn(); };
    document.addEventListener('keydown', onKey, { once: true });

    // Reject / Approve stubs (wire real logic here later)
    document.getElementById('modal-footer-reject')?.addEventListener('click', () => {
        console.info('Reject clicked for', row.employee, row.date);
        closeFn();
    });
    document.getElementById('modal-footer-approve')?.addEventListener('click', () => {
        console.info('Approve clicked for', row.employee, row.date);
        closeFn();
    });
}

export function closeDetailModal() {
    if (!backdrop) return;
    const el = backdrop;   // capture local ref before nulling module state
    backdrop = null;       // clear immediately so re-open calls work
    el.classList.remove('is-open');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
}

/* ─────────────────────────────────────────────────────
   EDIT MODAL
   ───────────────────────────────────────────────────── */
function buildEditModal(row) {
    const currentOt = row.submittedOt !== 'N/A' ? parseFloat(row.submittedOt) : parseFloat(row.otHours) || 0;
    const initials = getInitials(row.employee);
    
    return `
    <div class="modal-backdrop" id="edit-modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-dialog edit-modal-dialog">

            <!-- ── HEADER ── -->
            <div class="modal-header edit-header">
                <div class="modal-header-left">
                    <div class="edit-header-icon">
                        <i class="ph-bold ph-pencil-simple"></i>
                    </div>
                    <div class="modal-title-group">
                        <h3>Edit Overtime Hours</h3>
                        <p>${row.employee} &nbsp;·&nbsp; Current: ${currentOt}h</p>
                    </div>
                </div>
                <button class="modal-close" id="edit-close-x" title="Close" aria-label="Close">
                    <i class="ph ph-x"></i>
                </button>
            </div>

            <!-- ── BODY ── -->
            <div class="modal-body">
                <div class="stepper-wrapper">
                    <span class="stepper-label">New Overtime Hours</span>
                    
                    <div class="stepper-controls">
                        <button class="stepper-btn" id="stepper-minus" disabled title="Decrease by 0.5h">
                            <i class="ph-bold ph-minus"></i>
                        </button>
                        <div class="stepper-value" id="stepper-val">
                            ${currentOt.toFixed(1)}<span class="stepper-unit">h</span>
                        </div>
                        <button class="stepper-btn" id="stepper-plus" title="Increase by 0.5h">
                            <i class="ph-bold ph-plus"></i>
                        </button>
                    </div>

                    <div class="stepper-progress-bar">
                        <div class="stepper-progress-fill" id="stepper-progress" style="width: 30%;"></div>
                    </div>
                    
                    <span class="stepper-note">
                        <i class="ph ph-info"></i>
                        Adjust in 0.5h steps &mdash; minimum is ${currentOt}h (original submission)
                    </span>
                </div>
            </div>

            <!-- ── FOOTER ── -->
            <div class="modal-footer">
                <button class="modal-btn modal-btn-cancel" id="edit-cancel-btn">Cancel</button>
                <button class="modal-btn modal-btn-save" id="edit-save-btn">
                    <i class="ph-bold ph-check"></i> Save Changes
                </button>
            </div>

        </div>
    </div>`;
}

export function openEditModal(row, onSave) {
    closeDetailModal();
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildEditModal(row);
    backdrop = wrapper.firstElementChild;
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => backdrop.classList.add('is-open'));

    const initialVal = row.submittedOt !== 'N/A' ? parseFloat(row.submittedOt) : parseFloat(row.otHours) || 0;
    let currentVal = initialVal;
    const maxVal = initialVal + 6; // max 6h above initial

    const btnMinus   = document.getElementById('stepper-minus');
    const btnPlus    = document.getElementById('stepper-plus');
    const valDisp    = document.getElementById('stepper-val');
    const progressEl = document.getElementById('stepper-progress');

    function updateState() {
        // Update display (keep unit span)
        valDisp.innerHTML = `${currentVal.toFixed(1)}<span class="stepper-unit">h</span>`;
        btnMinus.disabled = (currentVal <= initialVal);
        // Update progress bar
        const pct = Math.min(((currentVal - initialVal) / 6) * 100, 100);
        if (progressEl) progressEl.style.width = (30 + pct * 0.7) + '%';
    }

    btnMinus.addEventListener('click', () => {
        if (currentVal > initialVal) { currentVal -= 0.5; updateState(); }
    });

    btnPlus.addEventListener('click', () => {
        currentVal += 0.5; updateState();
    });

    const closeFn = () => closeDetailModal();
    document.getElementById('edit-close-x')?.addEventListener('click', closeFn);
    document.getElementById('edit-cancel-btn')?.addEventListener('click', closeFn);

    backdrop.addEventListener('click', e => {
        if (e.target === backdrop) closeFn();
    });

    const onKey = e => { if (e.key === 'Escape') closeFn(); };
    document.addEventListener('keydown', onKey);

    document.getElementById('edit-save-btn')?.addEventListener('click', () => {
        if (onSave) onSave(currentVal.toFixed(1));
        closeFn();
        document.removeEventListener('keydown', onKey);
    });
}

/* ─────────────────────────────────────────────────────
   CONFIRM MODALS (Approve / Reject)
   ───────────────────────────────────────────────────── */
function buildConfirmModal(type, row) {
    const isApprove = type === 'approve';
    
    // ============================================
    // REJECT MODAL
    // ============================================
    if (!isApprove) {
        return `
        <div class="modal-backdrop" id="confirm-modal-backdrop" role="dialog" aria-modal="true">
            <div class="modal-dialog prompt-dialog reject-prompt-dialog">
                
                <div class="prompt-header">
                    <div class="prompt-header-title">
                        <div class="prompt-icon reject-icon">
                            <i class="ph-bold ph-x"></i>
                        </div>
                        <h3>Reject Overtime Request</h3>
                    </div>
                    <button class="modal-close" id="confirm-cancel-x">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>

                <div class="prompt-body">
                    <label class="prompt-label">Reason for Rejection (Minimum 10 words required)</label>
                    <textarea class="prompt-textarea" id="reject-reason" placeholder="Please provide a detailed reason for rejecting this overtime request..."></textarea>
                    <div class="prompt-word-count">Words: <span id="word-count-val">0</span></div>

                    <div class="prompt-checkboxes">
                        <label class="prompt-checkbox">
                            <input type="checkbox" id="chk-incorrect">
                            <span>I confirm that the overtime hours are incorrect</span>
                        </label>
                        <label class="prompt-checkbox">
                            <input type="checkbox" id="chk-policy">
                            <span>I confirm that this request does not comply with company policy</span>
                        </label>
                    </div>
                </div>

                <div class="prompt-footer">
                    <button class="modal-btn modal-btn-cancel" id="confirm-cancel-btn">Cancel</button>
                    <button class="modal-btn prompt-btn-reject" id="confirm-action-btn">Reject Request</button>
                </div>

            </div>
        </div>`;
    }

    // ============================================
    // ACCEPT MODAL
    // ============================================
    const hours = row.submittedOt !== 'N/A' ? row.submittedOt : row.otHours;
    
    // Reusing the badge HTML for Status
    let badgeCls = 'submitted';
    if (row.status === 'Approved') badgeCls = 'approved';
    if (row.status === 'Rejected') badgeCls = 'rejected';

    return `
    <div class="modal-backdrop" id="confirm-modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-dialog prompt-dialog accept-prompt-dialog">
            
            <div class="prompt-header">
                <div class="prompt-header-title">
                    <div class="prompt-icon accept-icon">
                        <i class="ph-bold ph-check"></i>
                    </div>
                    <h3>Accept Overtime Request</h3>
                </div>
                <button class="modal-close" id="confirm-cancel-x">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>

            <div class="prompt-body accept-body scrollable-body">
                
                <div class="accept-grid">
                    <!-- Employee Info -->
                    <div class="accept-card">
                        <div class="accept-card-title"><i class="ph-fill ph-user"></i> Employee Information</div>
                        <div class="accept-row"><span>Name:</span> <strong>${row.employee}</strong></div>
                        <div class="accept-row"><span>Employee ID:</span> <strong>${row.employeeId || 'DT002'}</strong></div>
                    </div>

                    <!-- Request Info -->
                    <div class="accept-card">
                        <div class="accept-card-title"><i class="ph-fill ph-file-text"></i> Request Information</div>
                        <div class="accept-row"><span>Request ID:</span> <strong>${row.requestId || '38'}</strong></div>
                        <div class="accept-row"><span>Date:</span> <strong>${row.date || '—'}</strong></div>
                        <div class="accept-row"><span>Status:</span> <span class="badge ${badgeCls}">${row.status || 'Submitted'}</span></div>
                    </div>

                    <!-- Time Info -->
                    <div class="accept-card">
                        <div class="accept-card-title"><i class="ph-fill ph-clock"></i> Time Information</div>
                        <div class="accept-row"><span>Shift End Time:</span> <strong>${row.endTime || '5:30 PM'}</strong></div>
                        <div class="accept-row"><span>Punch Out Time:</span> <strong>${row.punchOut || '8:00 PM'}</strong></div>
                        <div class="accept-row"><span>Submitted OT Hours:</span> 
                            <strong>${hours} hours <i class="ph-bold ph-pencil-simple text-green edit-inline"></i></strong>
                        </div>
                    </div>

                    <!-- Timestamps -->
                    <div class="accept-card">
                        <div class="accept-card-title"><i class="ph-fill ph-calendar-blank"></i> Timestamps</div>
                        <div class="accept-row"><span>Submitted At:</span> <strong>${row.submittedAt || 'Mar 25, 2026 5:25 PM'}</strong></div>
                        <div class="accept-row"><span>Actioned At:</span> <strong>${row.actionedAt || '—'}</strong></div>
                        <div class="accept-row"><span>Updated At:</span> <strong>${row.updatedAt || '—'}</strong></div>
                    </div>
                </div>

                <!-- Work Report full width -->
                <div class="accept-card full-width">
                    <div class="accept-card-title"><i class="ph-fill ph-file-text"></i> Work Report</div>
                    <div class="accept-text">${row.workReport || 'No work report submitted'}</div>
                </div>

            </div>

            <div class="prompt-footer">
                <button class="modal-btn modal-btn-cancel" id="confirm-cancel-btn">Edit</button>
                <button class="modal-btn prompt-btn-accept" id="confirm-action-btn">Accept Request</button>
            </div>

        </div>
    </div>`;
}

export function openConfirmModal(type, row, onConfirm) {
    closeDetailModal();
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildConfirmModal(type, row);
    backdrop = wrapper.firstElementChild;
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => backdrop.classList.add('is-open'));

    const closeFn = () => closeDetailModal();
    
    document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeFn);
    document.getElementById('confirm-cancel-x')?.addEventListener('click', closeFn);

    backdrop.addEventListener('click', e => {
        if (e.target === backdrop) closeFn();
    });

    const onKey = e => { if (e.key === 'Escape') closeFn(); };
    document.addEventListener('keydown', onKey);

    // For reject modal: live word count & validation
    if (type === 'reject') {
        const textarea   = document.getElementById('reject-reason');
        const wordCount  = document.getElementById('word-count-val');
        const actionBtn  = document.getElementById('confirm-action-btn');
        
        if (textarea && wordCount && actionBtn) {
            actionBtn.disabled = true;
            actionBtn.style.opacity = '0.5';
            
            textarea.addEventListener('input', () => {
                const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0);
                const count = words.length;
                wordCount.textContent = count;
                
                const valid = count >= 10;
                actionBtn.disabled = !valid;
                actionBtn.style.opacity = valid ? '1' : '0.5';
                wordCount.style.color = valid ? '#10b981' : '#94a3b8';
            });
        }
    }

    document.getElementById('confirm-action-btn')?.addEventListener('click', () => {
        if (onConfirm) onConfirm();
        closeFn();
        document.removeEventListener('keydown', onKey);
    });
}
