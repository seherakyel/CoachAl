function safeParseJSON(raw, fallback) {
    try {
        if (raw == null || raw === "") return fallback;
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function splitLongInterviewParagraph(text) {
    var s = (text || "").trim();
    if (s.length <= 120) return [s];
    var chunks = s.replace(/([.!?])\s+/g, "$1\n").split("\n").map(function(x) { return x.trim(); }).filter(Boolean);
    return chunks.length > 1 ? chunks : [s];
}

function populateAnalysisResult() {
    var alignment = safeParseJSON(sessionStorage.getItem("coachai_alignment"), null);
    var companyProfile = safeParseJSON(sessionStorage.getItem("coachai_company_profile"), null);

    if (alignment == null || companyProfile == null) {
        window.location.href = "cv-analysis.html";
        return;
    }

    function escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function pct01(v) {
        var n = Number(v);
        if (Number.isNaN(n)) return 0;
        return Math.round(Math.min(1, Math.max(0, n)) * 100);
    }

    var rawPct = alignment.score_percent != null ? Number(alignment.score_percent) : NaN;
    if (Number.isNaN(rawPct) && alignment.score != null) {
        var s = Number(alignment.score);
        rawPct = s <= 1 ? s * 100 : s;
    }
    if (Number.isNaN(rawPct)) rawPct = 0;
    var score = Math.round(rawPct);

    var scoreValEl = document.getElementById("score-value");
    var riskEl = document.getElementById("score-risk");
    var arcEl = document.getElementById("score-arc");
    if (scoreValEl) scoreValEl.textContent = score;

    var risk = score >= 80 ? "Düşük Risk" : score >= 60 ? "Orta Risk" : "Yüksek Risk";
    if (riskEl) {
        riskEl.textContent = risk;
        if (score >= 80) { riskEl.className = "font-label-sm text-label-sm bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full mt-2"; }
        else if (score >= 60) { riskEl.className = "font-label-sm text-label-sm bg-amber-50 text-amber-700 px-2 py-1 rounded-full mt-2"; }
        else { riskEl.className = "font-label-sm text-label-sm bg-red-50 text-red-700 px-2 py-1 rounded-full mt-2"; }
    }

    if (arcEl) {
        var circumference = 283;
        var offset = circumference - (score / 100) * circumference;
        arcEl.style.strokeDashoffset = offset;
        if (score >= 80) arcEl.style.stroke = "#10b981";
        else if (score >= 60) arcEl.style.stroke = "#f59e0b";
        else arcEl.style.stroke = "#ef4444";
    }

    var company = companyProfile.company_name || sessionStorage.getItem("coachai_company_name") || "—";
    document.getElementById("company-name").textContent = company;
    document.getElementById("company-initial").textContent = company[0] ? company[0].toUpperCase() : "—";
    document.getElementById("company-industry").textContent = companyProfile.industry || "Technology";
    var targetPos = (companyProfile.position || alignment.position || "").trim();
    var posEl = document.getElementById("company-position");
    if (targetPos && posEl) {
        posEl.textContent = "Hedef rol: " + targetPos;
        posEl.classList.remove("hidden");
    }
    document.getElementById("result-subtitle").textContent = "Profilinizin " + company + " beklentileriyle eşleşme analizi.";
    document.getElementById("company-culture").textContent = companyProfile.culture_summary || "—";
    document.getElementById("ai-advice").textContent = alignment.advice || companyProfile.preparation_tips || "Analiziniz tamamlandı. Mülakat moduna geçebilirsiniz.";

    var techStack = companyProfile.tech_stack || [];
    document.getElementById("tech-stack").innerHTML = techStack.map(function(t) {
        return `<span class="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-full font-medium">${escapeHtml(String(t))}</span>`;
    }).join("") || "<span class='text-on-surface-variant text-sm'>—</span>";

    var processRaw = companyProfile.interview_process;
    var interviewSteps = [];
    if (Array.isArray(processRaw)) {
        interviewSteps = processRaw.map(function(p) { return String(p); });
    } else if (typeof processRaw === "string" && processRaw.trim()) {
        interviewSteps = processRaw.split(/\r?\n+/).map(function(s) { return s.trim(); }).filter(Boolean);
        if (interviewSteps.length === 1 && interviewSteps[0].length > 120) {
            interviewSteps = splitLongInterviewParagraph(interviewSteps[0]);
        }
    }
    document.getElementById("interview-process").innerHTML = interviewSteps.map(function(p, i) {
        return '<div class="flex items-center gap-3 p-2 rounded-lg ' + (i === 0 ? "bg-surface-container-low" : "bg-surface-container-lowest") + '"><span class="material-symbols-outlined text-[16px] ' + (i === 0 ? "text-primary" : "text-outline") + '">' + (i === 0 ? "done" : "radio_button_unchecked") + '</span><span class="text-sm text-on-surface">' + escapeHtml(p) + "</span></div>";
    }).join("") || "<span class='text-on-surface-variant text-sm'>Şirket profilinde mülakat adımları metin olarak geldi; yukarıdaki özetten takip edebilirsiniz.</span>";

    var traitLabels = [
        { key: "S", label: "Yetenek eşleşmesi", hint: "CV’deki yeteneklerin şirket profiline uyumu", icon: "psychology" },
        { key: "E", label: "Deneyim uyumu", hint: "Deneyim süresi ile rol beklentisi", icon: "work_history" },
        { key: "D", label: "Eğitim faktörü", hint: "Eğitim seviyesi", icon: "school" }
    ];
    document.getElementById("score-breakdown").innerHTML = traitLabels.map(function(t) {
        var v = alignment[t.key];
        var p = pct01(v);
        return (
            '<div class="flex gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">' +
            '<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">' +
            '<span class="material-symbols-outlined text-[22px]">' + t.icon + "</span></div>" +
            '<div class="min-w-0 flex-1">' +
            '<div class="flex items-center justify-between gap-2 mb-2">' +
            '<span class="text-sm font-medium text-on-surface">' + escapeHtml(t.label) + "</span>" +
            '<span class="text-sm font-semibold tabular-nums text-primary">' + p + "%</span></div>" +
            '<div class="h-2.5 overflow-hidden rounded-full bg-surface-container">' +
            '<div class="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500" style="width:' + p + '%"></div></div>' +
            '<p class="mt-2 text-xs leading-relaxed text-on-surface-variant">' + escapeHtml(t.hint) + "</p>" +
            "</div></div>"
        );
    }).join("");

    var traits = companyProfile.key_traits || [];
    if (Array.isArray(traits) && traits.length) {
        document.getElementById("key-traits-section").classList.remove("hidden");
        document.getElementById("key-traits").innerHTML = traits.map(function(t) {
            return '<span class="px-2.5 py-1 bg-indigo-50/80 text-indigo-900 text-xs rounded-lg border border-indigo-100/80 font-medium">' + escapeHtml(String(t)) + "</span>";
        }).join("");
    }

    var questions = companyProfile.common_questions || [];
    var posLabel = (companyProfile.position || alignment.position || "").trim();
    var leadEl = document.getElementById("common-questions-lead");
    if (leadEl) {
        if (posLabel) {
            leadEl.textContent =
                company +
                " ve “" +
                posLabel +
                "” rolü için bu şirketin tipik beklentileriyle örtüşen örnek mülakat temaları aşağıda. Kamuya açık bilgiler ve makul çıkarımlara dayanır.";
        } else {
            leadEl.textContent =
                company +
                " profiline göre örnek mülakat temaları aşağıda. Kamuya açık bilgiler ve makul çıkarımlara dayanır.";
        }
    }
    if (Array.isArray(questions) && questions.length) {
        document.getElementById("common-questions-section").classList.remove("hidden");
        document.getElementById("common-questions").innerHTML = questions.map(function(q, i) {
            return '<li class="flex gap-2.5 items-start rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2"><span class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 text-indigo-800 font-label-sm text-[10px] font-semibold">' + (i + 1) + '</span><span class="text-sm text-on-surface leading-relaxed">' + escapeHtml(String(q)) + "</span></li>";
        }).join("");
    }

    function rowHtml(kind, iconCls, iconName, label, detail) {
        var d = (detail || "").trim();
        var shell =
            kind === "matched"
                ? "rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-3 shadow-sm"
                : "rounded-xl border border-amber-200/90 bg-amber-50/50 p-3 shadow-sm";
        return (
            '<li class="' +
            shell +
            '"><div class="flex items-start gap-3"><span class="material-symbols-outlined ' +
            iconCls +
            ' mt-0.5 shrink-0 text-[22px]">' +
            iconName +
            '</span><div class="min-w-0"><span class="block text-sm font-semibold text-on-surface">' +
            escapeHtml(label) +
            "</span>" +
            (d
                ? '<span class="mt-1 block text-xs leading-relaxed text-on-surface-variant">' +
                  escapeHtml(d) +
                  "</span>"
                : "") +
            "</div></div></li>"
        );
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
        return rowHtml("matched", "text-emerald-600", "check_circle", lab, det);
    }).join("") || "<li class='rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4 text-sm text-on-surface-variant'>Eşleşen yetenek listesi için analizi yeniden çalıştırın.</li>";

    document.getElementById("missing-skills").innerHTML = missingUi.map(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        var det = row.detail != null ? String(row.detail) : "";
        return rowHtml("missing", "text-amber-600", "trending_up", lab, det);
    }).join("") || "<li class='rounded-xl border border-dashed border-amber-200 bg-amber-50/30 p-4 text-sm text-on-surface-variant'>Gelişim alanı listesi için analizi yeniden çalıştırın.</li>";

    var nextSteps = Array.isArray(alignment.next_steps) ? alignment.next_steps : [];
    nextSteps = nextSteps.map(function(s) { return String(s).trim(); }).filter(Boolean);
    if (nextSteps.length < 2 && missingUi && missingUi.length) {
        nextSteps = missingUi.slice(0, 4).map(function(row) {
            var lab = row.skill != null ? String(row.skill) : "";
            return lab ? "“" + lab + "” alanında kısa pratik veya örnek proje ile hazırlanın." : "";
        }).filter(Boolean);
    }
    if (nextSteps.length < 2) {
        nextSteps = [
            "Güçlü yönlerinizi 2-3 STAR hikayesiyle netleştirin.",
            "Şirketin teknoloji setine uygun bir kaynak veya açık kaynak kod örneği inceleyin.",
            "Mülakatta anlatacağınız projelerde ölçülebilir sonuçları (ölçek, süre, kalite) hazır tutun."
        ];
    }
    document.getElementById("next-steps-list").innerHTML = nextSteps.slice(0, 5).map(function(text, idx) {
        return (
            '<li class="flex gap-3 rounded-lg border border-indigo-100/90 bg-indigo-50/40 px-3 py-2.5">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">' +
            (idx + 1) +
            '</span><span class="text-[15px] leading-relaxed text-on-surface">' +
            escapeHtml(text) +
            "</span></li>"
        );
    }).join("");

    var root = document.getElementById("analysis-root");
    if (root) root.classList.add("analysis-ready");
}

function onLayoutReady() {
    try {
        populateAnalysisResult();
    } catch (e) {
        console.error("analysis-result populate:", e);
        window.location.href = "cv-analysis.html";
    }
}
