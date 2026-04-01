export function renderMetrics(data) {
    try {
        console.log("Updating metrics with data count:", data.length);
        
        const pendingCount = data.filter(d => d.status === 'Pending' || d.status === 'Submitted').length;
        const approvedCount = data.filter(d => d.status === 'Approved').length;
        const rejectedCount = data.filter(d => d.status === 'Rejected').length;
        const expiredCount = data.filter(d => d.status === 'Expired').length;
        
        // Sum approved hours. Handle string, null, or decimal.
        const totalHours = data.filter(d => d.status === 'Approved')
                               .reduce((sum, d) => {
                                   let h = parseFloat(d.otHours);
                                   return sum + (isNaN(h) ? 0 : h);
                               }, 0);

        const elPending = document.getElementById('metric-pending');
        const elHours = document.getElementById('metric-hours');
        const elRejected = document.getElementById('metric-rejected');
        const elApproved = document.getElementById('metric-approved');
        const elExpired = document.getElementById('metric-expired');

        if (elPending) elPending.innerText = pendingCount;
        if (elHours) elHours.innerHTML = `${totalHours.toFixed(1)}<small>h</small>`;
        if (elRejected) elRejected.innerText = rejectedCount;
        if (elApproved) elApproved.innerText = approvedCount;
        if (elExpired) elExpired.innerText = expiredCount;

        // Force a re-run of animations
        animateMetrics();
    } catch (error) {
        console.error("Error updating metrics:", error);
    }
}   

function animateMetrics() {
    document.querySelectorAll('.metric-value').forEach(el => {
        const small  = el.querySelector('small');
        const suffix = small ? small.outerHTML : '';
        const raw    = parseFloat(el.textContent);
        if (isNaN(raw) || raw === 0) return;

        const isDecimal = String(el.textContent).includes('.');     
        const duration  = 1000;
        const startTime = performance.now();

        function step(now) {
            const elapsed  = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3);
            const current  = eased * raw;
            el.innerHTML   = (isDecimal ? current.toFixed(1) : Math.floor(current).toString()) + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    });
}

export function initMetrics() {
    // Initial animation setup
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach(card => {
        card.addEventListener('animationend', () => {
            if (!card.classList.contains('is-mounted')) {
                card.classList.add('is-mounted');
            }
        }, { once: true });
    });
}
