window.isDark = ()=>document.documentElement.classList.contains('dark');
window.gridColor = ()=>window.isDark()?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)';
window.textColor = ()=>window.isDark()?'#fff':'#0f172a';
window.mutedColor = ()=>window.isDark()?'#a1a1aa':'#52525b';

window.setupCanvas = function(id){
    const cvs=document.getElementById(id);
    if(!cvs || !cvs.parentElement) return null;
    const r=cvs.parentElement.getBoundingClientRect();
    const w=Math.max(0,Math.floor(r.width));
    const h=Math.max(0,Math.floor(r.height));
    if(!w || !h) return null;
    const ctx=cvs.getContext('2d');
    const dpr=Math.min(window.devicePixelRatio||1,2);
    cvs.width=Math.floor(w*dpr);
    cvs.height=Math.floor(h*dpr);
    cvs.style.width=w+'px';
    cvs.style.height=h+'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr,dpr);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.clearRect(0,0,w,h);
    return{cvs,ctx,w,h,dpr};
}

let chartRedrawTimer=null;
window.scheduleChartRedraw = function(){
    clearTimeout(chartRedrawTimer);
    chartRedrawTimer=setTimeout(()=>{
        requestAnimationFrame(()=>{
            try {
                if(document.getElementById('tab-dashboard')?.classList.contains('active')) if (window.drawKineticGraph) window.drawKineticGraph();
                if(document.getElementById('tab-analytics')?.classList.contains('active')){
                    if (window.currentAnaTab === 'calendar') {
                        if (window.buildCalendar) window.buildCalendar();
                    } else if (!window.__analyticsBusy) {
                        window.__analyticsBusy = true;
                        try { if (window.computeAndDrawAnalytics) window.computeAndDrawAnalytics(); } finally {
                            setTimeout(() => window.__analyticsBusy = false, 50);
                        }
                    }
                }
                if(window.currentDetailSubId){
                    const sub=window.appData.substances.find(s=>s.id===window.currentDetailSubId);
                    if(sub){
                        const subDoses=window.appData.doses.filter(d=>d.substanceId===window.currentDetailSubId);
                        const col=window.CAT_COLORS[sub.category]||'#64748b';
                        if (window.drawSubstanceDetailCharts) window.drawSubstanceDetailCharts(sub,subDoses,col);
                    }
                }
            } catch(err) { console.warn('Chart redraw failed', err); }
        });
    }, 80);
}

window.drawGrid = function(ctx,w,h,cols=6,rows=4){
    ctx.strokeStyle=window.gridColor();ctx.lineWidth=1;ctx.beginPath();
    for(let i=0;i<=cols;i++){const x=i*(w/cols);ctx.moveTo(x,0);ctx.lineTo(x,h);}
    for(let i=0;i<=rows;i++){const y=i*(h/rows);ctx.moveTo(0,y);ctx.lineTo(w,y);}
    ctx.stroke();
}

window.drawNoData = function(ctx,w,h,msg='Žádná data'){
    ctx.fillStyle=window.mutedColor();ctx.textAlign='center';ctx.font='bold 10px Inter';ctx.fillText(msg,w/2,h/2);
}

