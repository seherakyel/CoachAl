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

/** İnce hatlı SVG — konu metnine göre (kod, bulut, mimari, veri, güvenlik, varsayılan) */
function arTopicIconSvg(text, className) {
    var cls = className || "ar-step-ico";
    var t = String(text || "").toLowerCase();
    var op = ' fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
    if (/bulut|cloud|aws|azure|gcp|kubernetes|k8s|docker|devops|deploy|infra|network|ağ|container/i.test(t)) {
        return (
            '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path' + op + ' d="M6.5 17.5A4.5 4.5 0 014 10.2a5.5 5.5 0 0110.3-1.1A4 4 0 0118.5 17.5h-12z"/>' +
            "</svg>"
        );
    }
    if (/mimari|architecture|microservice|mikroservis|design|pattern|scalab|ölçek|sistem|monolith|gateway|event|ddd|clean/i.test(t)) {
        return (
            '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' +
            '<rect x="3" y="4" width="18" height="4" rx="1"' + op + '/>' +
            '<rect x="5" y="10" width="14" height="4" rx="1"' + op + '/>' +
            '<rect x="7" y="16" width="10" height="4" rx="1"' + op + "/>" +
            "</svg>"
        );
    }
    if (/kod|code|geliştir|program|yazılım|test|git|bug|refactor|java|python|go|typescript|javascript|debug|review/i.test(t)) {
        return (
            '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path' + op + ' d="M7 8l-4 4 4 4"/>' +
            '<path' + op + ' d="M17 8l4 4-4 4"/>' +
            '<path' + op + ' d="M14 4l-4 16"/>' +
            "</svg>"
        );
    }
    if (/veri|data|sql|nosql|database|db|cache|redis|mongo|postgres|transaction|kafka|stream/i.test(t)) {
        return (
            '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' +
            '<ellipse cx="12" cy="6" rx="7" ry="3"' + op + '/>' +
            '<path' + op + ' d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>' +
            "</svg>"
        );
    }
    if (/güvenlik|security|auth|oauth|jwt|şifre|encrypt|xss|csrf|oauth|iam/i.test(t)) {
        return (
            '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path' + op + ' d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"/>' +
            "</svg>"
        );
    }
    return (
        '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="9"' + op + '/>' +
        '<circle cx="12" cy="12" r="5"' + op + '/>' +
        '<circle cx="12" cy="12" r="1.5"' + op + "/>" +
        "</svg>"
    );
}

function arAccordionChevron() {
    return (
        '<svg class="ar-acc-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>"
    );
}

