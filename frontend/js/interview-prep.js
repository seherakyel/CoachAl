/**
 * Mülakat hazırlık sayfası — yol haritası (interview_process).
 * Veri: sessionStorage coachai_company_profile
 */
function safeParseJSON(raw, fallback) {
    try {
        if (raw == null || raw === "") return fallback;
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function splitLongInterviewParagraph(text) {
    var s = (text || "").trim();
    if (s.length <= 120) return [s];
    var chunks = s.replace(/([.!?])\s+/g, "$1\n").split("\n").map(function(x) {
        return x.trim();
    }).filter(Boolean);
    return chunks.length > 1 ? chunks : [s];
}

var AR_INTERVIEW_THIRD_PLACEHOLDER =
    "Kapanış, referans ve teklif aşamaları şirket içi prosedüre göre sonlandırılır.";

function splitSentencesForInterview(text) {
    return String(text || "")
        .replace(/([.!?])\s+/g, "$1\n")
        .split("\n")
        .map(function(x) {
            return x.trim();
        })
        .filter(Boolean);
}

function splitIntoThreeBySentences(text) {
    var sents = splitSentencesForInterview(text);
    var n = sents.length;
    if (n >= 3) {
        var i1 = Math.ceil(n / 3);
        var i2 = Math.ceil((n - i1) / 2) + i1;
        return [sents.slice(0, i1).join(" "), sents.slice(i1, i2).join(" "), sents.slice(i2).join(" ")];
    }
    if (n === 2) {
        return [sents[0], sents[1], AR_INTERVIEW_THIRD_PLACEHOLDER];
    }
    var t = sents[0] || String(text).trim();
    if (!t) {
        return [AR_INTERVIEW_THIRD_PLACEHOLDER, AR_INTERVIEW_THIRD_PLACEHOLDER, AR_INTERVIEW_THIRD_PLACEHOLDER];
    }
    if (t.length > 200) {
        var third = Math.ceil(t.length / 3);
        return [t.slice(0, third), t.slice(third, 2 * third), t.slice(2 * third)];
    }
    return [t, AR_INTERVIEW_THIRD_PLACEHOLDER, AR_INTERVIEW_THIRD_PLACEHOLDER];
}

function normalizeInterviewStepsToThree(rawSteps) {
    var list = rawSteps.map(function(x) {
        return String(x).trim();
    }).filter(Boolean);
    if (list.length === 0) return [];

    if (list.length >= 3) {
        return [list[0], list[1], list.slice(2).join(" ")];
    }
    if (list.length === 2) {
        return [list[0], list[1], AR_INTERVIEW_THIRD_PLACEHOLDER];
    }

    var one = list[0];
    var expanded = one.length > 120 ? splitLongInterviewParagraph(one) : [one];

    if (expanded.length >= 3) {
        return [expanded[0], expanded[1], expanded.slice(2).join(" ")];
    }
    if (expanded.length === 2) {
        return [expanded[0], expanded[1], AR_INTERVIEW_THIRD_PLACEHOLDER];
    }
    return splitIntoThreeBySentences(expanded[0]);
}

var DEFAULT_ROADMAP_STEPS = [
    "İnsan kaynakları veya işe alım görüşmesi: deneyim özeti, rol beklentileri ve uyum.",
    "Teknik değerlendirme: alan bilgisi, problem çözme ve uygulama soruları.",
    "Vaka çalışması veya derinlemesine teknik oturum; gerekirse son değerlendirme ve referans.",
];

function extractInterviewSteps(companyProfile) {
    var processRaw = companyProfile && companyProfile.interview_process;
    var steps = [];
    if (Array.isArray(processRaw)) {
        steps = processRaw.map(function(p) {
            return String(p);
        });
    } else if (typeof processRaw === "string" && processRaw.trim()) {
        steps = processRaw.split(/\r?\n+/).map(function(s) {
            return s.trim();
        }).filter(Boolean);
    }
    return normalizeInterviewStepsToThree(steps);
}

/** Yatay timeline: adımlar flex + araya ince çizgi */
function renderRoadmap(steps) {
    var root = document.getElementById("ip-roadmap");
    if (!root) return;
    var parts = [];
    steps.forEach(function(text, i) {
        if (i > 0) {
            parts.push(
                '<div class="flex flex-1 min-w-[1rem] items-center self-stretch pt-5 px-1 sm:px-2">' +
                    '<div class="h-px w-full bg-slate-200" role="presentation"></div>' +
                    "</div>"
            );
        }
        parts.push(
            '<div class="flex flex-col items-center min-w-0 flex-1 max-w-[14rem] mx-auto">' +
                '<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-sm" aria-hidden="true">' +
                (i + 1) +
                "</span>" +
                '<p class="mt-4 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Adım ' +
                (i + 1) +
                "</p>" +
                '<p class="mt-2 text-center text-sm leading-relaxed text-slate-600">' +
                escapeHtml(text) +
                "</p>" +
                "</div>"
        );
    });
    root.innerHTML = parts.join("");
}

function populateInterviewPrep() {
    var companyProfile = safeParseJSON(sessionStorage.getItem("coachai_company_profile"), null);
    if (companyProfile == null) {
        window.location.href = "cv-analysis.html";
        return;
    }

    var company =
        companyProfile.company_name || sessionStorage.getItem("coachai_company_name") || "Şirket";
    var badgeEl = document.getElementById("ip-company-badge");
    if (badgeEl) {
        badgeEl.textContent = company + " Hazırlık Planı";
    }
    var sub = document.getElementById("ip-page-subtitle");
    if (sub) {
        sub.textContent = "Şirket profilinize göre özetlenen mülakat adımları.";
        sub.classList.remove("hidden");
    }

    var steps = extractInterviewSteps(companyProfile);
    if (steps.length === 0) {
        steps = DEFAULT_ROADMAP_STEPS.slice();
    }

    renderRoadmap(steps);
}

function onInterviewPrepReady() {
    try {
        populateInterviewPrep();
    } catch (e) {
        console.error("interview-prep:", e);
        window.location.href = "cv-analysis.html";
    }
}
