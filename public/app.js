const DEFAULT_PROFILE = { weight: 70, age: 30,    metabolism: 'medium' };
const DEFAULT_SETTINGS = { privacyMode:false, darkMode:true, currency:'CZK', compactHistory:false, hideFinance:false, firstDayOfWeek:'1', accentColor:'emerald', disableWarnings:false };
const DEFAULT_SUBSTANCES = [{
    id:'kratom_v8', name:'Kratom', icon:'🍃', category:'jine', receptor:'Opioid', unit:'g', step:0.5, brand:'Přírodní', basePrice:4, packageSize:250, maxDailyDose:15,
    status:'active', form:'prasek', legalStatus:'legal', defaultRoa:'oral', addictionRisk:'medium', warningTag:'', rating:4,
    compounds:[
        {id:'c_mitra',name:'Mitragynin',amtPerUnit:15,halfLife:24,tmax:60,useCurve:false,curve:[],thresh:15,light:35,heavy:75},
        {id:'c_7oh',name:'7-OH-Mitragynin',amtPerUnit:0.1,halfLife:2.5,tmax:45,useCurve:false,curve:[],thresh:1,light:3,heavy:5}
    ],
    variants:[
        {id:'v_green',name:'Zelený',color:'#22c55e',price:4,compoundAmts:{c_mitra:15,c_7oh:0.1}},
        {id:'v_red',name:'Červený',color:'#ef4444',price:4,compoundAmts:{c_mitra:12,c_7oh:0.3}},
        {id:'v_white',name:'Bílý',color:'#94a3b8',price:4,compoundAmts:{c_mitra:18,c_7oh:0.05}}
    ]
},{
    id:'caffeine_v8', name:'Káva / Kofein', icon:'☕', category:'stimulant', receptor:'Adrenergni', unit:'mg', step:50, brand:'', basePrice:0.5, packageSize:0, maxDailyDose:400,
    status:'active', form:'tekutina', legalStatus:'legal', defaultRoa:'oral', addictionRisk:'low', warningTag:'Nenarušovat spánek', rating:5,
    compounds:[{id:'c_caf',name:'Kofein',amtPerUnit:1,halfLife:5,tmax:45,useCurve:false,curve:[],thresh:30,light:80,heavy:200}],
    variants:[
        {id:'v_espr',name:'Espresso (~80mg)',color:'#8b5cf6',price:50,compoundAmts:{c_caf:80}},
        {id:'v_filter',name:'Filtr (~120mg)',color:'#6366f1',price:40,compoundAmts:{c_caf:120}},
        {id:'v_energy',name:'Energy drink (~160mg)',color:'#f59e0b',price:35,compoundAmts:{c_caf:160}}
    ]
}];

let appData = { profile:{...DEFAULT_PROFILE}, settings:{...DEFAULT_SETTINGS}, substances:JSON.parse(JSON.stringify(DEFAULT_SUBSTANCES)), doses:[], quickDoses:[] };

const CAT_COLORS = {stimulant:'#f97316',sedativum:'#3b82f6',psychedelikum:'#a855f7',entaktogen:'#ec4899',disociativum:'#06b6d4',nootropikum:'#10b981',jine:'#64748b'};
const CAT_NAMES  = {stimulant:'Stimulant',sedativum:'Sedativum',psychedelikum:'Psychedelikum',entaktogen:'Entaktogen',disociativum:'Disociativum',nootropikum:'Nootropikum',jine:'Jiné'};
const ROUTE_NAMES = {oral:'Ústy',sublingual:'Pod jazyk',intranasal:'Nosem',inhalation:'Plíce'};
const RECEPTOR_NAMES = {Neuveden:'Neznámý',Dopamin:'Dopamin',Serotonin:'Serotonin',GABA:'GABA',Opioid:'Opioidní',Kanabinoid:'Kanabinoid',Adrenergni:'Adrenergní',Cholin:'Cholinergní'};
const ADDICTION_COLORS = {low:'#10b981',medium:'#f59e0b',high:'#ef4444'};
const LEGAL_BADGE = {legal:'✅ Legální',rx:'💊 Předpis',grey:'⚠️ Šedá zóna',illegal:'🚫 Nelegální'};

