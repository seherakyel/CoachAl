/** Paylaşılan CV listesi / seçim yardımcıları (profil + CV analizi). */

function escapeCvHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatCvUploadedAt(iso) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch (e) {
        return "";
    }
}

function cvDisplayLabel(cv) {
    if (cv.file_name) return cv.file_name;
    if (cv.cv_id) return "CV – " + cv.cv_id.slice(0, 8).toUpperCase();
    return "CV";
}

function cvMetaLine(cv) {
    var parts = [];
    if (cv.experience_years != null) parts.push(cv.experience_years + " yıl deneyim");
    if (cv.education_level) parts.push(cv.education_level);
    var meta = parts.join(" · ");
    var date = formatCvUploadedAt(cv.uploaded_at);
    var tail = (date ? date + " · " : "") + (cv.skill_count || 0) + " yetenek";
    return meta ? meta + " — " + tail : tail;
}

async function fetchUserCvList(limit) {
    var tok = await getToken();
    var r = await fetch(API_BASE + "/api/cv/list?limit=" + (limit || 20), {
        headers: { Authorization: "Bearer " + tok },
    });
    var data = await r.json();
    if (!r.ok) {
        throw new Error(
            typeof data.detail === "string" ? data.detail : "CV listesi alınamadı"
        );
    }
    var items = data.items || [];
    return {
        items: items,
        cv_count: data.cv_count != null ? data.cv_count : items.length,
        max_cvs: data.max_cvs != null ? data.max_cvs : 3,
    };
}

async function deleteCvDocument(cvId) {
    var tok = await getToken();
    var r = await fetch(API_BASE + "/api/cv/" + encodeURIComponent(cvId), {
        method: "DELETE",
        headers: { Authorization: "Bearer " + tok },
    });
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "CV silinemedi");
    }
    return data;
}

function clearSelectedCvIfDeleted(cvId) {
    if (sessionStorage.getItem("coachai_cv_id") === cvId) {
        sessionStorage.removeItem("coachai_cv_id");
        sessionStorage.removeItem("coachai_cv_name");
        sessionStorage.removeItem("coachai_cv_parsed");
    }
}

async function fetchCvDetail(cvId) {
    var tok = await getToken();
    var r = await fetch(API_BASE + "/api/cv/" + encodeURIComponent(cvId), {
        headers: { Authorization: "Bearer " + tok },
    });
    var data = await r.json();
    if (!r.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "CV yüklenemedi");
    }
    return data;
}

function persistSelectedCv(cvId, fileName, parsedData) {
    sessionStorage.setItem("coachai_cv_id", cvId);
    sessionStorage.setItem("coachai_cv_name", fileName || "");
    sessionStorage.setItem("coachai_cv_parsed", JSON.stringify(parsedData || {}));
}

function renderCvListItems(items, options) {
    options = options || {};
    var selectedId = options.selectedId || sessionStorage.getItem("coachai_cv_id") || "";
    var actionLabel = options.actionLabel || "Seç";
    var actionClass =
        options.actionClass ||
        "shrink-0 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors";
    var showDelete = !!options.showDelete;

    if (!items.length) {
        return (
            '<div class="flex flex-col items-center py-6 gap-3 text-center">' +
            '<span class="material-symbols-outlined text-[32px] text-slate-300">description</span>' +
            '<p class="text-sm text-slate-400">Henüz CV yüklenmemiş.</p>' +
            "</div>"
        );
    }

    var html = '<div class="divide-y divide-slate-100">';
    items.forEach(function (cv) {
        var id = cv.cv_id || "";
        var isSelected = id && id === selectedId;
        var label = escapeCvHtml(cvDisplayLabel(cv));
        var meta = escapeCvHtml(cvMetaLine(cv));
        html +=
            '<div class="flex items-center gap-3 py-3.5' +
            (isSelected ? " bg-indigo-50/60 -mx-2 px-2 rounded-xl" : "") +
            '" data-cv-id="' +
            escapeCvHtml(id) +
            '">' +
            '<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' +
            (isSelected ? "bg-primary-container text-white" : "bg-indigo-50 text-primary-container") +
            '">' +
            '<span class="material-symbols-outlined text-[20px]" style="font-variation-settings:\'FILL\' 1">description</span>' +
            "</div>" +
            '<div class="min-w-0 flex-1">' +
            '<p class="text-sm font-semibold text-slate-800 truncate">' +
            label +
            "</p>" +
            '<p class="text-xs text-slate-400 mt-0.5 truncate">' +
            meta +
            "</p>" +
            (isSelected
                ? '<p class="text-xs font-medium text-primary-container mt-1">Seçili CV</p>'
                : "") +
            "</div>" +
            '<div class="flex shrink-0 items-center gap-2">' +
            (showDelete
                ? '<button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors" data-cv-delete="' +
                  escapeCvHtml(id) +
                  '" aria-label="CV sil" title="CV sil">' +
                  '<span class="material-symbols-outlined text-[20px]">delete</span></button>'
                : "") +
            (options.hideSelectAction
                ? ""
                : '<button type="button" class="' +
                  actionClass +
                  '" data-cv-select="' +
                  escapeCvHtml(id) +
                  '">' +
                  escapeCvHtml(isSelected ? "Seçili" : actionLabel) +
                  "</button>") +
            "</div>" +
            "</div>";
    });
    html += "</div>";
    return html;
}
