const fs = require('fs');
let code = fs.readFileSync('public/charts.js', 'utf8');

const sIdx = code.indexOf('window.openDayDetail = function(dateStr)');
if (sIdx > -1) {
    const eIdx = code.indexOf('window.closeDayDetail = function');
    const endOfClose = code.indexOf('};', eIdx) + 2;
    
    const newBlock = `
window.selectCalendarDay = function(dateStr) {
    const ds = window.appData.doses;
    const subData = window.appData.substances;
    
    // Highlight the selected day in calendar
    document.querySelectorAll('.cal-day-btn').forEach(b => {
        if(b.dataset.date === dateStr) {
            b.classList.add('ring-2', 'ring-accent-500', 'ring-offset-2', 'dark:ring-offset-slate-900', 'shadow-glow');
        } else {
            b.classList.remove('ring-2', 'ring-accent-500', 'ring-offset-2', 'dark:ring-offset-slate-900', 'shadow-glow');
        }
    });

    const dDate = new Date(dateStr);
    const dayName = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota'][dDate.getDay()];
    document.getElementById('historyDayLabel').innerText = dayName + ' ' + dDate.toLocaleDateString('cs-CZ');
    
    const dayDoses = ds.filter(d => new Date(d.timestamp).toDateString() === new Date(dateStr).toDateString())
                       .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    document.getElementById('historyDayCount').innerText = dayDoses.length;
    
    const summary = document.getElementById('historyDaySummary');
    if (dayDoses.length === 0) {
        summary.innerHTML = '';
    } else {
        const uniqueSubs = new Set(dayDoses.map(d=>d.substanceId)).size;
        const totalMg = dayDoses.reduce((acc, d) => acc + Number(d.amount), 0).toFixed(1);
        summary.innerHTML = \`
            <div class="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">\${uniqueSubs} látek</div>
            <div class="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">\${totalMg} mg celkem</div>
            <div class="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-bold">Aktivní den</div>
        \`;
    }

    const cont = document.getElementById('historyTimeline');
    if (dayDoses.length === 0) {
        cont.innerHTML = '<div class="text-[10px] text-slate-500 font-bold text-center py-4 bg-slate-50 dark:bg-white/5 rounded-2xl">Žádné záznamy v tento den</div>';
    } else {
        cont.innerHTML = dayDoses.map(d => {
            const time = new Date(d.timestamp).toLocaleTimeString('cs-CZ', {hour:'2-digit', minute:'2-digit'});
            return \`
            <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 relative shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white dark:bg-black/20 shadow-sm border border-slate-100 dark:border-white/5">\${d.icon}</div>
                    <div>
                        <div class="flex items-center gap-2 font-black text-sm text-slate-800 dark:text-white">\${d.amount} \${d.unit} <span class="opacity-50">/</span> \${d.substanceName}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">\${time} &bull; \${window.ROUTE_NAMES && window.ROUTE_NAMES[d.route] ? window.ROUTE_NAMES[d.route] : d.route}</div>
                    </div>
                </div>
            </div>\`;
        }).join('');
    }
    
    const cw = document.getElementById('calChartWrap');
    if(window._calDayChart) {
        window._calDayChart.destroy();
        window._calDayChart = null;
    }
    
    if(dayDoses.length === 0) {
        cw.classList.add('hidden');
        return;
    }
    
    cw.classList.remove('hidden');
    const canvas = document.getElementById('calDayChart');
    const ctx = canvas.getContext('2d');
    
    const labels = [];
    const dataPts = [];
    const dosePts = new Array(24 * 4).fill(null); // every 15 mins
    const minT = new Date(dateStr).getTime();
    
    for(let h=0; h<24; h++) {
        for(let m=0; m<60; m+=15) {
            const t = minT + h*3600000 + m*60000;
            labels.push(h.toString().padStart(2,'0') + ':' + m.toString().padStart(2,'0'));
            
            let sumLvl = 0;
            // Also include doses from up to 2 days prior to be somewhat accurate
            const recentDoses = ds.filter(d => {
                const dt = new Date(d.timestamp).getTime();
                return dt <= t && dt > (t - 48*3600000); 
            });
            for(const d of recentDoses) {
                const dt = new Date(d.timestamp).getTime();
                const s = subData.find(x => x.id === d.substanceId);
                let hl = s?.halfLife || 1;
                if(hl > 24) hl = 24;
                const hoursPassed = (t - dt) / 3600000;
                sumLvl += d.amount * Math.pow(0.5, hoursPassed / hl);
            }
            dataPts.push(sumLvl);
        }
    }
    
    // Map doses to closest 15-min bucket for the selected day only
    for(const d of dayDoses) {
        const dt = new Date(d.timestamp);
        const h = dt.getHours();
        const m = dt.getMinutes();
        const bucket = h * 4 + Math.floor(m / 15);
        if(!dosePts[bucket]) dosePts[bucket] = 0;
        dosePts[bucket] += Number(d.amount);
    }
    
    window._calDayChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Dávka (mg)',
                    data: dosePts,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4,
                    barThickness: 6,
                    yAxisID: 'yBar',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Aktivní Hladina',
                    data: dataPts,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 3,
                    yAxisID: 'y',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    grid: {display:false},
                    ticks: { maxTicksLimit: 8, font: {size:10, family: 'Inter'} }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    border: {display:false},
                    grid: { color: 'rgba(150,150,150,0.1)' },
                    ticks: { font: {size:10, family: 'Inter'} }
                },
                yBar: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    border: {display:false},
                    grid: { display: false },
                    ticks: { display: false },
                    suggestedMax: Math.max(...dataPts)*1.5 || 100
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { boxWidth: 10, font: {family: 'Inter', size:10} }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            if(ctx.datasetIndex === 0) return 'Dávka: ' + ctx.raw + ' ud.';
                            return 'Hladina: ' + ctx.raw.toFixed(1) + ' ud.';
                        }
                    }
                }
            }
        }
    });
};
`;
    code = code.substring(0, sIdx) + newBlock + code.substring(endOfClose);
    fs.writeFileSync('public/charts.js', code, 'utf8');
} else {
    console.log("Could not find openDayDetail");
}