function runMigrations() {
    let mod = false;
    if(!appData.settings.currency){appData.settings={...DEFAULT_SETTINGS,...appData.settings};mod=true;}
    if(!appData.quickDoses){appData.quickDoses=[];mod=true;}
    appData.substances = appData.substances.map(s=>{
        if(!s.receptor){s.receptor='Neuveden';s.packageSize=0;s.maxDailyDose=0;mod=true;}
        if(!s.status){s.status='active';s.form='jine';s.legalStatus='legal';s.defaultRoa='oral';s.addictionRisk='medium';s.warningTag='';s.rating=0;mod=true;}
        if(!s.compounds){mod=true;s.unit='mg';s.step=10;s.icon='💊';s.compounds=[{id:'c_'+s.id,name:s.name,amtPerUnit:1,halfLife:s.halfLife||5,tmax:60,useCurve:false,curve:[],thresh:0,light:0,heavy:0}];s.variants=[];}
        return s;
    });
    appData.doses = appData.doses.map(d=>{
        if(!d.color){mod=true;const sub=appData.substances.find(x=>x.id===d.substanceId);d.icon=sub?.icon||'💊';const v=sub?.variants?.find(x=>x.name===d.variantName);d.color=v?.color||(sub?CAT_COLORS[sub.category]:'#10b981')||'#10b981';}
        return d;
    });
    if(mod) saveData();
}

function initApp(){
    const sv=localStorage.getItem('biotrack_data');
    if(sv){try{const p=JSON.parse(sv);appData.profile={...DEFAULT_PROFILE,...p.profile};appData.settings={...DEFAULT_SETTINGS,...p.settings};appData.substances=p.substances||JSON.parse(JSON.stringify(DEFAULT_SUBSTANCES));appData.doses=p.doses||[];appData.quickDoses=p.quickDoses||[];}catch(e){}}
    runMigrations(); applySettings(); populateForms(); switchTab('dashboard');
    if (window.buildCalendar) window.buildCalendar();
    if (window.renderRecentLogs) window.renderRecentLogs();
    if (window.updateDashboard) { window.updateDashboard(); }
    setInterval(()=>{ if(window.updateDashboardLive) window.updateDashboardLive(); },60000); setTimeOffset(0); filterLab('active');
}

function saveData(){localStorage.setItem('biotrack_data',JSON.stringify(appData));}

window.showToast = function(m,type='default'){
    const c=document.getElementById('toastContainer'),t=document.createElement('div');
    const bg = type==='error'?'bg-red-600/95':type==='success'?'bg-emerald-600/95':'bg-slate-900/95 dark:bg-white/95';
    const tc = (type==='error'||type==='success')?'text-white':'text-white dark:text-slate-900';
    t.className=`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-soft-dark font-bold text-sm transform transition-all duration-300 opacity-0 translate-y-4 ${bg} backdrop-blur-md ${tc} border border-white/10 z-[100]`;
    t.innerHTML=`<span>${m}</span>`;
    c.appendChild(t);
    requestAnimationFrame(()=>t.classList.remove('opacity-0','translate-y-4'));
    setTimeout(()=>{t.classList.add('opacity-0');setTimeout(()=>t.remove(),300);},2500);
}

let confCb=null;
window.showConfirm = function(tit,txt,cb){if(document.getElementById('confirmTitle')) document.getElementById('confirmTitle').innerText=tit;if(document.getElementById('confirmText')) document.getElementById('confirmText').innerText=txt;confCb=cb;document.getElementById('confirmDialog').classList.replace('hidden','flex');setTimeout(()=>document.getElementById('confirmDialogInner').classList.remove('scale-95'),10);}
window.closeConfirm = function(res){document.getElementById('confirmDialogInner').classList.add('scale-95');setTimeout(()=>{document.getElementById('confirmDialog').classList.replace('flex','hidden');if(confCb)confCb(res);},200);}

