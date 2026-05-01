async function onLayoutReady(user) {
    document.getElementById("welcome-title").textContent = "Hoş Geldin, " + (user.displayName || user.email.split("@")[0]) + "!";
    await loadDashboard();
}

async function loadDashboard() {
    var tok;
    try { tok = await getToken(); } catch(e) { return; }
    try {
        var r = await fetch(API_BASE + "/api/dashboard/summary", { headers: { Authorization: "Bearer " + tok } });
        var d = await r.json();
        document.getElementById("stat-company").textContent = d.company_count || d.total_companies || "0";
        document.getElementById("stat-interview").textContent = d.interview_count || d.total_interviews || "0";
        var alignments = d.alignments || d.recent_alignments || [];
        var avgScore = 0;
        if (alignments.length > 0) {
            var sum = alignments.reduce(function(acc, a) { return acc + (a.score || 0); }, 0);
            avgScore = Math.round((sum / alignments.length) * 100);
        }
        document.getElementById("stat-avg").textContent = avgScore ? "%" + avgScore : "—";
        renderBarChart(alignments);
        renderTable(alignments);
    } catch(e) {
        document.getElementById("stat-company").textContent = "—";
        document.getElementById("stat-avg").textContent = "—";
        document.getElementById("stat-interview").textContent = "—";
        document.getElementById("table-body").innerHTML = `<tr><td colspan="5" class="py-8 text-center text-on-surface-variant">Veri yüklenemedi</td></tr>`;
    }
}

function renderBarChart(alignments) {
    var container = document.getElementById("bar-chart-container");
    if (!alignments || alignments.length === 0) {
        container.innerHTML = `<div class="text-center text-on-surface-variant text-sm py-12">Henüz analiz yok. <a href="cv-analysis.html" class="text-primary hover:underline">İlk analizi başlat →</a></div>`;
        return;
    }
    var max = 100;
    container.innerHTML = `<div class="w-full h-48 flex items-end gap-3 px-2">` +
        alignments.slice(0, 8).map(function(a) {
            var pct = Math.round((a.score || 0) * 100);
            var h = Math.max(5, pct);
            var company = (a.company_name || "—").substring(0, 8);
            var color = pct >= 80 ? "bg-emerald-400" : pct >= 60 ? "bg-primary-fixed-dim" : "bg-amber-400";
            return `<div class="flex-1 flex flex-col items-center gap-1 group">
<span class="text-xs text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">%${pct}</span>
<div class="${color} rounded-t-lg w-full transition-all hover:brightness-90 cursor-default" style="height:${h}%"></div>
<span class="text-xs text-on-surface-variant truncate w-full text-center">${company}</span>
</div>`;
        }).join("") + `</div>`;
}

function renderTable(alignments) {
    var tbody = document.getElementById("table-body");
    if (!alignments || alignments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-on-surface-variant text-sm">Henüz analiz yok</td></tr>`;
        return;
    }
    tbody.innerHTML = alignments.slice(0, 10).map(function(a) {
        var score = Math.round((a.score || 0) * 100);
        var company = a.company_name || "—";
        var position = a.target_position || "—";
        var date = a.created_at ? a.created_at.substring(0, 10) : "—";
        var risk = score >= 80 ? "Düşük Risk" : score >= 60 ? "Orta Risk" : "Yüksek Risk";
        var scoreClass = score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : score >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200";
        return `<tr class="hover:bg-slate-50 transition-colors group">
<td class="py-4 px-6 font-medium">${company}</td>
<td class="py-4 px-6 text-on-surface-variant">${position}</td>
<td class="py-4 px-6"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${scoreClass}">%${score}</span></td>
<td class="py-4 px-6 text-on-surface-variant text-sm">${risk}</td>
<td class="py-4 px-6 text-right"><a href="analysis-result.html" class="font-label-sm text-label-sm text-slate-500 border border-slate-200 px-4 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-all bg-transparent">Detay</a></td>
</tr>`;
    }).join("");
}