/** Mülakat konusu: başlık + detay (iki satır / iki nokta / uzun metin) */
function arSplitTopicBody(s) {
    s = String(s).trim();
    var i = s.indexOf(":");
    if (i > 0 && i < 96) {
        return { topic: s.slice(0, i).trim(), rest: s.slice(i + 1).trim() };
    }
    var lines = s.split(/\r?\n/);
    if (lines.length > 1 && lines[0].length < 140) {
        return { topic: lines[0].trim(), rest: lines.slice(1).join("\n").trim() };
    }
    if (s.length > 96) {
        return { topic: s.slice(0, 93).trim() + "…", rest: s };
    }
    return { topic: s, rest: "" };
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
    var riskBadgeEl = document.getElementById("score-risk-badge");
    var riskIconEl = document.getElementById("score-risk-icon");
    var riskLabelEl = document.getElementById("score-risk-label");
    var glowWrap = document.getElementById("score-glow-wrap");
    var arcEl = document.getElementById("score-arc");
    if (scoreValEl) scoreValEl.textContent = score;

    var risk = score >= 80 ? "Düşük Risk" : score >= 60 ? "Orta Risk" : "Yüksek Risk";
    var badgeBase = "mt-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold shadow-sm";
    if (riskLabelEl) riskLabelEl.textContent = risk;
    if (riskIconEl) {
        riskIconEl.setAttribute("style", "font-variation-settings:'FILL' 1,'wght' 500");
    }
    if (riskBadgeEl && riskIconEl) {
        if (score >= 80) {
            riskBadgeEl.className = badgeBase + " border border-emerald-200/90 bg-emerald-50/95 text-emerald-800";
            riskIconEl.textContent = "verified";
            riskIconEl.className = "material-symbols-outlined text-[18px] text-emerald-600";
        } else if (score >= 60) {
            riskBadgeEl.className = badgeBase + " border border-amber-200/90 bg-amber-50/95 text-amber-900";
            riskIconEl.textContent = "priority_high";
            riskIconEl.className = "material-symbols-outlined text-[18px] text-amber-600";
        } else {
            riskBadgeEl.className = badgeBase + " border border-red-200/90 bg-red-50/95 text-red-800";
            riskIconEl.textContent = "warning";
            riskIconEl.className = "material-symbols-outlined text-[18px] text-red-600";
        }
    }
    if (glowWrap) {
        glowWrap.className = "ar-score-glow-wrap relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72";
        if (score >= 80) glowWrap.classList.add("ar-glow-emerald");
        else if (score >= 60) glowWrap.classList.add("ar-glow-amber");
        else glowWrap.classList.add("ar-glow-red");
    }
    if (scoreValEl) {
        if (score >= 80) scoreValEl.className = "text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-emerald-600 leading-none";
        else if (score >= 60) scoreValEl.className = "text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-amber-600 leading-none";
        else scoreValEl.className = "text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-red-600 leading-none";
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
    var companyKey = String(company).trim().toLowerCase();
    var logoTrendy = document.getElementById("company-logo-trendyol");
    var logoFallback = document.getElementById("company-logo-fallback");
    var initialEl = document.getElementById("company-initial");
    if (companyKey.indexOf("trendyol") !== -1) {
        if (logoTrendy) logoTrendy.classList.remove("hidden");
        if (logoFallback) logoFallback.classList.add("hidden");
    } else {
        if (logoTrendy) logoTrendy.classList.add("hidden");
        if (logoFallback) logoFallback.classList.remove("hidden");
        if (initialEl) initialEl.textContent = company[0] ? company[0].toUpperCase() : "—";
    }
    document.getElementById("company-industry").textContent = companyProfile.industry || "Technology";
    var targetPos = (companyProfile.position || alignment.position || "").trim();
    var posEl = document.getElementById("company-position");
    if (targetPos && posEl) {
        posEl.textContent = "Hedef rol · " + targetPos;
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
    document.getElementById("interview-process").innerHTML = interviewSteps.length
        ? '<div class="ar-ip-timeline"><div class="ar-ip-line" aria-hidden="true"></div>' +
          interviewSteps
              .map(function(p, i) {
                  return (
                      '<div class="ar-ip-step">' +
                      '<span class="ar-ip-dot" aria-hidden="true"></span>' +
                      '<span class="text-[11px] font-bold uppercase tracking-wide text-indigo-600/90 mb-1.5 block">Adım ' +
                      (i + 1) +
                      "</span>" +
                      '<p class="text-sm text-on-surface leading-relaxed">' +
                      escapeHtml(p) +
                      "</p></div>"
                  );
              })
              .join("") +
          "</div>"
        : "<span class='text-on-surface-variant text-sm'>Şirket profilinde mülakat adımları metin olarak geldi; yukarıdaki özetten takip edebilirsiniz.</span>";

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
        document.getElementById("common-questions").innerHTML = questions.map(function(q) {
            var full = String(q).trim();
            var parts = arSplitTopicBody(full);
            var detailText = parts.rest && parts.rest.length ? parts.rest : full;
            return (
                '<details class="ar-q-acc">' +
                "<summary>" +
                arTopicIconSvg(parts.topic, "ar-q-topic-ico") +
                '<span class="min-w-0 flex-1">' +
                escapeHtml(parts.topic) +
                "</span>" +
                arAccordionChevron() +
                "</summary>" +
                '<div class="ar-q-acc-panel">' +
                escapeHtml(detailText) +
                "</div></details>"
            );
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
    document.getElementById("next-steps-list").innerHTML = nextSteps.slice(0, 5).map(function(text) {
        return (
            "<li>" +
            '<div class="ar-next-card">' +
            arTopicIconSvg(text, "ar-step-ico") +
            '<span class="text-[15px] leading-relaxed text-on-surface min-w-0">' +
            escapeHtml(text) +
            "</span></div></li>"
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
