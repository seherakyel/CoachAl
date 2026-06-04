var completedSessions = [];
var selectedSessionId = null;
var selectedSession = null;
var _sessionDetailCache = {};

function escapeReportHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatSessionDate(iso) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (e) {
        return String(iso).substring(0, 16);
    }
}

function sessionModeIcon(mode) {
    return mode === "quiz" ? "quiz" : "edit_note";
}

function scoreColor(score) {
    if (score == null) return "text-on-surface-variant";
    var n = Number(score);
    if (n >= 80) return "text-emerald-600";
    if (n >= 60) return "text-amber-600";
    return "text-red-600";
}

function previewStatCell(label, value) {
    return (
        '<div><p class="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">' +
        escapeReportHtml(label) +
        '</p><p class="font-medium text-on-surface mt-0.5">' +
        escapeReportHtml(value) +
        "</p></div>"
    );
}

function renderSessionsList(items) {
    var list = document.getElementById("sessions-list");
    var empty = document.getElementById("sessions-empty");
    var loading = document.getElementById("sessions-loading");
    var countEl = document.getElementById("sessions-count");

    if (loading) loading.classList.add("hidden");
    completedSessions = items || [];

    if (countEl) {
        countEl.textContent = completedSessions.length
            ? completedSessions.length + " kayıt"
            : "";
    }

    if (!completedSessions.length) {
        if (list) {
            list.classList.add("hidden");
            list.innerHTML = "";
        }
        if (empty) empty.classList.remove("hidden");
        hidePreview();
        return;
    }

    if (empty) empty.classList.add("hidden");
    if (!list) return;
    list.classList.remove("hidden");

    list.innerHTML = completedSessions
        .map(function (s) {
            var id = s.session_id || s.id;
            var active = selectedSessionId === id;
            var border = active
                ? "border-primary ring-2 ring-primary/15 bg-primary-fixed/20"
                : "border-outline-variant hover:border-primary/35 bg-surface-container-lowest";
            var examScore =
                s.total_score != null
                    ? '<span class="font-bold ' +
                      scoreColor(s.total_score) +
                      '">%' +
                      Math.round(Number(s.total_score)) +
                      "</span>"
                    : s.correct_count != null
                      ? '<span class="text-on-surface-variant text-sm">' +
                        s.correct_count +
                        "/" +
                        (s.question_count || "?") +
                        " doğru</span>"
                      : "";

            return (
                '<button type="button" class="session-pick w-full text-left rounded-xl border p-4 transition-all ' +
                border +
                '" data-session-id="' +
                escapeReportHtml(id) +
                '">' +
                '<div class="flex flex-wrap items-start justify-between gap-3">' +
                '<div class="flex gap-3 min-w-0 flex-1">' +
                '<div class="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">' +
                '<span class="material-symbols-outlined text-primary">' +
                sessionModeIcon(s.mode) +
                "</span></div>" +
                '<div class="min-w-0"><p class="font-semibold text-sm text-on-surface">' +
                escapeReportHtml(s.mode_label || s.mode) +
                "</p>" +
                '<p class="text-xs text-on-surface-variant mt-1 leading-relaxed">' +
                escapeReportHtml(s.list_label || s.cv_name + " → " + s.company_name) +
                "</p>" +
                '<p class="text-[11px] text-on-surface-variant mt-1">' +
                escapeReportHtml(formatSessionDate(s.completed_at || s.started_at)) +
                "</p></div></div>" +
                '<div class="shrink-0 text-right">' +
                examScore +
                "</div></div></button>"
            );
        })
        .join("");

    list.querySelectorAll(".session-pick").forEach(function (btn) {
        btn.addEventListener("click", function () {
            selectSession(btn.getAttribute("data-session-id"));
        });
    });
}

function hidePreview() {
    var preview = document.getElementById("session-preview");
    var detail = document.getElementById("session-detail-panel");
    if (preview) preview.classList.add("hidden");
    if (detail) detail.classList.add("hidden");
    selectedSessionId = null;
    selectedSession = null;
}

