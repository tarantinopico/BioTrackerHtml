const fs = require('fs');
let code = fs.readFileSync('public/charts.js', 'utf8');

code = code.replace(
    /if \(dosesForDay\.length > 0\) \{[\s\S]*?\} else \{[\s\S]*?\}/,
    `if (dosesForDay.length > 0) {
                const intensity = Math.min(dosesForDay.length / 5, 1);
                html += \`<div class="aspect-square rounded-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center border border-transparent shadow-md font-sans font-black flex items-center justify-center text-white cal-day-btn" data-date="\${dStr}" style="background: rgba(16, 185, 129, \${0.4 + intensity * 0.6})" onclick="window.selectCalendarDay('\${dStr}')">
                    <span class="text-xs">\${day}</span>
                </div>\`;
            } else {
                html += \`<div class="aspect-square rounded-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center border \${cls} cal-day-btn" data-date="\${dStr}" onclick="window.selectCalendarDay('\${dStr}')">
                    <span class="text-xs font-bold text-slate-400 dark:text-slate-500">\${day}</span>
                </div>\`;
            }`
);

fs.writeFileSync('public/charts.js', code, 'utf8');