window.drawBarChartUtility = function(canvasId,dataItems,forceColor=null){
    const C=window.setupCanvas(canvasId);if(!C)return;const{ctx,w,h}=C;ctx.clearRect(0,0,w,h);
    if(!dataItems.length){window.drawNoData(ctx,w,h);return;}
    window.drawGrid(ctx,w,h,dataItems.length,4);
    const max=Math.max(...dataItems.map(d=>d.val))||1,barW=w/(dataItems.length*1.6);
    ctx.textAlign='center';
    dataItems.forEach((item,i)=>{
        const bh=Math.max((item.val/max)*(h-30),4);
        const x=i*(w/dataItems.length)+(w/dataItems.length)/2;
        const col=forceColor||item.color||'#10b981';
        const grd=ctx.createLinearGradient(0,h-bh-16,0,h-16);
        grd.addColorStop(0,col);grd.addColorStop(1,col+'80');
        ctx.fillStyle=grd;
        ctx.beginPath();
        if(ctx.roundRect) { ctx.roundRect(x-barW/2,h-bh-16,barW,bh,[4,4,0,0]); } else { ctx.fillRect(x-barW/2,h-bh-16,barW,bh); }
        ctx.fill();
        ctx.fillStyle=window.textColor();ctx.font='bold 8px Inter';ctx.textBaseline='bottom';
        ctx.fillText(item.val%1!==0?item.val.toFixed(1):item.val,x,h-bh-18);
        if(item.icon){ctx.font='11px sans-serif';ctx.textBaseline='top';ctx.fillText(item.icon,x,h-13);}
        else if(item.label){ctx.font='7px Inter';ctx.textBaseline='top';ctx.fillStyle=window.mutedColor();ctx.fillText(item.label.substring(0,7),x,h-13);}
    });
}

window.drawDoughnutUtility = function(canvasId,dataItems){
    const C=window.setupCanvas(canvasId);if(!C)return;const{ctx,w,h}=C;ctx.clearRect(0,0,w,h);
    const total=dataItems.reduce((s,d)=>s+d.val,0);
    if(!total){window.drawNoData(ctx,w,h);return;}
    const cx=w/3,cy=h/2,r=Math.min(w/3,h/2)*0.85,ir=r*0.55;
    let start=-Math.PI/2;
    dataItems.forEach(d=>{
        const slice=(d.val/total)*Math.PI*2;
        ctx.beginPath();ctx.arc(cx,cy,r,start,start+slice);ctx.arc(cx,cy,ir,start+slice,start,true);
        ctx.fillStyle=d.color;ctx.fill();
        start+=slice;
    });
    ctx.fillStyle=window.textColor();ctx.textAlign='center';ctx.font='bold 11px Inter';ctx.textBaseline='middle';
    ctx.fillText(total,cx,cy);
    ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='bold 8px Inter';
    const legendX=cx+r+12;
    dataItems.slice(0,6).forEach((d,i)=>{
        const ly=cy-(Math.min(dataItems.length,6)*14)/2+i*14+7;
        ctx.fillStyle=d.color;ctx.beginPath(); 
        if(ctx.roundRect) ctx.roundRect(legendX,ly-4,8,8,2); else ctx.fillRect(legendX,ly-4,8,8);
        ctx.fill();
        ctx.fillStyle=window.textColor();ctx.fillText(`${d.label} (${Math.round((d.val/total)*100)}%)`,legendX+11,ly);
    });
}

window.drawLineUtility = function(canvasId,points,color,labels=null,filled=true){
    const C=window.setupCanvas(canvasId);if(!C)return;const{ctx,w,h}=C;ctx.clearRect(0,0,w,h);
    const safePoints=(points&&points.length)?points:[0];
    const max=Math.max(1,...safePoints);
    window.drawGrid(ctx,w,h,Math.max(1,safePoints.length-1),4);
    const pad=12,cW=w-pad*2,cH=h-pad*2-16;
    const px=(i)=>safePoints.length===1?w/2:pad+i*(cW/(safePoints.length-1));
    const py=(v)=>pad+cH-(v/max)*cH;
    if(safePoints.length===1){
        ctx.fillStyle=color;
        ctx.beginPath();ctx.arc(px(0),py(safePoints[0]),3,0,Math.PI*2);ctx.fill();
    } else {
        ctx.beginPath();ctx.moveTo(px(0),py(safePoints[0]));
        for(let i=1;i<safePoints.length;i++)ctx.lineTo(px(i),py(safePoints[i]));
        ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();
        if(filled){
            const grd=ctx.createLinearGradient(0,0,0,h);grd.addColorStop(0,color+'55');grd.addColorStop(1,color+'00');
            ctx.lineTo(px(safePoints.length-1),h);ctx.lineTo(px(0),h);ctx.fillStyle=grd;ctx.fill();
        }
        ctx.fillStyle=color;
        safePoints.forEach((v,i)=>{if(v>0){ctx.beginPath();ctx.arc(px(i),py(v),2.5,0,Math.PI*2);ctx.fill();}});
    }
    if(labels){
        ctx.fillStyle=window.mutedColor();ctx.font='7px Inter';ctx.textAlign='center';ctx.textBaseline='top';
        labels.forEach((l,i)=>{if(i%Math.ceil(labels.length/7)===0)ctx.fillText(l,px(i),h-14);});
    }
}

