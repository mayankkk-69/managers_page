// components/table/table.js
import { openDetailModal, openEditModal, openConfirmModal } from '../modal/modal.js';
import { renderMetrics } from '../metrics/metrics.js';
import { renderUserFilter } from '../filters/filters.js';

/* ─────────────────────────────────────────────────────
   Extended mock data — all fields used in the detail modal
   ───────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────
   Data state logic
   ───────────────────────────────────────────────────── */
let tableData = [];

export async function fetchOvertimeData() {
    try {
        const response = await fetch('api/fetch_overtime.php');
        const result = await response.json();
        if (result.success) {
            tableData = result.data;
            renderTableData();
            renderUserFilter(tableData);
        } else {
            console.error('Failed to fetch overtime data:', result.message);
        }
    } catch (error) {
        console.error('Error fetching overtime data:', error);
    }
}

async function updateOvertimeStatus(attendanceId, status, comments = '', otHours = null) {
    try {
        const response = await fetch('api/update_overtime.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                attendance_id: attendanceId,
                status: status,
                comments: comments,
                otHours: otHours
            })
        });
        const result = await response.json();
        if (result.success) {
            await fetchOvertimeData();
            return true;
        } else {
            alert('Update failed: ' + result.message);
            return false;
        }
    } catch (error) {
        console.error('Error updating overtime status:', error);
        return false;
    }
}

/* ─────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────── */
function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === '—') return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncateText(text, maxLength = 30) {
    if (!text) return '—';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/* ─────────────────────────────────────────────────────
   Render table rows
   ───────────────────────────────────────────────────── */
export function renderTableData() {
    const tableBody      = document.getElementById('table-body');
    const emptyState     = document.getElementById('empty-state');
    const tableContainer = document.querySelector('.table-container');

    if (!tableBody) return;

    // Get current filter values
    const userFilter   = (document.getElementById('filter-user')?.value || 'all').toLowerCase();
    const statusFilter = (document.getElementById('filter-status')?.value || 'all').toLowerCase();
    const monthFilter  = document.getElementById('filter-month')?.value || 'all'; // e.g. "03"
    const yearFilter   = document.getElementById('filter-year')?.value || 'all';  // e.g. "2026"

    let filtered = tableData.filter(item => {
        // User filter
        const matchUser = userFilter === 'all' || item.employee.toLowerCase() === userFilter;
        
        // Status filter
        const matchStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter;
        
        // Date filters (item.date is likely YYYY-MM-DD)
        const dateObj = new Date(item.date);
        const itemMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const itemYear = dateObj.getFullYear().toString();
        
        const matchMonth = monthFilter === 'all' || itemMonth === monthFilter;
        const matchYear = yearFilter === 'all' || itemYear === yearFilter;

        return matchUser && matchStatus && matchMonth && matchYear;
    });

    // Update the KPI Cards based on newly filtered data
    renderMetrics(filtered);

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.classList.remove('hidden');
        return;
    }

    tableContainer.style.display = '';
    emptyState.classList.add('hidden');

    filtered.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 0.06}s`;
        const badgeClass = `badge badge-${row.status.toLowerCase()}`;

        tr.innerHTML = `
            <td>
                <div class="employee-name">
                    <div class="employee-avatar">${getInitials(row.employee)}</div>
                    ${row.employee}
                </div>
            </td>
            <td>${formatDate(row.date)}</td>
            <td>${row.endTime}</td>
            <td>${row.punchOut}</td>
            <td><strong>${row.otHours}h</strong></td>
            <td class="highlighted-cell">${row.submittedOt !== 'N/A' ? row.submittedOt + 'h' : '—'}</td>
            <td><span class="truncate js-view-btn" data-atid="${row.attendance_id}" style="cursor: pointer; color: var(--primary-600); font-weight: 500;" title="${(row.workReport || '').replace(/"/g, '&quot;')}">${truncateText(row.workReport)}</span></td>
            <td><span class="truncate js-view-btn" data-atid="${row.attendance_id}" style="cursor: pointer; color: var(--primary-600); font-weight: 500;" title="${(row.otReport || '').replace(/"/g, '&quot;')}">${truncateText(row.otReport)}</span></td>
            <td><span class="${badgeClass}">${row.status}</span></td>
            <td>
                <div class="action-icons">
                    <button class="action-btn approve js-approve-btn" title="Approve" data-atid="${row.attendance_id}">
                        <i class="ph-fill ph-check-circle"></i>
                    </button>
                    <button class="action-btn reject js-reject-btn" title="Reject" data-atid="${row.attendance_id}">
                        <i class="ph-fill ph-x-circle"></i>
                    </button>
                    <button class="action-btn edit js-edit-btn" title="Edit Hours" data-atid="${row.attendance_id}">
                        <i class="ph-bold ph-pencil-simple"></i>
                    </button>
                    <button class="action-btn view js-view-btn" title="View Details" data-atid="${row.attendance_id}">
                        <i class="ph-bold ph-eye"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Wire view buttons
    tableBody.querySelectorAll('.js-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const atid = btn.dataset.atid;
            const rowData = tableData.find(d => d.attendance_id == atid);
            if (rowData) openDetailModal(rowData);
        });
    });

    // Wire edit buttons
    tableBody.querySelectorAll('.js-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const atid = btn.dataset.atid;
            const rowData = tableData.find(d => d.attendance_id == atid);
            if (rowData) {
                openEditModal(rowData, async (newVal) => {
                    await updateOvertimeStatus(atid, rowData.status, rowData.managerComment, newVal);
                });
            }
        });
    });

    // Wire approve buttons
    tableBody.querySelectorAll('.js-approve-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const atid = btn.dataset.atid;
            const rowData = tableData.find(d => d.attendance_id == atid);
            if (rowData) {
                openConfirmModal('approve', rowData, async (comments) => {
                    await updateOvertimeStatus(atid, 'Approved', comments);
                });
            }
        });
    });

    // Wire reject buttons
    tableBody.querySelectorAll('.js-reject-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const atid = btn.dataset.atid;
            const rowData = tableData.find(d => d.attendance_id == atid);
            if (rowData) {
                openConfirmModal('reject', rowData, async (comments) => {
                    await updateOvertimeStatus(atid, 'Rejected', comments);
                });
            }
        });
    });
}

/* ─────────────────────────────────────────────────────
   Init
   ───────────────────────────────────────────────────── */
export function initTable() {
    fetchOvertimeData();
    initToggle();
}

function initToggle() {
    const btnStudio = document.getElementById('view-studio');
    const btnSite   = document.getElementById('view-site');
    if (!btnStudio || !btnSite) return;

    let currentView = 'studio';

    function setView(view) {
        currentView = view;
        if (view === 'studio') {
            btnStudio.classList.add('active');
            btnSite.classList.remove('active');
            renderTableData(); // Studio data = default mockData
        } else {
            btnSite.classList.add('active');
            btnStudio.classList.remove('active');
            // Show empty state for Site view (no site data yet)
            const tableBody      = document.getElementById('table-body');
            const tableContainer = document.querySelector('.table-container');
            const emptyState     = document.getElementById('empty-state');
            if (tableBody) tableBody.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = `
                    <i class="ph ph-buildings"></i>
                    <p>No site overtime records found for the selected period.</p>`;
                emptyState.classList.remove('hidden');
            }
        }
    }

    btnStudio.addEventListener('click', () => setView('studio'));
    btnSite.addEventListener('click',   () => setView('site'));
}