window.switchTab = function(id){
    document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
    const tabEl = document.getElementById(`tab-${id}`);
    if (tabEl) tabEl.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.getAttribute('data-target')===id));
    const ts={dashboard:'Přehled',logger:'Nová dávka',substances:'Laboratoř',analytics:'Analytika',settings:'Nastavení'};
    if(document.getElementById('pageTitle')) document.getElementById('pageTitle').innerText=ts[id]||'';
    
    if(id==='dashboard'){ 
        if (window.updateDashboard) window.updateDashboard(); 
        if (window.scheduleChartRedraw) window.scheduleChartRedraw(); 
        if(window.renderRecentLogs) window.renderRecentLogs(); 
    }
    if(id==='logger'){ 
        if (typeof populateLoggerDropdown === 'function') populateLoggerDropdown(); 
        if (typeof resetLoggerDefaults === 'function') resetLoggerDefaults(false,{prefillAmount:true}); 
        setTimeout(() => { const l=document.getElementById('logAmount'); if(l) l.focus(); }, 150); 
    }
    if(id==='analytics'){
        window.currentAnaTab='summary'; 
        if(window.switchAnaTab) window.switchAnaTab('summary');
    }
    
    window.scrollTo(0,0);
    if (window.scheduleChartRedraw) window.scheduleChartRedraw();
}
window.fmtMoney = function(v){if(appData.settings.hideFinance)return '***';const sym=appData.settings.currency==='EUR'?'€':appData.settings.currency==='USD'?'$':'Kč';return Math.round(v).toLocaleString('cs-CZ')+' '+sym;}
window.fmtAmt = function(v,unit){return (v%1!==0?v.toFixed(2):v)+' '+unit;}
window.formatTimeAgoDetailed = function(ds){const d=Date.now()-new Date(ds).getTime();if(d<60000)return'Právě teď';const m=Math.floor(d/60000),h=Math.floor(m/60),dy=Math.floor(h/24);if(dy>0)return`Před ${dy}d ${h%24}h`;if(h>0)return`Před ${h}h ${m%60}m`;return`Před ${m}m`;}
window.formatTimeAgoShort = function(ds){const d=Date.now()-new Date(ds).getTime(),m=Math.floor(d/60000),h=Math.floor(m/60),dy=Math.floor(h/24);if(dy>0)return`${dy}d`;if(h>0)return`${h}h`;return`${m}m`;}
window.blendColorsHex = function(c1,c2,r){r=Math.max(0,Math.min(1,r));const h=c=>{let n=parseInt(c.replace('#',''),16);return[n>>16,(n>>8)&255,n&255];};const a=h(c1),b=h(c2);return'#'+a.map((v,i)=>Math.round(v+(b[i]-v)*r).toString(16).padStart(2,'0')).join('');}
window.getDoseColorSmooth = function(base,ratio){const safe=base||'#64748b';if(ratio<=0)return document.documentElement.classList.contains('dark')?'#94a3b8':'#64748b';if(ratio<=0.3)return window.blendColorsHex(safe,'#22c55e',ratio/0.3);if(ratio<=0.7)return window.blendColorsHex('#22c55e','#eab308',(ratio-0.3)/0.4);if(ratio<=1.0)return window.blendColorsHex('#eab308','#ef4444',(ratio-0.7)/0.3);return'#ef4444';}

window.getMetFactor = function(){const m=appData.profile.metabolism;return m==='slow'?1.3:m==='fast'?0.7:1.0;}
window.getCurveValue = function(curve,tMins){if(!curve||!curve.length)return 0;const c=[...curve].sort((a,b)=>a.t-b.t);if(tMins<=c[0].t)return c[0].c;if(tMins>=c[c.length-1].t)return c[c.length-1].c;for(let i=0;i<c.length-1;i++){if(tMins>=c[i].t&&tMins<=c[i+1].t){const p=(tMins-c[i].t)/(c[i+1].t-c[i].t);return c[i].c+((c[i+1].c-c[i].c)*p);}}return 0;}