window.drawMultiLineUtility = function(canvasId,datasets){
    const C=window.setupCanvas(canvasId);if(!C)return;const{ctx,w,h}=C;ctx.clearRect(0,0,w,h);
    const safeSets=(datasets||[]).map(ds=>({ ...ds, points:(ds.points&&ds.points.length)?ds.points:[0] }));
    let max=1;safeSets.forEach(ds=>ds.points.forEach(p=>{if(p>max)max=p;}));
    window.drawGrid(ctx,w,h,Math.max(1,safeSets[0]?.points.length-1||6),4);
    const pad=12,cW=w-pad*2,cH=h-pad*2;
    safeSets.forEach(ds=>{
        const pts=ds.points;
        ctx.beginPath();
        if(pts.length===1){
            ctx.moveTo(w/2, pad+cH-(pts[0]/max)*cH);
            ctx.arc(w/2, pad+cH-(pts[0]/max)*cH, 2.5, 0, Math.PI*2);
        } else {
            ctx.moveTo(pad,pad+cH-(pts[0]/max)*cH);
            for(let i=1;i<pts.length;i++)ctx.lineTo(pad+i*(cW/(pts.length-1)),pad+cH-(pts[i]/max)*cH);
        }
        ctx.strokeStyle=ds.color;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
        ctx.fillStyle=ds.color;
        pts.forEach((v,i)=>{if(v>0){ctx.beginPath();ctx.arc(pts.length===1?w/2:pad+i*(cW/(pts.length-1)),pad+cH-(v/max)*cH,2,0,Math.PI*2);ctx.fill();}});
    });
}

window.drawRadarUtility = function(canvasId,dataItems){
    const C=window.setupCanvas(canvasId);if(!C)return;const{ctx,w,h}=C;ctx.clearRect(0,0,w,h);
    if(dataItems.length<3)return;
    const cx=w/2,cy=h/2,r=Math.min(w,h)*0.32,max=Math.max(...dataItems.map(d=>d.val))||1;
    ctx.strokeStyle=window.gridColor();ctx.lineWidth=1;
    for(let level=1;level<=4;level++){
        ctx.beginPath();
        for(let i=0;i<dataItems.length;i++){const ang=(Math.PI*2/dataItems.length)*i-Math.PI/2;const vx=cx+Math.cos(ang)*r*(level/4);const vy=cy+Math.sin(ang)*r*(level/4);i===0?ctx.moveTo(vx,vy):ctx.lineTo(vx,vy);}
        ctx.closePath();ctx.stroke();
    }
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 8px Inter';
    dataItems.forEach((d,i)=>{
        const ang=(Math.PI*2/dataItems.length)*i-Math.PI/2;
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(ang)*r,cy+Math.sin(ang)*r);ctx.strokeStyle=window.gridColor();ctx.stroke();
        ctx.fillStyle=d.color;ctx.fillText(d.label,cx+Math.cos(ang)*(r+13),cy+Math.sin(ang)*(r+13));
    });
    ctx.beginPath();
    dataItems.forEach((d,i)=>{
        const ang=(Math.PI*2/dataItems.length)*i-Math.PI/2;
        const dist=r*(d.val/max);
        i===0?ctx.moveTo(cx+Math.cos(ang)*dist,cy+Math.sin(ang)*dist):ctx.lineTo(cx+Math.cos(ang)*dist,cy+Math.sin(ang)*dist);
    });
    ctx.closePath();ctx.fillStyle='rgba(16,185,129,0.35)';ctx.fill();ctx.strokeStyle='#10b981';ctx.lineWidth=1.5;ctx.stroke();
}

