/**
 * charts.js
 * Draws the Trend line chart and Task Status doughnut using Chart.js
 */
(function () {
    const data   = window.perfData  || {};
    const trends = data.trends      || {};
    const stats  = data.stats       || {};

    /* ── Shared Chart Defaults ─────────────────────────── */
    Chart.defaults.font.family = "'Outfit', system-ui, sans-serif";
    Chart.defaults.font.size   = 12;
    Chart.defaults.color       = '#9ca3af';

    // Helper to create gradients
    function getGradient(ctx, color, opacityStart, opacityEnd) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, `${color}${opacityStart}`);
        gradient.addColorStop(1, `${color}${opacityEnd}`);
        return gradient;
    }

    /* ── 1. Performance Trend (Line) ───────────────────── */
    const trendCanvas = document.getElementById('trendChart');
    if (trendCanvas && trends.labels) {
        const ctx = trendCanvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.labels,
                datasets: [
                    {
                        label: 'On Time',
                        data: trends.onTime || [],
                        borderColor: '#16a34a',
                        backgroundColor: getGradient(ctx, '#16a34a', '20', '00'),
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointBackgroundColor: '#16a34a',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Extended',
                        data: trends.late || [],
                        borderColor: '#dc2626',
                        backgroundColor: getGradient(ctx, '#dc2626', '15', '00'),
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointBackgroundColor: '#dc2626',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#111827',
                        bodyColor: '#374151',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        usePointStyle: true,
                        boxPadding: 6,
                        titleFont: { weight: '600' },
                        bodyFont: { size: 12 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: '#9ca3af', font: { size: 11 }, padding: 10 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { 
                            color: '#eef0f3', 
                            lineWidth: 1,
                            drawBorder: false,
                            borderDash: [5, 5]
                        },
                        border: { display: false },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 11 },
                            stepSize: 1,
                            precision: 0,
                            padding: 10
                        }
                    }
                },
                interaction: { mode: 'index', intersect: false }
            }
        });
    }

    /* ── 2. Task Status Doughnut ───────────────────────── */
    const splitCtx = document.getElementById('splitChart');
    if (splitCtx) {
        const total   = stats.total  || 0;
        const done    = stats.done   || 0;
        const onTime  = stats.onTime || 0;
        const late    = stats.late   || 0;
        const active  = total - done;

        new Chart(splitCtx, {
            type: 'doughnut',
            data: {
                labels: ['On Time', 'Extended', 'Active / Pending'],
                datasets: [{
                    data: [onTime, late, Math.max(active, 0)],
                    backgroundColor: ['#16a34a', '#dc2626', '#2563eb'],
                    borderColor: '#ffffff',
                    borderWidth: 4,
                    hoverOffset: 6,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            boxWidth: 10,
                            boxHeight: 10,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 11, weight: '500' },
                            color: '#6b7280'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#111827',
                        bodyColor: '#374151',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        usePointStyle: true,
                        boxPadding: 6
                    }
                }
            }
        });
    }
})();

