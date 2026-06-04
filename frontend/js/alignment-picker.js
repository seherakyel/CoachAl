/** Geçmiş hizalama analizleri — exam / quiz kurulum seçimi */

var _alignmentCache = [];
var _alignmentListInflight = null;
var ALIGNMENT_LIST_CACHE_KEY = "coachai_alignment_list_v2";
var ALIGNMENT_LIST_CACHE_TTL_MS = 5 * 60 * 1000;

function escapeAlignHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatAlignmentDate(iso) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (e) {
        return "";
    }
}

function alignmentOptionLabel(a) {
    var cv = a.cv_name || "CV";
    var company = a.company_name || "Şirket";
    var role = a.position || a.target_position || "Pozisyon";
    var score = a.score != null ? " · %" + Math.round(Number(a.score)) : "";
    return cv + " → " + company + " · " + role + score;
}

function readAlignmentListCache() {
    try {
        var raw = sessionStorage.getItem(ALIGNMENT_LIST_CACHE_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.items)) return null;
        if (Date.now() - (parsed.ts || 0) > ALIGNMENT_LIST_CACHE_TTL_MS) return null;
        return parsed.items;
    } catch (e) {
        return null;
    }
}

function writeAlignmentListCache(items) {
    try {
        sessionStorage.setItem(
            ALIGNMENT_LIST_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), items: items || [] })
        );
    } catch (e) {
        /* quota */
    }
}

function invalidateAlignmentListCache() {
    sessionStorage.removeItem(ALIGNMENT_LIST_CACHE_KEY);
    _alignmentCache = [];
}

/** CV analizi bittikten sonra listeyi anında güncelle */
function prependAlignmentListCache(entry) {
    if (!entry || !entry.alignment_id) return;
    var items = readAlignmentListCache() || [];
    items = items.filter(function (a) {
        return (a.alignment_id || a.id) !== entry.alignment_id;
    });
    items.unshift(entry);
    writeAlignmentListCache(items.slice(0, 30));
    _alignmentCache = items;
}

function alignmentEntryFromScoreResponse(ad, cvId, profileId) {
    if (!ad) return null;
    var id = ad.result_id || ad.alignment_id || ad.id;
    if (!id) return null;
    return {
        id: id,
        alignment_id: id,
        cv_id: ad.cv_id || cvId || "",
        profile_id: ad.profile_id || profileId || "",
        cv_name: ad.cv_name || sessionStorage.getItem("coachai_cv_name") || "CV",
        company_name: ad.company_name || sessionStorage.getItem("coachai_company_name") || "Şirket",
        position: ad.position || "",
        target_position: ad.position || "",
        score: ad.score_percent != null ? ad.score_percent : ad.score,
        risk_level: ad.risk_level || "",
        created_at: new Date().toISOString(),
    };
}

async function fetchAlignmentList(limit, options) {
    options = options || {};
    if (!options.force) {
        var cached = readAlignmentListCache();
        if (cached && cached.length) return cached;
    }

    if (_alignmentListInflight) return _alignmentListInflight;

    _alignmentListInflight = (async function () {
        var tok = await getToken();
        var r = await fetch(API_BASE + "/api/alignment/list?limit=" + (limit || 20), {
            headers: { Authorization: "Bearer " + tok },
        });
        var data = await r.json();
        if (!r.ok) {
            throw new Error(
                typeof data.detail === "string" ? data.detail : "Analiz listesi alınamadı"
            );
        }
        var items = data.items || [];
        writeAlignmentListCache(items);
        return items;
    })();

    try {
        return await _alignmentListInflight;
    } finally {
        _alignmentListInflight = null;
    }
}

function findAlignmentById(id) {
    return _alignmentCache.find(function (a) {
        return (a.alignment_id || a.id) === id;
    });
}

function renderAlignmentDetail(panelEl, a) {
    if (!panelEl) return;
    if (!a) {
        panelEl.classList.add("hidden");
        panelEl.innerHTML = "";
        return;
    }
    var date = formatAlignmentDate(a.created_at);
    panelEl.classList.remove("hidden");
    panelEl.innerHTML =
        '<div class="grid gap-3 sm:grid-cols-2">' +
        '<div><p class="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">CV</p>' +
        '<p class="text-sm font-medium text-on-surface mt-0.5">' +
        escapeAlignHtml(a.cv_name || "—") +
        "</p></div>" +
        '<div><p class="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Şirket</p>' +
        '<p class="text-sm font-medium text-on-surface mt-0.5">' +
        escapeAlignHtml(a.company_name || "—") +
        "</p></div>" +
        '<div><p class="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Hedef rol</p>' +
        '<p class="text-sm font-medium text-on-surface mt-0.5">' +
        escapeAlignHtml(a.position || a.target_position || "—") +
        "</p></div>" +
        '<div><p class="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Eşleşme</p>' +
        '<p class="text-sm font-medium text-primary mt-0.5">%' +
        escapeAlignHtml(a.score != null ? Math.round(Number(a.score)) : "—") +
        (a.risk_level
            ? ' <span class="text-on-surface-variant font-normal">(' +
              escapeAlignHtml(a.risk_level) +
              ")</span>"
            : "") +
        "</p></div>" +
        (date
            ? '<div class="sm:col-span-2"><p class="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Analiz tarihi</p>' +
              '<p class="text-xs text-on-surface-variant mt-0.5">' +
              escapeAlignHtml(date) +
              "</p></div>"
            : "") +
        "</div>";
}

