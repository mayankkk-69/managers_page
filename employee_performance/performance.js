document.addEventListener('DOMContentLoaded', () => {
    // ── Initialize Lucide Icons ─────────────────────────────
    if (window.lucide) {
        lucide.createIcons();
    }

    // ── Global State ────────────────────────────────────────
    const state = {
        range: 'month',
        charts: {},
        data: null
    };

    // ── UI Elements ─────────────────────────────────────────
    const loaders = {
        main: document.getElementById('loader-overlay'),
        tasks: document.getElementById('recent-tasks-list'),
        performers: document.getElementById('top-performers-list')
    };

    // ── Data Fetching ───────────────────────────────────────
    async function fetchData() {
        try {
            const response = await fetch(`api/performance_data.php?range=${state.range}`);
            const result = await response.json();
            
            if (result.success) {
                state.data = result.data;
                updateUI();
            } else {
                console.error('Data fetch failed:', result.message);
            }
        } catch (error) {
            console.error('Error fetching performance data:', error);
        } finally {
            hideLoader();
        }
    }

    function hideLoader() {
        if (loaders.main) {
            loaders.main.style.opacity = '0';
            setTimeout(() => {
                loaders.main.style.display = 'none';
            }, 500);
        }
    }

    // ── UI Updates ──────────────────────────────────────────
    function updateUI() {
        if (!state.data) return;

        // Update Stats
        document.getElementById('efficiency-val').textContent = `${state.data.stats.efficiency}%`;
        document.getElementById('ontime-val').textContent = state.data.stats.onTimeCount;
        document.querySelector('#ontime-card .stat-sub').textContent = `/ ${state.data.stats.totalCompleted} total`;
        document.getElementById('active-tasks-val').textContent = state.data.stats.activeCount;
        document.getElementById('late-tasks-val').textContent = state.data.stats.lateCount;

        // Initialize/Update Charts
        initMainChart(state.data.trends);
        initMiniCharts(state.data.trends.efficiency);

        // Render Lists
        renderTasks(state.data.recentTasks);
        renderPerformers(state.data.topPerformers);
    }

    function renderTasks(tasks) {
        if (!loaders.tasks) return;
        
        if (tasks.length === 0) {
            loaders.tasks.innerHTML = '<p class="empty-msg">No recent activity found.</p>';
            return;
        }

        loaders.tasks.innerHTML = tasks.map(task => {
            const statusColor = task.status === 'completed' ? 'var(--success)' : 
                                task.status === 'late' ? 'var(--danger)' : 'var(--warning)';
            
            return `
                <div class="task-item">
                    <div class="task-status-dot" style="background: ${statusColor}"></div>
                    <div class="task-info">
                        <span class="task-name">${task.name}</span>
                        <span class="task-meta">${task.project} • ${task.stage}</span>
                    </div>
                    <div class="task-assignee">
                        <span class="task-meta">${task.date}</span>
                        <div class="assignee-avatar"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderPerformers(performers) {
        if (!loaders.performers) return;

        loaders.performers.innerHTML = performers.map((p, index) => `
            <div class="performer-item">
                <span class="rank">#${index + 1}</span>
                <img src="${p.avatar || '../images/default_user.png'}" alt="${p.name}" class="performer-avatar">
                <div class="performer-info">
                    <span class="performer-name">${p.name}</span>
                    <span class="performer-role">${p.role}</span>
                </div>
                <div class="performer-score">
                    <span class="score-val">${p.efficiency}%</span>
                    <span class="score-label">Efficiency</span>
                </div>
            </div>
        `).join('');
    }

    // ── Chart Initializations ────────────────────────────────
    function initMainChart(trends) {
        const ctx = document.getElementById('mainPerformanceChart').getContext('2d');
        
        if (state.charts.main) state.charts.main.destroy();

        const gradientPrimary = ctx.createLinearGradient(0, 0, 0, 400);
        gradientPrimary.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradientPrimary.addColorStop(1, 'rgba(99, 102, 241, 0)');

        const gradientDanger = ctx.createLinearGradient(0, 0, 0, 400);
        gradientDanger.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
        gradientDanger.addColorStop(1, 'rgba(239, 68, 68, 0)');

        state.charts.main = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.labels,
                datasets: [
                    {
                        label: 'On-Time',
                        data: trends.onTime,
                        borderColor: '#6366f1',
                        backgroundColor: gradientPrimary,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#6366f1'
                    },
                    {
                        label: 'Late',
                        data: trends.late,
                        borderColor: '#ef4444',
                        backgroundColor: gradientDanger,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#64748b' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }

    function initMiniCharts(data) {
        const ctx = document.getElementById('efficiency-mini-chart').getContext('2d');
        if (state.charts.mini) state.charts.mini.destroy();

        state.charts.mini = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    data: data,
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }

    // ── Event Listeners ─────────────────────────────────────
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.range = e.target.dataset.range;
            
            // Show some feedback while loading
            loaders.tasks.innerHTML = '<div class="skeleton-loader"></div>';
            fetchData();
        });
    });

    // Initial Fetch
    fetchData();
});