window.updateDashboard = function(){
    const now=new Date(),todayStr=now.toDateString(),act=window.getActiveComps();
    const todayDoses=window.appData.doses.filter(d=>new Date(d.timestamp).toDateString()===todayStr);
    const dtd = document.getElementById('dashTotalDoses');
    if (dtd) dtd.innerText=todayDoses.length;
    const dtc = document.getElementById('dashTotalCost');
    if (dtc) dtc.innerText=window.fmtMoney(todayDoses.reduce((s,d)=>s+(Number(d.price)||0),0));
    const tInfl=Math.min(100,Math.round(act.reduce((s,a)=>s+a.infl,0)));
    const stStr=tInfl===0?'Čistý':tInfl<30?'Lehký vliv':tInfl<75?'Silný':'Extrémní';
    const colCls=tInfl===0?'text-slate-500':tInfl<30?'text-emerald-500':tInfl<75?'text-orange-500':'text-red-500';
    const ii = document.getElementById('influenceIndex');
    if(ii) ii.innerText=`${tInfl}%`;
    const ir = document.getElementById('influenceRing');
    if(ir) ir.style.strokeDashoffset=283-(283*tInfl/100);
    const is = document.getElementById('influenceStatus');
    if(is) { is.innerText=stStr; is.className=`mt-2 text-[8px] font-black uppercase tracking-wide transition-colors ${colCls}`; }
    const dac = document.getElementById('dashActiveCountTxt');
    if(dac) dac.innerText=act.length;
    
    const dicCard = document.getElementById('desktopInfluenceCard');
    if(dicCard) {
        if(tInfl>=75&&!window.appData.settings.disableWarnings) dicCard.style.animation='pulseAlert 2s infinite';
        else dicCard.style.animation='';
    }
    
    const asl = document.getElementById('activeSubstancesList');
    if(asl) {
        asl.innerHTML=act.map((a,i)=>`
            <div class="flex justify-between items-center bg-white/60 dark:bg-black/40 p-2 rounded-lg border border-slate-200/50 dark:border-white/5 shadow-sm animate-stagger-${Math.min(5,i+1)}">
                <div class="font-bold text-[10px] privacy-target text-slate-800 dark:text-white truncate">${a.icon} ${a.name}</div>
                <div class="text-[9px] font-bold text-slate-500 whitespace-nowrap ml-2">${a.conc.toFixed(2)} <span class="text-accent-500">${Math.round(a.infl)}%</span></div>
            </div>`).join('');
    }

    const stats={};
    window.appData.doses.forEach(d=>{
        if(!stats[d.substanceId])stats[d.substanceId]={totalAmts:0,todayAmt:0,firstDate:new Date(d.timestamp),unit:d.unit};
        const dDate=new Date(d.timestamp);if(dDate<stats[d.substanceId].firstDate)stats[d.substanceId].firstDate=dDate;
        stats[d.substanceId].totalAmts+=d.amount;
        if(dDate.toDateString()===todayStr)stats[d.substanceId].todayAmt+=d.amount;
    });
    const lastMap={};window.appData.doses.forEach(d=>{if(!lastMap[d.substanceId]||new Date(d.timestamp)>new Date(lastMap[d.substanceId].timestamp))lastMap[d.substanceId]=d;});
    const lastArr=Object.values(lastMap).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).filter(d=>{const sub=window.appData.substances.find(s=>s.id===d.substanceId);return sub&&sub.status==='active';}).slice(0,4);
    const wgt=document.getElementById('lastUsedWidget');
    if(wgt) {
        if(!lastArr.length){wgt.innerHTML='<div class="text-[10px] font-bold text-slate-500 p-2">Zatím žádná data.</div>';}
        else {
            wgt.innerHTML=lastArr.map((d,i)=>{
                const sStat=stats[d.substanceId];
                const daysSince=Math.max(1,Math.ceil((now-sStat.firstDate)/86400000));
                const dailyAvg=sStat.totalAmts/daysSince;
                let trendStr='~0%',trendCol='text-slate-400';
                if(dailyAvg>0){const tr=((sStat.todayAmt-dailyAvg)/dailyAvg)*100;if(sStat.todayAmt===0){trendStr='-100%';trendCol='text-emerald-500';}else if(tr>5){trendStr='+'+tr.toFixed(0)+'%';trendCol='text-red-500';}else if(tr<-5){trendStr=tr.toFixed(0)+'%';trendCol='text-emerald-500';}}
                return `<div class="flex flex-col bg-white/70 dark:bg-black/50 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 shadow-sm relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform animate-stagger-${Math.min(5,i+1)}" onclick="window.switchTab('logger');document.getElementById('logSubstance').value='${d.substanceId}';window.handleSubstanceChange();">
                    <div class="absolute inset-0 opacity-[0.07]" style="background-color:${d.color}"></div>
                    <div class="flex justify-between items-start relative z-10 mb-1.5">
                        <div class="flex flex-col"><div class="flex items-center gap-1.5"><span class="text-xs">${d.icon}</span><span class="text-[10px] font-bold truncate privacy-target text-slate-800 dark:text-white">${d.substanceName}</span></div><span class="text-[8px] font-bold text-slate-500 mt-0.5 ml-5">${window.formatTimeAgoDetailed(d.timestamp)}</span></div>
                        <span class="text-[7px] font-black uppercase px-1.5 py-0.5 bg-white/60 dark:bg-black/40 rounded border border-slate-200/50 dark:border-white/5 text-slate-500">${window.formatTimeAgoShort(d.timestamp)}</span>
                    </div>
                    <div class="relative z-10 flex justify-between items-end border-t border-slate-200/50 dark:border-white/5 pt-1.5">
                        <div class="flex flex-col"><span class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Dnes</span><div class="flex items-baseline gap-1"><span class="text-xs font-black text-slate-700 dark:text-slate-200 privacy-target">${window.fmtAmt(sStat.todayAmt,sStat.unit)}</span><span class="text-[8px] font-bold ${trendCol}">${trendStr}</span></div></div>
                        <div class="flex flex-col items-end"><span class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ø/den</span><span class="text-[9px] font-bold text-slate-500 privacy-target">${window.fmtAmt(parseFloat(dailyAvg.toFixed(1)),sStat.unit)}</span></div>
                    </div>
                </div>`;
            }).join('');
        }
    }
    
    let spend7=0,spendPrev7=0;
    const nTime=new Date();nTime.setHours(0,0,0,0);
    window.appData.doses.forEach(d=>{const dt=new Date(d.timestamp);dt.setHours(0,0,0,0);const diff=Math.round((nTime-dt)/86400000);if(diff>=0&&diff<7)spend7+=Number(d.price)||0;else if(diff>=7&&diff<14)spendPrev7+=Number(d.price)||0;});
    ['dashTrendBar','dashTrendBarMob'].forEach(id=>{
        const tBar=document.getElementById(id);const tDir=document.getElementById(id.replace('Bar','Dir'));if(!tBar)return;
        if(spendPrev7===0){tBar.style.width='50%';tBar.className='h-full bg-slate-400 rounded-full transition-all';if(tDir)tDir.innerText='Nelze porovnat';}
        else{const ratio=spend7/spendPrev7;if(ratio>1){tBar.style.width=Math.min(100,50*ratio)+'%';tBar.className='h-full bg-red-500 rounded-full transition-all';if(tDir){tDir.innerText=`+${Math.round((ratio-1)*100)}%`;tDir.className='text-xs font-black text-red-500';}}else{tBar.style.width=(50*ratio)+'%';tBar.className='h-full bg-emerald-500 rounded-full transition-all';if(tDir){tDir.innerText=`-${Math.round((1-ratio)*100)}%`;tDir.className='text-xs font-black text-emerald-500';}}}
    });

    const dlCont=document.getElementById('dailyLimitsContainer');
    if(dlCont){
        const tracked=window.appData.substances.filter(s=>s.status==='active'&&s.maxDailyDose>0);
        if(!tracked.length){dlCont.innerHTML='';}
        else {
            dlCont.innerHTML=tracked.map((s,i)=>{
                const todayAmt=window.appData.doses.filter(d=>d.substanceId===s.id&&new Date(d.timestamp).toDateString()===todayStr).reduce((sum,d)=>sum+d.amount,0);
                let ratio=Math.min(1,todayAmt/s.maxDailyDose);
                let bgCls='bg-emerald-500',barAnims='';
                if(ratio>0.75)bgCls='bg-orange-500';
                if(ratio>=1){bgCls='bg-red-500';barAnims='progress-bar-striped progress-bar-animated';}
                return `<div class="bg-white/40 dark:bg-white/5 p-2 rounded-lg border border-slate-200/50 dark:border-white/5 animate-stagger-${Math.min(5,i+1)}">
                    <div class="flex justify-between items-center mb-1"><div class="flex items-center gap-1"><span class="text-[10px]">${s.icon}</span><span class="text-[9px] font-bold text-slate-600 dark:text-slate-300">${s.name} — denní limit</span></div><span class="text-[9px] font-black privacy-target ${ratio>=1?'text-red-500':''}">${todayAmt} / ${s.maxDailyDose} ${s.unit}</span></div>
                    <div class="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden"><div class="h-full ${bgCls} ${barAnims} rounded-full transition-all" style="width:${ratio*100}%"></div></div>
                </div>`;
            }).join('');
        }
    }
}

