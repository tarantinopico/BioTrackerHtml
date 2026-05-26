(() => {
    document.addEventListener("DOMContentLoaded", () => {
        let lastScrollY = window.scrollY;
        const nav = document.getElementById('mobileNav');
        if (nav) {
            window.addEventListener('scroll', () => {
                const currentScrollY = window.scrollY;
                if (currentScrollY > 60 && currentScrollY > lastScrollY + 10) nav.classList.add('nav-hidden');
                else if (currentScrollY < lastScrollY - 10 || currentScrollY < 60) nav.classList.remove('nav-hidden');
                lastScrollY = currentScrollY;
            }, { passive: true });
        }
        
        const floatFab = document.createElement('div');
        floatFab.className = 'fixed bottom-24 right-5 sm:hidden z-[90] transition-all duration-300';
        floatFab.innerHTML = `
            <button onclick="window.switchTab('logger')" class="w-14 h-14 bg-gradient-to-tr from-accent-600 to-accent-400 rounded-full shadow-[0_8px_16px_rgba(16,185,129,0.3)] shadow-accent-500/40 flex items-center justify-center text-white active:scale-95 transition-transform hover:shadow-lg border border-accent-300/30">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            </button>
        `;
        document.body.appendChild(floatFab);
        const originalSwitchTab = window.switchTab;
        window.switchTab = function(id) {
            if(floatFab) {
                floatFab.style.opacity = (id === 'logger' || id === 'settings' || id === 'substances') ? '0' : '1';
                floatFab.style.pointerEvents = floatFab.style.opacity === '1' ? 'auto' : 'none';
                floatFab.style.transform = floatFab.style.opacity === '1' ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)';
            }
            if(nav) nav.classList.remove('nav-hidden');
            if (originalSwitchTab) originalSwitchTab(id);
        };
        setTimeout(() => window.switchTab('dashboard'), 100);
    });
})();

