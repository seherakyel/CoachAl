function onLayoutReady() {
    var alignment = JSON.parse(sessionStorage.getItem("coachai_alignment") || "null");
    var companyProfile = JSON.parse(sessionStorage.getItem("coachai_company_profile") || "null");

    if (!alignment || !companyProfile) {
        window.location.href = "cv-analysis.html";
        return;
    }

    var rawPct = alignment.score_percent != null ? Number(alignment.score_percent) : NaN;
    if (Number.isNaN(rawPct) && alignment.score != null) {
        var s = Number(alignment.score);
        rawPct = s <= 1 ? s * 100 : s;
    }
    if (Number.isNaN(rawPct)) rawPct = 0;
    var score = Math.round(rawPct);

    document.getElementById("score-value").textContent = score;

    var risk = score >= 80 ? "Düşük Risk" : score >= 60 ? "Orta Risk" : "Yüksek Risk";
    var riskEl = document.getElementById("score-risk");
    riskEl.textContent = risk;
    if (score >= 80) { riskEl.className = "font-label-sm text-label-sm bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full mt-2"; }
    else if (score >= 60) { riskEl.className = "font-label-sm text-label-sm bg-amber-50 text-amber-700 px-2 py-1 rounded-full mt-2"; }
    else { riskEl.className = "font-label-sm text-label-sm bg-red-50 text-red-700 px-2 py-1 rounded-full mt-2"; }

    var arcEl = document.getElementById("score-arc");
    var circumference = 283;
    var offset = circumference - (score / 100) * circumference;
    arcEl.style.strokeDashoffset = offset;
    if (score >= 80) arcEl.style.stroke = "#10b981";
    else if (score >= 60) arcEl.style.stroke = "#f59e0b";
    else arcEl.style.stroke = "#ef4444";

    var company = companyProfile.company_name || sessionStorage.getItem("coachai_company_name") || "—";
    document.getElementById("company-name").textContent = company;
    document.getElementById("company-initial").textContent = company[0] ? company[0].toUpperCase() : "—";
    document.getElementById("company-industry").textContent = companyProfile.industry || "Technology";
    document.getElementById("result-subtitle").textContent = "Profilinizin " + company + " beklentileriyle eşleşme analizi.";
    document.getElementById("company-culture").textContent = companyProfile.culture_summary || "—";
    document.getElementById("ai-advice").textContent = alignment.advice || companyProfile.preparation_tips || "Analiziniz tamamlandı. Mülakat moduna geçebilirsiniz.";

    var techStack = companyProfile.tech_stack || [];
    document.getElementById("tech-stack").innerHTML = techStack.map(function(t) {
        return `<span class="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-full font-medium">${t}</span>`;
    }).join("") || "<span class='text-on-surface-variant text-sm'>—</span>";

    var processRaw = companyProfile.interview_process;
    var steps = [];
    if (Array.isArray(processRaw)) {
        steps = processRaw.map(function(p) { return String(p); });
    } else if (typeof processRaw === "string" && processRaw.trim()) {
        steps = processRaw.split(/\r?\n+/).map(function(s) { return s.trim(); }).filter(Boolean);
        if (steps.length === 1 && steps[0].length > 120) {
            var parts = steps[0].split(/(?<=[.!?])\s+/);
            if (parts.length > 1) steps = parts.map(function(s) { return s.trim(); }).filter(Boolean);
        }
    }
    document.getElementById("interview-process").innerHTML = steps.map(function(p, i) {
        return `<div class="flex items-center gap-3 p-2 rounded-lg ${i === 0 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}"><span class="material-symbols-outlined text-[16px] ${i === 0 ? 'text-primary' : 'text-outline'}">${i === 0 ? 'done' : 'radio_button_unchecked'}</span><span class="text-sm text-on-surface">${p}</span></div>`;
    }).join("") || "<span class='text-on-surface-variant text-sm'>Şirket profilinde mülakat adımları metin olarak geldi; yukarıdaki özetten takip edebilirsiniz.</span>";

    function rowHtml(iconCls, iconName, label, detail) {
        var d = (detail || "").trim();
        return `<li class="flex items-start gap-3"><span class="material-symbols-outlined ${iconCls} text-[20px] shrink-0 mt-0.5">${iconName}</span><div><span class="font-label-sm text-sm font-medium text-on-surface block">${label}</span>${d ? `<span class="font-body-md text-xs text-on-surface-variant block mt-1 leading-relaxed">${d}</span>` : ""}</div></li>`;
    }

    var matchedUi = alignment.matched_skills_ui;
    var missingUi = alignment.missing_skills_ui;
    var legacyM = alignment.matched_skills || [];
    var legacyX = alignment.missing_skills || [];

    if (!matchedUi || !matchedUi.length) {
        matchedUi = legacyM.map(function(s) {
            if (typeof s === "object" && s !== null && (s.skill || s.detail)) return s;
            var lab = typeof s === "string" ? s : (s.skill || "");
            return { skill: lab, detail: "Bu başlık CV’niz ve ilan profiliyle uyumlu görünüyor." };
        });
    }
    if (!missingUi || !missingUi.length) {
        missingUi = legacyX.map(function(s) {
            if (typeof s === "object" && s !== null && (s.skill || s.detail)) return s;
            var lab = typeof s === "string" ? s : (s.skill || "");
            return { skill: lab, detail: "Bu alanı güçlendirmek mülakatta öne çıkmanıza yardımcı olur." };
        });
    }

    document.getElementById("matched-skills").innerHTML = matchedUi.map(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        var det = row.detail != null ? String(row.detail) : "";
        return rowHtml("text-emerald-500", "check_circle", lab, det);
    }).join("") || "<li class='text-on-surface-variant text-sm'>Eşleşen yetenek listesi için analizi yeniden çalıştırın.</li>";

    document.getElementById("missing-skills").innerHTML = missingUi.map(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        var det = row.detail != null ? String(row.detail) : "";
        return rowHtml("text-amber-600", "trending_up", lab, det);
    }).join("") || "<li class='text-on-surface-variant text-sm'>Gelişim alanı listesi için analizi yeniden çalıştırın.</li>";
}