window.currentAnaTab='summary';

window.switchAnaTab = function(tabId){
    window.currentAnaTab=tabId;
    document.querySelectorAll('.ana-tab-btn').forEach(b=>{
        b.className='ana-tab-btn whitespace-nowrap bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-full text-xs font-bold';
        if(b.id==='btnAna-health')b.classList.add('finance-target');
    });
    const actBtn=document.getElementById('btnAna-'+tabId);
    actBtn.className='ana-tab-btn whitespace-nowrap bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-md';
    if(tabId==='health')actBtn.classList.add('finance-target');
    document.querySelectorAll('.ana-section').forEach(s=>s.classList.remove('active'));
    document.getElementById('ana-'+tabId).classList.add('active');
    const backBtn=document.getElementById('anaBackBtn');
    if(backBtn)backBtn.classList.add('hidden');
    if(tabId==='substances'){
        document.getElementById('anaSubOverview').style.display='block';
        document.getElementById('anaSubDetail').classList.remove('active');
        window.renderAnaSubList();
    } else if (tabId === 'calendar') {
        if (window.buildCalendar) window.buildCalendar();
    } else {
        if (!window.__analyticsBusy) {
            window.__analyticsBusy = true;
            requestAnimationFrame(()=>{
                try { if(window.computeAndDrawAnalytics) window.computeAndDrawAnalytics(); } finally {
                    setTimeout(() => window.__analyticsBusy = false, 60);
                }
            });
        }
    }
    window.scheduleChartRedraw();
}

