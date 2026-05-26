const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

const loggerFormRegex = /<!-- ADD DOSE FULL FORM -->[\s\S]*?<\/form>\s*/;
const match = html.match(loggerFormRegex);
if (match) {
    const loggerForm = match[0];
    html = html.replace(loggerFormRegex, '');

    const tabLoggerStr = `<!-- ═══════════════════════════════════════════ TAB: ZÁZNAM ═══ -->
        <div id="tab-logger" class="tab-content max-w-xl mx-auto w-full">
            <div class="flex justify-between items-center mb-4 animate-stagger-1">
                <h2 class="text-2xl font-black text-slate-800 dark:text-white">Záznam</h2>
            </div>
            ${loggerForm}
        </div>
        
        `;

    // Insert tab-logger before tab-dashboard
    html = html.replace('<!-- ═══════════════════════════════════════════ TAB: PŘEHLED ═══ -->', tabLoggerStr + '<!-- ═══════════════════════════════════════════ TAB: PŘEHLED ═══ -->');
    fs.writeFileSync('index.html', html, 'utf-8');
    console.log("Separated logger tab");
} else {
    console.log("Could not find loggerForm.");
}
