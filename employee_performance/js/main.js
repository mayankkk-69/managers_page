/**
 * main.js
 * Orchestrates section loading, API fetch, employee selector,
 * date range switching and custom date picker.
 */
(function () {

    // ── State ───────────────────────────────────────────
    const state = {
        range:      'month',
        employeeId: null,   // null = current user
        from:       null,   // custom range start (YYYY-MM-DD)
        to:         null    // custom range end   (YYYY-MM-DD)
    };

    // ── Section definitions ─────────────────────────────
    const SECTIONS = [
        { container: 'section-header',     file: 'sections/header.html'     },
        { container: 'section-summary',    file: 'sections/summary.html'    },
        { container: 'section-charts',     file: 'sections/charts.html'     },
        { container: 'section-task-table', file: 'sections/task_table.html' }
    ];

    const v = Date.now(); // cache-buster

    // ── Load section HTML ────────────────────────────────
    async function loadSections() {
        for (const s of SECTIONS) {
            const el = document.getElementById(s.container);
            if (!el) continue;
            try {
                const res  = await fetch(s.file + '?v=' + v);
                el.innerHTML = await res.text();
            } catch (e) {
                console.warn('[PerfDash] Could not load section:', s.file);
            }
        }
    }

    // ── Fetch data from API ──────────────────────────────
    async function fetchData() {
        let url = `api/performance_data.php?range=${state.range}`;
        if (state.employeeId) url += `&user_id=${state.employeeId}`;
        if (state.range === 'custom' && state.from && state.to) {
            url += `&from=${state.from}&to=${state.to}`;
        }

        try {
            const res = await fetch(url + '&t=' + Date.now());
            window.perfData = await res.json();
        } catch (e) {
            console.error('[PerfDash] API fetch failed:', e);
            window.perfData = {
                stats: { total:0, done:0, onTime:0, late:0, avgDaysOver:0 },
                tasks: [],
                trends: { labels:[], onTime:[], late:[] }
            };
        }
    }

    // ── Load all JS modules ──────────────────────────────
    function loadScript(src) {
        return new Promise(resolve => {
            const el  = document.createElement('script');
            el.src    = src;
            el.async  = false;
            el.onload = resolve;
            document.body.appendChild(el);
        });
    }

    async function loadModules() {
        await loadScript(`js/summary.js?v=${v}`);
        await loadScript(`js/task_table.js?v=${v}`);
        await loadScript(`js/charts.js?v=${v}`);
    }

    // ── Populate employee dropdown ───────────────────────
    function populateEmployeeDropdown() {
        const sel = document.getElementById('employeeSelect');
        if (!sel) return;

        const employees = (window.perfData && window.perfData.employees) || [];

        if (employees.length === 0) {
            const wrap = document.getElementById('ph-employee-container');
            if (wrap) wrap.style.display = 'none';
            return;
        }

        sel.innerHTML = employees.map(e =>
            `<option value="${e.id}" ${e.id == state.employeeId ? 'selected' : ''}>${e.name}</option>`
        ).join('');

        if (!state.employeeId && employees.length > 0) {
            state.employeeId = employees[0].id;
            sel.value = state.employeeId;
        }

        sel.addEventListener('change', () => {
            state.employeeId = sel.value || null;
            refreshData();
        });
    }

    // ── Date range label helper ──────────────────────────
    function getDateRangeLabel() {
        const fmt = d => d.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
        const today = new Date();

        switch (state.range) {
            case 'day':
                return fmt(today);
            case 'week': {
                const s = new Date(today);
                s.setDate(today.getDate() - 6);
                return `${fmt(s)} – ${fmt(today)}`;
            }
            case 'month': {
                const s = new Date(today);
                s.setMonth(today.getMonth() - 1);
                return `${fmt(s)} – ${fmt(today)}`;
            }
            case 'quarter': {
                const s = new Date(today);
                s.setMonth(today.getMonth() - 3);
                return `${fmt(s)} – ${fmt(today)}`;
            }
            case 'custom':
                if (state.from && state.to) {
                    return `${fmt(new Date(state.from))} – ${fmt(new Date(state.to))}`;
                }
                return 'Custom Range';
            default:
                return '';
        }
    }

    // ── Update header display ────────────────────────────
    function updateRangeDisplay() {
        const subtitleMap = {
            day:     'today',
            week:    'this week',
            month:   'this month',
            quarter: 'this quarter',
            custom:  'custom range'
        };

        const subtitleEl = document.getElementById('ph-subtitle-range');
        if (subtitleEl) {
            subtitleEl.textContent = `Showing data for ${subtitleMap[state.range] || state.range}`;
        }

        const badgeEl = document.getElementById('ph-active-badge');
        if (badgeEl) {
            badgeEl.textContent = getDateRangeLabel();
        }
    }

    // ── Refresh data + re-render ─────────────────────────
    async function refreshData() {
        await fetchData();

        // Re-run summary
        const summaryMod = document.querySelector('script[src*="summary.js"]');
        if (summaryMod) summaryMod.remove();
        await loadScript(`js/summary.js?v=${Date.now()}`);

        // Re-run task table
        if (typeof window.reloadTaskTable === 'function') {
            window.reloadTaskTable(window.perfData.tasks || []);
        }

        // Destroy all active Chart.js instances and redraw
        const trenMod = document.querySelector('script[src*="charts.js"]');
        if (trenMod) trenMod.remove();
        Object.values(Chart.instances).forEach(chart => chart.destroy());
        await loadScript(`js/charts.js?v=${Date.now()}`);
    }

    // ── Wire range buttons + custom date picker ──────────
    function wireRangeButtons() {
        const picker      = document.getElementById('ph-custom-picker');
        const fromInput   = document.getElementById('ph-date-from');
        const toInput     = document.getElementById('ph-date-to');
        const applyBtn    = document.getElementById('ph-apply-custom');
        const cancelBtn   = document.getElementById('ph-cancel-custom');

        // Pre-fill today in custom inputs
        const todayStr = new Date().toISOString().split('T')[0];
        if (fromInput) fromInput.value = todayStr;
        if (toInput)   toInput.value   = todayStr;

        function setActive(range) {
            document.querySelectorAll('.ph-range-btn').forEach(b => b.classList.remove('active'));
            const btn = document.querySelector(`.ph-range-btn[data-range="${range}"]`);
            if (btn) btn.classList.add('active');
        }

        document.querySelectorAll('.ph-range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.range === 'custom') {
                    // Toggle picker panel
                    if (picker) picker.classList.toggle('open');
                    return;
                }

                // Hide picker when switching to quick filter
                if (picker) picker.classList.remove('open');

                setActive(btn.dataset.range);
                state.range = btn.dataset.range;
                state.from  = null;
                state.to    = null;
                updateRangeDisplay();
                refreshData();
            });
        });

        // Apply custom range
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const from = fromInput ? fromInput.value : null;
                const to   = toInput   ? toInput.value   : null;

                if (!from || !to) {
                    alert('Please select both a start and end date.');
                    return;
                }
                if (new Date(from) > new Date(to)) {
                    alert('Start date cannot be after end date.');
                    return;
                }

                state.range = 'custom';
                state.from  = from;
                state.to    = to;

                setActive('custom');
                if (picker) picker.classList.remove('open');
                updateRangeDisplay();
                refreshData();
            });
        }

        // Cancel / close picker
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (picker) picker.classList.remove('open');
            });
        }

        // Close picker when clicking outside
        document.addEventListener('click', e => {
            if (!picker) return;
            const cluster = document.querySelector('.ph-range-cluster');
            if (cluster && !cluster.contains(e.target)) {
                picker.classList.remove('open');
            }
        });
    }

    // ── Boot ─────────────────────────────────────────────
    async function boot() {
        await loadSections();
        await fetchData();

        populateEmployeeDropdown();
        updateRangeDisplay();
        wireRangeButtons();

        await loadModules();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
