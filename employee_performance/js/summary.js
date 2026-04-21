/**
 * summary.js
 * Populates the 4 stat cards using window.perfData
 */
(function () {
    const d = window.perfData || {};
    const stats = d.stats || {};

    const total  = stats.total  || 0;
    const done   = stats.done   || 0;
    const onTime = stats.onTime || 0;
    const late   = stats.late   || 0;
    const avgDays= stats.avgDaysOver || 0;

    const pctDone   = total > 0 ? Math.round((done / total) * 100) : 0;
    const pctOnTime = done  > 0 ? Math.round((onTime / done) * 100) : 0;
    const pctLate   = done  > 0 ? Math.round((late / done) * 100) : 0;

    // Helpers
    function set(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function setBar(id, pct, delay = 0) {
        const el = document.getElementById(id);
        if (!el) return;
        setTimeout(() => {
            el.style.width = Math.min(pct, 100) + '%';
        }, delay);
    }

    set('stat-total',    total);
    set('stat-done',     done);
    set('stat-done-sub', `out of ${total} task${total !== 1 ? 's' : ''}`);

    set('stat-ontime',    pctOnTime + '%');
    set('stat-ontime-sub', `${onTime} task${onTime !== 1 ? 's' : ''} without delays`);

    set('stat-late',     late);
    set('stat-late-sub', avgDays > 0
        ? `~${avgDays} day${avgDays !== 1 ? 's' : ''} avg over deadline`
        : 'No overdue extensions');

    // Animate bars
    setBar('bar-done',   pctDone,   100);
    setBar('bar-ontime', pctOnTime, 150);
    setBar('bar-late',   pctLate,   200);
})();