window.currentDetailSubId=null;

window.renderAnaSubList = function(){
    const list=document.getElementById('anaSubList');
    const subs=window.appData.substances.filter(s=>window.appData.doses.some(d=>d.substanceId===s.id));
    if(!subs.length){list.innerHTML='<div class="text-xs font-bold text-slate-500 p-3">Žádná data k zobrazení. Nejprve zaznamenejte dávky.</div>';return;}
    const now=new Date(),todayStr=now.toDateString();
    list.innerHTML=subs.map((s,i)=>{
        const subDoses=window.appData.doses.filter(d=>d.substanceId===s.id);
        const todayCount=subDoses.filter(d=>new Date(d.timestamp).toDateString()===todayStr).length;
        const totalSpend=subDoses.reduce((sum,d)=>sum+(Number(d.price)||0),0);
        const lastDose=subDoses.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0];
        const col=window.CAT_COLORS[s.category]||'#64748b';
        return `<div class="flex items-center gap-3 p-3 bg-white/60 dark:bg-black/30 rounded-xl border border-slate-200/50 dark:border-white/5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform animate-stagger-${Math.min(5,i+1)}" onclick="window.openSubstanceDetail('${s.id}')">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style="background:${col}20;border:1px solid ${col}40">${s.icon}</div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2"><span class="font-black text-sm text-slate-800 dark:text-white truncate">${s.name}</span><span class="text-[8px] font-bold px-1.5 py-0.5 rounded" style="background:${col}20;color:${col}">${window.CAT_NAMES[s.category]}</span></div>
                <div class="text-[9px] font-bold text-slate-500 mt-0.5">${subDoses.length}× celkem • Naposledy: ${lastDose?window.formatTimeAgoShort(lastDose.timestamp):'-'} • Dnes: ${todayCount}×</div>
            </div>
            <div class="flex flex-col items-end gap-1">
                <span class="text-xs font-black text-accent-500">${subDoses.length}×</span>
                <span class="text-[8px] font-bold text-slate-400 finance-target privacy-target">${window.fmtMoney(totalSpend)}</span>
            </div>
            <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </div>`;
    }).join('');
}