(() => {
    const chartInstances = {};

    const isDark = () => document.documentElement.classList.contains('dark');
    const chartDefsChanged = () => {
        if(!window.Chart) return;
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = isDark() ? '#94a3b8' : '#64748b';
        Chart.defaults.scale.grid.color = isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        Chart.defaults.plugins.tooltip.backgroundColor = isDark() ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        Chart.defaults.plugins.tooltip.titleColor = isDark() ? '#f8fafc' : '#0f172a';
        Chart.defaults.plugins.tooltip.bodyColor = isDark() ? '#e2e8f0' : '#475569';
        Chart.defaults.plugins.tooltip.borderColor = isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.cornerRadius = 12;
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.elements.line.tension = 0.4;
        Chart.defaults.elements.line.borderWidth = 3;
        Chart.defaults.elements.point.radius = 0;
        Chart.defaults.elements.point.hoverRadius = 6;
        Chart.defaults.elements.bar.borderRadius = 4;
        Chart.defaults.elements.arc.borderWidth = isDark() ? 2 : 2;
        Chart.defaults.elements.arc.borderColor = isDark() ? '#0f172a' : '#ffffff';
    };

    window.addEventListener('resize', () => Object.values(chartInstances).forEach(i => i.resize()));

    function initCanvas(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return null;
        if (el.tagName.toUpperCase() === 'CANVAS') return el;
        if (!el.querySelector('canvas')) {
            el.innerHTML = '';
            const cvs = document.createElement('canvas');
            el.appendChild(cvs);
        }
        return el.querySelector('canvas');
    }

    function createChart(id, type, data, options = {}) {
        const cvs = initCanvas(id);
        if (!cvs || !window.Chart) return null;
        if (chartInstances[id]) chartInstances[id].destroy();
        chartDefsChanged();

        const defOpt = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            interaction: { mode: 'index', intersect: false }
        };
        const mOpt = Object.assign({}, defOpt, options);
        if(options.plugins) mOpt.plugins = Object.assign({}, defOpt.plugins, options.plugins);
        
        chartInstances[id] = new Chart(cvs, { type, data, options: mOpt });
        return chartInstances[id];
    }
    
    function gradientFill(ctx, color) {
        if(!ctx || !ctx.chart || !ctx.chart.chartArea) return color+'33';
        const chartArea = ctx.chart.chartArea;
        const grad = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        grad.addColorStop(0, color + '80');
        grad.addColorStop(1, color + '00');
        return grad;
    }

    function setStat(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }

    // Exported function for drawing dashboard kinetic
    window.drawKineticGraph = function() {
        const act = window.getActiveComps();
        if (!act.length) { if(chartInstances['kineticCanvas']) chartInstances['kineticCanvas'].destroy(); return; }
        
        const now = Date.now();
        const labels = Array.from({length: 25}, (_, i) => `+${i}h`);
        
        const datasets = act.map((comp, idx) => {
            const data = [];
            for (let i = 0; i <= 24; i++) {
                let conc = 0;
                window.appData.doses.forEach(d => {
                    d.compounds.forEach(c => {
                        if (c.name === comp.name) conc += window.calcCompoundKinetic(c, d, ((now - new Date(d.timestamp).getTime()) / 3600000) + i);
                    });
                });
                data.push(Math.max(0, parseFloat(conc.toFixed(2))));
            }
            const color = window.CAT_COLORS[Object.keys(window.CAT_COLORS)[idx % Object.keys(window.CAT_COLORS).length]] || '#10b981';
            return {
                label: comp.name, data, borderColor: color,
                backgroundColor: ctx => gradientFill(ctx, color), fill: true
            };
        });

        createChart('kineticCanvas', 'line', { labels, datasets }, {
            scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } }, y: { display: false, beginAtZero: true } }
        });
    };
    
    window.drawSubstanceDetailCharts = function(sub, subDoses, col) {
        if (!subDoses.length) return;
        const now = new Date(); now.setHours(0,0,0,0);
        const L30 = [];
        for(let i=29; i>=0; i--) { 
            const d = new Date(now.getTime() - i*86400000);
            L30.push({ str: `${("0"+d.getDate()).slice(-2)}.${("0"+(d.getMonth()+1)).slice(-2)}.`, t: d.toDateString() }); 
        }

        // Daily Amt
        const dAmt = L30.map(dDay => parseFloat(subDoses.filter(d => new Date(d.timestamp).toDateString() === dDay.t).reduce((s,d) => s + d.amount, 0).toFixed(1)));
        createChart('sdChart-daily', 'line', {
            labels: L30.map(d=>d.str),
            datasets: [{ label: 'Generální dávka', data: dAmt, borderColor: col, backgroundColor: ctx => gradientFill(ctx, col), fill: true }]
        }, { scales: { x: { grid: { display: false }, ticks: {maxTicksLimit:8} }, y: { border: {dash: [4,4]}, grid: {color:isDark()?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)'} } } });
        
        // Tolerance (7d moving avg)
        const dAct = L30.map(dDay => subDoses.filter(d => new Date(d.timestamp).toDateString() === dDay.t).reduce((s,d) => s + (d.compounds[0]?.amountMg||0), 0));
        const tMA = dAct.map((v, i, arr) => {
            const sum = arr.slice(Math.max(0, i-6), i+1).reduce((a,b)=>a+b,0);
            return parseFloat((sum / Math.min(i+1, 7)).toFixed(1));
        });
        createChart('sdChart-tolerance', 'line', {
            labels: L30.map(d=>d.str),
            datasets: [
                { label: 'MA(7d)', data: tMA, borderColor: '#f43f5e', backgroundColor: ctx => gradientFill(ctx, '#f43f5e'), fill: true },
                { label: 'Denně', data: dAct.map(x=>parseFloat(x.toFixed(1))), borderColor: isDark()?'#475569':'#cbd5e1', borderDash: [4,4], borderWidth: 1.5, fill: false }
            ]
        }, { scales: { x: { grid: { display: false } }, y: { display: false } } });

        // Histogram
        const buckets=[{l:'Mikro',c:0},{l:'Lehká',c:0},{l:'Běžná',c:0},{l:'Silná',c:0}];
        const lc=sub.compounds[0]||{thresh:0,light:0,heavy:0};
        subDoses.forEach(d=>{
            const amg=d.compounds[0]?.amountMg||0;
            if(amg>=lc.heavy)buckets[3].c++;else if(amg>=lc.light)buckets[2].c++;else if(amg>=lc.thresh)buckets[1].c++;else buckets[0].c++;
        });
        createChart('sdChart-histogram', 'bar', {
            labels: buckets.map(b=>b.l),
            datasets: [{ label: 'Počet apl.', data: buckets.map(b=>b.c), backgroundColor: col }]
        }, { scales: { x: { grid: {display:false} }, y: { display: false } } });

        // DOW
        const dow = Array(7).fill(0);
        subDoses.forEach(d => dow[(new Date(d.timestamp).getDay()+6)%7]++);
        createChart('sdChart-dow', 'bar', {
            labels: ['Po','Út','St','Čt','Pá','So','Ne'],
            datasets: [{ label: 'Aktivita', data: dow, backgroundColor: '#8b5cf6' }]
        }, { scales: { x: { grid: {display:false} }, y: { display: false } } });

        // TOD
        const tod = Array(24).fill(0);
        subDoses.forEach(d => tod[new Date(d.timestamp).getHours()]++);
        createChart('sdChart-tod', 'bar', {
            labels: Array.from({length:24},(_,i)=>i+'h'),
            datasets: [{ label: 'Opakování', data: tod, backgroundColor: '#f59e0b' }]
        }, { scales: { x: { grid: {display:false}, ticks:{maxTicksLimit:8} }, y: { display: false } } });

        // Cost
        let cCost = 0;
        const dCost = L30.map(dDay => {
            const sum = subDoses.filter(d => new Date(d.timestamp).toDateString() === dDay.t).reduce((s,d) => s + (Number(d.price)||0), 0);
            cCost += sum;
            return cCost;
        });
        createChart('sdChart-cost', 'line', {
            labels: L30.map(d=>d.str),
            datasets: [{ label: 'Kč', data: dCost, borderColor: '#10b981', backgroundColor: ctx => gradientFill(ctx, '#10b981'), fill: true }]
        }, { scales: { x: { grid: { display: false } }, y: { display: false } } });

        // ROA
        const rMap={}; subDoses.forEach(d=>{rMap[d.route]=(rMap[d.route]||0)+1;});
        createChart('sdChart-roa', 'doughnut', {
            labels: Object.keys(rMap).map(k => window.ROUTE_NAMES[k]||k),
            datasets: [{ data: Object.values(rMap), backgroundColor: ['#3b82f6','#a855f7','#f97316','#10b981','#ec4899','#8b5cf6'] }]
        }, { cutout: '65%' });
        
        // Variants
        const vMap={}; subDoses.forEach(d=>{ const n = d.variantName || '—'; vMap[n]=(vMap[n]||0)+1;});
        createChart('sdChart-variants', 'doughnut', {
            labels: Object.keys(vMap),
            datasets: [{ data: Object.values(vMap), backgroundColor: ['#f43f5e','#8b5cf6','#06b6d4','#eab308'] }]
        }, { cutout: '65%', plugins: { legend: { display: true, position: 'right', labels: { boxWidth: 10, font: {size: 10} } } } });
    };

    window.computeAndDrawAnalytics = function() {
        if (!window.Chart || !document.getElementById('tab-analytics')?.classList.contains('active')) return;
        
        const ds = window.appData.doses;
        const subData = window.appData.substances;
        if (!ds.length) return;

        const now = new Date(); now.setHours(0,0,0,0);
        const L14 = [];
        for(let i=13; i>=0; i--) { 
            const d = new Date(now.getTime() - i*86400000);
            L14.push({ str: `${("0"+d.getDate()).slice(-2)}.${("0"+(d.getMonth()+1)).slice(-2)}.`, t: d.toDateString() }); 
        }

        const dateStr = d => new Date(d.timestamp).toDateString();
        const dates = [...new Set(ds.map(dateStr))];
        const spend = ds.reduce((s,d)=>s+(Number(d.price)||0),0);
        
        // Combos
        const combos = {};
        dates.forEach(dt => {
            const dayDs = [...new Set(ds.filter(d=>dateStr(d)===dt).map(d=>d.substanceId))].sort();
            if(dayDs.length > 1) {
                const sNames = dayDs.map(id => subData.find(s=>s.id===id)?.name).filter(Boolean);
                if(sNames.length>1) {
                    const key = sNames.join(' + ');
                    combos[key] = (combos[key]||0)+1;
                }
            }
        });
        const topCombo = Object.keys(combos).sort((a,b)=>combos[b]-combos[a])[0] || '-';
        
        const cntSub={}, cntCat={}, cntRec={}, cntVar={}, activeSum={};
        let gross=0, activeMg=0;
        ds.forEach(d=>{
            gross+=d.amount;
            d.compounds.forEach(c=>activeMg+=c.amountMg);
            const sub = subData.find(s=>s.id===d.substanceId);
            if(!sub) return;
            cntSub[sub.name] = (cntSub[sub.name]||0)+1;
            cntCat[sub.category] = (cntCat[sub.category]||0)+1;
            if(sub.receptor) cntRec[sub.receptor] = (cntRec[sub.receptor]||0)+1;
            if(d.variantName) cntVar[d.variantName] = (cntVar[d.variantName]||0)+1;
            activeSum[sub.name] = (activeSum[sub.name]||0) + d.compounds.reduce((s,c)=>s+c.amountMg,0);
        });

        const favSub = Object.keys(cntSub).sort((a,b)=>cntSub[b]-cntSub[a])[0] || '-';
        const favCatId = Object.keys(cntCat).sort((a,b)=>cntCat[b]-cntCat[a])[0];
        const favRecId = Object.keys(cntRec).sort((a,b)=>cntRec[b]-cntRec[a])[0];
        const topVar = Object.keys(cntVar).sort((a,b)=>cntVar[b]-cntVar[a])[0] || '-';
        const avgActive = activeMg / ds.length;

        // Streaks
        const sorted = [...ds].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
        let sumDowntime = 0, gaps = 0, longestSober = 0;
        for(let i=1; i<sorted.length; i++) {
            const h = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / 3600000;
            if(h>0) { sumDowntime+=h; gaps++; }
            if(h/24 > longestSober) longestSober = h/24;
        }
        const activeSoberStreak = (new Date() - new Date(sorted[sorted.length-1].timestamp)) / 86400000;
        if(activeSoberStreak > longestSober) longestSober = activeSoberStreak;

        let streak = 0;
        for(let i=0; i<365; i++){
            const dt = new Date(); dt.setDate(dt.getDate()-i);
            if(dates.includes(dt.toDateString())) streak++;
            else if(i>0) break;
        }

        const daysTotal = Math.max(1, (new Date() - new Date(sorted[0].timestamp))/86400000);
        const avgSp = spend / daysTotal;
        const dowCnt = Array(7).fill(0);
        ds.forEach(d => dowCnt[(new Date(d.timestamp).getDay() + 6) % 7]++);
        const topDay = ['Po','Út','St','Čt','Pá','So','Ne'][dowCnt.indexOf(Math.max(...dowCnt))];

        setStat('stat-totalDoses', ds.length);
        setStat('stat-favSub', favSub);
        setStat('stat-totalSpend', window.fmtMoney(spend));
        setStat('stat-topCombo', topCombo);
        setStat('stat-favCat', window.CAT_NAMES[favCatId] || '-');
        setStat('stat-topReceptor', window.RECEPTOR_NAMES[favRecId] || '-');
        setStat('stat-topVariantName', topVar);
        setStat('stat-avgActiveDose', parseFloat(avgActive.toFixed(1)) + ' mg');
        setStat('stat-daysTracked', dates.length);
        setStat('stat-activeStreak', streak + 'd');
        setStat('stat-topDay', topDay);
        setStat('stat-avgDowntime', gaps > 0 ? parseFloat((sumDowntime/gaps).toFixed(1)) + 'h' : '-');
        setStat('stat-longestSober', parseFloat(longestSober.toFixed(1)) + 'd');
        setStat('stat-avgSpend', window.fmtMoney(avgSp));
        setStat('stat-yearlySpend', window.fmtMoney(avgSp * 365));
        setStat('stat-totalGross', window.fmtAmt(gross, 'X'));
        setStat('stat-totalActive', parseFloat(activeMg.toFixed(1)) + ' mg');

        // ----- CHARTS ----- //

        createChart('chart-radarCat', 'radar', {
            labels: Object.keys(window.CAT_NAMES).map(k=>window.CAT_NAMES[k]),
            datasets: [{
                label: 'Kategorie',
                data: Object.keys(window.CAT_NAMES).map(k=>(cntCat[k]||0)),
                backgroundColor: 'rgba(16,185,129,0.3)', borderColor: '#10b981', pointBackgroundColor: '#10b981'
            }]
        }, { scales: { r: { ticks: {display: false}, grid: {color:isDark()?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'}, pointLabels: {color:isDark()?'#cbd5e1':'#475569'} } } });

        const sortedSubs = Object.entries(cntSub).sort((a,b)=>b[1]-a[1]).slice(0,5);
        createChart('chart-topSubs', 'bar', {
            labels: sortedSubs.map(x=>x[0]),
            datasets: [{ label: 'Počet', data: sortedSubs.map(x=>x[1]), backgroundColor: '#8b5cf6' }]
        }, { indexAxis: 'y', scales: { x:{display:false}, y:{grid:{display:false}} } });

        // Heatmap rendering (Custom DOM instead of Chartjs to make it look like a calendar grid)
        const heatEl = document.getElementById('chart-heatmap');
        if(heatEl) {
            heatEl.innerHTML = '';
            const grid = document.createElement('div');
            grid.className = 'w-full h-full pb-2';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(15, 1fr)';
            grid.style.gap = '4px';
            const hData = [];
            for(let i=29;i>=0;i--){
                const dt = new Date(now.getTime() - i*86400000);
                hData.push({ d: dt, c: ds.filter(d=>dateStr(d)===dt.toDateString()).length });
            }
            const maxC = Math.max(...hData.map(d=>d.c)) || 1;
            hData.forEach(d => {
                const b = document.createElement('div');
                const int = d.c / maxC;
                b.className = `rounded w-full aspect-square transition-all duration-300 hover:scale-110`;
                b.style.backgroundColor = d.c > 0 ? (isDark() ? `rgba(59,130,246,${0.2+0.8*int})` : `rgba(37,99,235,${0.2+0.8*int})`) : (isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)');
                b.title = `${("0"+d.d.getDate()).slice(-2)}.${("0"+(d.d.getMonth()+1)).slice(-2)} - ${d.c} dávek`;
                grid.appendChild(b);
            });
            heatEl.appendChild(grid);
        }

        if(document.getElementById('chart-globalTod')) {
            const hCounts = new Array(24).fill(0);
            ds.forEach(d => {
                const hour = new Date(d.timestamp).getHours();
                hCounts[hour]++;
            });
            createChart('chart-globalTod', 'bar', {
                labels: Array.from({length:24},(_,i)=>i+':00'),
                datasets: [{ 
                    label: 'Dávek', 
                    data: hCounts, 
                    backgroundColor: isDark() ? 'rgba(129, 140, 248, 0.8)' : 'rgba(99, 102, 241, 0.8)',
                    borderRadius: 4
                }]
            }, {
                scales: { x: { display: true, ticks: {font:{size:9}} }, y: { beginAtZero: true, ticks: {stepSize: 1, precision: 0} } }
            });
        }

        if(document.getElementById('chart-globalTrend')) {
            const trData = [];
            for(let i=29;i>=0;i--){
                const dt = new Date(now.getTime() - i*86400000);
                trData.push( ds.filter(d=>dateStr(d)===dt.toDateString()).length );
            }
            const lbls = Array.from({length:30}, (_,i) => {
                const dt = new Date(now.getTime() - (29-i)*86400000);
                return `${dt.getDate()}.${dt.getMonth()+1}.`;
            });
            createChart('chart-globalTrend', 'line', {
                labels: lbls,
                datasets: [{
                    label: 'Celkem za den',
                    data: trData,
                    borderColor: '#f59e0b',
                    backgroundColor: gradientFill('#f59e0b', 0.5),
                    fill: true,
                    tension: 0.4
                }]
            }, {
                plugins: { legend: { display: false } },
                scales: { x: { display: true, ticks: {maxTicksLimit: 7} }, y: { beginAtZero: true, ticks: {stepSize: 1, precision: 0} } }
            });
        }

        const rcData = Object.entries(cntRec).map(([k,v])=>({n: window.RECEPTOR_NAMES[k]||k, v}));
        createChart('chart-receptorsPie', 'doughnut', {
            labels: rcData.map(d=>d.n),
            datasets: [{ data: rcData.map(d=>d.v), backgroundColor: ['#22c55e','#3b82f6','#8b5cf6','#f43f5e','#f59e0b'] }]
        }, { cutout: '60%', plugins:{legend:{display:true, position:'right', labels:{boxWidth:12, font:{size:10}}}} });

        const strB=[{l:'Mikro',c:0},{l:'Lehká',c:0},{l:'Běžná',c:0},{l:'Silná',c:0}];
        ds.forEach(d=>{
            const s = subData.find(x=>x.id===d.substanceId);
            const lc = s?.compounds?.[0]||{thresh:0,light:0,heavy:0};
            const amg = d.compounds[0]?.amountMg||0;
            if(amg>0) { if(amg>=lc.heavy) strB[3].c++;else if(amg>=lc.light) strB[2].c++;else if(amg>=lc.thresh) strB[1].c++;else strB[0].c++; }
        });
        createChart('chart-doseStrengthPie', 'pie', {
            labels: strB.map(b=>b.l),
            datasets: [{ data: strB.map(b=>b.c), backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444'] }]
        });

        const vCosts = {};
        ds.forEach(d=> { if(d.variantName) vCosts[d.variantName] = (vCosts[d.variantName]||0) + (Number(d.price)||0); });
        createChart('chart-variantCostsPie', 'doughnut', {
            labels: Object.keys(vCosts),
            datasets: [{ data: Object.values(vCosts), backgroundColor: ['#ec4899','#8b5cf6','#3b82f6','#10b981'] }]
        }, { cutout: '65%' });

        const sortedVar = Object.entries(cntVar).sort((a,b)=>b[1]-a[1]).slice(0,6);
        createChart('chart-topVariantsCount', 'bar', {
            labels: sortedVar.map(x=>x[0]),
            datasets: [{ label: 'Počet', data: sortedVar.map(x=>x[1]), backgroundColor: '#ec4899' }]
        }, { indexAxis: 'y', scales: { x:{display:false}, y:{grid:{display:false}} } });

        const cTodCnt = Array(24).fill(0);
        ds.forEach(d => cTodCnt[new Date(d.timestamp).getHours()]++);
        createChart('chart-tod', 'bar', {
            labels: Array.from({length:24},(_,i)=>i+'h'),
            datasets: [{ label: 'Dávky', data: cTodCnt, backgroundColor: '#f59e0b' }]
        }, { scales: { x:{grid:{display:false}}, y:{display:false} } });

        // Heatmapa denní doby (Kdy dominují látky)
        if(document.getElementById('chart-timeHeatmap')) {
            const hData = {};
            ds.forEach(d => {
                const s = subData.find(x => x.id === d.substanceId);
                const sName = s ? s.name : 'Neznámé';
                const h = new Date(d.timestamp).getHours(); // 0-23
                if(!hData[sName]) hData[sName] = new Array(24).fill(0);
                hData[sName][h]++;
            });
            const topSubs = Object.keys(hData).sort((a,b) => ds.filter(d=>subData.find(x=>x.id===d.substanceId)?.name===b).length - ds.filter(d=>subData.find(x=>x.id===d.substanceId)?.name===a).length).slice(0, 5);
            
            const datasets = topSubs.map((sName, i) => {
                const colors = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6'];
                return {
                    label: sName,
                    data: hData[sName],
                    backgroundColor: colors[i % colors.length],
                    borderRadius: 4
                };
            });
            
            const labels = Array.from({length:24}, (_,i)=> i+'h');
            
            createChart('chart-timeHeatmap', 'bar', {
                labels: labels,
                datasets: datasets
            }, { 
                scales: { 
                    x:{ stacked: true, grid:{display:false} },
                    y:{ stacked: true, beginAtZero: true, border: {display: false}, ticks:{stepSize:1} }
                },
                plugins: { legend: { display: true, position: 'top' } }
            });
        }


        createChart('chart-dow', 'bar', {
            labels: ['Po','Út','St','Čt','Pá','So','Ne'],
            datasets: [{ label: 'Počet', data: dowCnt, backgroundColor: '#6366f1' }]
        }, { scales: { x:{grid:{display:false}}, y:{display:false} } });

        const rM={}; ds.forEach(d=>{rM[d.route]=(rM[d.route]||0)+1;});
        createChart('chart-routes', 'doughnut', {
            labels: Object.keys(rM).map(k=>window.ROUTE_NAMES[k]||k),
            datasets: [{ data: Object.values(rM), backgroundColor: ['#6366f1','#ec4899','#f59e0b','#10b981'] }]
        }, { cutout: '70%' });

        // 14 Days Series
        const l14Cnt=[], l14Act=[], l14Spd=[]; let cumS=0;
        L14.forEach(dDay => {
            const ms = ds.filter(d=>dateStr(d)===dDay.t);
            l14Cnt.push(ms.length);
            const amt = ms.reduce((s,d)=>s+d.compounds.reduce((ss,cc)=>ss+cc.amountMg,0),0);
            l14Act.push(parseFloat(amt.toFixed(1)));
            cumS += ms.reduce((s,d)=>s+(Number(d.price)||0),0);
            l14Spd.push(cumS);
        });

        createChart('chart-trend', 'line', {
            labels: L14.map(d=>d.str),
            datasets: [{ label: 'Dávky', data: l14Cnt, borderColor: '#3b82f6', backgroundColor: ctx => gradientFill(ctx,'#3b82f6'), fill: true }]
        }, { scales: { x:{grid:{display:false}}, y:{display:false} } });

        const maActive = l14Act.map((v, i, arr) => parseFloat((arr.slice(Math.max(0, i-2), i+1).reduce((a,b)=>a+b,0) / Math.min(i+1, 3)).toFixed(1)));
        createChart('chart-toleranceTrend', 'line', {
            labels: L14.map(d=>d.str),
            datasets: [
                { label: 'MA(3d)', data: maActive, borderColor: '#ef4444', backgroundColor: ctx => gradientFill(ctx,'#ef4444'), fill: true },
                { label: 'Denně', data: l14Act, borderColor: isDark()?'#475569':'#cbd5e1', borderDash:[4,4], fill: false, borderWidth: 1.5 }
            ]
        }, { scales: { x:{grid:{display:false}}, y:{display:false} } });

        createChart('chart-spendTrend', 'line', {
            labels: L14.map(d=>d.str),
            datasets: [{ label: 'Kč', data: l14Spd, borderColor: '#10b981', backgroundColor: ctx => gradientFill(ctx,'#10b981'), fill: true }]
        }, { scales: { x:{grid:{display:false}}, y:{display:false} } });

        createChart('chart-activeMassTrend', 'line', {
            labels: L14.map(d=>d.str),
            datasets: [{ label: 'mg', data: l14Act, borderColor: '#fb923c', backgroundColor: ctx => gradientFill(ctx,'#fb923c'), fill: true }]
        }, { scales: { x:{grid:{display:false}}, y:{display:false} } });

        
        // ---> ENHANCED FINANCE CHARTS START <---
        setStat('stat-costPerDose', ds.length > 0 ? window.fmtMoney(gross / ds.length) : window.fmtMoney(0));
        setStat('stat-lifetimeCost', window.fmtMoney(gross));

        if(document.getElementById('chart-monthlySpend')) {
            const msMap = {};
            // Group by YYYY-MM
            ds.forEach(d => {
                const dt = new Date(d.timestamp);
                const k = dt.getFullYear() + '-' + ('0' + (dt.getMonth()+1)).slice(-2);
                msMap[k] = (msMap[k]||0) + (Number(d.price)||0);
            });
            const mKeys = Object.keys(msMap).sort().slice(-6); // last 6 months
            const mLabels = mKeys.map(k => {
                const [y,m] = k.split('-');
                const monthNames = ['Led','Úno','Bře','Dub','Kvě','Čer','Čvc','Srp','Zář','Říj','Lis','Pro'];
                return `${monthNames[parseInt(m)-1]} ${y}`;
            });
            const mDataVals = mKeys.map(k => msMap[k]);
            
            createChart('chart-monthlySpend', 'bar', {
                labels: mLabels,
                datasets: [{ label: 'Výdaje', data: mDataVals, backgroundColor: '#3b82f6', borderRadius: 6 }]
            }, { 
                scales: { 
                    x:{ grid:{display:false} },
                    y:{ beginAtZero: true, border: {display: false} }
                }
            });
        }

        if(document.getElementById('chart-costByCat')) {
            const cMap = {};
            ds.forEach(d => {
                const s = subData.find(x=>x.id===d.substanceId);
                const cId = s ? s.category : 'Neznámé';
                const cName = window.CAT_NAMES[cId] || cId;
                cMap[cName] = (cMap[cName]||0) + (Number(d.price)||0);
            });
            const cKeys = Object.keys(cMap).sort((a,b)=>cMap[b]-cMap[a]); // Sort desc
            
            createChart('chart-costByCat', 'pie', {
                labels: cKeys,
                datasets: [{ 
                    data: cKeys.map(k=>cMap[k]), 
                    backgroundColor: ['#10b981','#3b82f6','#8b5cf6','#ec4899','#f59e0b', '#ef4444', '#14b8a6', '#64748b']
                }]
            }, {
                plugins: { legend: { display: true, position: 'right' } }
            });
        }
        // ---> ENHANCED FINANCE CHARTS END <---

        const costSub = {};
        ds.forEach(d=>{ const n = subData.find(s=>s.id===d.substanceId)?.name; if(n) costSub[n] = (costSub[n]||0)+(Number(d.price)||0); });
        const topCS = Object.entries(costSub).sort((a,b)=>b[1]-a[1]).slice(0,10);
        createChart('chart-topCostSubs', 'bar', {
            labels: topCS.map(x=>x[0]),
            datasets: [{ label: 'Kč', data: topCS.map(x=>x[1]), backgroundColor: '#10b981' }]
        }, { indexAxis: 'y', scales: { x:{display:false}, y:{grid:{display:false}} } });

        const top3Ids = Object.keys(cntSub).sort((a,b)=>cntSub[b]-cntSub[a]).slice(0,3);
        const mcColors = ['#3b82f6', '#ec4899', '#f59e0b'];
        const mData = top3Ids.map((name, i) => {
            const hist = L14.map(dDay => ds.filter(d=>dateStr(d)===dDay.t && subData.find(s=>s.id===d.substanceId)?.name===name).length);
            return { label: name, data: hist, borderColor: mcColors[i], fill: false };
        });
        createChart('chart-multiTrend', 'line', {
            labels: L14.map(d=>d.str), datasets: mData
        }, { scales: { x:{grid:{display:false}}, y:{display:false} }, plugins: { legend: { display: true, position: 'bottom' } } });
    };

    let calCurrentMonthDate = new Date();
    window.changeCalendarMonth = function(diff) {
        calCurrentMonthDate.setMonth(calCurrentMonthDate.getMonth() + diff);
        window.buildCalendar();
    };
    window.jumpCalendarToday = function() {
        calCurrentMonthDate = new Date();
        window.buildCalendar();
        setTimeout(() => window.selectCalendarDay(new Date().toDateString()), 50);
    };

    window.buildCalendar = function() {
        const titleEl = document.getElementById('historyCalendarMonthLabel');
        const gridEl = document.getElementById('historyCalendarGrid');
        const wDays = document.getElementById('historyCalendarWeekdays');
        if (!gridEl || !titleEl || !wDays) return;
        
        const year = calCurrentMonthDate.getFullYear();
        const month = calCurrentMonthDate.getMonth();
        const monthNames = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
        titleEl.innerText = `${monthNames[month]} ${year}`;
        
        if (!wDays.innerHTML) wDays.innerHTML = ['Po','Út','St','Čt','Pá','So','Ne'].map(d=>`<div class="text-[10px] uppercase font-bold text-slate-400 text-center py-2">${d}</div>`).join('');
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = (firstDay.getDay() + 6) % 7;
        
        let html = '';
        for (let i = 0; i < startOffset; i++) {
            html += `<div class="aspect-square rounded-2xl bg-slate-50 dark:bg-white/5 opacity-50"></div>`;
        }
        
        const ds = window.appData.doses;
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dStr = new Date(year, month, day).toDateString();
            const dosesForDay = ds.filter(d => new Date(d.timestamp).toDateString() === dStr);
            const isToday = new Date().toDateString() === dStr;
            
            let cls = isDark() ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200/60';
            if (isToday) cls += ' ring-2 ring-accent-500 ring-offset-2 dark:ring-offset-slate-900 border-accent-500/50 shadow-glow';
            
            if (dosesForDay.length > 0) {
                const intensity = Math.min(dosesForDay.length / 5, 1);
                html += `<div class="aspect-square rounded-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center border border-transparent shadow-md font-sans font-black flex items-center justify-center text-white cal-day-btn" data-date="${dStr}" style="background: rgba(16, 185, 129, ${0.4 + intensity * 0.6})" onclick="window.selectCalendarDay('${dStr}')">
                    <span class="text-xs">${day}</span>
                </div>`;
            } else {
                html += `<div class="aspect-square rounded-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center border ${cls} cal-day-btn" data-date="${dStr}" onclick="window.selectCalendarDay('${dStr}')">
                    <span class="text-xs font-bold text-slate-400 dark:text-slate-500">${day}</span>
                </div>`;
            }
        }
        gridEl.innerHTML = html;
        if (!window._firstCalBuild) {
            window._firstCalBuild = true;
            setTimeout(() => window.selectCalendarDay(new Date().toDateString()), 50);
        }
        
        const dCount = document.getElementById('cal-dosesCount');
        const dDays = document.getElementById('cal-daysDist');
        if(dCount) dCount.innerText = ds.filter(d=>new Date(d.timestamp).getMonth()===month && new Date(d.timestamp).getFullYear()===year).length;
        if(dDays) dDays.innerText = new Set(ds.filter(d=>new Date(d.timestamp).getMonth()===month && new Date(d.timestamp).getFullYear()===year).map(d=>new Date(d.timestamp).toDateString())).size;
    };

    const originalUpdateDashboard = window.updateDashboard;
    window.updateDashboard = function() {
        if(originalUpdateDashboard) originalUpdateDashboard();
        if(window.drawKineticGraph) window.drawKineticGraph();
    };

    window.renderRecentLogs = function() {
        const ds = window.appData.doses;
        const cont = document.getElementById('recentLogs');
        if(!cont) return;
        const recent = ds.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,10);
        if(!recent.length) { cont.innerHTML = '<div class="text-xs text-slate-500 font-bold p-6 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">Zatím žádné záznamy.</div>'; return; }
        
        cont.innerHTML = recent.map((d, i) => {
            return `
            <div class="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow mb-3">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner relative overflow-hidden">
                        <div class="absolute inset-0 opacity-20" style="background:${d.color}"></div>
                        <span class="relative z-10 drop-shadow-sm">${d.icon}</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 font-black text-[15px] privacy-target text-slate-800 dark:text-white tracking-tight">${d.amount} ${d.unit} <span class="opacity-50">/</span> ${d.substanceName}</div>
                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">${window.formatTimeAgoDetailed(d.timestamp)} &bull; ${window.ROUTE_NAMES[d.route]||d.route}</div>
                    </div>
                </div>
                <button class="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center transition-colors shadow-sm" onclick="window.delLog('${d.id}')">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>`;
        }).join('');
    };

    if ('serviceWorker' in navigator) {
        // window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(console.error));
    }
})();



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
        summary.innerHTML = `
            <div class="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">${uniqueSubs} látek</div>
            <div class="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">${totalMg} mg celkem</div>
            <div class="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-bold">Aktivní den</div>
        `;
    }

    const cont = document.getElementById('historyTimeline');
    if (dayDoses.length === 0) {
        cont.innerHTML = '<div class="text-[10px] text-slate-500 font-bold text-center py-4 bg-slate-50 dark:bg-white/5 rounded-2xl">Žádné záznamy v tento den</div>';
    } else {
        cont.innerHTML = dayDoses.map(d => {
            const time = new Date(d.timestamp).toLocaleTimeString('cs-CZ', {hour:'2-digit', minute:'2-digit'});
            return `
            <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 relative shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white dark:bg-black/20 shadow-sm border border-slate-100 dark:border-white/5">${d.icon}</div>
                    <div>
                        <div class="flex items-center gap-2 font-black text-sm text-slate-800 dark:text-white">${d.amount} ${d.unit} <span class="opacity-50">/</span> ${d.substanceName}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${time} &bull; ${window.ROUTE_NAMES && window.ROUTE_NAMES[d.route] ? window.ROUTE_NAMES[d.route] : d.route}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    
    const cw = document.getElementById('calChartWrap');
    if(window._calDayChart) {
        window._calDayChart.destroy();
        window._calDayChart = null;
    }
    
    
    let hasTail = false;
    // We already compute dataPts later, so let's just NOT hide it unconditionally.
    
    
    cw.classList.remove("hidden");
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


