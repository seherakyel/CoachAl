function safeParseJSON(raw, fallback) {
    try {
        if (raw == null || raw === "") return fallback;
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function escapeHtmlStr(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;");
}

function splitLongInterviewParagraph(text) {
    var s = (text || "").trim();
    if (s.length <= 120) return [s];
    var chunks = s.replace(/([.!?])\s+/g, "$1\n").split("\n").map(function(x) { return x.trim(); }).filter(Boolean);
    return chunks.length > 1 ? chunks : [s];
}

/** Üçüncü adım için genel kapanış metni (API’de yeterli madde yoksa) */
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

/** Tek blok metni cümlelere veya uzunluğa göre tam 3 adıma böler */
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

/** Mülakat sürecini her zaman tam 3 adımda gösterir (boş girdi → []) */
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

/** Gelişim rehberi — Firestore `coaching_content` + localStorage önbellek (coaching-firestore.js) */

function coachingTopicMissingHtml() {
    return (
        '<div class="flex flex-col items-center justify-center gap-3 rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/90 to-white px-5 py-8 text-center">' +
        '<span class="material-symbols-outlined text-[40px] text-indigo-400" aria-hidden="true">hourglass_empty</span>' +
        '<p class="m-0 max-w-[28ch] text-sm leading-relaxed text-slate-700">' +
        "Koç bu konu üzerinde çalışıyor." +
        "</p></div>"
    );
}

function coachingLoadingHtml() {
    return (
        '<div class="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/90 p-4 text-sm leading-relaxed text-slate-600">' +
        '<svg class="h-5 w-5 shrink-0 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
        '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>' +
        "</svg>" +
        "<span>Kaynaklar yükleniyor<span class=\"text-indigo-400\">…</span></span>" +
        "</div>"
    );
}

function coachingSectionSoonHtml() {
    return (
        '<div class="rounded-xl border border-slate-100 bg-slate-50/90 p-4 text-center text-sm text-slate-600">' +
        "Bu bölüm için içerik yakında eklenecek." +
        "</div>"
    );
}

function coachingWatchListHtml(items, esc) {
    var escapeHtml = esc || escapeHtmlStr;
    var iconVideo =
        '<svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>';
    if (!items || !items.length) return coachingSectionSoonHtml();
    return (
        '<ul class="m-0 list-none space-y-3 p-0">' +
        items
            .map(function (it) {
                var title = escapeHtml(it.title || "");
                var url = escapeHtml(it.url || "");
                var dur = String(it.duration || "").trim();
                var durHtml = dur
                    ? '<span class="mt-0.5 block text-xs font-normal text-slate-500">' + escapeHtml(dur) + "</span>"
                    : "";
                return (
                    '<li><a class="group flex items-start gap-4 rounded-xl border border-transparent bg-gray-50 p-4 text-sm leading-snug text-slate-800 shadow-sm transition hover:border-indigo-500 hover:bg-gray-50" href="' +
                    url +
                    '" target="_blank" rel="noopener noreferrer">' +
                    iconVideo +
                    '<span class="min-w-0 flex-1 pt-0.5">' +
                    '<span class="font-medium text-slate-800 group-hover:text-indigo-900">' +
                    title +
                    "</span>" +
                    durHtml +
                    '</span><span class="mt-1 shrink-0 text-xs text-slate-400 group-hover:text-indigo-600" aria-hidden="true">↗</span></a></li>'
                );
            })
            .join("") +
        "</ul>"
    );
}

function coachingReadListHtml(items, esc) {
    var escapeHtml = esc || escapeHtmlStr;
    var iconBook =
        '<svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>';
    if (!items || !items.length) return coachingSectionSoonHtml();
    return (
        '<ul class="m-0 list-none space-y-3 p-0">' +
        items
            .map(function (it) {
                var title = escapeHtml(it.title || "");
                var url = escapeHtml(it.url || "");
                var src = String(it.source || "").trim();
                var srcHtml = src
                    ? '<span class="mt-0.5 block text-xs font-normal text-slate-500">' + escapeHtml(src) + "</span>"
                    : "";
                return (
                    '<li><a class="group flex items-start gap-4 rounded-xl border border-transparent bg-gray-50 p-4 text-sm leading-snug text-slate-800 shadow-sm transition hover:border-indigo-500 hover:bg-gray-50" href="' +
                    url +
                    '" target="_blank" rel="noopener noreferrer">' +
                    iconBook +
                    '<span class="min-w-0 flex-1 pt-0.5">' +
                    '<span class="font-medium text-slate-800 group-hover:text-indigo-900">' +
                    title +
                    "</span>" +
                    srcHtml +
                    '</span><span class="mt-1 shrink-0 text-xs text-slate-400 group-hover:text-indigo-600" aria-hidden="true">↗</span></a></li>'
                );
            })
            .join("") +
        "</ul>"
    );
}

function coachingCheatSheetAccordionHtml(items, esc) {
    var escapeHtml = esc || escapeHtmlStr;
    if (!items || !items.length) return coachingSectionSoonHtml();
    return (
        '<div class="space-y-2">' +
        items
            .map(function (it) {
                var q = escapeHtml(it.question || "");
                var ia = escapeHtml(it.idealAnswer || "");
                var tip = escapeHtml(it.coachTip || "");
                return (
                    '<details class="group rounded-xl border border-slate-200/90 bg-white shadow-sm open:shadow-md open:ring-1 open:ring-indigo-100">' +
                    '<summary class="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-900 outline-none marker:content-none [&::-webkit-details-marker]:hidden">' +
                    '<span class="min-w-0 flex-1 text-left leading-snug">' +
                    q +
                    "</span>" +
                    '<span class="material-symbols-outlined shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true">expand_more</span>' +
                    "</summary>" +
                    '<div class="space-y-3 border-t border-slate-100 px-4 pb-4 pt-2 text-sm leading-relaxed text-slate-700">' +
                    '<div><span class="text-xs font-semibold uppercase tracking-wide text-indigo-600">İdeal cevap</span><p class="mb-0 mt-1">' +
                    ia +
                    "</p></div>" +
                    '<div class="rounded-lg bg-amber-50/80 px-3 py-2 text-xs text-amber-950"><span class="font-semibold text-amber-900">Koçun tüyosu:</span> ' +
                    tip +
                    "</div></div></details>"
                );
            })
            .join("") +
        "</div>"
    );
}


function setArLearnModalTab(tab) {
    ["watch", "read", "cheatsheet"].forEach(function(t) {
        var panel = document.getElementById("ar-learn-panel-" + t);
        var btn = document.getElementById("ar-learn-tab-" + t);
        var sel = t === tab;
        if (panel) {
            panel.classList.toggle("hidden", !sel);
            panel.hidden = !sel;
        }
        if (btn) btn.setAttribute("aria-selected", sel ? "true" : "false");
    });
}

function closeArLearnModal() {
    var modal = document.getElementById("ar-learn-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
}

async function openArLearnModal(skillRaw) {
    var esc = escapeHtmlStr;
    var skillTrim = String(skillRaw || "").trim() || "Bu konu";
    var titleEl = document.getElementById("ar-learn-modal-title");
    var watchEl = document.getElementById("ar-learn-panel-watch");
    var readEl = document.getElementById("ar-learn-panel-read");
    var cheatEl = document.getElementById("ar-learn-panel-cheatsheet");
    var simEl = document.getElementById("ar-learn-sim-cta");
    if (titleEl) titleEl.textContent = skillTrim + " — Gelişim rehberi";
    var loading = coachingLoadingHtml();
    if (watchEl) watchEl.innerHTML = loading;
    if (readEl) readEl.innerHTML = loading;
    if (cheatEl) cheatEl.innerHTML = loading;
    if (simEl)
        simEl.href =
            "quiz.html?topic=" +
            encodeURIComponent(skillTrim) +
            "&mode=fast-track";
    var modal = document.getElementById("ar-learn-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    setArLearnModalTab("watch");

    var fetchFn = typeof fetchCoachingEntryForSkill === "function" ? fetchCoachingEntryForSkill : null;
    if (!fetchFn) {
        var missingSdk = coachingTopicMissingHtml();
        if (watchEl) watchEl.innerHTML = missingSdk;
        if (readEl) readEl.innerHTML = missingSdk;
        if (cheatEl) cheatEl.innerHTML = missingSdk;
        return;
    }

    try {
        var result = await fetchFn(skillRaw);
        var entry = result && result.entry;
        if (!entry) {
            var missing = coachingTopicMissingHtml();
            if (watchEl) watchEl.innerHTML = missing;
            if (readEl) readEl.innerHTML = missing;
            if (cheatEl) cheatEl.innerHTML = missing;
            return;
        }
        if (watchEl) watchEl.innerHTML = coachingWatchListHtml(entry.watch, esc);
        if (readEl) readEl.innerHTML = coachingReadListHtml(entry.read, esc);
        if (cheatEl) cheatEl.innerHTML = coachingCheatSheetAccordionHtml(entry.cheatSheet, esc);
    } catch (err) {
        console.error("[CoachAI] Gelişim rehberi yüklenemedi:", err);
        var errHtml = coachingTopicMissingHtml();
        if (watchEl) watchEl.innerHTML = errHtml;
        if (readEl) readEl.innerHTML = errHtml;
        if (cheatEl) cheatEl.innerHTML = errHtml;
    }
}

/** Tek modal — backdrop, X, Escape, sekme geçişleri */
function initArLearnModalUi() {
    if (initArLearnModalUi._done) return;
    initArLearnModalUi._done = true;

    document.addEventListener("click", function(e) {
        var trig = e.target.closest(".ar-missing-learn-btn");
        var ms = document.getElementById("missing-skills");
        if (trig && ms && ms.contains(trig)) {
            e.preventDefault();
            var sk = trig.getAttribute("data-ar-skill");
            if (sk != null && sk !== "") void openArLearnModal(sk);
            return;
        }
        if (e.target.id === "ar-learn-modal-backdrop") {
            closeArLearnModal();
        }
    });

    var closeBtn = document.getElementById("ar-learn-modal-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", function() {
            closeArLearnModal();
        });
    }

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            var modal = document.getElementById("ar-learn-modal");
            if (modal && !modal.classList.contains("hidden")) closeArLearnModal();
        }
    });

    ["watch", "read", "cheatsheet"].forEach(function(t) {
        var btn = document.getElementById("ar-learn-tab-" + t);
        if (btn) {
            btn.addEventListener("click", function() {
                setArLearnModalTab(t);
            });
        }
    });
}