window.calcCompoundKinetic = function(dc,di,timeH){
    const t=timeH!==undefined?timeH:(Date.now()-new Date(di.timestamp).getTime())/3600000;
    if(t<0)return 0;
    if(dc.useCurve&&dc.curve.length>0)return dc.amountMg*(window.getCurveValue(dc.curve,t*60)/100);
    let tmaxM=dc.tmax||60, hl=(dc.halfLife||5)*window.getMetFactor();
    switch(di.route){case'sublingual':tmaxM*=0.5;hl*=0.9;break;case'intranasal':tmaxM*=0.25;hl*=0.8;break;case'inhalation':tmaxM*=0.1;hl*=0.7;break;case'oral':if(!di.stomachEmpty)tmaxM*=1.3;break;}
    const ke=Math.LN2/hl, ka=Math.max(ke*1.5,Math.LN2/(tmaxM/60*0.5));
    if(ka===ke)return 0;
    return Math.max(0,(dc.amountMg/(appData.profile.weight||70))*(ka/(ka-ke))*(Math.exp(-ke*t)-Math.exp(-ka*t)));
}

window.getActiveComps = function(){
    const act={},now=Date.now();
    appData.doses.forEach(d=>{
        const eH=(now-new Date(d.timestamp).getTime())/3600000;
        if(eH<0||eH>72)return;
        d.compounds.forEach(c=>{
            const conc=window.calcCompoundKinetic(c,d);
            const infl=c.heavy?(conc/(c.heavy/(appData.profile.weight||70)))*100:0;
            if(infl>1||conc>0.1){const k=c.name;if(!act[k])act[k]={name:c.name,icon:d.icon,conc:0,infl:0};act[k].conc+=conc;act[k].infl+=infl;}
        });
    });
    return Object.values(act).sort((a,b)=>b.infl-a.infl);
}

window.calcTimeToClear = function(compound,currentAmtH,route){
    let hl=(compound.halfLife||5)*window.getMetFactor();
    switch(route){case'sublingual':hl*=0.9;break;case'intranasal':hl*=0.8;break;case'inhalation':hl*=0.7;break;}
    if(currentAmtH<=compound.thresh||compound.thresh===0)return 0;
    return -hl*Math.log2(compound.thresh/currentAmtH);
}

window.updateDashboardLive = function(){if(document.getElementById('tab-dashboard').classList.contains('active')) if (window.updateDashboard) window.updateDashboard();}