window.openSubstanceDetail = function(subId){
    window.currentDetailSubId=subId;
    const sub=window.appData.substances.find(s=>s.id===subId);if(!sub)return;
    const subDoses=window.appData.doses.filter(d=>d.substanceId===subId).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    const now=new Date(),todayStr=now.toDateString();
    const col=window.CAT_COLORS[sub.category]||'#64748b';
    const iconEl=document.getElementById('sdIcon');if(iconEl) iconEl.innerText=sub.icon;if(iconEl) iconEl.style.background=col+'20'; if(iconEl) iconEl.style.border=`1px solid ${col}40`;
    if(document.getElementById('sdName')) document.getElementById('sdName').innerText=sub.name;
    if(document.getElementById('sdTotalUses')) document.getElementById('sdTotalUses').innerText=subDoses.length;
    const badges=[
        `<span class="text-[8px] font-bold px-2 py-0.5 rounded-full" style="background:${col}20;color:${col}">${window.CAT_NAMES[sub.category]}</span>`,
        `<span class="text-[8px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">${window.RECEPTOR_NAMES[sub.receptor]||'?'}</span>`,
        sub.warningTag?`<span class="text-[8px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">⚠️ ${sub.warningTag}</span>`:'',
        `<span class="text-[8px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">${window.LEGAL_BADGE[sub.legalStatus]||''}</span>`
    ].filter(Boolean).join('');
    if(document.getElementById('sdBadges')) document.getElementById('sdBadges').innerHTML=badges;
    const todayAmt=subDoses.filter(d=>new Date(d.timestamp).toDateString()===todayStr).reduce((s,d)=>s+d.amount,0);
    const oldest=subDoses.length?new Date(Math.min(...subDoses.map(d=>new Date(d.timestamp).getTime()))):now;
    const daysTracked=Math.max(1,Math.ceil((now-oldest)/86400000));
    const totalAmt=subDoses.reduce((s,d)=>s+d.amount,0);
    const avgDay=totalAmt/daysTracked;
    const totalCost=subDoses.reduce((s,d)=>s+(Number(d.price)||0),0);
    let streak=0;
    for(let i=0;i<365;i++){const dt=new Date();dt.setDate(dt.getDate()-i);if(subDoses.some(d=>new Date(d.timestamp).toDateString()===dt.toDateString()))streak++;else if(i>0)break;}
    if(document.getElementById('sdToday')) document.getElementById('sdToday').innerText=window.fmtAmt(todayAmt,sub.unit);
    if(document.getElementById('sdAvgDay')) document.getElementById('sdAvgDay').innerText=window.fmtAmt(parseFloat(avgDay.toFixed(2)),sub.unit);
    if(document.getElementById('sdTotalCost')) document.getElementById('sdTotalCost').innerText=window.fmtMoney(totalCost);
    if(document.getElementById('sdStreak')) document.getElementById('sdStreak').innerText=streak+'d';
    document.getElementById('anaSubOverview').style.display='none';
    document.getElementById('anaSubDetail').classList.add('active');
    document.getElementById('anaBackBtn').classList.remove('hidden');
    document.getElementById('anaBackBtn').classList.add('flex');
    setTimeout(()=> { if (window.drawSubstanceDetailCharts) window.drawSubstanceDetailCharts(sub,subDoses,col) }, 50);
    const minAmt=subDoses.length?Math.min(...subDoses.map(d=>d.amount)):0;
    const maxAmt=subDoses.length?Math.max(...subDoses.map(d=>d.amount)):0;
    const medianAmt=subDoses.length?[...subDoses].sort((a,b)=>a.amount-b.amount)[Math.floor(subDoses.length/2)].amount:0;
    const stdDev=subDoses.length>1?Math.sqrt(subDoses.reduce((s,d)=>s+Math.pow(d.amount-avgDay,2),0)/subDoses.length):0;
    if(document.getElementById('sdStatsTable')) document.getElementById('sdStatsTable').innerHTML=[
        {label:'Min. dávka',val:window.fmtAmt(minAmt,sub.unit),col:'text-emerald-500'},
        {label:'Max. dávka',val:window.fmtAmt(maxAmt,sub.unit),col:'text-red-500'},
        {label:'Medián',val:window.fmtAmt(medianAmt,sub.unit),col:'text-blue-500'},
        {label:'Std. odchylka',val:window.fmtAmt(parseFloat(stdDev.toFixed(2)),sub.unit),col:'text-purple-500'},
        {label:'Celkem spotřeba',val:window.fmtAmt(parseFloat(totalAmt.toFixed(2)),sub.unit),col:'text-accent-500'},
        {label:'Dní sledování',val:daysTracked+'d',col:'text-slate-600 dark:text-slate-300'},
        {label:'Cena/jedn.',val:sub.basePrice>0?sub.basePrice+' '+window.appData.settings.currency+'/'+sub.unit:'-',col:'text-slate-600 dark:text-slate-300 finance-target'},
        {label:'Balení zbývá',val:sub.packageSize>0&&avgDay>0?Math.round((sub.packageSize-totalAmt%sub.packageSize)/avgDay)+'d':'N/A',col:'text-orange-500'}
    ].map(s=>`<div class="bg-slate-50 dark:bg-white/5 rounded-xl p-2.5 text-center"><div class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1">${s.label}</div><div class="text-sm font-black ${s.col}">${s.val}</div></div>`).join('');
    if(document.getElementById('sdRecentDoses')) document.getElementById('sdRecentDoses').innerHTML=subDoses.slice(0,10).map((d,i)=>{
        const v=sub.variants?.find(vx=>vx.name===d.variantName);
        const col2=v?.color||window.CAT_COLORS[sub.category]||'#10b981';
        return `<div class="flex items-center justify-between p-2.5 bg-white/60 dark:bg-black/30 rounded-xl border border-slate-200/50 dark:border-white/5 animate-stagger-${Math.min(5,i+1)}">
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${col2}"></div>
                <div><div class="text-[10px] font-bold text-slate-800 dark:text-white privacy-target">${d.amount} ${d.unit}${d.variantName?' · '+d.variantName:''}</div><div class="text-[8px] font-bold text-slate-500">${window.formatTimeAgoDetailed(d.timestamp)} · ${window.ROUTE_NAMES[d.route]||d.route}</div></div>
            </div>
            <div class="text-right"><div class="text-[10px] font-black text-accent-500 privacy-target">${d.compounds.map(c=>c.amountMg.toFixed(1)+'mg').join('+')}</div><div class="text-[8px] font-bold text-slate-400 finance-target privacy-target">${d.price>0?window.fmtMoney(d.price):'-'}</div></div>
        </div>`;
    }).join('');
}

window.closeSubstanceDetail = function(){
    document.getElementById('anaSubDetail').classList.remove('active');
    document.getElementById('anaSubOverview').style.display='block';
    const backBtn=document.getElementById('anaBackBtn');
    backBtn.classList.add('hidden');backBtn.classList.remove('flex');
    window.currentDetailSubId=null;
}
