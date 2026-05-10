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

/** Liste taşması: alt fade + ipucu yalnızca kaydırılacak içerik varken */
function updateSkillsScrollOverflowHints() {
    ["matched-skills", "missing-skills"].forEach(function(id) {
        var el = document.getElementById(id);
        if (!el || !el.parentElement) return;
        var wrap = el.parentElement;
        if (!wrap.classList.contains("ar-skills-fade-bottom")) return;
        var cueId = id === "matched-skills" ? "ar-matched-scroll-cue" : "ar-missing-scroll-cue";
        var cue = document.getElementById(cueId);
        var overflow = el.scrollHeight > el.clientHeight + 1;
        wrap.classList.toggle("ar-skills-fade-bottom--scrollable", overflow);
        if (cue) {
            if (overflow) cue.removeAttribute("hidden");
            else cue.setAttribute("hidden", "");
        }
    });
}

function initSkillsScrollOverflowWatch() {
    if (initSkillsScrollOverflowWatch._done) return;
    initSkillsScrollOverflowWatch._done = true;
    var deb;
    window.addEventListener("resize", function() {
        clearTimeout(deb);
        deb = setTimeout(updateSkillsScrollOverflowHints, 120);
    });
}

/** Eşleşen + eksik yetenek accordion — liste başına tek açık satır */
function initSkillAccordionsUi() {
    if (initSkillAccordionsUi._done) return;
    initSkillAccordionsUi._done = true;

    document.addEventListener("click", function(e) {
        if (e.target.closest(".ar-missing-learn-btn")) return;

        var trig = e.target.closest(".ar-skill-acc-trigger");
        if (!trig) return;

        var item = trig.closest(".ar-skill-acc-item");
        if (!item) return;

        var wrap = item.closest("#matched-skills, #missing-skills");
        if (!wrap) return;

        var wasOpen = item.classList.contains("ar-skill-acc-item--open");
        wrap.querySelectorAll(".ar-skill-acc-item").forEach(function(other) {
            other.classList.remove("ar-skill-acc-item--open");
            var t = other.querySelector(".ar-skill-acc-trigger");
            var p = other.querySelector(".ar-skill-acc-panel");
            if (t) t.setAttribute("aria-expanded", "false");
            if (p) p.setAttribute("aria-hidden", "true");
        });

        if (!wasOpen) {
            item.classList.add("ar-skill-acc-item--open");
            trig.setAttribute("aria-expanded", "true");
            var panel = item.querySelector(".ar-skill-acc-panel");
            if (panel) panel.setAttribute("aria-hidden", "false");
        }

        requestAnimationFrame(function() {
            updateSkillsScrollOverflowHints();
        });
        window.setTimeout(updateSkillsScrollOverflowHints, 360);
    });
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

/** Skor kutusunda 'Hedef: %…' satırı (eksik yeteneklerden potansiyel). */
function updateGrowthPotentialUi(score, missingUi) {
    var line = document.getElementById("coach-potential-line");
    var pctEl = document.getElementById("coach-potential-pct");
    if (!line || !pctEl) return;

    var rows = Array.isArray(missingUi) ? missingUi : [];
    if (!rows.length) {
        line.classList.add("hidden");
        return;
    }

    var comp = computePotentialMatchScore(score, rows);
    var pot = comp.potential;
    var gain = Math.max(0, pot - score);

    if (gain <= 0) {
        line.classList.add("hidden");
        return;
    }

    pctEl.textContent = String(pot);
    line.classList.remove("hidden");
}

/**
 * Eşleşen (matched) ve eksik (gap) yetenekler — aynı accordion bileşeni.
 * variant: "matched" | "gap"
 */
function skillAccordionHtml(variant, label, detail, index, escapeHtml) {
    var isMatched = variant === "matched";
    var d = (detail || "").trim();
    var safeLabel = escapeHtml(label);
    var emptyCopy = isMatched
        ? "Bu başlık için CoachAI yorumu henüz eklenmemiş."
        : "Bu başlık için kısa özet henüz eklenmemiş. Tam kaynaklar için gelişim rehberini açabilirsiniz.";
    var bodyHtml = d
        ? "<p class=\"mb-0 text-sm leading-relaxed text-slate-600\">" + escapeHtml(d) + "</p>"
        : "<p class=\"mb-0 text-sm leading-relaxed text-slate-500\">" + escapeHtml(emptyCopy) + "</p>";

    var itemMod = isMatched ? " ar-skill-acc-item--matched" : " ar-skill-acc-item--gap";
    var panelId = isMatched ? "ar-matched-panel-" + index : "ar-missing-panel-" + index;
    var headId = isMatched ? "ar-matched-acc-head-" + index : "ar-missing-acc-head-" + index;

    var triggerRing = "hover:bg-indigo-50 focus-visible:ring-indigo-400";

    var iconHtml = isMatched
        ? '<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600" aria-hidden="true">' +
          '<span class="material-symbols-outlined text-[19px]" style="font-variation-settings:\'FILL\' 0,\'wght\' 400">check_circle</span></span>'
        : '<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-indigo-200 bg-white text-indigo-600" aria-hidden="true">' +
          '<span class="material-symbols-outlined text-[19px]" style="font-variation-settings:\'FILL\' 0,\'wght\' 400">trending_up</span></span>';

    var rightTone = "text-indigo-900";
    var chevronTone = "text-indigo-600";
    var borderTop = "border-indigo-100";

    var learnBtn = isMatched
        ? ""
        : '<button type="button" class="ar-missing-learn-btn mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" data-ar-skill="' +
          escapeHtmlAttr(label) +
          '" aria-haspopup="dialog" aria-controls="ar-learn-modal">' +
          '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">menu_book</span>Gelişim rehberi</button>';

    return (
        '<div class="ar-skill-acc-item rounded-xl border border-slate-200/90 bg-white transition-all duration-300 ease-out' +
        itemMod +
        '">' +
        '<button type="button" class="ar-skill-acc-trigger flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors duration-200 ' +
        triggerRing +
        ' focus-visible:ring-2 focus-visible:ring-offset-2" aria-expanded="false" aria-controls="' +
        panelId +
        '" id="' +
        headId +
        '">' +
        iconHtml +
        '<span class="min-w-0 flex-1 text-sm font-medium tracking-tight text-indigo-950">' +
        safeLabel +
        "</span>" +
        '<span class="flex shrink-0 items-center gap-1.5 text-xs font-medium ' +
        rightTone +
        '">' +
        '<span class="hidden sm:inline">Detay</span>' +
        '<span class="ar-skill-acc-chevron material-symbols-outlined text-[20px] transition-transform duration-300 ease-out ' +
        chevronTone +
        '" aria-hidden="true">expand_more</span>' +
        "</span></button>" +
        '<div id="' +
        panelId +
        '" class="ar-skill-acc-panel" role="region" aria-labelledby="' +
        headId +
        '" aria-hidden="true">' +
        '<div class="ar-skill-acc-panel-sizer">' +
        '<div class="ar-skill-acc-panel-inner border-t px-3 pb-3 pt-2 ' +
        borderTop +
        '">' +
        bodyHtml +
        learnBtn +
        "</div></div></div></div>"
    );
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

/** Aranan profil — yinelenen beklenti metinlerini tekilleştir */
function dedupeKeyTraits(arr) {
    var seen = {};
    var out = [];
    (arr || []).forEach(function(t) {
        var raw = String(t == null ? "" : t).trim();
        if (!raw) return;
        var k = raw.toLowerCase().replace(/\s+/g, " ");
        if (seen[k]) return;
        seen[k] = true;
        out.push(raw);
    });
    return out;
}

/** Aranan profil — kısa listeyi şablondan tamamlar (min. satır sayısı) */
var AR_SUPPLEMENTAL_KEY_TRAITS = [
    "Büyük ölçekli dağıtık sistemlerde tasarım ve operasyon deneyimi",
    "Takım içi kod incelemesi ve teknik karar dokümantasyonu",
    "Üretim ortamında gözlemlenebilirlik ve hata ayıklama disiplini",
    "Çevik ritimlere uyum ve önceliklendirilmiş teslimat",
    "Güvenlik ve veri gizliliği bilinciyle geliştirme",
    "Performans ve maliyet odaklı mühendislik trade-off'ları",
    "Sürekli öğrenme ve yeni teknolojileri kontrollü benimseme",
    "Paydaşlarla net iletişim ve teknik sunum becerisi",
    "Otomasyon, test ve kalite kapılarıyla sürdürülebilir pipeline",
    "Incident müdahalesi ve kök neden analizi deneyimi",
    "Domain modelleme ve sınır bağlam (bounded context) düşüncesi",
    "Erişilebilirlik ve kullanıcı deneyimiyle uyumlu arayüz kararları"
];

function extendKeyTraits(traits, minLen) {
    var out = dedupeKeyTraits(traits);
    minLen = minLen || 10;
    if (out.length >= minLen) return out;
    var seen = {};
    out.forEach(function(t) {
        seen[String(t).trim().toLowerCase().replace(/\s+/g, " ")] = true;
    });
    for (var i = 0; i < AR_SUPPLEMENTAL_KEY_TRAITS.length && out.length < minLen; i++) {
        var x = AR_SUPPLEMENTAL_KEY_TRAITS[i];
        var k = String(x).trim().toLowerCase().replace(/\s+/g, " ");
        if (seen[k]) continue;
        seen[k] = true;
        out.push(x);
    }
    return out;
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
    if (scoreValEl) scoreValEl.textContent = score;

    var coachBar = document.getElementById("coach-headline-score-bar");
    if (coachBar) {
        coachBar.style.width = "0%";
        coachBar.removeAttribute("data-ar-fill-wide");
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                var w = Math.min(100, Math.max(0, score));
                coachBar.style.width = w + "%";
                if (w >= 100) coachBar.setAttribute("data-ar-fill-wide", "1");
            });
        });
    }

    var matchLbl = document.getElementById("score-match-label");
    if (matchLbl) {
        matchLbl.textContent = "Eşleşme";
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

    var traitLabels = [
        { key: "S", label: "Yetenek", hint: "CV’deki yeteneklerin şirket profiline uyumu", icon: "psychology" },
        { key: "E", label: "Deneyim", hint: "Deneyim süresi ile rol beklentisi", icon: "work_history" },
        { key: "D", label: "Eğitim", hint: "Eğitim seviyesi", icon: "school" }
    ];
    var scoreBreakdownEl = document.getElementById("score-breakdown");
    if (scoreBreakdownEl) {
        scoreBreakdownEl.innerHTML = traitLabels.map(function(t) {
            var v = alignment[t.key];
            var p = pct01(v);
            return (
                '<div data-ar-score-row class="flex gap-2 items-start" title="' +
                escapeHtmlAttr(t.hint) +
                '">' +
                '<div class="ar-score-row-icon flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-500">' +
                '<span class="material-symbols-outlined text-[14px]" style="font-variation-settings:\'FILL\' 0,\'wght\' 400">' +
                t.icon +
                "</span></div>" +
                '<div class="min-w-0 flex-1 pt-0">' +
                '<div class="flex items-baseline justify-between gap-2">' +
                '<span class="text-xs font-semibold text-slate-800 leading-tight">' +
                escapeHtml(t.label) +
                '</span><span class="ar-score-pct text-xs font-bold tabular-nums tracking-tight text-indigo-600" data-target="' +
                p +
                '">0%</span></div>' +
                '<div class="ar-score-bar-track mt-1 h-1 w-full max-w-full rounded-full overflow-hidden">' +
                '<div class="ar-score-bar-fill h-full rounded-full"></div></div>' +
                "</div></div>"
            );
        }).join("");
        requestAnimationFrame(function() {
            requestAnimationFrame(animateScoreBreakdownPcts);
        });
    }

    var traits = extendKeyTraits(companyProfile.key_traits || [], 12);
    if (traits.length) {
        document.getElementById("key-traits-section").classList.remove("hidden");
        document.getElementById("key-traits").innerHTML = traits
            .map(function(t) {
                var raw = String(t);
                return (
                    '<span role="listitem" class="ar-trait-chip text-left">' +
                    '<span class="material-symbols-outlined ar-trait-chip-mark text-[15px] leading-none" style="font-variation-settings:\'FILL\' 0,\'wght\' 400" aria-hidden="true">check_small</span>' +
                    '<span class="min-w-0 break-words">' +
                    escapeHtml(raw) +
                    "</span></span>"
                );
            })
            .join("");
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

    document.getElementById("matched-skills").innerHTML = matchedUi
        .map(function(row, idx) {
            var lab = row.skill != null ? String(row.skill) : "";
            var det = row.detail != null ? String(row.detail) : "";
            return skillAccordionHtml("matched", lab, det, idx, escapeHtml);
        })
        .join("") ||
        "<p class='text-sm text-slate-500'>Eşleşen yetenek listesi için analizi yeniden çalıştırın.</p>";

    document.getElementById("missing-skills").innerHTML = missingUi
        .map(function(row, idx) {
            var lab = row.skill != null ? String(row.skill) : "";
            var det = row.detail != null ? String(row.detail) : "";
            return skillAccordionHtml("gap", lab, det, idx, escapeHtml);
        })
        .join("") ||
        "<p class='text-sm text-slate-500'>Gelişim alanı listesi için analizi yeniden çalıştırın.</p>";

    updateGrowthPotentialUi(score, missingUi);

    initSkillAccordionsUi();
    initArLearnModalUi();
    initSkillsScrollOverflowWatch();
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            updateSkillsScrollOverflowHints();
        });
    });
    window.setTimeout(updateSkillsScrollOverflowHints, 220);

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
