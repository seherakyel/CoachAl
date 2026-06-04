var examQuestions = [];
var examSessionId = null;

function showPanel(id) {
    ["setup-panel", "loading-panel", "exam-panel", "result-panel"].forEach(function (p) {
        document.getElementById(p).classList.toggle("hidden", p !== id);
    });
}
function setSetupError(msg) {
    var el = document.getElementById("setup-error");
    el.textContent = msg;
    el.classList.remove("hidden");
}
function setExamError(msg) {
    var el = document.getElementById("exam-error");
    el.textContent = msg;
    el.classList.remove("hidden");
}

async function loadSetup() {
    await initAlignmentPicker({
        selectId: "alignment-select",
        detailId: "alignment-detail",
        emptyMessage: "Henüz analiz yok — önce CV Analizi yapın",
    });
}

document.getElementById("btn-start-exam").addEventListener("click", async function () {
    var creds = getSelectedAlignmentCredentials("alignment-select");
    if (!creds) {
        setSetupError("Lütfen listeden bir analiz seçin.");
        return;
    }
    document.getElementById("setup-error").classList.add("hidden");
    showPanel("loading-panel");
    try {
        var tok = await getToken();
        var r = await fetch(API_BASE + "/api/interview/classic", {
            method: "POST",
            headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
            body: JSON.stringify({ alignment_id: creds.alignment_id }),
        });
        var d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail));
        examQuestions = d.questions || [];
        examSessionId = d.session_id || null;
        var subtitle =
            (creds.cv_name || "CV") +
            " · " +
            (creds.company_name || "Şirket") +
            " · " +
            (creds.position || "Rol");
        document.getElementById("exam-subtitle").textContent = subtitle;
        renderExamQuestions();
        showPanel("exam-panel");
    } catch (err) {
        showPanel("setup-panel");
        setSetupError(err.message || "Sınav başlatılamadı");
    }
});

function renderExamQuestions() {
    var container = document.getElementById("questions-container");
    container.innerHTML = examQuestions
        .map(function (q, i) {
            var text = typeof q === "string" ? q : q.question || q.text || q;
            return (
                '<div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">' +
                '<div class="flex items-center gap-3 mb-4"><div class="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm shrink-0">' +
                (i + 1) +
                "</div>" +
                '<p class="font-body-lg text-body-lg text-on-surface font-medium">' +
                text +
                "</p></div>" +
                '<textarea id="answer-' +
                i +
                '" rows="5" placeholder="Cevabınızı buraya yazın…" class="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"></textarea>' +
                "</div>"
            );
        })
        .join("");
}

document.getElementById("btn-submit-exam").addEventListener("click", async function () {
    document.getElementById("exam-error").classList.add("hidden");
    var answers = examQuestions.map(function (q, i) {
        var idx = typeof q === "object" && q.index != null ? q.index : i;
        return {
            question_index: idx,
            answer: (document.getElementById("answer-" + i) || {}).value || "",
        };
    });
    var hasContent = answers.some(function (a) {
        return a.answer.trim().length > 0;
    });
    if (!hasContent) {
        setExamError("En az bir soruyu cevaplayın.");
        return;
    }

    document.getElementById("btn-submit-exam").disabled = true;
    document.getElementById("btn-submit-exam").innerHTML =
        '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Değerlendiriliyor…';

    try {
        var tok = await getToken();
        if (!examSessionId) {
            setExamError("Oturum bulunamadı. Sınavı yeniden başlatın.");
            return;
        }
        var body = { session_id: examSessionId, answers: answers };
        var r = await fetch(API_BASE + "/api/interview/evaluate", {
            method: "POST",
            headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        var d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail));
        sessionStorage.setItem("coachai_exam_session_id", d.session_id || "");
        renderExamResults(d.per_question || d.results || d.evaluations || []);
        showPanel("result-panel");
    } catch (err) {
        setExamError(err.message || "Değerlendirme başarısız");
        document.getElementById("btn-submit-exam").disabled = false;
        document.getElementById("btn-submit-exam").innerHTML =
            '<span class="material-symbols-outlined">send</span>Sınavı Teslim Et';
    }
});

function renderExamResults(results) {
    document.getElementById("results-list").innerHTML =
        results
            .map(function (r, i) {
                var q = r.question || "Soru " + (i + 1);
                var score = typeof r.score === "number" ? r.score : null;
                var fb = r.feedback || r.comment || "";
                var scoreColor =
                    score !== null
                        ? score >= 80
                            ? "text-emerald-600"
                            : score >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                        : "text-on-surface-variant";
                return (
                    '<div class="border-b border-outline-variant pb-6 last:border-0 last:pb-0">' +
                    '<div class="flex items-start justify-between mb-3">' +
                    '<p class="font-label-sm text-label-sm text-on-surface font-semibold max-w-[75%]">' +
                    q +
                    "</p>" +
                    (score !== null
                        ? '<span class="font-h3 text-h3 font-bold ' +
                          scoreColor +
                          '">' +
                          score +
                          "</span>"
                        : "") +
                    "</div>" +
                    (fb ? '<p class="font-body-md text-body-md text-on-surface-variant">' + fb + "</p>" : "") +
                    "</div>"
                );
            })
            .join("") || "<p class='text-on-surface-variant text-sm'>Sonuç bulunamadı.</p>";
}

function onLayoutReady() {
    loadSetup();
}
