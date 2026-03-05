function initActivityChart(stats) {
    const ctx = document.getElementById('activityChart')?.getContext('2d');
    if (!ctx) return;
    
    // Генерируем данные за последние 24 часа
    const labels = [];
    const data = [];
    
    for (let i = 23; i >= 0; i--) {
        const hour = new Date();
        hour.setHours(hour.getHours() - i);
        labels.push(hour.getHours() + ':00');
        
        // Генерируем случайные данные на основе текущих игроков
        const baseValue = stats.playing || 1000;
        const variation = Math.random() * 0.3 - 0.15; // -15% до +15%
        data.push(Math.round(baseValue * (1 + variation)));
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Players',
                data: data,
                borderColor: '#00A2FF',
                backgroundColor: 'rgba(0, 162, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { callback: value => formatNumber(value) }
                },
                x: {
                    grid: { display: false },
                    ticks: { maxRotation: 0, maxTicksLimit: 8 }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}
