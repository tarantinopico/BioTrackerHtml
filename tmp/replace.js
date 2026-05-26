const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf-8');

const regex = /<!-- ═══════════════════════════════════════════ TAB: PŘEHLED ═══ -->[\s\S]*?(?=<!-- ═══════════════════════════════════════════ TAB: LABORATOŘ ═══ -->)/;

const newContent = `<!-- ═══════════════════════════════════════════ TAB: PŘEHLED ═══ -->
        <div id="tab-dashboard" class="tab-content active mx-auto w-full">
            <!-- Main Content Grid -->
            <div class="grid grid-cols-1 gap-3">
                
                <!-- Kinetics Graph (Main Focus) -->
                <div class="bento-card p-3 md:p-4 animate-stagger-1 text-center w-full">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="font-black text-sm md:text-base text-slate-800 dark:text-white flex items-center gap-2">
                           <svg class="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> 
                           Kinetika
                        </h3>
                        <div class="flex gap-2 items-center">
                            <select id="graphMode" onchange="drawKineticGraph()" class="custom-select bg-slate-100/60 dark:bg-white/10 border border-transparent text-[9px] font-bold rounded-lg py-1 pl-2 outline-none cursor-pointer text-slate-700 dark:text-slate-200">
                                <option value="influence">Vliv (%)</option>
                                <option value="concentration">Hladina (mg)</option>
                            </select>
                        </div>
                    </div>
                    <div class="w-full h-40 sm:h-52 relative bg-white/40 dark:bg-[#08080a]/50 rounded-xl overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-inner">
                        <div id="kineticCanvas" class="w-full h-full"></div>
                    </div>
                    <div id="dailyLimitsContainer" class="mt-2 space-y-1"></div>
                    <div id="activeSubstancesList" class="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2"></div>
                </div>

                <!-- ADD DOSE FULL FORM -->
                <form id="loggerForm" class="bento-card p-4 lg:p-5 border-t-4 border-t-accent-500 animate-stagger-2 shadow-lg relative overflow-hidden">
                    <div id="loggerGlowBg" class="absolute inset-0 pointer-events-none opacity-5 mix-blend-multiply dark:mix-blend-screen transition-all duration-500"></div>
                    <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                        
                        <!-- Top on mobile / Right on desktop: Massive Plus/Minus -->
                        <div class="flex flex-col items-center justify-center bg-slate-50/50 dark:bg-white/5 p-4 rounded-3xl border border-slate-200/50 dark:border-white/5 md:order-last">
                            <label class="block text-center text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Nastavení Množství</label>
                            
                            <div class="flex items-center justify-center gap-3 w-full mb-4">
                                <button type="button" onclick="adjustAmount(-1)" class="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white dark:bg-slate-800 shadow-md border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center active:scale-90 transition-transform text-slate-600 dark:text-slate-300 hover:text-accent-500 hover:border-accent-500 shrink-0">
                                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4"/></svg>
                                </button>
                                
                                <div class="relative flex justify-center border-b-[3px] border-slate-200 dark:border-slate-700 focus-within:border-accent-500 mx-2 w-full max-w-[150px]">
                                    <input type="number" id="logAmount" inputmode="decimal" required min="0" step="any" value="0" oninput="updateLoggerUI()" class="w-full bg-transparent text-center text-5xl md:text-6xl font-black outline-none tracking-tighter privacy-target pb-1" style="color:#64748b">
                                    <div id="logUnitLabel" class="absolute right-0 bottom-2 text-base font-bold text-slate-400 transform translate-x-full pr-2">g</div>
                                </div>
                                
                                <button type="button" onclick="adjustAmount(1)" class="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white dark:bg-slate-800 shadow-md border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center active:scale-90 transition-transform text-slate-600 dark:text-slate-300 hover:text-accent-500 hover:border-accent-500 shrink-0">
                                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/></svg>
                                </button>
                            </div>
                            
                            <div class="flex justify-center gap-2 w-full flex-wrap">
                                <button type="button" onclick="setCommonAmount(0.5)" class="text-[10px] font-black uppercase px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-accent-500 hover:text-accent-500 transition-all active:scale-95">Micro</button>
                                <button type="button" onclick="setCommonAmount(1.0)" class="text-[10px] font-black uppercase px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-accent-500 hover:text-accent-500 transition-all active:scale-95">Běžná</button>
                                <button type="button" onclick="setCommonAmount(1.5)" class="text-[10px] font-black uppercase px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-accent-500 hover:text-accent-500 transition-all active:scale-95">Silná</button>
                            </div>
                        </div>

                        <!-- Bottom on mobile / Left on desktop: Details -->
                        <div class="space-y-4 md:order-first flex flex-col justify-center">
                            <!-- Warning Box -->
                            <div id="loggerWarnBox" style="display:none" class="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-900/40">
                                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                <span class="text-xs font-bold" id="loggerWarnText">Varování</span>
                            </div>

                            <div>
                                <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Látka & Forma</label>
                                <div class="space-y-2">
                                    <select id="logSubstance" required onchange="handleSubstanceChange()" class="custom-select w-full bg-slate-50 dark:bg-[#0c0c0e]/70 border-2 border-slate-200/60 dark:border-white/10 rounded-xl py-3 px-3 text-base font-black focus:border-accent-500 outline-none transition-all privacy-target text-slate-800 dark:text-white shadow-inner"></select>
                                    <select id="logVariant" onchange="updateLoggerUI()" class="custom-select w-full bg-slate-50 dark:bg-[#0c0c0e]/70 border-2 border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-3 text-sm font-bold focus:border-accent-500 outline-none transition-all hidden text-slate-700 dark:text-slate-200"></select>
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Administrace</label>
                                <input type="hidden" id="logRoute" value="oral">
                                <div class="grid grid-cols-4 gap-1.5" id="routeSelector">
                                    <button type="button" onclick="setRoute('oral')" class="route-btn active bg-accent-500 text-white border-accent-500 border-2 py-2.5 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 shadow-glow-sm active:scale-95" data-val="oral">Ústa</button>
                                    <button type="button" onclick="setRoute('sublingual')" class="route-btn bg-slate-50 dark:bg-[#0c0c0e]/60 text-slate-500 border-slate-200/60 dark:border-white/10 border-2 py-2.5 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 active:scale-95" data-val="sublingual">Jazyk</button>
                                    <button type="button" onclick="setRoute('intranasal')" class="route-btn bg-slate-50 dark:bg-[#0c0c0e]/60 text-slate-500 border-slate-200/60 dark:border-white/10 border-2 py-2.5 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 active:scale-95" data-val="intranasal">Nos</button>
                                    <button type="button" onclick="setRoute('inhalation')" class="route-btn bg-slate-50 dark:bg-[#0c0c0e]/60 text-slate-500 border-slate-200/60 dark:border-white/10 border-2 py-2.5 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 active:scale-95" data-val="inhalation">Plíce</button>
                                </div>
                                <div class="text-center text-[7.5px] font-medium text-slate-400 mt-1" id="logRoaInfo">ROA ovlivňuje vlastnosti kinetiky</div>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Čas</label>
                                    <input type="datetime-local" id="logTime" required class="w-full bg-slate-50 dark:bg-[#0c0c0e]/70 border-2 border-slate-200/60 dark:border-white/10 rounded-xl p-2.5 text-[11px] font-bold focus:border-accent-500 outline-none h-[44px] text-slate-700 dark:text-slate-200">
                                </div>
                                <div class="finance-target">
                                    <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Cena (Kč)</label>
                                    <input type="number" id="logPrice" step="any" min="0" placeholder="0" class="w-full bg-slate-50 dark:bg-[#0c0c0e]/70 border-2 border-slate-200/60 dark:border-white/10 rounded-xl p-2.5 text-base font-black focus:border-accent-500 outline-none text-center privacy-target h-[44px] text-slate-800 dark:text-white shadow-inner">
                                </div>
                            </div>
                            
                            <div class="bg-slate-50 dark:bg-black/40 rounded-xl p-3 border border-slate-200/50 dark:border-white/5 shadow-inner mt-2 hidden" id="previewBoxContainer">
                                <div class="flex items-center gap-1.5 mb-2">
                                    <span class="text-[9px] font-black uppercase text-slate-400">Extrakce molekul</span>
                                </div>
                                <div id="activeCompoundsPreview" class="space-y-1.5"></div>
                                <div class="text-center text-[9px] font-bold text-slate-500 mt-2" id="logClearanceEstimate"></div>
                            </div>
                        </div>

                    </div>
                    
                    <div class="mt-4 w-full">
                        <button type="submit" class="w-full bg-gradient-to-r from-accent-500 to-accent-600 text-white font-black py-4 rounded-2xl shadow-glow hover:shadow-glow-sm active:scale-[0.98] transition-all text-lg flex justify-center items-center gap-2 relative overflow-hidden group">
                            <span class="relative z-10 flex items-center gap-2">
                                Injikovat Dávku
                            </span>
                        </button>
                    </div>
                </form>

                <!-- Info Cards -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 animate-stagger-3">
                    <div class="bento-card p-3 flex flex-col justify-center border-l-[3px] border-l-blue-500">
                        <div class="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Aktivní Sub.</div>
                        <div class="text-xl font-black text-slate-800 dark:text-white" id="dashActiveCountTxt">0</div>
                    </div>
                    <div class="bento-card p-3 flex flex-col justify-center border-l-[3px] border-l-purple-500">
                        <div class="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Dnes Dávek</div>
                        <div class="text-xl font-black text-slate-800 dark:text-white" id="dashTotalDoses">0</div>
                    </div>
                    <div class="bento-card p-3 flex flex-col justify-center finance-target border-l-[3px] border-l-accent-500">
                        <div class="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Dnes Útrata</div>
                        <div class="text-xl font-black privacy-target text-slate-800 dark:text-white" id="dashTotalCost">0</div>
                    </div>
                    <div class="bento-card p-3 flex flex-col justify-center finance-target">
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Trend (7d)</span>
                            <span class="text-[10px] font-black" id="dashTrendDir">-</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div class="h-full bg-accent-500 rounded-full transition-all" id="dashTrendBar" style="width:50%"></div>
                        </div>
                    </div>
                </div>

                <!-- Last Actions -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 animate-stagger-4">
                    <div class="bento-card p-3 md:p-4 flex flex-col">
                        <div class="flex justify-between items-center mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Naposledy užito</h3>
                        </div>
                        <div id="lastUsedWidget" class="flex flex-col gap-2">
                            <div class="text-xs font-bold text-slate-500 p-2 text-center my-auto">Zatím žádná data.</div>
                        </div>
                    </div>
                    <div class="bento-card p-3 md:p-4 flex flex-col">
                        <div class="flex justify-between items-center mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nedávná historie</h3>
                            <button onclick="switchTab('analytics')" class="text-[9px] font-bold text-accent-500 uppercase hover:underline">Analytika →</button>
                        </div>
                        <div id="recentLogs" class="space-y-2 max-h-[300px] overflow-y-auto pr-1"></div>
                    </div>
                </div>

            </div>
            
            <!-- Removed unused legacy IDs -->
            <div id="dashTrendDirMob" class="hidden"></div>
            <div id="dashTrendBarMob" class="hidden"></div>
        </div>
`;

if(regex.test(html)) {
    const newHtml = html.replace(regex, newContent);
    fs.writeFileSync('index.html', newHtml, 'utf-8');
    console.log('REPLACED SUCCESSFULLY');
} else {
    console.log('REGEX DID NOT MATCH');
}