function renderSessionPreview(s) {
    var preview = document.getElementById("session-preview");
    var title = document.getElementById("preview-title");
    var scoreEl = document.getElementById("preview-exam-score");
    var grid = document.getElementById("preview-grid");
    var summary = document.getElementById("preview-summary");
    if (!preview || !s) return;

    preview.classList.remove("hidden");

    if (title) {
        title.textContent =
            (s.cv_name || "CV") + " → " + (s.company_name || "Şirket") + " · " + (s.position || "Rol");
    }
    if (scoreEl) {
        scoreEl.textContent =
            s.total_score != null ? "%" + Math.round(Number(s.total_score)) : "—";
        scoreEl.className =
            "text-2xl font-bold shrink-0 " + scoreColor(s.total_score);
    }

    var statsLine =
        (s.question_count || 0) +
        " soru" +
        (s.weak_answer_count != null ? " · " + s.weak_answer_count + " zayıf cevap" : "") +
        (s.correct_count != null && s.mode === "quiz"
            ? " · " + s.correct_count + " doğru"
            : "");

    if (grid) {
        grid.innerHTML =
            previewStatCell("CV", s.cv_name || "—") +
            previewStatCell("Şirket", s.company_name || "—") +
            previewStatCell("Hedef rol", s.position || "—") +
            previewStatCell(
                "Eşleşme analizi",
                s.alignment_score != null ? "%" + Math.round(Number(s.alignment_score)) : "—"
            ) +
            previewStatCell("Sınav türü", s.mode_label || s.mode || "—") +
            previewStatCell("Tarih", formatSessionDate(s.completed_at || s.started_at)) +
            previewStatCell("İstatistik", statsLine);
    }

    if (summary) {
        var fb = s.feedback_preview || s.feedback || "";
        summary.textContent = fb
            ? fb
            : "Genel geri bildirim özeti bu oturumda kayıtlı değil. Detaylar için aşağıdaki butonu kullanın.";
    }

    document.getElementById("session-detail-panel").classList.add("hidden");
}

function selectSession(sessionId) {
    if (!sessionId) {
        hidePreview();
        renderSessionsList(completedSessions);
        return;
    }
    selectedSessionId = sessionId;
    selectedSession =
        completedSessions.find(function (s) {
            return (s.session_id || s.id) === sessionId;
        }) || null;
    renderSessionsList(completedSessions);
    renderSessionPreview(selectedSession);
}

async function loadCompletedSessions() {
    var loading = document.getElementById("sessions-loading");
    if (loading) loading.classList.remove("hidden");

    try {
        var tok = await getToken();
        var r = await fetch(API_BASE + "/api/interview/completed?limit=30", {
            headers: { Authorization: "Bearer " + tok },
        });
        var d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Liste alınamadı");
        renderSessionsList(d.items || []);
    } catch (e) {
        if (loading) loading.classList.add("hidden");
        var list = document.getElementById("sessions-list");
        if (list) {
            list.classList.remove("hidden");
            list.innerHTML =
                '<p class="text-sm text-error py-4">' +
                escapeReportHtml(e.message || "Yüklenemedi") +
                "</p>";
        }
    }
}

async function openSessionDetail() {
    if (!selectedSessionId) return;

    var panel = document.getElementById("session-detail-panel");
    var titleEl = document.getElementById("session-detail-title");
    var metaEl = document.getElementById("session-detail-meta");
    var summaryEl = document.getElementById("session-detail-summary");
    var questionsEl = document.getElementById("session-detail-questions");
    if (!panel || !questionsEl) return;

    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    questionsEl.innerHTML =
        '<div class="flex items-center gap-2 py-8 text-sm text-on-surface-variant justify-center"><div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>Detaylar yükleniyor…</div>';

    var s = selectedSession;

    try {
        var detail = _sessionDetailCache[selectedSessionId];
        if (!detail) {
            var tok = await getToken();
            var r = await fetch(
                API_BASE + "/api/interview/session/" + encodeURIComponent(selectedSessionId),
                { headers: { Authorization: "Bearer " + tok } }
            );
            detail = await r.json();
            if (!r.ok)
                throw new Error(typeof detail.detail === "string" ? detail.detail : "Detay alınamadı");
            _sessionDetailCache[selectedSessionId] = detail;
        }

        if (titleEl) titleEl.textContent = detail.mode_label || sessionModeLabel(detail.mode);
        if (metaEl) {
            metaEl.textContent =
                (detail.cv_name || (s && s.cv_name) || "CV") +
                " · " +
                (detail.company_name || "") +
                " · " +
                (detail.position || "") +
                " · Eşleşme %" +
                (detail.alignment_score != null
                    ? Math.round(Number(detail.alignment_score))
                    : s && s.alignment_score != null
                      ? Math.round(Number(s.alignment_score))
                      : "—") +
                " · Sınav %" +
                (detail.total_score != null ? Math.round(Number(detail.total_score)) : "—");
        }

        var fb = detail.feedback_full || detail.feedback || "";
        if (summaryEl) {
            if (fb) {
                summaryEl.textContent = fb;
                summaryEl.classList.remove("hidden");
            } else {
                summaryEl.classList.add("hidden");
            }
        }

        renderDetailQuestions(questionsEl, detail);
    } catch (e) {
        questionsEl.innerHTML =
            '<p class="text-sm text-error">' + escapeReportHtml(e.message || "Hata") + "</p>";
    }
}

