// ─── QUICK DOSES ───
window.openQuickDoseModal = function(){window.renderQuickDoses();document.getElementById('quickDoseModal').classList.replace('hidden','flex');requestAnimationFrame(()=>document.getElementById('quickDoseModalInner').classList.remove('translate-y-full'));}
window.closeQuickDoseModal = function(){document.getElementById('quickDoseModalInner').classList.add('translate-y-full');setTimeout(()=>document.getElementById('quickDoseModal').classList.replace('flex','hidden'),300);}

window.renderQuickDoses = function(){
    const c=document.getElementById('quickDosesGrid');
    if(!window.appData.quickDoses||!window.appData.quickDoses.length){c.innerHTML='<div class="col-span-2 text-center py-6 text-[10px] font-bold text-slate-500">Žádné předvolby. Vytvořte první!</div>';return;}
    c.innerHTML=window.appData.quickDoses.map((qd,i)=>{
        const sub=window.appData.substances.find(s=>s.id===qd.substanceId);if(!sub)return'';
        const v=sub.variants?.find(vx=>vx.id===qd.variantId);
        const col=v?.color||window.CAT_COLORS[sub.category]||'#10b981';
        return`<div class="bg-white/60 dark:bg-[#0c0c0e]/60 rounded-2xl p-3 border border-slate-200/50 dark:border-white/5 relative cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all flex flex-col items-center shadow-sm animate-stagger-${Math.min(5,i+1)}" onclick="window.executeQuickDose('${qd.id}')">
            <button onclick="event.stopPropagation();window.openQuickDoseEditModal('${qd.id}')" class="absolute top-1 right-1 p-1.5 text-slate-400 hover:text-accent-500 transition-colors rounded-lg z-10">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
            <div class="w-10 h-10 rounded-full flex justify-center items-center text-lg mb-2" style="background:${col}20;color:${col};border:1px solid ${col}40">${qd.icon||sub.icon}</div>
            <div class="text-[9px] font-black text-slate-800 dark:text-white truncate w-full text-center">${qd.name}</div>
            <div class="text-[8px] font-bold text-slate-500 mt-1">${qd.amount} ${sub.unit} • ${window.ROUTE_NAMES[qd.route]}</div>
        </div>`;
    }).join('');
}