/** Eksik yetenek satırı için tahmini puan kazancı (API weight varsa onu kullanır). */
function gapLiftPointsForMissing(row, indexInTop3) {
    if (row && row.weight != null) {
        var v = Number(row.weight);
        if (!Number.isNaN(v) && v >= 0) {
            if (v > 1) return Math.min(25, Math.round(v));
            if (v > 0) return Math.min(15, Math.max(1, Math.round(v * 12)));
        }
    }
    if (row && row.impact != null) {
        var im = Number(row.impact);
        if (!Number.isNaN(im) && im >= 0) return Math.min(25, Math.round(im));
    }
    var tier = [7, 6, 5];
    return tier[indexInTop3] != null ? tier[indexInTop3] : 4;
}

/** Koçun işaret ettiği ilk 3 eksik yeteneğin ağırlıklarını toplayıp skora ekler; üst sınır %100. */
function computePotentialMatchScore(currentScore, missingRows) {
    var rows = Array.isArray(missingRows) ? missingRows : [];
    var top = rows.slice(0, 3);
    if (!top.length) {
        return { potential: currentScore, gain: 0 };
    }
    var gain = 0;
    for (var i = 0; i < top.length; i++) {
        gain += gapLiftPointsForMissing(top[i], i);
    }
    var room = Math.max(0, 100 - currentScore);
    gain = Math.min(gain, room);
    var potential = Math.min(100, Math.round(currentScore + gain));
    if (top.length && potential <= currentScore) {
        potential = Math.min(100, currentScore + Math.min(1, room));
    }
    return { potential: potential, gain: potential - currentScore };
}

