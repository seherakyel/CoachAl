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

/** tech_stack maddesinin eşleşen / eksik yetenek satırlarıyla örtüşüp örtüşmediği */
function arTechTokensOverlap(tech, phrase) {
    var a = String(tech).toLowerCase().trim();
    var b = String(phrase).toLowerCase().trim();
    if (!a || !b) return false;
    if (b.indexOf(a) !== -1 || a.indexOf(b) !== -1) return true;
    var strip = function(s) {
        return s.replace(/[^a-z0-9+#.]/g, "");
    };
    var sa = strip(a);
    var sb = strip(b);
    if (sa.length >= 3 && sb.indexOf(sa) !== -1) return true;
    if (sb.length >= 3 && sa.indexOf(sb) !== -1) return true;
    var words = a.split(/[\s,/]+/).filter(function(w) {
        return w.length > 2;
    });
    return words.some(function(w) {
        return b.indexOf(w) !== -1;
    });
}

function arTechBadgeKind(tech, matchedUi, missingUi) {
    var m = matchedUi.some(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        return arTechTokensOverlap(tech, lab);
    });
    if (m) return "matched";
    var g = missingUi.some(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        return arTechTokensOverlap(tech, lab);
    });
    if (g) return "gap";
    return "gap";
}

/** Skor bileşenleri: yüzde ve bar 0'dan hedefe animasyon */
function animateScoreBreakdownPcts() {
    var rows = document.querySelectorAll("[data-ar-score-row]");
    if (!rows || !rows.length) return;
    rows.forEach(function(row) {
        var pctEl = row.querySelector(".ar-score-pct");
        var barEl = row.querySelector(".ar-score-bar-fill");
        if (!pctEl || !barEl) return;
        var target = parseInt(pctEl.getAttribute("data-target"), 10);
        if (Number.isNaN(target)) target = 0;
        target = Math.min(100, Math.max(0, target));
        pctEl.textContent = "0%";
        barEl.style.width = "0%";
        var startTs = null;
        var duration = 1000;
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }
        function step(ts) {
            if (startTs === null) startTs = ts;
            var u = Math.min(1, (ts - startTs) / duration);
            var v = Math.round(target * easeOutCubic(u));
            pctEl.textContent = v + "%";
            barEl.style.width = v + "%";
            if (u < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    });
}

/** Aranan profil rozeti — minik Material ikon veya yıldız */
function traitBadgeLeadingGraphic(label) {
    var s = String(label).toLowerCase();
    function matIcon(name, fillOne) {
        return (
            '<span class="material-symbols-outlined text-[15px] text-indigo-500 shrink-0" style="font-variation-settings:\'FILL\' ' +
            (fillOne ? "1" : "0") +
            ',\'wght\' 500">' +
            name +
            "</span>"
        );
    }
    if (/react|vue|angular|svelte|javascript|typescript|css|html|web|ui|ux|geliştir|website|frontend/.test(s)) return matIcon("code", true);
    if (/python|java|go|rust|kotlin|php|ruby|backend|api|microservice|spring|node/.test(s)) return matIcon("terminal", true);
    if (/cloud|aws|azure|gcp|docker|kubernetes|devops|infra|sunucu/.test(s)) return matIcon("cloud", false);
    if (/sql|nosql|data|analytics|machine|learning|\bai\b|ml|veri|kafka/.test(s)) return matIcon("database", false);
    if (/lead|manager|takım|team|iletişim|communication|english|soft|collaboration|agile|scrum/.test(s)) return matIcon("groups", true);
    if (/güvenlik|security|auth|oauth|encrypt/.test(s)) return matIcon("shield", false);
    if (/tasarım|design|figma|mobil|mobile|ios|android/.test(s)) return matIcon("palette", false);
    return (
        '<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100/90 text-[12px] leading-none text-indigo-600" aria-hidden="true">\u2726</span>'
    );
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
    var badgeBase =
        "mt-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-700";
    if (riskLabelEl) riskLabelEl.textContent = risk;
    if (riskIconEl) {
        riskIconEl.setAttribute("style", "font-variation-settings:'FILL' 1,'wght' 500");
    }
    if (riskBadgeEl && riskIconEl) {
        if (score >= 80) {
            riskBadgeEl.className = badgeBase;
            riskIconEl.textContent = "verified";
            riskIconEl.className = "material-symbols-outlined text-[18px] text-emerald-600";
        } else if (score >= 60) {
            riskBadgeEl.className = badgeBase;
            riskIconEl.textContent = "priority_high";
            riskIconEl.className = "material-symbols-outlined text-[18px] text-amber-500";
        } else {
            riskBadgeEl.className = badgeBase;
            riskIconEl.textContent = "warning";
            riskIconEl.className = "material-symbols-outlined text-[18px] text-rose-600";
        }
    }
    if (glowWrap) {
        glowWrap.className = "ar-score-glow-wrap relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72";
        if (score >= 80) glowWrap.classList.add("ar-glow-indigo");
        else if (score >= 60) glowWrap.classList.add("ar-glow-amber");
        else glowWrap.classList.add("ar-glow-red");
    }
    if (scoreValEl) {
        if (score >= 80) scoreValEl.className = "text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-indigo-600 leading-none";
        else if (score >= 60) scoreValEl.className = "text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-amber-600 leading-none";
        else scoreValEl.className = "text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-rose-600 leading-none";
    }

    if (arcEl) {
        var circumference = 283;
        var offset = circumference - (score / 100) * circumference;
        arcEl.style.strokeDashoffset = offset;
        if (score >= 80) arcEl.style.stroke = "#4f46e5";
        else if (score >= 60) arcEl.style.stroke = "#f59e0b";
        else arcEl.style.stroke = "#f43f5e";
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
        ? '<div class="ar-ip-plain">' +
          interviewSteps
              .map(function(p, i) {
                  return (
                      '<div class="ar-ip-row pl-3 border-l-[3px] border-indigo-400">' +
                      '<span class="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Adım ' +
                      (i + 1) +
                      "</span>" +
                      '<p class="mt-2 text-sm text-slate-700 leading-relaxed">' +
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
            '<div data-ar-score-row class="flex gap-3 rounded-xl border border-slate-100/95 bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-900/[0.03] transition-shadow duration-300 hover:shadow-md">' +
            '<div class="ar-score-row-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-indigo-100 self-start mt-0.5">' +
            '<span class="material-symbols-outlined text-[18px]" style="font-variation-settings:\'FILL\' 1">' +
            t.icon +
            "</span></div>" +
            '<div class="min-w-0 flex-1">' +
            '<div class="flex items-baseline justify-between gap-2 mb-1">' +
            '<span class="text-sm font-semibold text-slate-800 leading-tight">' +
            escapeHtml(t.label) +
            '</span><span class="ar-score-pct text-sm font-bold tabular-nums tracking-tight text-indigo-700" data-target="' +
            p +
            '">0%</span></div>' +
            '<div class="ar-score-bar-track mb-1.5">' +
            '<div class="ar-score-bar-fill"></div></div>' +
            '<p class="text-[11px] leading-snug text-slate-600">' +
            escapeHtml(t.hint) +
            "</p></div></div>"
        );
    }).join("");
    requestAnimationFrame(function() {
        requestAnimationFrame(animateScoreBreakdownPcts);
    });

    var traits = companyProfile.key_traits || [];
    if (Array.isArray(traits) && traits.length) {
        document.getElementById("key-traits-section").classList.remove("hidden");
        document.getElementById("key-traits").innerHTML = traits
            .map(function(t) {
                var raw = String(t);
                return (
                    '<span class="ar-trait-badge inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-200/75 bg-indigo-50/30 px-3.5 py-2 text-left text-xs font-medium text-slate-700">' +
                    traitBadgeLeadingGraphic(raw) +
                    "<span class=\"min-w-0 break-words leading-snug\">" +
                    escapeHtml(raw) +
                    "</span></span>"
                );
            })
            .join("");
    }

    function rowHtml(kind, label, detail) {
        var d = (detail || "").trim();
        var leftEdge =
            kind === "matched"
                ? "border-b border-solid border-slate-100 border-l-[4px] border-indigo-600"
                : "border-b border-solid border-slate-100 border-l-[4px] border-indigo-200 [border-left-style:dashed]";
        var iconHtml =
            kind === "matched"
                ? '<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shadow-sm ring-1 ring-indigo-200/90">' +
                  '<span class="material-symbols-outlined text-[22px]" style="font-variation-settings:\'FILL\' 1,\'wght\' 500">check_circle</span></div>'
                : '<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-indigo-200 bg-slate-50 text-slate-400">' +
                  '<span class="material-symbols-outlined text-[20px]" style="font-variation-settings:\'FILL\' 0,\'wght\' 400">change_circle</span></div>';
        return (
            '<li class="border-b border-slate-100 py-4 pl-4 ' +
            leftEdge +
            ' last:border-b-0">' +
            '<div class="flex items-start gap-3">' +
            iconHtml +
            '<div class="min-w-0"><span class="block text-sm font-semibold text-slate-800">' +
            escapeHtml(label) +
            "</span>" +
            (d
                ? '<span class="ar-skill-detail mt-2 block text-xs text-slate-600">' +
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

    var techStack = companyProfile.tech_stack || [];
    document.getElementById("tech-stack").innerHTML = techStack
        .map(function(t) {
            var raw = String(t);
            var kind = arTechBadgeKind(raw, matchedUi, missingUi);
            var check =
                '<span class="material-symbols-outlined text-[15px] text-indigo-600 shrink-0" style="font-variation-settings:\'FILL\' 1,\'wght\' 500">check_circle</span>';
            var plus =
                '<span class="material-symbols-outlined text-[15px] text-indigo-300 shrink-0" style="font-variation-settings:\'FILL\' 0,\'wght\' 400">add_circle</span>';
            var shell =
                kind === "matched"
                    ? "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                    : "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600";
            return (
                "<span class='" +
                shell +
                "'>" +
                (kind === "matched" ? check : plus) +
                "<span>" +
                escapeHtml(raw) +
                "</span></span>"
            );
        })
        .join("") || "<span class='text-on-surface-variant text-sm'>—</span>";

    document.getElementById("matched-skills").innerHTML = matchedUi.map(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        var det = row.detail != null ? String(row.detail) : "";
        return rowHtml("matched", lab, det);
    }).join("") || "<li class='border-b border-slate-100 py-4 text-sm text-slate-500 last:border-0'>Eşleşen yetenek listesi için analizi yeniden çalıştırın.</li>";

    document.getElementById("missing-skills").innerHTML = missingUi.map(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        var det = row.detail != null ? String(row.detail) : "";
        return rowHtml("missing", lab, det);
    }).join("") || "<li class='border-b border-slate-100 py-4 text-sm text-slate-500 last:border-0'>Gelişim alanı listesi için analizi yeniden çalıştırın.</li>";

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