window.openQuickDoseEditModal = function(id=null){
    window.closeQuickDoseModal();
    const subSel=document.getElementById('qdSubstance');
    subSel.innerHTML=window.appData.substances.filter(s=>s.status==='active').map(s=>`<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
    const btnDel=document.getElementById('btnDelQd');
    if(id){
        const qd=window.appData.quickDoses.find(x=>x.id===id);
        if(qd){
            if(document.getElementById('qdEditTitle')) document.getElementById('qdEditTitle').innerText='Úprava předvolby';
            document.getElementById('qdId').value=qd.id;
            document.getElementById('qdName').value=qd.name;
            document.getElementById('qdIcon').value=qd.icon;
            subSel.value=qd.substanceId;window.handleQdSubstanceChange();
            setTimeout(()=>{document.getElementById('qdVariant').value=qd.variantId||'';},20);
            document.getElementById('qdAmount').value=qd.amount;
            document.getElementById('qdRoute').value=qd.route;
            btnDel.classList.remove('hidden');
        }
    } else {
        if(document.getElementById('qdEditTitle')) document.getElementById('qdEditTitle').innerText='Nová předvolba';
        document.getElementById('qdId').value='';
        document.getElementById('qdName').value='';
        document.getElementById('qdIcon').value='⚡';
        if(subSel.options.length)subSel.value=subSel.options[0].value;
        window.handleQdSubstanceChange();
        document.getElementById('qdAmount').value=0;
        document.getElementById('qdRoute').value='oral';
        btnDel.classList.add('hidden');
    }
    document.getElementById('quickDoseEditModal').classList.replace('hidden','flex');
    requestAnimationFrame(()=>document.getElementById('quickDoseEditModalInner').classList.remove('translate-y-full'));
}

window.closeQuickDoseEditModal = function(){
    document.getElementById('quickDoseEditModalInner').classList.add('translate-y-full');
    setTimeout(()=>{document.getElementById('quickDoseEditModal').classList.replace('flex','hidden');window.openQuickDoseModal();},300);
}

window.handleQdSubstanceChange = function(){
    const sid=document.getElementById('qdSubstance').value;
    const sub=window.appData.substances.find(s=>s.id===sid);if(!sub)return;
    if(document.getElementById('qdUnitLabel')) document.getElementById('qdUnitLabel').innerText=sub.unit;
    document.getElementById('qdRoute').value=sub.defaultRoa||'oral';
    const varSel=document.getElementById('qdVariant');
    if(sub.variants&&sub.variants.length>0){varSel.classList.remove('hidden');varSel.innerHTML='<option value="">-- Základní --</option>'+sub.variants.map(v=>`<option value="${v.id}">${v.name}</option>`).join('');}
    else{varSel.classList.add('hidden');varSel.innerHTML='';}
}

window.saveQuickDose = function(){
    const id=document.getElementById('qdId').value||'qd_'+Date.now();
    const sid=document.getElementById('qdSubstance').value;
    const sub=window.appData.substances.find(s=>s.id===sid);if(!sub)return;
    const qd={id,name:document.getElementById('qdName').value||sub.name,icon:document.getElementById('qdIcon').value||sub.icon,substanceId:sid,variantId:document.getElementById('qdVariant').value||null,amount:Number(document.getElementById('qdAmount').value)||0,route:document.getElementById('qdRoute').value};
    const idx=window.appData.quickDoses.findIndex(x=>x.id===id);
    if(idx>-1)window.appData.quickDoses[idx]=qd;else window.appData.quickDoses.push(qd);
    localStorage.setItem('biotrack_data',JSON.stringify(window.appData));window.closeQuickDoseEditModal();window.showToast('Předvolba uložena.','success');
}

window.deleteQuickDose = function(){
    const id=document.getElementById('qdId').value;if(!id)return;
    window.appData.quickDoses=window.appData.quickDoses.filter(x=>x.id!==id);
    localStorage.setItem('biotrack_data',JSON.stringify(window.appData));window.closeQuickDoseEditModal();
}

window.executeQuickDose = function(id){
    const qd=window.appData.quickDoses.find(x=>x.id===id);if(!qd)return;
    const sub=window.appData.substances.find(s=>s.id===qd.substanceId);if(!sub){window.showToast('Látka nenalezena!','error');return;}
    const variant=sub.variants?.find(v=>v.id===qd.variantId);
    const snappedComps=sub.compounds.map(c=>{let apu=c.amtPerUnit;if(variant&&variant.compoundAmts[c.id]!==undefined)apu=variant.compoundAmts[c.id];return{id:c.id,name:c.name,amountMg:qd.amount*apu,halfLife:c.halfLife,tmax:c.tmax,useCurve:c.useCurve,curve:JSON.parse(JSON.stringify(c.curve)),thresh:c.thresh,light:c.light,heavy:c.heavy};});
    let p=0;if(variant&&typeof variant.price==='number')p=qd.amount*variant.price;else if(typeof sub.basePrice==='number')p=qd.amount*sub.basePrice;
    window.appData.doses.push({id:Date.now().toString(),substanceId:sub.id,substanceName:sub.name,variantName:variant?.name,icon:sub.icon,color:variant?.color||window.CAT_COLORS[sub.category]||'#10b981',amount:qd.amount,unit:sub.unit,route:qd.route,stomachEmpty:true,price:p,timestamp:new Date().toISOString(),compounds:snappedComps});
    localStorage.setItem('biotrack_data',JSON.stringify(window.appData));
    window.showToast(`⚡ ${qd.name} injikováno!`,'success');window.closeQuickDoseModal();
    if(window.updateDashboard) window.updateDashboard();
}

// ─── SUBSTANCES ───
window.filterLab = function(f){
    document.querySelectorAll('.lab-filt-btn').forEach(b=>{b.className='lab-filt-btn bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap';});
    const btn = document.getElementById('btnLab-'+f);
    if(btn) btn.className='lab-filt-btn bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap';
    window.renderSubstancesGrid(f);
}

window.renderSubstancesGrid = function(filt='active'){
    const d=document.getElementById('substancesGrid');
    if (!d) return;
    const filtered=window.appData.substances.filter(s=>filt==='all'?true:s.status===filt);
    if(!filtered.length){d.innerHTML='<div class="col-span-3 text-center py-10 text-slate-500 text-xs font-bold">Žádné látky v této kategorii.</div>';return;}
    d.innerHTML=filtered.map((s,i)=>{
        const c=window.CAT_COLORS[s.category]||window.CAT_COLORS['jine'];
        const usageCnt=window.appData.doses.filter(d=>d.substanceId===s.id).length;
        const isArch=s.status==='archived';
        const star=s.rating>0?'⭐'.repeat(s.rating):'';
        const addCol=window.ADDICTION_COLORS[s.addictionRisk]||'#64748b';
        return`<div class="bento-card p-4 cursor-pointer hover:border-accent-500/50 transition-all group relative overflow-hidden animate-stagger-${Math.min(5,i+1)} ${isArch?'opacity-60 grayscale hover:grayscale-0':''}" onclick="window.editSub('${s.id}')">
            <div class="absolute inset-x-0 top-0 h-1 opacity-70" style="background:linear-gradient(90deg,transparent,${c},transparent)"></div>
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-black text-sm privacy-target text-slate-800 dark:text-white"><span class="mr-1.5">${s.icon||'💊'}</span>${s.name} <span class="text-[8px]">${star}</span></h3>
                <span class="w-2 h-2 rounded-full mt-1.5" style="background:${c}"></span>
            </div>
            <div class="text-[9px] text-slate-500 mb-2 line-clamp-1">${s.compounds.map(x=>x.name).join(' + ')}</div>
            <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
                <div class="flex items-center justify-between">
                    <span class="text-[7.5px] text-slate-400 font-bold uppercase">Použito: ${usageCnt}× | ${window.RECEPTOR_NAMES[s.receptor]||'?'}</span>
                    <span class="text-[7.5px] font-bold px-1.5 py-0.5 rounded" style="background:${addCol}20;color:${addCol}">Záv: ${s.addictionRisk==='low'?'Nízká':s.addictionRisk==='medium'?'Střední':'Vysoká'}</span>
                </div>
                ${s.warningTag?`<span class="text-[8px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded w-fit">⚠️ ${s.warningTag}</span>`:''}
                <div class="flex gap-1 flex-wrap">
                    ${s.packageSize>0?`<span class="bg-slate-200/50 dark:bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-600 dark:text-slate-300">📦 ${s.packageSize} ${s.unit}</span>`:''}
                    <span class="bg-slate-200/50 dark:bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-600 dark:text-slate-300">${window.LEGAL_BADGE[s.legalStatus]||''}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

window.edComps=[]; window.edVars=[];

window.openSubstanceModal = function(){
    if(document.getElementById('subModalTitle')) document.getElementById('subModalTitle').innerText='Nová látka';
    ['subId','subName','subBrand','subWarning'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('subIcon').value='💊';document.getElementById('subUnit').value='mg';document.getElementById('subStep').value='10';
    document.getElementById('subBasePrice').value='';document.getElementById('subPackageSize').value='';document.getElementById('subMaxDose').value='';
    document.getElementById('subStatus').value='active';document.getElementById('subForm').value='prasek';document.getElementById('subReceptor').value='Neuveden';
    document.getElementById('subLegal').value='legal';document.getElementById('subDefaultRoa').value='oral';document.getElementById('subAddiction').value='medium';document.getElementById('subRating').value='0';
    document.getElementById('btnDelSub').classList.add('hidden');
    window.edComps=[{id:'c_new1',name:'Základní složka',amtPerUnit:1,halfLife:5,tmax:60,useCurve:false,curve:[],thresh:10,light:50,heavy:100}];window.edVars=[];
    window.r_comps();window.r_vars();
    document.getElementById('substanceModal').classList.replace('hidden','flex');
    requestAnimationFrame(()=>document.getElementById('subModalInner').classList.remove('translate-y-full'));
}

window.closeSubstanceModal = function(){document.getElementById('subModalInner').classList.add('translate-y-full');setTimeout(()=>document.getElementById('substanceModal').classList.replace('flex','hidden'),300);}

window.editSub = function(id){
    const s=window.appData.substances.find(x=>x.id===id);if(!s)return;
    if(document.getElementById('subModalTitle')) document.getElementById('subModalTitle').innerText='Úprava látky';
    document.getElementById('subId').value=s.id;document.getElementById('subName').value=s.name;document.getElementById('subIcon').value=s.icon||'💊';
    document.getElementById('subUnit').value=s.unit;document.getElementById('subStep').value=s.step;document.getElementById('subCategory').value=s.category;
    document.getElementById('subReceptor').value=s.receptor||'Neuveden';document.getElementById('subBrand').value=s.brand||'';
    document.getElementById('subBasePrice').value=s.basePrice||0;document.getElementById('subPackageSize').value=s.packageSize||'';
    document.getElementById('subMaxDose').value=s.maxDailyDose||'';document.getElementById('subStatus').value=s.status||'active';
    document.getElementById('subForm').value=s.form||'prasek';document.getElementById('subLegal').value=s.legalStatus||'legal';
    document.getElementById('subDefaultRoa').value=s.defaultRoa||'oral';document.getElementById('subAddiction').value=s.addictionRisk||'medium';
    document.getElementById('subWarning').value=s.warningTag||'';document.getElementById('subRating').value=s.rating||0;
    document.getElementById('btnDelSub').classList.remove('hidden');
    window.edComps=JSON.parse(JSON.stringify(s.compounds||[]));window.edVars=JSON.parse(JSON.stringify(s.variants||[]));
    window.r_comps();window.r_vars();
    document.getElementById('substanceModal').classList.replace('hidden','flex');
    requestAnimationFrame(()=>document.getElementById('subModalInner').classList.remove('translate-y-full'));
}

window.r_comps = function(){
    const u=document.getElementById('subUnit').value;
    if(document.getElementById('compoundsContainer')) document.getElementById('compoundsContainer').innerHTML=window.edComps.map((c,i)=>`
        <div class="bg-white/60 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[1.25rem] p-4 relative shadow-sm hover:shadow-md transition-shadow">
            <button type="button" onclick="window.edComps.splice(${i},1);window.r_comps();" class="absolute top-2 right-2 text-red-500 bg-red-50/80 dark:bg-red-900/20 p-1.5 rounded-lg active:scale-90">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <div class="grid grid-cols-2 gap-2 pr-8 mb-2">
                <div class="col-span-2"><input type="text" value="${c.name}" onchange="window.edComps[${i}].name=this.value" placeholder="Název složky" class="w-full bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-accent-500 text-slate-800 dark:text-white"></div>
                <div><label class="text-[7px] font-bold text-slate-400 uppercase">Základ (mg/${u})</label><input type="number" step="any" value="${c.amtPerUnit}" onchange="window.edComps[${i}].amtPerUnit=Number(this.value)" class="w-full bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-accent-500"></div>
                <div><label class="text-[7px] font-bold text-slate-400 uppercase">Poločas (h)</label><input type="number" step="any" value="${c.halfLife}" onchange="window.edComps[${i}].halfLife=Number(this.value)" class="w-full bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-accent-500"></div>
                <div><label class="text-[7px] font-bold text-slate-400 uppercase">Tmax (min)</label><input type="number" step="any" value="${c.tmax}" onchange="window.edComps[${i}].tmax=Number(this.value)" class="w-full bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-accent-500"></div>
            </div>
            <div class="flex gap-2 items-center mb-2">
                <button type="button" onclick="window.openCurveEditor(${i})" class="flex-1 text-[9px] font-bold ${c.useCurve?'bg-accent-500 text-white shadow-glow-sm md:hover:scale-105 active:scale-95':'bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-300/50 dark:hover:bg-white/20 active:scale-95'} py-1.5 rounded-lg transition-colors">
                    Křivka absorpce ${c.useCurve?'(Aktivní)':'(Vypnuto)'}
                </button>
            </div>
            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                <div><label class="text-[7px] font-bold text-slate-400 uppercase">Prahová (mg)</label><input type="number" step="any" value="${c.thresh}" onchange="window.edComps[${i}].thresh=Number(this.value)" class="w-full bg-white/80 dark:bg-white/5 rounded-lg p-1.5 text-[10px] font-bold text-center outline-none focus:ring-2 focus:ring-accent-500"></div>
                <div><label class="text-[7px] font-bold text-slate-400 uppercase">Běžná (mg)</label><input type="number" step="any" value="${c.light}" onchange="window.edComps[${i}].light=Number(this.value)" class="w-full bg-white/80 dark:bg-white/5 rounded-lg p-1.5 text-[10px] font-bold text-center outline-none focus:ring-2 focus:ring-accent-500"></div>
                <div><label class="text-[7px] font-bold text-slate-400 uppercase">Silná (mg)</label><input type="number" step="any" value="${c.heavy}" onchange="window.edComps[${i}].heavy=Number(this.value)" class="w-full bg-white/80 dark:bg-white/5 rounded-lg p-1.5 text-[10px] font-bold text-center outline-none focus:ring-2 focus:ring-accent-500"></div>
            </div>
        </div>`).join('');
}

window.addCompoundUI = function(){
    window.edComps.push({id:'c_'+Date.now(),name:'Nová složka',amtPerUnit:1,halfLife:5,tmax:60,useCurve:false,curve:[],thresh:10,light:50,heavy:100});
    window.r_comps();
}

window.r_vars = function(){
    if(document.getElementById('variantsContainer')) document.getElementById('variantsContainer').innerHTML=window.edVars.map((v,i)=>`
        <div class="bg-white/60 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[1.25rem] p-3.5 flex flex-col gap-2.5 relative pr-10 shadow-sm hover:shadow-md transition-shadow">
            <button type="button" onclick="window.edVars.splice(${i},1);window.r_vars();" class="absolute top-1/2 -translate-y-1/2 right-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <div class="flex items-center gap-2">
                <input type="color" value="${v.color||'#10b981'}" onchange="window.edVars[${i}].color=this.value" class="w-7 h-7 rounded-md cursor-pointer">
                <input type="text" value="${v.name}" onchange="window.edVars[${i}].name=this.value" placeholder="Název varianty" class="flex-1 bg-white/80 dark:bg-white/5 rounded-lg p-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-accent-500 text-slate-800 dark:text-white">
            </div>
            <div class="flex items-center gap-2 finance-target">
                <label class="text-[8px] font-bold text-slate-400 uppercase w-1/3">Cena/jedn.</label>
                <input type="number" step="any" value="${v.price!==undefined?v.price:0}" onchange="window.edVars[${i}].price=Number(this.value)" placeholder="0" class="w-2/3 bg-white/80 dark:bg-white/5 rounded-lg p-1.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-accent-500">
            </div>
            <div class="text-[7px] font-bold text-slate-400 uppercase">Obsahy (mg) pro variantu:</div>
            <div class="grid grid-cols-2 gap-1.5">
                ${window.edComps.map(c=>`
                <div class="flex items-center gap-1">
                    <span class="text-[8px] w-1/2 truncate font-medium text-slate-600 dark:text-slate-300">${c.name}</span>
                    <input type="number" step="any" value="${v.compoundAmts[c.id]!==undefined?v.compoundAmts[c.id]:c.amtPerUnit}" onchange="window.edVars[${i}].compoundAmts['${c.id}']=Number(this.value)" class="w-1/2 bg-white/80 dark:bg-white/5 rounded p-1 text-[9px] font-bold text-center outline-none focus:ring-2 focus:ring-accent-500">
                </div>`).join('')}
            </div>
        </div>`).join('');
}

window.addVariantUI = function(){
    const n={id:'v_'+Date.now(),name:'Nová varianta',color:'#10b981',price:0,compoundAmts:{}};
    window.edComps.forEach(c=>n.compoundAmts[c.id]=c.amtPerUnit);
    window.edVars.push(n);window.r_vars();
}

window.saveSubstance = function(){
    if(!window.edComps.length){window.showToast('Přidejte alespoň 1 složku.','error');return;}
    const id=document.getElementById('subId').value||'s_'+Date.now();
    const s={
        id,
        name:document.getElementById('subName').value||'Produkt',
        icon:document.getElementById('subIcon').value||'💊',
        category:document.getElementById('subCategory').value,
        receptor:document.getElementById('subReceptor').value,
        unit:document.getElementById('subUnit').value,
        step:Number(document.getElementById('subStep').value)||1,
        brand:document.getElementById('subBrand').value,
        basePrice:Number(document.getElementById('subBasePrice').value)||0,
        packageSize:Number(document.getElementById('subPackageSize').value)||0,
        maxDailyDose:Number(document.getElementById('subMaxDose').value)||0,
        status:document.getElementById('subStatus').value,
        form:document.getElementById('subForm').value,
        legalStatus:document.getElementById('subLegal').value,
        defaultRoa:document.getElementById('subDefaultRoa').value,
        addictionRisk:document.getElementById('subAddiction').value,
        warningTag:document.getElementById('subWarning').value,
        rating:Number(document.getElementById('subRating').value),
        compounds:window.edComps,
        variants:window.edVars
    };
    const idx=window.appData.substances.findIndex(x=>x.id===id);
    if(idx>-1)window.appData.substances[idx]=s;else window.appData.substances.push(s);
    localStorage.setItem('biotrack_data',JSON.stringify(window.appData));
    if(window.populateLoggerDropdown) window.populateLoggerDropdown();
    const activeBtn=document.querySelector('.lab-filt-btn.bg-slate-900,.lab-filt-btn.dark\\:bg-white');
    window.filterLab(activeBtn?activeBtn.id.replace('btnLab-',''):'active');
    window.closeSubstanceModal();window.showToast('✅ Produkt uložen.','success');
}

window.deleteCurrentSubstance = function(){
    window.showConfirm('Smazat látku?','Historie záznamů zůstane zachována.',(c)=>{
        if(c){
            window.appData.substances=window.appData.substances.filter(x=>x.id!==document.getElementById('subId').value);
            localStorage.setItem('biotrack_data',JSON.stringify(window.appData));
            if(window.populateLoggerDropdown) window.populateLoggerDropdown();
            window.filterLab('all');
            window.closeSubstanceModal();
            window.showToast('Látka smazána.');
        }
    });
}

// ─── CURVE EDITOR ───
window.curCEdit=-1;
window.openCurveEditor = function(idx){
    window.curCEdit=idx;
    document.getElementById('curveModal').classList.replace('hidden','flex');
    window.r_curvePts();
    // Force render on open just in case
    setTimeout(()=>window.r_curvePts(), 50);
}
window.closeCurveModal = function(){
    document.getElementById('curveModal').classList.replace('flex','hidden');
    if(window.edComps[window.curCEdit])window.edComps[window.curCEdit].useCurve=window.edComps[window.curCEdit].curve.length>0;
    window.r_comps();
}
window.renderCurvePreview = function(points) {
    if(!window.Chart) return;
    const canvas = document.getElementById('curvePreviewChart');
    if(!canvas) return;
    
    if(window._curveChart) { window._curveChart.destroy(); }
    
    if(!points || points.length === 0) {
        return; // empty chart
    }
    
    const sorted = [...points].sort((a,b)=>a.t - b.t);
    const pts = [...sorted];
    if(pts[0].t > 0) { pts.unshift({t:0, c:0}); }
    const last = pts[pts.length-1];
    if(last.c > 0) { pts.push({t: last.t * 1.5, c: 0}); } 
    
    const labels = pts.map(p => p.t);
    const data = pts.map(p => p.c);
    
    window._curveChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Efekt',
                data: data,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: '#8b5cf6',
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Čas(m)', font: {size:8} }, grid: { display: false }, ticks: {font:{size:9}} },
                y: { min: 0, max: 100, border: {display:false}, ticks: {stepSize: 25, font: {size: 9}} }
            },
            plugins: { legend: { display: false }, tooltip: {callbacks: {label: (ctx) => ctx.raw + '%' }} },
            interaction: { mode: 'index', intersect: false }
        }
    });
};

