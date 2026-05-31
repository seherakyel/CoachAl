var _allApplications = [];

async function onLayoutReady(user) {
    document.getElementById("welcome-title").textContent = "Hoş Geldin, " + (user.displayName || user.email.split("@")[0]) + "!";
    showSkeletons();
    await loadDashboard();
}

function showSkeletons() {
    var pulse = '<div class="h-9 w-20 bg-slate-200 animate-pulse rounded-lg"></div>';
    ["stat-cv", "stat-avg", "stat-interview", "stat-best"].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = pulse;
    });
    var chartSkeleton = '<div class="w-full h-40 flex items-end gap-3 px-2">';
    [55, 70, 40, 85, 60, 75].forEach(function(h) {
        chartSkeleton += '<div class="flex-1 flex flex-col items-center gap-1">' +
            '<div class="bg-slate-200 animate-pulse rounded-t-lg w-full" style="height:' + h + '%;"></div>' +
            '<div class="h-3 w-full bg-slate-100 animate-pulse rounded mt-1"></div>' +
            '</div>';
    });
    chartSkeleton += '</div>';
    document.getElementById("bar-chart-container").innerHTML = chartSkeleton;
    var skeletonRow = '<tr>' +
        Array(5).fill('<td class="py-4 px-6"><div class="h-4 bg-slate-100 animate-pulse rounded w-3/4"></div></td>').join("") +
        '</tr>';
    document.getElementById("table-body").innerHTML = skeletonRow + skeletonRow + skeletonRow;
}

async function loadDashboard() {
    var tok;
    try { tok = await getToken(); } catch(e) { return; }
    try {
        var r = await fetch(API_BASE + "/api/dashboard/summary", { headers: { Authorization: "Bearer " + tok } });
        var d = await r.json();
        var applications = d.applications || [];
        _allApplications = applications;

        document.getElementById("stat-cv").textContent = d.cv_count != null ? d.cv_count : "0";
        document.getElementById("stat-interview").textContent = d.interview_count != null ? d.interview_count : "0";

        var scored = applications.filter(function(a) { return a.alignment_score != null; });
        var avgScore = 0;
        if (scored.length > 0) {
            var sum = scored.reduce(function(acc, a) { return acc + (a.alignment_score || 0); }, 0);
            avgScore = Math.round(sum / scored.length);
        }
        document.getElementById("stat-avg").textContent = avgScore ? "%" + avgScore : "—";

        var bestScore = null;
        applications.forEach(function(a) {
            if (a.classic_best != null && (bestScore == null || a.classic_best > bestScore)) bestScore = a.classic_best;
            if (a.quiz_best != null && (bestScore == null || a.quiz_best > bestScore)) bestScore = a.quiz_best;
        });
        document.getElementById("stat-best").textContent = bestScore != null ? bestScore : "—";

        renderBarChart(applications);
        renderTable(applications);
    } catch(e) {
        ["stat-cv", "stat-avg", "stat-interview", "stat-best"].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.textContent = "—";
        });
        document.getElementById("bar-chart-container").innerHTML = renderEmptyState();
        document.getElementById("table-body").innerHTML = '<tr><td colspan="5" class="py-8 text-center text-on-surface-variant text-sm">Veri yüklenemedi</td></tr>';
    }
}

function renderEmptyState() {
    return '<div class="flex flex-col items-center justify-center min-h-[160px] gap-3">' +
        '<span class="material-symbols-outlined text-[48px] text-slate-300">analytics</span>' +
        '<p class="text-sm text-on-surface-variant">Henüz analiziniz yok</p>' +
        '<a href="cv-analysis.html" class="text-sm text-primary border border-primary/30 px-4 py-1.5 rounded-lg hover:bg-primary/5 transition-colors">CV Yükle ve Başla →</a>' +
        '</div>';
}

function renderBarChart(applications) {
    var container = document.getElementById("bar-chart-container");
    var items = (applications || []).filter(function(a) { return a.alignment_score != null; }).slice(0, 8);
    if (items.length === 0) {
        container.innerHTML = renderEmptyState();
        return;
    }
    container.innerHTML = '<div class="w-full h-40 flex items-end gap-3 px-2 pt-6">' +
        items.map(function(a) {
            var pct = Math.round(a.alignment_score || 0);
            var h = Math.max(4, pct);
            var company = (a.company_name || "—").substring(0, 8);
            var color = pct >= 80 ? "bg-emerald-400" : pct >= 60 ? "bg-indigo-400" : "bg-amber-400";
            return '<div class="flex-1 flex flex-col items-center gap-1 group cursor-default">' +
                '<span class="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity leading-none">%' + pct + '</span>' +
                '<div class="' + color + ' rounded-t-lg w-full transition-all group-hover:brightness-90" style="height:' + h + '%;"></div>' +
                '<span class="text-[10px] text-on-surface-variant truncate w-full text-center mt-0.5">' + company + '</span>' +
                '</div>';
        }).join("") + '</div>';
}

function renderTable(applications) {
    var tbody = document.getElementById("table-body");
    if (!applications || applications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-4">' + renderEmptyState() + '</td></tr>';
        return;
    }
    tbody.innerHTML = applications.slice(0, 10).map(function(a) {
        var score = Math.round(a.alignment_score || 0);
        var company = a.company_name || "—";
        var position = a.position || "—";
        var risk = score >= 80 ? "Düşük Risk" : score >= 60 ? "Orta Risk" : "Yüksek Risk";
        var scorePillCls = score >= 80
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : score >= 60
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-red-50 text-red-700 border-red-200";
        var riskCls = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
        var detailHref = a.alignment_id ? "analysis-result.html?id=" + a.alignment_id : "cv-analysis.html";
        return '<tr class="hover:bg-slate-50 transition-colors">' +
            '<td class="py-4 px-6 font-medium text-on-surface">' + company + '</td>' +
            '<td class="py-4 px-6 text-on-surface-variant text-sm">' + position + '</td>' +
            '<td class="py-4 px-6"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + scorePillCls + '">%' + score + '</span></td>' +
            '<td class="py-4 px-6"><span class="text-xs font-medium ' + riskCls + '">' + risk + '</span></td>' +
            '<td class="py-4 px-6 text-right"><a href="' + detailHref + '" class="text-sm text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-all">Detay</a></td>' +
            '</tr>';
    }).join("");
}
