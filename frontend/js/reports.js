var currentAlignmentId = null;
var currentSessionId = null;
var _alignmentSessions = [];
var _sessionDetailCache = {};

function escapeReportHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatSessionDate(iso) {
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
        return String(iso).substring(0, 16);
    }
}

function sessionModeLabel(mode) {
    if (mode === "quiz") return "Teknik quiz";
    if (mode === "classic") return "Klasik sınav";
    return mode || "Mülakat";
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

function updateAiReportSessionNote() {
    var note = document.getElementById("ai-report-session-note");
    if (!note) return;
    if (!currentSessionId) {
        note.classList.add("hidden");
        note.textContent = "";
        return;
    }
    var s = _alignmentSessions.find(function (x) {
        return (x.session_id || x.id) === currentSessionId;
    });
    if (!s) {
        note.classList.add("hidden");
        return;
    }
    note.classList.remove("hidden");
    note.textContent =
        "AI raporu şu oturumu da dikkate alacak: " + sessionModeLabel(s.mode) + (s.total_score != null ? " (%" + Math.round(s.total_score) + ")" : "") + ".";
}

function renderSessionsList(items) {
    var section = document.getElementById("sessions-section");
    var list = document.getElementById("sessions-list");
    var empty = document.getElementById("sessions-empty");
    var countEl = document.getElementById("sessions-count");
    if (!section || !list) return;

    _alignmentSessions = items || [];
    section.classList.remove("hidden");

    if (!_alignmentSessions.length) {
        list.innerHTML = "";
        if (empty) empty.classList.remove("hidden");
        if (countEl) countEl.textContent = "0 oturum";
        return;
    }

    if (empty) empty.classList.add("hidden");
    if (countEl) countEl.textContent = _alignmentSessions.length + " oturum";

    list.innerHTML = _alignmentSessions
        .map(function (s) {
            var id = s.session_id || s.id;
            var selected = currentSessionId === id;
            var mode = sessionModeLabel(s.mode);
            var score =
                s.total_score != null
                    ? '<span class="font-bold ' +
                      scoreColor(s.total_score) +
                      '">%' +
                      Math.round(Number(s.total_score)) +
                      "</span>"
                    : s.correct_count != null && s.question_count
                      ? '<span class="text-on-surface-variant">' +
                        s.correct_count +
                        "/" +
                        s.question_count +
                        " doğru</span>"
                      : "";
            var focus =
                s.focus_topic && s.mode === "quiz"
                    ? '<span class="text-xs text-on-surface-variant"> · ' +
                      escapeReportHtml(s.focus_topic) +
                      "</span>"
                    : "";
            var border = selected
                ? "border-primary ring-2 ring-primary/15"
                : "border-outline-variant hover:border-primary/40";

            return (
                '<article class="rounded-xl border bg-surface-container-lowest p-4 transition-all ' +
                border +
                '" data-session-id="' +
                escapeReportHtml(id) +
                '">' +
                '<div class="flex flex-wrap items-start justify-between gap-3">' +
                '<div class="flex gap-3 min-w-0">' +
                '<div class="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">' +
                '<span class="material-symbols-outlined text-primary">' +
                sessionModeIcon(s.mode) +
                "</span></div>" +
                '<div class="min-w-0"><p class="font-semibold text-sm text-on-surface">' +
                escapeReportHtml(mode) +
                "</p>" +
                '<p class="text-xs text-on-surface-variant mt-0.5">' +
                escapeReportHtml(formatSessionDate(s.completed_at || s.started_at)) +
                " · " +
                (s.question_count || "—") +
                " soru" +
                focus +
                "</p></div></div>" +
                '<div class="text-right shrink-0">' +
                score +
                "</div></div>" +
                '<div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-outline-variant/80">' +
                '<button type="button" class="btn-view-session px-3 py-2 text-xs font-semibold rounded-lg bg-surface-container-low border border-outline-variant hover:border-primary text-on-surface" data-session-id="' +
                escapeReportHtml(id) +
                '">Değerlendirmeyi gör</button>' +
                '<button type="button" class="btn-pick-session px-3 py-2 text-xs font-semibold rounded-lg ' +
                (selected ? "bg-primary text-on-primary" : "text-primary hover:bg-primary-fixed") +
                '" data-session-id="' +
                escapeReportHtml(id) +
                '">' +
                (selected ? "AI raporunda seçili" : "AI raporuna ekle") +
                "</button></div></article>"
            );
        })
        .join("");

    list.querySelectorAll(".btn-view-session").forEach(function (btn) {
        btn.addEventListener("click", function () {
            openSessionDetail(btn.getAttribute("data-session-id"));
        });
    });
    list.querySelectorAll(".btn-pick-session").forEach(function (btn) {
        btn.addEventListener("click", function () {
            pickSessionForReport(btn.getAttribute("data-session-id"));
        });
    });
}

async function loadSessionsForAlignment(alignment) {
    var section = document.getElementById("sessions-section");
    var list = document.getElementById("sessions-list");
    var hint = document.getElementById("session-hint");
    var detailPanel = document.getElementById("session-detail-panel");

    currentSessionId = null;
    _sessionDetailCache = {};
    updateAiReportSessionNote();
    if (detailPanel) detailPanel.classList.add("hidden");

    if (!alignment || !(alignment.alignment_id || alignment.id)) {
        if (section) section.classList.add("hidden");
        if (list) list.innerHTML = "";
        return;
    }

    var alignmentId = alignment.alignment_id || alignment.id;
    if (section) section.classList.remove("hidden");
    if (list) {
        list.innerHTML =
            '<div class="flex items-center gap-2 py-6 text-sm text-on-surface-variant"><div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>Sınavlar yükleniyor…</div>';
    }

    try {
        var tok = await getToken();
        var r = await fetch(
            API_BASE + "/api/interview/by-alignment/" + encodeURIComponent(alignmentId) + "?limit=20",
            { headers: { Authorization: "Bearer " + tok } }
        );
        var d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Oturumlar alınamadı");
        renderSessionsList(d.items || []);
        if (hint && (d.items || []).length) {
            hint.textContent =
                (d.items || []).length +
                " tamamlanmış oturum — detaylar veritabanından okunur (yeniden sınav gerekmez).";
        }
    } catch (e) {
        if (list) {
            list.innerHTML =
                '<p class="text-sm text-error">' + escapeReportHtml(e.message || "Yüklenemedi") + "</p>";
        }
    }
}

function pickSessionForReport(sessionId) {
    currentSessionId = sessionId || null;
    renderSessionsList(_alignmentSessions);
    updateAiReportSessionNote();
}

async function openSessionDetail(sessionId) {
    if (!sessionId) return;
    var panel = document.getElementById("session-detail-panel");
    var titleEl = document.getElementById("session-detail-title");
    var metaEl = document.getElementById("session-detail-meta");
    var summaryEl = document.getElementById("session-detail-summary");
    var questionsEl = document.getElementById("session-detail-questions");
    if (!panel || !questionsEl) return;

    panel.classList.remove("hidden");
    questionsEl.innerHTML =
        '<div class="flex items-center gap-2 py-8 text-sm text-on-surface-variant justify-center"><div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>Yükleniyor…</div>';

    var summary = _alignmentSessions.find(function (s) {
        return (s.session_id || s.id) === sessionId;
    });

    try {
        var detail = _sessionDetailCache[sessionId];
        if (!detail) {
            var tok = await getToken();
            var r = await fetch(API_BASE + "/api/interview/session/" + encodeURIComponent(sessionId), {
                headers: { Authorization: "Bearer " + tok },
            });
            detail = await r.json();
            if (!r.ok) throw new Error(typeof detail.detail === "string" ? detail.detail : "Detay alınamadı");
            _sessionDetailCache[sessionId] = detail;
        }

        var mode = sessionModeLabel(detail.mode);
        if (titleEl) titleEl.textContent = mode;
        if (metaEl) {
            metaEl.textContent =
                (detail.cv_name || summary && summary.cv_name ? summary.cv_name : "CV") +
                " · " +
                (detail.company_name || "") +
                " · " +
                (detail.position || "") +
                " · " +
                formatSessionDate(detail.completed_at || detail.started_at);
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

        var perQ = detail.per_question || [];
        if (!perQ.length) {
            questionsEl.innerHTML =
                '<p class="text-sm text-on-surface-variant">Soru detayı bulunamadı.</p>';
            return;
        }

        if (detail.mode === "quiz") {
            questionsEl.innerHTML = perQ
                .map(function (row, i) {
                    var ok = row.is_correct === true;
                    var opts = row.options || [];
                    var sel =
                        row.selected_index != null && opts[row.selected_index]
                            ? opts[row.selected_index]
                            : "—";
                    var cor =
                        row.correct_index != null && opts[row.correct_index]
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
                        '<p class="text-sm font-medium text-on-surface">' +
                        (i + 1) +
                        ". " +
                        escapeReportHtml(row.question) +
                        "</p></div>" +
                        '<p class="text-xs text-on-surface-variant ml-7">Sizin cevap: ' +
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
        } else {
            questionsEl.innerHTML = perQ
                .map(function (row, i) {
                    var sc = row.score;
                    return (
                        '<div class="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">' +
                        '<div class="flex justify-between gap-3 mb-2">' +
                        '<p class="text-sm font-medium text-on-surface flex-1">' +
                        (i + 1) +
                        ". " +
                        escapeReportHtml(row.question) +
                        "</p>" +
                        (sc != null
                            ? '<span class="font-bold text-sm ' +
                              scoreColor(sc) +
                              '">' +
                              Math.round(sc) +
                              "</span>"
                            : "") +
                        "</div>" +
                        '<p class="text-xs text-on-surface-variant whitespace-pre-wrap">' +
                        escapeReportHtml(row.answer || "—") +
                        "</p>" +
                        (row.feedback
                            ? '<p class="text-xs text-primary mt-2 border-t border-outline-variant/60 pt-2">' +
                              escapeReportHtml(row.feedback) +
                              "</p>"
                            : "") +
                        "</div>"
                    );
                })
                .join("");
        }

        pickSessionForReport(sessionId);
    } catch (e) {
        questionsEl.innerHTML =
            '<p class="text-sm text-error">' + escapeReportHtml(e.message || "Hata") + "</p>";
    }
}

async function onLayoutReady() {
    var closeBtn = document.getElementById("btn-close-session-detail");
    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            document.getElementById("session-detail-panel").classList.add("hidden");
        });
    }
    var useBtn = document.getElementById("btn-use-session-for-report");
    if (useBtn) {
        useBtn.addEventListener("click", function () {
            if (currentSessionId) updateAiReportSessionNote();
        });
    }

    await initAlignmentPicker({
        selectId: "alignment-select",
        detailId: "alignment-detail",
        emptyMessage: "Henüz analiz yok — önce CV Analizi yapın",
    });

    var sel = document.getElementById("alignment-select");
    var detailEl = document.getElementById("alignment-detail");
    if (sel) {
        sel.onchange = function () {
            currentAlignmentId = sel.value || null;
            currentSessionId = null;
            updateAiReportSessionNote();
            var picked = currentAlignmentId ? findAlignmentById(currentAlignmentId) : null;
            renderAlignmentDetail(detailEl, picked);
            loadSessionsForAlignment(picked);
        };
        if (sel.value) sel.onchange();
    }
}

document.getElementById("btn-generate").addEventListener("click", async function () {
    var creds = getSelectedAlignmentCredentials("alignment-select");
    if (!creds || !creds.alignment_id) {
        showSelectorError("Lütfen listeden bir geçmiş analiz seçin.");
        return;
    }
    currentAlignmentId = creds.alignment_id;

    clearSelectorError();
    document.getElementById("selector-panel").classList.add("hidden");
    document.getElementById("generating-state").classList.remove("hidden");
    document.getElementById("report-panel").classList.add("hidden");
    try {
        var tok = await getToken();
        var body = { alignment_id: currentAlignmentId };
        if (currentSessionId) body.session_id = currentSessionId;
        var r = await fetch(API_BASE + "/api/feedback/generate", {
            method: "POST",
            headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        var d = await r.json();
        if (!r.ok)
            throw new Error(typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail));
        renderReport(d);
    } catch (err) {
        document.getElementById("selector-panel").classList.remove("hidden");
        showSelectorError(err.message || "Rapor oluşturulamadı");
    }
    document.getElementById("generating-state").classList.add("hidden");
});

function renderReport(d) {
    document.getElementById("report-panel").classList.remove("hidden");
    document.getElementById("selector-panel").classList.remove("hidden");

    var criticals = d.critical_warnings || d.elimination_risks || [];
    if (criticals.length > 0) {
        document.getElementById("critical-warning").classList.remove("hidden");
        document.getElementById("critical-list").innerHTML = criticals
            .map(function (c) {
                return (
                    '<li class="flex items-start gap-2"><span class="material-symbols-outlined text-error text-sm mt-1">dangerous</span><span class="font-body-md text-on-error-container">' +
                    escapeReportHtml(c) +
                    "</span></li>"
                );
            })
            .join("");
    } else {
        document.getElementById("critical-warning").classList.add("hidden");
    }

    var strengths = d.strengths || [];
    document.getElementById("strengths-list").innerHTML =
        strengths
            .map(function (s) {
                var title = typeof s === "string" ? s : s.title || s;
                var detail = typeof s === "object" ? s.detail || "" : "";
                return (
                    '<li class="flex gap-3 items-start"><span class="material-symbols-outlined text-primary mt-0.5">check_circle</span><div><h4 class="font-label-sm text-label-sm text-on-surface mb-1">' +
                    escapeReportHtml(title) +
                    "</h4>" +
                    (detail
                        ? '<p class="font-body-md text-sm text-on-surface-variant">' +
                          escapeReportHtml(detail) +
                          "</p>"
                        : "") +
                    "</div></li>"
                );
            })
            .join("") || "<li class='text-on-surface-variant text-sm'>Güçlü yön bulunamadı</li>";

    var weaknesses = d.weaknesses || d.areas_for_improvement || [];
    document.getElementById("weaknesses-list").innerHTML =
        weaknesses
            .map(function (w) {
                var title = typeof w === "string" ? w : w.title || w;
                var detail = typeof w === "object" ? w.detail || "" : "";
                return (
                    '<li class="flex gap-3 items-start"><span class="material-symbols-outlined text-tertiary mt-0.5">error</span><div><h4 class="font-label-sm text-label-sm text-on-surface mb-1">' +
                    escapeReportHtml(title) +
                    "</h4>" +
                    (detail
                        ? '<p class="font-body-md text-sm text-on-surface-variant">' +
                          escapeReportHtml(detail) +
                          "</p>"
                        : "") +
                    "</div></li>"
                );
            })
            .join("") || "<li class='text-on-surface-variant text-sm'>Gelişim alanı bulunamadı</li>";

    var plan = d.action_plan || d.study_plan || [];
    document.getElementById("action-plan").innerHTML =
        plan
            .map(function (p, i) {
                var label = typeof p === "string" ? p : p.week || "Hafta " + (i + 1);
                var title = typeof p === "object" ? p.title || p.goal || "" : p;
                var detail = typeof p === "object" ? p.description || p.detail || "" : "";
                var isFirst = i === 0;
                return (
                    '<div class="relative"><div class="absolute -left-[35px] top-1 h-6 w-6 rounded-full ' +
                    (isFirst ? "bg-primary" : "bg-surface-variant") +
                    ' border-4 border-surface-container-lowest"></div>' +
                    '<div class="mb-1"><span class="font-label-sm text-label-sm ' +
                    (isFirst
                        ? "text-primary bg-primary-fixed"
                        : "text-on-surface-variant bg-surface-variant") +
                    ' px-2 py-0.5 rounded">' +
                    escapeReportHtml(label) +
                    "</span></div>" +
                    '<h4 class="font-body-lg text-body-lg font-medium text-on-surface mb-1">' +
                    escapeReportHtml(title) +
                    "</h4>" +
                    (detail
                        ? '<p class="font-body-md text-on-surface-variant">' +
                          escapeReportHtml(detail) +
                          "</p>"
                        : "") +
                    "</div>"
                );
            })
            .join("") || "<p class='text-on-surface-variant text-sm'>Plan bulunamadı</p>";

    var resources = d.resources || d.recommended_resources || [];
    document.getElementById("resources-list").innerHTML =
        resources
            .map(function (res) {
                var title = typeof res === "string" ? res : res.title || res;
                var url = typeof res === "object" ? res.url || "#" : "#";
                var desc = typeof res === "object" ? res.description || "" : "";
                var icon =
                    typeof res === "object"
                        ? res.type === "video"
                            ? "smart_display"
                            : res.type === "article"
                              ? "article"
                              : "menu_book"
                        : "menu_book";
                return (
                    '<a href="' +
                    escapeReportHtml(url) +
                    '" target="_blank" rel="noopener" class="block bg-surface-container-lowest p-4 rounded-xl border border-outline-variant hover:border-primary/50 hover:shadow-sm transition-all group">' +
                    '<div class="flex items-start justify-between"><div class="flex items-center gap-3 mb-2"><div class="bg-surface-container-low p-2 rounded"><span class="material-symbols-outlined text-on-surface-variant">' +
                    icon +
                    '</span></div><h4 class="font-label-sm text-label-sm text-on-surface group-hover:text-primary transition-colors">' +
                    escapeReportHtml(title) +
                    '</h4></div><span class="material-symbols-outlined text-outline text-sm">open_in_new</span></div>' +
                    (desc
                        ? '<p class="font-body-md text-sm text-on-surface-variant line-clamp-2">' +
                          escapeReportHtml(desc) +
                          "</p>"
                        : "") +
                    "</a>"
                );
            })
            .join("") || "<p class='text-on-surface-variant text-sm'>Kaynak bulunamadı</p>";
}

function showSelectorError(msg) {
    var el = document.getElementById("selector-error");
    el.textContent = msg;
    el.classList.remove("hidden");
}
function clearSelectorError() {
    document.getElementById("selector-error").classList.add("hidden");
}