/** Dış kesikli potansiyel halkası + gelişim kapsülü (eksik yeteneklerden). */
function updateGrowthPotentialUi(score, missingUi) {
    var POT_R = 49;
    var circPot = 2 * Math.PI * POT_R;
    var arcPot = document.getElementById("score-potential-arc");
    var pill = document.getElementById("ar-growth-pill");
    var pillPct = document.getElementById("ar-growth-pill-pct");
    if (!arcPot || !pill || !pillPct) return;

    var rows = Array.isArray(missingUi) ? missingUi : [];
    if (!rows.length) {
        arcPot.style.strokeDashoffset = String(circPot);
        pill.classList.add("hidden");
        return;
    }

    var comp = computePotentialMatchScore(score, rows);
    var pot = comp.potential;
    var gain = Math.max(0, pot - score);

    if (gain <= 0) {
        arcPot.style.strokeDashoffset = String(circPot);
        pill.classList.add("hidden");
        return;
    }

    arcPot.setAttribute("stroke-dasharray", "4 8");
    arcPot.style.strokeDashoffset = String(circPot - (pot / 100) * circPot);

    pillPct.textContent = String(pot);
    pill.classList.remove("hidden");

    if (!pill._arPotentialScrollBound) {
        pill._arPotentialScrollBound = true;
        pill.addEventListener("click", function () {
            var anchor = document.getElementById("ar-missing-skills-anchor");
            if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }
}

function missingSkillRowHtml(label, detail, index, escapeHtml) {
    var d = (detail || "").trim();
    var safeLabel = escapeHtml(label);
    var leftEdge = "border-b border-solid border-slate-100 border-l-[4px] border-indigo-200 [border-left-style:dashed]";
    var iconHtml =
        '<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-indigo-200 bg-slate-50 text-slate-400">' +
        '<span class="material-symbols-outlined text-[20px]" style="font-variation-settings:\'FILL\' 0,\'wght\' 400">change_circle</span></div>';
    /** Koç önerisi — Material sparkles (yol gösteren) */
    var coachSuggestIcon =
        '<span class="material-symbols-outlined shrink-0 text-[16px] leading-none text-indigo-500" style="font-variation-settings:\'FILL\' 1,\'wght\' 500" aria-hidden="true">auto_awesome</span>';
    return (
        '<li class="border-b border-slate-100 py-3 pl-4 ' +
        leftEdge +
        ' last:border-b-0">' +
        '<div class="flex items-start gap-3">' +
        iconHtml +
        '<div class="min-w-0 flex-1">' +
        '<div class="flex flex-col gap-0">' +
        '<span class="block text-sm font-semibold text-slate-800">' +
        safeLabel +
        "</span>" +
        (d ? '<span class="ar-skill-detail block text-xs leading-snug text-slate-600">' + escapeHtml(d) + "</span>" : "") +
        '<div class="mt-1.5">' +
        '<div class="ar-missing-learn-wrap relative inline-block max-w-full">' +
        '<button type="button" class="ar-missing-learn-btn inline-flex items-center justify-center gap-2 rounded-full border border-indigo-500 bg-transparent px-3 py-1.5 text-[11px] font-medium leading-none tracking-tight text-indigo-600 transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-1" title="Eksiklerini kapatmak için tıkla" aria-label="Koç önerisi: Eksiklerini kapatmak için tıkla" aria-haspopup="dialog" aria-controls="ar-learn-modal" data-ar-skill="' +
        escapeHtmlAttr(label) +
        '" id="ar-learn-btn-' +
        index +
        '">' +
        coachSuggestIcon +
        '<span class="whitespace-nowrap">Koç Öneriyor</span>' +
        "</button>" +
        "</div>" +
        "</div>" +
        "</div></div></div></li>"
    );
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
    var glowWrap = document.getElementById("score-glow-wrap");
    var arcEl = document.getElementById("score-arc");
    if (scoreValEl) scoreValEl.textContent = score;

    if (glowWrap) {
        glowWrap.className =
            "ar-score-glow-wrap ar-glow-indigo relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72";
    }
    if (scoreValEl) {
        scoreValEl.className =
            "ar-score-value-lift text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-indigo-700 leading-none";
    }
    var matchLbl = document.getElementById("score-match-label");
    if (matchLbl) {
        matchLbl.className = "text-[11px] font-semibold uppercase tracking-widest text-indigo-700 opacity-90";
    }

    if (arcEl) {
        var circumference = 283;
        var offset = circumference - (score / 100) * circumference;
        arcEl.style.strokeDashoffset = offset;
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
        interviewSteps = processRaw.map(function(p) {
            return String(p);
        });
    } else if (typeof processRaw === "string" && processRaw.trim()) {
        interviewSteps = processRaw.split(/\r?\n+/).map(function(s) {
            return s.trim();
        }).filter(Boolean);
    }
    interviewSteps = normalizeInterviewStepsToThree(interviewSteps);
    document.getElementById("interview-process").innerHTML = interviewSteps.length
        ? '<div class="ar-ip-plain">' +
          interviewSteps
              .map(function(p, i) {
                  return (
                      '<div class="ar-ip-row pl-2.5 border-l-2 border-indigo-400">' +
                      '<span class="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Adım ' +
                      (i + 1) +
                      "</span>" +
                      '<p class="mt-1 text-slate-700 leading-snug">' +
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

    document.getElementById("missing-skills").innerHTML = missingUi
        .map(function(row, idx) {
            var lab = row.skill != null ? String(row.skill) : "";
            var det = row.detail != null ? String(row.detail) : "";
            return missingSkillRowHtml(lab, det, idx, escapeHtml);
        })
        .join("") || "<li class='border-b border-slate-100 py-4 text-sm text-slate-500 last:border-0'>Gelişim alanı listesi için analizi yeniden çalıştırın.</li>";

    updateGrowthPotentialUi(score, missingUi);

    initArLearnModalUi();

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