function sessionModeLabel(mode) {
    if (mode === "quiz") return "Teknik quiz";
    if (mode === "classic") return "Klasik sınav";
    return mode || "Sınav";
}

function renderDetailQuestions(container, detail) {
    var perQ = detail.per_question || [];
    if (!perQ.length) {
        container.innerHTML =
            '<p class="text-sm text-on-surface-variant">Soru detayı bulunamadı.</p>';
        return;
    }

    if (detail.mode === "quiz") {
        container.innerHTML = perQ
            .map(function (row, i) {
                var ok = row.is_correct === true;
                var opts = row.options || [];
                var sel =
                    row.selected_index != null && opts[row.selected_index] != null
                        ? opts[row.selected_index]
                        : "—";
                var cor =
                    row.correct_index != null && opts[row.correct_index] != null
                        ? opts[row.correct_index]
                        : "—";
                return (
                    '<div class="rounded-lg border ' +
                    (ok ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/40") +
                    ' p-4">' +
                    '<div class="flex items-start gap-2 mb-2">' +
                    '<span class="material-symbols-outlined text-[20px] ' +
                    (ok ? "text-emerald-600" : "text-red-600") +
                    '">' +
                    (ok ? "check_circle" : "cancel") +
                    "</span>" +
                    '<p class="text-sm font-medium text-on-surface flex-1">' +
                    (i + 1) +
                    ". " +
                    escapeReportHtml(row.question) +
                    (row.difficulty ? ' <span class="text-xs text-on-surface-variant">(' + escapeReportHtml(row.difficulty) + ")</span>" : "") +
                    "</p></div>" +
                    '<p class="text-xs text-on-surface-variant ml-7">Cevabınız: ' +
                    escapeReportHtml(sel) +
                    "</p>" +
                    '<p class="text-xs text-emerald-700 ml-7">Doğru: ' +
                    escapeReportHtml(cor) +
                    "</p>" +
                    (row.explanation
                        ? '<p class="text-xs text-on-surface-variant ml-7 mt-2">' +
                          escapeReportHtml(row.explanation) +
                          "</p>"
                        : "") +
                    "</div>"
                );
            })
            .join("");
        return;
    }

    container.innerHTML = perQ
        .map(function (row, i) {
            var sc = row.score;
            return (
                '<div class="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">' +
                '<div class="flex justify-between gap-3 mb-2">' +
                '<p class="text-sm font-medium text-on-surface flex-1">' +
                (i + 1) +
                ". " +
                escapeReportHtml(row.question) +
                (row.type ? ' <span class="text-xs text-on-surface-variant">(' + escapeReportHtml(row.type) + ")</span>" : "") +
                "</p>" +
                (sc != null
                    ? '<span class="font-bold text-sm ' +
                      scoreColor(sc) +
                      '">' +
                      Math.round(sc) +
                      "/100</span>"
                    : "") +
                "</div>" +
                '<p class="text-xs font-semibold text-on-surface-variant mt-2">Cevabınız</p>' +
                '<p class="text-sm text-on-surface whitespace-pre-wrap mt-1">' +
                escapeReportHtml(row.answer || "—") +
                "</p>" +
                (row.feedback
                    ? '<p class="text-xs font-semibold text-primary mt-3">Değerlendirme</p><p class="text-sm text-on-surface-variant mt-1">' +
                      escapeReportHtml(row.feedback) +
                      "</p>"
                    : "") +
                "</div>"
            );
        })
        .join("");
}

async function onLayoutReady() {
    document.getElementById("btn-session-detail").addEventListener("click", openSessionDetail);
    document.getElementById("btn-close-session-detail").addEventListener("click", function () {
        document.getElementById("session-detail-panel").classList.add("hidden");
    });
    await loadCompletedSessions();
}