window.r_curvePts = function(){
    const c=window.edComps[window.curCEdit]?.curve||[];
    const lst=document.getElementById('curvePointsList');
    if(!c.length){
        lst.innerHTML='<div class="text-[10px] text-center text-slate-500 py-4 font-medium">Křivka je prázdná.<br>Bude použit standardní výpočet.</div>';
        if(window._curveChart) { window._curveChart.destroy(); window._curveChart = null; }
        return;
    }
    window.renderCurvePreview(c);
    [...c].sort((a,b)=>a.t-b.t);
    lst.innerHTML=c.map((pt,i)=>`
        <div class="flex justify-between items-center bg-slate-50 dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-white/10 mb-2">
            <div class="font-bold text-xs text-slate-600 dark:text-slate-300">Čas: <span class="text-accent-500 font-black">${pt.t} min</span></div>
            <div class="font-bold text-xs text-slate-600 dark:text-slate-300">Efekt: <span class="text-accent-500 font-black">${pt.c} %</span></div>
            <button onclick="window.edComps[${window.curCEdit}].curve.splice(${i},1);window.r_curvePts()" class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg active:scale-90">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
        </div>`).join('');
}
window.addCurvePoint = function(){
    const t=Number(document.getElementById('newCurveT').value);
    const c=Number(document.getElementById('newCurveC').value);
    if(isNaN(t)||isNaN(c)||t<0||c<0||c>100){window.showToast('Neplatné hodnoty (čas≥0, efekt 0-100).','error');return;}
    window.edComps[window.curCEdit].curve.push({t,c});
    document.getElementById('newCurveT').value='';
    document.getElementById('newCurveC').value='';
    window.r_curvePts();
}