window.populateLoggerDropdown = function(){
    const sel=document.getElementById('logSubstance');
    if (!sel) return;
    const active=appData.substances.filter(s=>s.status==='active');
    sel.innerHTML=active.map(s=>`<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
    if(active.length&&!sel.value)sel.value=active[0].id;
}

window.handleSubstanceChange = function(){
    const sub=appData.substances.find(s=>s.id===document.getElementById('logSubstance').value);
    if(sub){
        window.setRoute(sub.defaultRoa||'oral');
        const lastLog=window.getLatestDoseForSubstance ? window.getLatestDoseForSubstance(sub.id) : null;
        const selVar=document.getElementById('logVariant');
        let targetVariantId='';
        if(lastLog?.variantName){
            const v=sub.variants?.find(vx=>vx.name===lastLog.variantName);
            if(v) targetVariantId=v.id;
        }
        if(!targetVariantId && sub.variants?.length===1) targetVariantId=sub.variants[0].id;
        if(selVar){
            if(targetVariantId){
                selVar.value=targetVariantId;
            } else if(selVar.value && !(sub.variants||[]).some(v=>v.id===selVar.value)){
                selVar.value='';
            }
        }
        const amtInput=document.getElementById('logAmount');
        if(amtInput && (!amtInput.value || Number(amtInput.value)===0) && lastLog && Number(lastLog.amount)>0){
            const amt=Number(lastLog.amount);
            amtInput.value=amt%1!==0?amt.toFixed(2):String(amt);
        }
    }
    window.updateLoggerUI();
}

window.updateLoggerUI = function(){
    const selSub=document.getElementById('logSubstance');
    if (!selSub) return;
    const selVar=document.getElementById('logVariant');
    const sub=appData.substances.find(s=>s.id===selSub.value);if(!sub)return;
    if(document.getElementById('logUnitLabel')) document.getElementById('logUnitLabel').innerText=sub.unit;
    if(sub.variants&&sub.variants.length>0){
        selVar.classList.remove('hidden');
        const curr=selVar.value;
        selVar.innerHTML='<option value="">-- Základní verze --</option>'+sub.variants.map(v=>`<option value="${v.id}">${v.name}</option>`).join('');
        if(sub.variants.find(v=>v.id===curr))selVar.value=curr;
    } else {selVar.classList.add('hidden');selVar.innerHTML='';}
    const amt=Number(document.getElementById('logAmount').value)||0;
    const variant=sub.variants?.find(v=>v.id===selVar.value);
    const route=document.getElementById('logRoute').value;
    let peakRatio=0,maxTimeClear=0,maxPeak=0,maxOnset=0;
    if(document.getElementById('activeCompoundsPreview')) document.getElementById('activeCompoundsPreview').innerHTML=sub.compounds.map(c=>{
        let apu=c.amtPerUnit;if(variant&&variant.compoundAmts[c.id]!==undefined)apu=variant.compoundAmts[c.id];
        const aMg=amt*apu;
        let cRatio=c.heavy>0?aMg/c.heavy:0;if(cRatio>peakRatio)peakRatio=cRatio;
        let tClear=window.calcTimeToClear(c,aMg,route);if(tClear>maxTimeClear)maxTimeClear=tClear;
        let dynTmax=c.tmax||60;
        switch(route){case'sublingual':dynTmax*=0.5;break;case'intranasal':dynTmax*=0.25;break;case'inhalation':dynTmax*=0.1;break;}
        if(dynTmax>maxPeak)maxPeak=dynTmax;
        if(dynTmax*0.25>maxOnset)maxOnset=dynTmax*0.25;
        const dynColor=window.getDoseColorSmooth(variant?.color||CAT_COLORS[sub.category],cRatio);
        let inten='--';if(aMg>=c.heavy)inten='Silná';else if(aMg>=c.light)inten='Běžná';else if(aMg>=c.thresh)inten='Lehká';else if(aMg>0)inten='Mikro';
        const isDark = document.documentElement.classList.contains('dark');
        const textC=(aMg>=c.light)?'#ffffff':(isDark?'#000000':'#ffffff');
        if(aMg===0)return`<div class="flex justify-between items-center"><div class="font-bold text-[9px]"><span class="text-slate-400 font-normal mr-2">${(apu*(sub.unit==='mg'?100:1)).toFixed(2)}${sub.unit==='mg'?'%':'mg/'+sub.unit}</span>${c.name}</div><span class="text-[9px] font-black text-slate-400">0 mg</span></div>`;
        return`<div class="flex justify-between items-center"><div class="font-bold text-[9px]"><span class="text-slate-400 font-normal mr-2">${(apu*(sub.unit==='mg'?100:1)).toFixed(2)}${sub.unit==='mg'?'%':'mg/'+sub.unit}</span>${c.name}</div><div class="flex items-center gap-2"><span class="font-black text-[10px]" style="color:${dynColor}">${aMg.toFixed(2)} mg</span><span class="text-[7.5px] font-black uppercase px-2 py-0.5 rounded shadow-sm" style="background:${dynColor};color:${textC}">${inten}</span></div></div>`;
    }).join('');

    const warnBox=document.getElementById('loggerWarnBox');
    if(sub.maxDailyDose&&sub.maxDailyDose>0){
        const todayAmt=appData.doses.filter(d=>d.substanceId===sub.id&&new Date(d.timestamp).toDateString()===new Date().toDateString()).reduce((s,d)=>s+d.amount,0);
        if((todayAmt+amt)>sub.maxDailyDose){if(warnBox) warnBox.style.display='block';if(document.getElementById('loggerWarnText')) document.getElementById('loggerWarnText').innerText=`Dávka překročí bezpečný limit (${sub.maxDailyDose} ${sub.unit}/den)!`;}
        else if(warnBox) warnBox.style.display='none';
    } else if(warnBox) warnBox.style.display='none';

    const glowBg=document.getElementById('loggerGlowBg');
    const numInput=document.getElementById('logAmount');
    const contBox=document.getElementById('loggerInputContainer');
    const finalColor=window.getDoseColorSmooth(variant?.color||CAT_COLORS[sub.category],peakRatio);
    const isDark = document.documentElement.classList.contains('dark');
    if(peakRatio>0){
        if(numInput) numInput.style.color=finalColor;if(numInput) numInput.style.textShadow=`0 0 16px ${finalColor}`;
        if(glowBg) glowBg.style.background=`radial-gradient(circle at bottom,${finalColor}40 0%,transparent 80%)`;
        if(glowBg) glowBg.style.opacity=Math.min(0.1+peakRatio*0.4,0.6);
        if(contBox) contBox.style.borderTopColor=finalColor;
    } else {
        if(numInput) numInput.style.color='#64748b';if(numInput) numInput.style.textShadow='none';
        if(glowBg) glowBg.style.background='transparent';
        if(contBox) contBox.style.borderTopColor=isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)';
    }

    const priceInput=document.getElementById('logPrice');
    if(variant&&typeof variant.price==='number'&&amt>0){priceInput.value=(amt*variant.price).toFixed(2).replace(/\.00$/,'');if(document.getElementById('logPriceInfo')) document.getElementById('logPriceInfo').innerText=`Počítáno z: ${variant.price} / ${sub.unit}`;}
    else if(!variant&&typeof sub.basePrice==='number'&&amt>0){priceInput.value=(amt*sub.basePrice).toFixed(2).replace(/\.00$/,'');if(document.getElementById('logPriceInfo')) document.getElementById('logPriceInfo').innerText=`Počítáno z: ${sub.basePrice} / ${sub.unit}`;}
    else if(amt<=0){priceInput.value='';if(document.getElementById('logPriceInfo')) document.getElementById('logPriceInfo').innerText='Automaticky vypočteno';}

    const estC=document.getElementById('logClearanceEstimate');
    if(amt>0&&maxTimeClear>0)estC.innerHTML=`Nástup: ~${Math.round(maxOnset)}m | Vrchol: ~${Math.round(maxPeak)}m | Čistý za: <span class="text-accent-500">${maxTimeClear.toFixed(1)}h</span>`;
    else estC.innerHTML='';
}

window.adjustAmount = function(dir){
    const sub=appData.substances.find(s=>s.id===document.getElementById('logSubstance').value);
    const step=sub?.step||1;
    const inp=document.getElementById('logAmount');
    let val=Math.max(0,(Number(inp.value)||0)+(dir*step));
    inp.value=val%1!==0?val.toFixed(2):val;
    window.updateLoggerUI();
}

window.setCommonAmount = function(mul){
    const sub=appData.substances.find(s=>s.id===document.getElementById('logSubstance').value);if(!sub)return;
    let refMg=0;sub.compounds.forEach(c=>refMg+=c.light);
    let val=sub.unit==='g'?(refMg/1000)*mul:refMg*mul;
    const inp=document.getElementById('logAmount');
    inp.value=val%1!==0?val.toFixed(2):val;
    window.updateLoggerUI();
}

window.setRoute = function(v){
    document.getElementById('logRoute').value=v;
    document.querySelectorAll('.route-btn').forEach(b=>{
        b.className=b.dataset.val===v
            ?'route-btn active bg-accent-500 text-white border-accent-500 border-2 py-2 rounded-lg text-[9px] font-bold transition-all flex flex-col items-center gap-1 shadow-glow-sm active:scale-95'
            :'route-btn bg-white/60 dark:bg-[#0c0c0e]/60 text-slate-500 border-slate-200/60 dark:border-white/10 border-2 py-2 rounded-lg text-[9px] font-bold transition-all flex flex-col items-center gap-1 active:scale-95';
    });
    window.updateLoggerUI();
}

window.getLocalDatetimeValue = function(date=new Date()){
    const d=new Date(date);
    d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
    return d.toISOString().slice(0,16);
}

window.getLatestDoseForSubstance = function(subId){
    return [...appData.doses].filter(d=>d.substanceId===subId).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0]||null;
}

window.resetLoggerDefaults = function(forceTime=false, opts={}){
    const {prefillAmount=true}=opts;
    const timeInput=document.getElementById('logTime');
    if(timeInput && (forceTime || !timeInput.value || Number.isNaN(new Date(timeInput.value).getTime()))){
        timeInput.value=window.getLocalDatetimeValue();
    }
    const subSel=document.getElementById('logSubstance');
    if(!subSel||!subSel.value) return;
    const sub=appData.substances.find(s=>s.id===subSel.value);
    if(!sub) return;
    const lastLog=window.getLatestDoseForSubstance ? window.getLatestDoseForSubstance(sub.id) : null;
    const varSel=document.getElementById('logVariant');
    if(varSel){
        if(lastLog?.variantName){
            const v=sub.variants?.find(vx=>vx.name===lastLog.variantName);
            varSel.value=v?v.id:'';
        } else if(sub.variants?.length===1){
            varSel.value=sub.variants[0].id;
        } else if(varSel.value && !(sub.variants||[]).some(v=>v.id===varSel.value)){
            varSel.value='';
        }
    }
    const amtInput=document.getElementById('logAmount');
    if(prefillAmount && amtInput && (!amtInput.value || Number(amtInput.value)===0) && lastLog && Number(lastLog.amount)>0){
        const amt=Number(lastLog.amount);
        amtInput.value=amt%1!==0?amt.toFixed(2):String(amt);
    }
    window.updateLoggerUI();
}

window.setTimeOffset = function(m){document.getElementById('logTime').value=window.getLocalDatetimeValue(new Date(Date.now()+m*60000));}

// Export some remaining functions globally so they can be extended by the next script
window.appData = appData;
window.defaultSubstances = DEFAULT_SUBSTANCES;
window.CAT_COLORS = CAT_COLORS;
window.CAT_NAMES = CAT_NAMES;
window.ROUTE_NAMES = ROUTE_NAMES;
window.RECEPTOR_NAMES = RECEPTOR_NAMES;
window.ADDICTION_COLORS = ADDICTION_COLORS;
window.LEGAL_BADGE = LEGAL_BADGE;

// --- Remaining App features from the standard logic ---

// Added listener for the logger form
document.addEventListener("DOMContentLoaded", () => {
    const loggerForm = document.getElementById('loggerForm');
    if(loggerForm) {
        loggerForm.addEventListener('submit',e=>{
            e.preventDefault();
            const subId=document.getElementById('logSubstance').value;
            const varId=document.getElementById('logVariant').value;
            const amt=Number(document.getElementById('logAmount').value)||0;
            const sub=appData.substances.find(s=>s.id===subId);
            if(!sub||amt<=0){ window.showToast('Zadejte platné množství.','error');return;}
            const variant=sub.variants?.find(v=>v.id===varId);
            const snappedComps=sub.compounds.map(c=>{
                let apu=c.amtPerUnit;if(variant&&variant.compoundAmts[c.id]!==undefined)apu=variant.compoundAmts[c.id];
                return{id:c.id,name:c.name,amountMg:amt*apu,halfLife:c.halfLife,tmax:c.tmax,useCurve:c.useCurve,curve:JSON.parse(JSON.stringify(c.curve)),thresh:c.thresh,light:c.light,heavy:c.heavy};
            });
            const timeValue=document.getElementById('logTime').value;
            const timestamp=timeValue&& !Number.isNaN(new Date(timeValue).getTime()) ? new Date(timeValue).toISOString() : new Date().toISOString();
            appData.doses.push({
                id:Date.now().toString(),substanceId:sub.id,substanceName:sub.name,variantName:variant?.name,
                icon:sub.icon,color:variant?.color||CAT_COLORS[sub.category]||'#10b981',
                amount:amt,unit:sub.unit,route:document.getElementById('logRoute').value,stomachEmpty:true,
                price:Number(document.getElementById('logPrice').value)||0,
                timestamp,
                compounds:snappedComps
            });
            saveData();window.showToast('✅ Dávka injikována!','success');
            document.getElementById('logAmount').value='0';
            window.resetLoggerDefaults(true,{prefillAmount:false});
            if(window.renderRecentLogs) window.renderRecentLogs();
            if(window.updateDashboard) window.updateDashboard();
        });
    }
});

window.delLog = function(id){window.showConfirm('Smazat záznam?','Tato akce je nevratná.',(c)=>{if(c){appData.doses=appData.doses.filter(d=>d.id!==id);saveData();if(window.renderRecentLogs) window.renderRecentLogs();if(window.updateDashboard) window.updateDashboard();}});}

window.saveSettings = function(){
    appData.profile.weight=Number(document.getElementById('setWeight').value)||70;
    appData.profile.age=Number(document.getElementById('setAge').value)||30;
    appData.profile.metabolism=document.getElementById('setMetabolism').value;
    appData.settings.darkMode=document.getElementById('setDarkmode').checked;
    appData.settings.currency=document.getElementById('setCurrency').value;
    appData.settings.compactHistory=document.getElementById('setCompact').checked;
    appData.settings.hideFinance=document.getElementById('setHideFinance').checked;
    appData.settings.firstDayOfWeek=document.getElementById('setFirstDay').value;
    appData.settings.accentColor=document.getElementById('setAccent').value;
    appData.settings.disableWarnings=document.getElementById('setDisableWarn').checked;
    saveData(); window.applySettings(); window.showToast('✅ Nastavení uloženo.','success');
    if(window.updateDashboard) window.updateDashboard();
    if(document.getElementById('tab-logger')?.classList.contains('active')) if(window.renderRecentLogs) window.renderRecentLogs();
}

window.populateForms = function(){
    document.getElementById('setWeight').value=appData.profile.weight;
    document.getElementById('setAge').value=appData.profile.age;
    document.getElementById('setMetabolism').value=appData.profile.metabolism;
    document.getElementById('setDarkmode').checked=appData.settings.darkMode;
    document.getElementById('setCurrency').value=appData.settings.currency;
    document.getElementById('setCompact').checked=appData.settings.compactHistory;
    document.getElementById('setHideFinance').checked=appData.settings.hideFinance;
    document.getElementById('setFirstDay').value=appData.settings.firstDayOfWeek;
    document.getElementById('setAccent').value=appData.settings.accentColor;
    document.getElementById('setDisableWarn').checked=appData.settings.disableWarnings;
}

window.applySettings = function(){
    document.documentElement.classList.toggle('dark',appData.settings.darkMode);
    document.body.classList.toggle('privacy-on',appData.settings.privacyMode);
    document.body.classList.toggle('hide-finance-mode',appData.settings.hideFinance);
    document.body.classList.toggle('compact-mode',appData.settings.compactHistory);
    document.body.classList.toggle('warnings-disabled',appData.settings.disableWarnings);
    document.body.className=document.body.className.replace(/theme-\w+/g,'').trim();
    if(appData.settings.accentColor!=='emerald')document.body.classList.add('theme-'+appData.settings.accentColor);
    if(document.getElementById('tab-dashboard')?.classList.contains('active')){ if(window.drawKineticGraph) window.drawKineticGraph(); if(window.updateDashboard) window.updateDashboard();}
    if(document.getElementById('tab-analytics')?.classList.contains('active')){ 
        if(window.computeAndDrawAnalytics) {
            if (!window.__analyticsBusy) {
                  window.__analyticsBusy = true;
                  try { window.computeAndDrawAnalytics(); } finally {
                    setTimeout(() => window.__analyticsBusy = false, 50);
                  }
            }
        }
    }
}

window.togglePrivacy = function(){
    appData.settings.privacyMode=!appData.settings.privacyMode;
    saveData();window.applySettings();
    window.showToast(appData.settings.privacyMode?'🔒 Soukromý režim zapnut':'👁 Soukromý režim vypnut');
}

window.exportData = function(){
    const a=document.createElement('a');
    a.href='data:text/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(appData,null,2));
    a.download=`biotrack_v8_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();a.remove();
    window.showToast('📦 Data exportována.','success');
}

window.importData = function(e){
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=(ev)=>{
        try{
            const p=JSON.parse(ev.target.result);
            if(p.substances){
                appData=p; window.appData = appData; saveData(); initApp(); window.showToast('✅ Data obnovena.','success');
            } else window.showToast('Neplatný formát souboru.','error');
        }catch(err){window.showToast('Chyba při čtení souboru.','error');}
    };
    r.readAsText(f);
}

window.confirmWipe = function(){
    window.showConfirm('Vymazat veškerá data?','Smaže historii i nastavení. Nelze vrátit zpět.',(c)=>{
        if(c){localStorage.removeItem('biotrack_data');location.reload();}
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initApp();
});