function renderAlignmentSelectOptions(selectEl, detailEl, opts) {
    opts = opts || {};
    if (!_alignmentCache.length) {
        selectEl.innerHTML =
            '<option value="">' +
            escapeAlignHtml(opts.emptyMessage || "Henüz analiz yok") +
            "</option>";
        if (detailEl) renderAlignmentDetail(detailEl, null);
        return null;
    }

    var saved =
        sessionStorage.getItem("coachai_alignment_id") ||
        new URLSearchParams(window.location.search).get("alignment_id") ||
        "";

    selectEl.innerHTML =
        '<option value="">Geçmiş analiz seçin…</option>' +
        _alignmentCache
            .map(function (a) {
                var id = a.alignment_id || a.id;
                var sel = id === saved ? " selected" : "";
                return (
                    '<option value="' +
                    escapeAlignHtml(id) +
                    '"' +
                    sel +
                    ">" +
                    escapeAlignHtml(alignmentOptionLabel(a)) +
                    "</option>"
                );
            })
            .join("");

    function onSelectChange() {
        var picked = findAlignmentById(selectEl.value);
        renderAlignmentDetail(detailEl, picked);
        return picked;
    }

    selectEl.onchange = onSelectChange;
    return onSelectChange();
}

/**
 * @param {object} opts selectId, detailId, emptyMessage
 * @returns {Promise<object|null>} seçili analiz veya null
 */
async function initAlignmentPicker(opts) {
    opts = opts || {};
    var selectEl = document.getElementById(opts.selectId || "alignment-select");
    var detailEl = document.getElementById(opts.detailId || "alignment-detail");
    if (!selectEl) return null;

    var cached = readAlignmentListCache();
    if (cached && cached.length) {
        _alignmentCache = cached;
        var picked = renderAlignmentSelectOptions(selectEl, detailEl, opts);
        fetchAlignmentList(20, { force: true })
            .then(function (items) {
                _alignmentCache = items;
                if (!document.getElementById(opts.selectId || "alignment-select")) return;
                var prev = selectEl.value;
                renderAlignmentSelectOptions(selectEl, detailEl, opts);
                if (prev) selectEl.value = prev;
            })
            .catch(function () {
                /* önbellek yeterli */
            });
        return picked;
    }

    selectEl.innerHTML = '<option value="">Yükleniyor…</option>';
    if (detailEl) renderAlignmentDetail(detailEl, null);

    try {
        _alignmentCache = await fetchAlignmentList(20);
    } catch (e) {
        selectEl.innerHTML =
            '<option value="">Liste yüklenemedi — önce CV analizi yapın</option>';
        return null;
    }

    return renderAlignmentSelectOptions(selectEl, detailEl, opts);
}

function getSelectedAlignmentCredentials(selectId) {
    var sel = document.getElementById(selectId || "alignment-select");
    if (!sel || !sel.value) return null;
    var a = findAlignmentById(sel.value);
    if (!a || !a.cv_id || !a.profile_id) return null;
    return {
        alignment_id: a.alignment_id || a.id,
        cv_id: a.cv_id,
        profile_id: a.profile_id,
        cv_name: a.cv_name,
        company_name: a.company_name,
        position: a.position || a.target_position,
        score: a.score,
    };
}

function pickDefaultAlignment() {
    if (!_alignmentCache.length) {
        var cached = readAlignmentListCache();
        if (cached && cached.length) _alignmentCache = cached;
    }
    if (!_alignmentCache.length) return null;
    var savedCv = sessionStorage.getItem("coachai_cv_id");
    var savedPr = sessionStorage.getItem("coachai_profile_id");
    if (savedCv && savedPr) {
        var match = _alignmentCache.find(function (a) {
            return a.cv_id === savedCv && a.profile_id === savedPr;
        });
        if (match) return match;
    }
    return _alignmentCache[0];
}
