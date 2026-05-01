function onLayoutReady() {
    var alignment = JSON.parse(sessionStorage.getItem("coachai_alignment") || "null");
    var companyProfile = JSON.parse(sessionStorage.getItem("coachai_company_profile") || "null");

    if (!alignment || !companyProfile) {
        window.location.href = "cv-analysis.html";
        return;
    }

    var score = Math.round((alignment.score || 0) * 100);
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
    document.getElementById("company-initial").textContent = company[0].toUpperCase();
    document.getElementById("company-industry").textContent = companyProfile.industry || "Technology";
    document.getElementById("result-subtitle").textContent = "Profilinizin " + company + " beklentileriyle eşleşme analizi.";
    document.getElementById("company-culture").textContent = companyProfile.culture_summary || "—";
    document.getElementById("ai-advice").textContent = alignment.advice || companyProfile.preparation_tips || "Analiziniz tamamlandı. Mülakat moduna geçebilirsiniz.";

    var techStack = companyProfile.tech_stack || [];
    document.getElementById("tech-stack").innerHTML = techStack.map(function(t) {
        return `<span class="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-full font-medium">${t}</span>`;
    }).join("") || "<span class='text-on-surface-variant text-sm'>—</span>";

    var process = companyProfile.interview_process || [];
    document.getElementById("interview-process").innerHTML = process.map(function(p, i) {
        return `<div class="flex items-center gap-3 p-2 rounded-lg ${i === 0 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}"><span class="material-symbols-outlined text-[16px] ${i === 0 ? 'text-primary' : 'text-outline'}">${i === 0 ? 'done' : 'radio_button_unchecked'}</span><span class="text-sm text-on-surface">${p}</span></div>`;
    }).join("") || "<span class='text-on-surface-variant text-sm'>Bilgi yok</span>";

    var matched = alignment.matched_skills || [];
    document.getElementById("matched-skills").innerHTML = matched.map(function(s) {
        var label = typeof s === "string" ? s : s.skill || s;
        var detail = typeof s === "object" && s.detail ? s.detail : "";
        return `<li class="flex items-start gap-3"><span class="material-symbols-outlined text-emerald-500 text-[20px] shrink-0 mt-0.5">done</span><div><span class="font-label-sm text-sm font-medium text-on-surface block">${label}</span>${detail ? `<span class="font-body-md text-xs text-on-surface-variant">${detail}</span>` : ""}</div></li>`;
    }).join("") || "<li class='text-on-surface-variant text-sm'>Eşleşen yetenek bulunamadı</li>";

    var missing = alignment.missing_skills || [];
    document.getElementById("missing-skills").innerHTML = missing.map(function(s) {
        var label = typeof s === "string" ? s : s.skill || s;
        var detail = typeof s === "object" && s.detail ? s.detail : "";
        return `<li class="flex items-start gap-3"><span class="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">error</span><div><span class="font-label-sm text-sm font-medium text-on-surface block">${label}</span>${detail ? `<span class="font-body-md text-xs text-on-surface-variant">${detail}</span>` : ""}</div></li>`;
    }).join("") || "<li class='text-on-surface-variant text-sm'>Eksik yetenek bulunamadı</li>";
}
