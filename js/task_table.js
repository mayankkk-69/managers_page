/**
 * task_table.js
 * Renders the task history table with search, filter and pagination.
 */
(function () {
    const DEFAULT_PAGE_SIZE = 8;
    let PAGE_SIZE   = DEFAULT_PAGE_SIZE;
    let allTasks    = (window.perfData && window.perfData.tasks) ? window.perfData.tasks : [];
    let filtered    = [...allTasks];
    let currentPage = 1;
    let currentFilter = 'all';
    let searchQuery   = '';

    const tbody     = document.getElementById('taskTableBody');
    const countEl   = document.getElementById('tableRowCount');
    const pagination= document.getElementById('tablePagination');

    /* ── Helpers ─────────────────────────────────────────── */
    function fmt(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function daysOver(completed, deadline) {
        if (!completed || !deadline) return 0;
        const c = new Date(completed);
        const dl = new Date(deadline);
        const diff = Math.round((c - dl) / (1000 * 60 * 60 * 24));
        return diff;
    }

    function statusBadge(status) {
        const map = {
            completed:  '<span class="badge badge-on-time">Completed</span>',
            in_progress:'<span class="badge badge-active">In Progress</span>',
            in_review:  '<span class="badge badge-active">In Review</span>',
            pending:    '<span class="badge badge-pending">Pending</span>',
            rejected:   '<span class="badge badge-late">Rejected</span>',
        };
        return map[status] || `<span class="badge badge-pending">${status}</span>`;
    }

    function extensionHtml(task) {
        const status = task.status || '';

        if (status !== 'completed') {
            // Check if active task is already past deadline
            if (task.end_date) {
                const now  = new Date();
                const dl   = new Date(task.end_date);
                const diff = Math.round((now - dl) / (1000 * 60 * 60 * 24));
                if (diff > 0) {
                    return `<span class="ext-late"><i class="fa-solid fa-triangle-exclamation"></i> Overdue
                            <span class="days-over">+${diff}d</span></span>`;
                }
            }
            return `<span class="ext-pending"><i class="fa-regular fa-clock"></i> Ongoing</span>`;
        }

        const over = daysOver(task.completed_at || task.updated_at, task.end_date);

        if (over <= 0) {
            return `<span class="ext-on-time"><i class="fa-solid fa-circle-check"></i> On Time</span>`;
        } else {
            return `<span class="ext-late"><i class="fa-solid fa-clock-rotate-left"></i> Extended
                    <span class="days-over">+${over}d</span></span>`;
        }
    }

    /* ── Render ──────────────────────────────────────────── */
    function renderTable() {
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <div class="empty-icon"><i class="fa-solid fa-inbox"></i></div>
                            <p class="empty-title">No tasks found</p>
                            <p class="empty-desc">Try adjusting your search or filter.</p>
                        </div>
                    </td>
                </tr>`;
            if (countEl) countEl.textContent = '0 tasks';
            if (pagination) pagination.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        const start      = (currentPage - 1) * PAGE_SIZE;
        const slice      = filtered.slice(start, start + PAGE_SIZE);

        tbody.innerHTML = slice.map((t, idx) => {
            const rowNum    = start + idx + 1;
            const overHtml  = extensionHtml(t);

            return `
                <tr data-status="${t.status || ''}" data-task-id="${t.id || ''}">
                    <td class="text-muted">${rowNum}</td>
                    <td>
                        <span class="td-task-name" title="${t.substage_name || ''}">${t.substage_name || '—'}</span>
                        <span class="td-stage-name col-stage">${t.stage_name  || ''}</span>
                    </td>
                    <td>
                        <span class="td-project">
                            <i class="fa-solid fa-folder-open"></i>
                            ${t.project_name || '—'}
                        </span>
                    </td>
                    <td class="col-stage td-date">
                        ${t.stage_name || '—'}
                    </td>
                    <td class="col-deadline">
                        <div class="td-date">${fmt(t.end_date)}</div>
                    </td>
                    <td>
                        <div class="td-date">${t.status === 'completed' ? fmt(t.updated_at) : '—'}</div>
                    </td>
                    <td>${overHtml}</td>
                    <td>${statusBadge(t.status)}</td>
                </tr>`;
        }).join('');

        // Row count
        if (countEl) {
            const showing = `${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)}`;
            countEl.textContent = `Showing ${showing} of ${filtered.length} task${filtered.length !== 1 ? 's' : ''}`;
        }

        // Pagination
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        if (!pagination) return;

        // Always render the rows-per-page selector
        const perPageOptions = [5, 8, 15, 'All'];
        const perPageHtml = `
            <div class="per-page-wrap">
                <span class="per-page-label">Rows:</span>
                ${perPageOptions.map(n => {
                    const val = n === 'All' ? 9999 : n;
                    const active = PAGE_SIZE === val ? 'active' : '';
                    return `<button class="per-page-btn ${active}" data-size="${val}">${n}</button>`;
                }).join('')}
            </div>`;

        if (totalPages <= 1) {
            pagination.innerHTML = perPageHtml;
            wirePerPage();
            return;
        }

        // Page info
        const pageInfo = `<span class="page-info">Page ${currentPage} of ${totalPages}</span>`;

        // Prev button
        const prevBtn = `<button class="page-nav-btn" data-action="prev" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i>
        </button>`;

        // Next button
        const nextBtn = `<button class="page-nav-btn" data-action="next" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right"></i>
        </button>`;

        // Page number buttons (show max 5 around current page)
        let pages = [];
        const delta = 2;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        const pageNums = pages.map(p => p === '...'
            ? `<span class="page-ellipsis">…</span>`
            : `<button class="page-btn ${p === currentPage ? 'current' : ''}" data-page="${p}">${p}</button>`
        ).join('');

        pagination.innerHTML = `${perPageHtml}<div class="page-nav-group">${prevBtn}${pageNums}${nextBtn}</div>${pageInfo}`;

        // Wire page number clicks
        pagination.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page);
                renderTable();
            });
        });

        // Wire prev/next
        pagination.querySelectorAll('.page-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.action === 'prev' && currentPage > 1) {
                    currentPage--;
                    renderTable();
                } else if (btn.dataset.action === 'next' && currentPage < totalPages) {
                    currentPage++;
                    renderTable();
                }
            });
        });

        wirePerPage();
    }

    function wirePerPage() {
        if (!pagination) return;
        pagination.querySelectorAll('.per-page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                PAGE_SIZE   = parseInt(btn.dataset.size);
                currentPage = 1;
                renderTable();
            });
        });
    }

    /* ── Filter & Search ─────────────────────────────────── */
    function applyFilters() {
        currentPage = 1;
        filtered = allTasks.filter(t => {
            // Status filter
            if (currentFilter === 'on_time') {
                if (t.status !== 'completed') return false;
                if (daysOver(t.updated_at, t.end_date) > 0) return false;
            } else if (currentFilter === 'late') {
                if (t.status === 'completed' && daysOver(t.updated_at, t.end_date) <= 0) return false;
                if (t.status !== 'completed') {
                    if (!t.end_date) return false;
                    const diff = Math.round((new Date() - new Date(t.end_date)) / 86400000);
                    if (diff <= 0) return false;
                }
            } else if (currentFilter === 'active') {
                if (!['pending','in_progress','in_review'].includes(t.status)) return false;
            }

            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const haystack = [
                    t.substage_name, t.project_name, t.stage_name
                ].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }

            return true;
        });

        renderTable();
    }

    /* ── Event Listeners ─────────────────────────────────── */
    // Filter chips
    document.querySelectorAll('.chip[data-filter]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip[data-filter]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            applyFilters();
        });
    });

    // Search
    const searchInput = document.getElementById('taskSearch');
    if (searchInput) {
        let debounce;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                searchQuery = searchInput.value.trim();
                applyFilters();
            }, 250);
        });
    }

    /* ── Init ────────────────────────────────────────────── */
    renderTable();

    // Expose reload function for main.js to call after data refresh
    window.reloadTaskTable = function (tasks) {
        allTasks = tasks || [];
        filtered = [...allTasks];
        currentFilter = 'all';
        searchQuery   = '';
        currentPage   = 1;
        document.querySelectorAll('.chip[data-filter]').forEach(c => {
            c.classList.toggle('active', c.dataset.filter === 'all');
        });
        if (searchInput) searchInput.value = '';
        renderTable();
    };

    /* ── Task Detail Modal ───────────────────────────────── */
    const overlay     = document.getElementById('taskModalOverlay');
    const closeBtn    = document.getElementById('tmCloseBtn');
    const footerClose = document.getElementById('tmFooterClose');

    function fmtModal(dateStr) {
        if (!dateStr || dateStr === '0000-00-00 00:00:00') return '—';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function openModal(task) {
        if (!overlay) return;

        // Title
        document.getElementById('tmTitle').textContent    = task.substage_name || '—';
        document.getElementById('tmProject').innerHTML    = `<i class="fa-solid fa-folder-open"></i> ${task.project_name || '—'}`;
        document.getElementById('tmStage').innerHTML      = `<i class="fa-solid fa-layer-group"></i> ${task.stage_name || '—'}`;
        document.getElementById('tmStart').innerHTML      = `<i class="fa-regular fa-calendar"></i> ${fmtModal(task.start_date)}`;
        document.getElementById('tmDeadline').innerHTML   = `<i class="fa-regular fa-calendar-xmark"></i> ${fmtModal(task.end_date)}`;

        const isCompleted = task.status === 'completed';
        document.getElementById('tmCompleted').innerHTML  =
            `<i class="fa-solid fa-circle-check"></i> ${isCompleted ? fmtModal(task.updated_at) : '—'}`;

        // Status badge
        const statusMap = {
            completed:   '<span class="badge badge-on-time">Completed</span>',
            in_progress: '<span class="badge badge-active">In Progress</span>',
            in_review:   '<span class="badge badge-active">In Review</span>',
            pending:     '<span class="badge badge-pending">Pending</span>',
            rejected:    '<span class="badge badge-late">Rejected</span>',
        };
        document.getElementById('tmStatus').innerHTML =
            statusMap[task.status] || `<span class="badge badge-pending">${task.status}</span>`;

        // Extension row
        const extRow  = document.getElementById('tmExtRow');
        const extIcon = document.getElementById('tmExtIcon');
        const extText = document.getElementById('tmExtText');
        const extDays = document.getElementById('tmExtDays');
        extRow.className = 'tm-extension-row';

        if (isCompleted) {
            const over = daysOver(task.updated_at, task.end_date);
            if (over <= 0) {
                extRow.classList.add('on-time');
                extIcon.className = 'fa-solid fa-circle-check';
                extText.textContent = 'Completed on time';
                extDays.textContent = '';
            } else {
                extRow.classList.add('extended');
                extIcon.className = 'fa-solid fa-clock-rotate-left';
                extText.textContent = 'Completed late';
                extDays.textContent = `+${over} day${over !== 1 ? 's' : ''} over deadline`;
            }
        } else {
            const now  = new Date();
            const dl   = task.end_date ? new Date(task.end_date) : null;
            if (dl && now > dl) {
                const diff = Math.round((now - dl) / 86400000);
                extRow.classList.add('extended');
                extIcon.className = 'fa-solid fa-triangle-exclamation';
                extText.textContent = 'Overdue — still pending';
                extDays.textContent = `+${diff} day${diff !== 1 ? 's' : ''} past deadline`;
            } else {
                extRow.classList.add('pending');
                extIcon.className = 'fa-regular fa-clock';
                extText.textContent = 'Task is ongoing';
                extDays.textContent = '';
            }
        }

        // Timeline bar
        const bar         = document.getElementById('tmTimelineBar');
        const tlCaption   = document.getElementById('tmTimelineCaption');
        const tlStart     = document.getElementById('tmTimelineStart');
        const tlEnd       = document.getElementById('tmTimelineEnd');

        tlStart.textContent = fmtModal(task.start_date);
        tlEnd.textContent   = fmtModal(task.end_date);

        bar.className = 'tm-timeline-bar-fill';
        let pct = 0;

        if (task.start_date && task.end_date) {
            const s   = new Date(task.start_date);
            const e   = new Date(task.end_date);
            const ref = isCompleted ? new Date(task.updated_at) : new Date();
            const total = e - s;
            const elapsed = ref - s;
            pct = total > 0 ? Math.min(Math.round((elapsed / total) * 100), 100) : 0;

            if (isCompleted) {
                const over = daysOver(task.updated_at, task.end_date);
                bar.classList.add(over <= 0 ? 'on-time' : 'extended');
                tlCaption.textContent = over <= 0 ? '✓ Finished' : 'Overran';
            } else {
                bar.classList.add('pending');
                tlCaption.textContent = `${pct}% elapsed`;
            }
        }

        // Animate bar after paint
        bar.style.width = '0%';
        setTimeout(() => { bar.style.width = pct + '%'; }, 50);

        // Open
        overlay.classList.add('open');
    }

    function closeModal() {
        if (!overlay) return;
        overlay.classList.remove('open');
    }

    // Wire close buttons
    if (closeBtn)    closeBtn.addEventListener('click', closeModal);
    if (footerClose) footerClose.addEventListener('click', closeModal);
    if (overlay)     overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // Wire row clicks — delegate from tbody
    if (tbody) {
        tbody.addEventListener('click', e => {
            const row = e.target.closest('tr[data-task-id]');
            if (!row) return;
            const id   = parseInt(row.dataset.taskId);
            const task = allTasks.find(t => t.id == id);
            if (task) openModal(task);
        });
    }

    // Expose openModal so renderTable can use refreshed data
    window.openTaskModal = openModal;

})();

