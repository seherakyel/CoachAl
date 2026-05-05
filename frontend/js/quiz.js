var quizQuestions = [];
var quizAnswers = [];
var currentQ = 0;
var timerInterval = null;
var timeLeft = 60;
var quizSessionId = null;

var focusTopicFromUrl = null;

(function () {
    var q = new URLSearchParams(window.location.search);
    var t = q.get("topic");
    if (t) focusTopicFromUrl = t;
})();

function isTopicFlow() {
    return !!(focusTopicFromUrl && String(focusTopicFromUrl).trim());
}

function displayTopicLabel(raw) {
    if (!raw) return "";
    try {
        return decodeURIComponent(String(raw).replace(/\+/g, " "));
    } catch (e) {
        return String(raw);
    }
}

function showTopicFocusBanner(displayLabel) {
    var el = document.getElementById("topic-focus-banner");
    if (!el || !displayLabel) return;
    el.textContent = displayLabel + " odaklı simülasyon başlatıldı";
    el.classList.remove("hidden");
}

function hideTopicFocusBanner() {
    var el = document.getElementById("topic-focus-banner");
    if (el) el.classList.add("hidden");
}

function hideTopicFlowError() {
    var el = document.getElementById("topic-flow-error");
    if (el) {
        el.textContent = "";
        el.classList.add("hidden");
    }
}

function applyStoredCredentialsToSelects() {
    var cvSel = document.getElementById("cv-select");
    var profileSel = document.getElementById("profile-select");
    if (!cvSel || !profileSel) return;

    var cvId =
        sessionStorage.getItem("coachai_cv_id") || localStorage.getItem("coachai_cv_id") || "";
    var profileId =
        sessionStorage.getItem("coachai_profile_id") ||
        localStorage.getItem("coachai_profile_id") ||
        "";

    if (cvId) {
        cvSel.value = cvId;
    }
    if (profileId) {
        profileSel.value = profileId;
    }
}

/** Topic akışında sessionStorage / localStorage veya listedeki ilk kayıt. */
function ensureTopicDefaults() {
    var cvSel = document.getElementById("cv-select");
    var profileSel = document.getElementById("profile-select");
    if (!cvSel || !profileSel) return { cvId: "", profileId: "" };

    applyStoredCredentialsToSelects();

    var cvId = cvSel.value;
    var profileId = profileSel.value;

    if (!cvId && cvSel.options.length > 1) {
        cvSel.selectedIndex = 1;
        cvId = cvSel.value;
    }
    if (!profileId && profileSel.options.length > 1) {
        profileSel.selectedIndex = 1;
        profileId = profileSel.value;
    }

    return { cvId: cvId || "", profileId: profileId || "" };
}

function applyTopicFlowUI(label) {
    var dropdowns = document.getElementById("setup-dropdowns");
    var quick = document.getElementById("topic-quick-panel");
    var titleEl = document.getElementById("topic-quick-title");
    var btnLabel = document.getElementById("btn-start-quiz-label");
    var setupErr = document.getElementById("setup-error");

    if (dropdowns) dropdowns.classList.add("hidden");
    if (quick) quick.classList.remove("hidden");
    if (titleEl) titleEl.textContent = label + " Konusuna Özel Teknik Test";
    if (btnLabel) btnLabel.textContent = "Quizi Başlat";
    if (setupErr) setupErr.classList.add("hidden");
    hideTopicFlowError();
}

function showPanel(id) {
    ["setup-panel", "loading-panel", "quiz-panel", "result-panel"].forEach(function (p) {
        document.getElementById(p).classList.toggle("hidden", p !== id);
    });
    var ban = document.getElementById("topic-focus-banner");
    if (ban && id !== "quiz-panel") ban.classList.add("hidden");
}

async function loadDropdowns() {
    var tok;
    try {
        tok = await getToken();
    } catch (e) {
        return;
    }

    var cvSel = document.getElementById("cv-select");
    var profileSel = document.getElementById("profile-select");
    var savedCvId =
        sessionStorage.getItem("coachai_cv_id") || localStorage.getItem("coachai_cv_id");
    var savedProfileId =
        sessionStorage.getItem("coachai_profile_id") ||
        localStorage.getItem("coachai_profile_id");

    try {
        var cr = await fetch(API_BASE + "/api/cv/list?limit=20", {
            headers: { Authorization: "Bearer " + tok },
        });
        var cd = await cr.json();
        var cvs = cd.items || cd.cvs || [];
        cvSel.innerHTML =
            `<option value="">CV seçin…</option>` +
            cvs
                .map(function (c) {
                    return `<option value="${c.id || c.cv_id}" ${
                        (c.id || c.cv_id) === savedCvId ? "selected" : ""
                    }>${c.filename || c.original_filename || c.id}</option>`;
                })
                .join("");
    } catch (e) {
        cvSel.innerHTML = `<option value="">CV yüklenemedi</option>`;
    }

    try {
        var pr = await fetch(API_BASE + "/api/company/list?limit=20", {
            headers: { Authorization: "Bearer " + tok },
        });
        var pd = await pr.json();
        var profiles = pd.items || pd.profiles || [];
        profileSel.innerHTML =
            `<option value="">Şirket profili seçin…</option>` +
            profiles
                .map(function (p) {
                    return `<option value="${p.id || p.profile_id}" ${
                        (p.id || p.profile_id) === savedProfileId ? "selected" : ""
                    }>${p.company_name || p.id} ${
                        p.target_position ? "- " + p.target_position : ""
                    }</option>`;
                })
                .join("");
    } catch (e) {
        profileSel.innerHTML = `<option value="">Profil yüklenemedi</option>`;
    }
}

async function startQuizSession(cvId, profileId, opts) {
    opts = opts || {};
    if (isTopicFlow()) {
        hideTopicFlowError();
        document.getElementById("setup-error").classList.add("hidden");
    } else {
        document.getElementById("setup-error").classList.add("hidden");
    }
    hideTopicFocusBanner();
    showPanel("loading-panel");
    try {
        var tok = await getToken();
        var focusTopic =
            opts.focusTopic !== undefined && opts.focusTopic !== null
                ? opts.focusTopic
                : focusTopicFromUrl;
        var body = { cv_id: cvId, profile_id: profileId };
        var ft = focusTopic && String(focusTopic).trim();
        if (ft) body.focus_topic = ft;

        var r = await fetch(API_BASE + "/api/interview/quiz", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + tok,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        var d = await r.json();
        if (!r.ok)
            throw new Error(
                typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail)
            );
        quizQuestions = d.questions || [];
        quizAnswers = new Array(quizQuestions.length).fill(null);
        quizSessionId = d.session_id || null;
        currentQ = 0;
        showPanel("quiz-panel");
        if (ft) showTopicFocusBanner(displayTopicLabel(ft));
        showQuestion(0);
    } catch (err) {
        showPanel("setup-panel");
        hideTopicFocusBanner();
        var msg = err.message || "Quiz başlatılamadı";
        if (isTopicFlow()) {
            document.getElementById("setup-error").classList.add("hidden");
        } else {
            var el = document.getElementById("setup-error");
            el.textContent = msg;
            el.classList.remove("hidden");
        }
    }
}

document.getElementById("btn-start-quiz").addEventListener("click", async function () {
    if (isTopicFlow()) {
        hideTopicFlowError();
        await loadDropdowns();
        var ids = ensureTopicDefaults();
        await startQuizSession(ids.cvId, ids.profileId, {});
        return;
    }

    var cvId = document.getElementById("cv-select").value;
    var profileId = document.getElementById("profile-select").value;
    if (!cvId || !profileId) {
        var el = document.getElementById("setup-error");
        el.textContent = "CV ve şirket profili seçin.";
        el.classList.remove("hidden");
        return;
    }
    await startQuizSession(cvId, profileId, {});
});

function showQuestion(idx) {
    if (idx >= quizQuestions.length) {
        submitQuiz();
        return;
    }
    var q = quizQuestions[idx];
    var text = typeof q === "string" ? q : q.question || q.text || q;
    var options = typeof q === "object" && q.options ? q.options : [];
    document.getElementById("question-text").textContent = text;
    document.getElementById("quiz-progress").textContent =
        "Soru " + (idx + 1) + " / " + quizQuestions.length;
    document.getElementById("progress-bar").style.width =
        (idx / quizQuestions.length) * 100 + "%";

    var container = document.getElementById("options-container");
    container.innerHTML =
        options
            .map(function (opt, oi) {
                var label = typeof opt === "string" ? opt : opt.text || opt;
                return `<button class="w-full text-left px-5 py-4 rounded-xl border border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-primary-fixed text-on-surface text-sm font-medium transition-all" data-oi="${oi}">${String.fromCharCode(
                    65 + oi
                )}. ${label}</button>`;
            })
            .join("") ||
        `<textarea id="free-answer" rows="4" placeholder="Cevabınızı yazın…" class="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"></textarea><button id="free-next" class="mt-4 w-full bg-primary text-on-primary py-3 rounded-lg font-semibold text-sm">Sonraki</button>`;

    container.querySelectorAll("[data-oi]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            quizAnswers[idx] = parseInt(btn.getAttribute("data-oi"));
            clearTimer();
            currentQ++;
            showQuestion(currentQ);
        });
    });
    var freeNext = document.getElementById("free-next");
    if (freeNext) {
        freeNext.addEventListener("click", function () {
            quizAnswers[idx] = (document.getElementById("free-answer") || {}).value || "";
            clearTimer();
            currentQ++;
            showQuestion(currentQ);
        });
    }
    startTimer();
}

function startTimer() {
    clearTimer();
    timeLeft = 60;
    document.getElementById("timer-display").textContent = timeLeft;
    timerInterval = setInterval(function () {
        timeLeft--;
        document.getElementById("timer-display").textContent = timeLeft;
        if (timeLeft <= 0) {
            clearTimer();
            quizAnswers[currentQ] = null;
            currentQ++;
            showQuestion(currentQ);
        }
    }, 1000);
}
function clearTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

async function submitQuiz() {
    clearTimer();
    showPanel("loading-panel");
    hideTopicFocusBanner();
    try {
        var tok = await getToken();
        var answers = quizQuestions.map(function (q, i) {
            var text = typeof q === "string" ? q : q.question || q.text || q;
            return { question: text, answer_index: quizAnswers[i], answer: quizAnswers[i] };
        });
        var body = { answers: answers };
        if (quizSessionId) body.session_id = quizSessionId;
        var r = await fetch(API_BASE + "/api/interview/quiz/submit", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + tok,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        var d = await r.json();
        if (!r.ok)
            throw new Error(
                typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail)
            );
        sessionStorage.setItem("coachai_quiz_session_id", d.session_id || "");
        renderResults(d);
        showPanel("result-panel");
    } catch (err) {
        showPanel("setup-panel");
        var msg = err.message || "Quiz gönderilemedi";
        var el = document.getElementById("setup-error");
        el.textContent = msg;
        el.classList.remove("hidden");
    }
}

function renderResults(d) {
    var correct = typeof d.score === "number" ? d.score : d.correct_count || 0;
    var total = d.total || quizQuestions.length;
    document.getElementById("final-score").textContent = correct + "/" + total;
    document.getElementById("result-summary").textContent =
        correct +
        " doğru, " +
        (total - correct) +
        " yanlış. " +
        (d.summary || "");
    var detail = d.results || d.evaluations || [];
    document.getElementById("results-detail").innerHTML =
        detail
            .map(function (r, i) {
                var q = r.question || "Soru " + (i + 1);
                var correct_ans = r.correct_answer || r.correct || "";
                var user_ans = r.user_answer !== undefined ? r.user_answer : "—";
                var isCorrect = r.is_correct !== undefined ? r.is_correct : null;
                var borderCls =
                    isCorrect === true
                        ? "border-emerald-100"
                        : isCorrect === false
                          ? "border-red-100"
                          : "border-outline-variant";
                var iconCls =
                    isCorrect === true
                        ? "text-emerald-500"
                        : isCorrect === false
                          ? "text-red-500"
                          : "text-on-surface-variant";
                var icon =
                    isCorrect === true ? "check_circle" : isCorrect === false ? "cancel" : "help";
                return `<div class="bg-surface-container-lowest border ${borderCls} rounded-xl p-5 flex gap-4">
<span class="material-symbols-outlined ${iconCls} text-[24px] shrink-0">${icon}</span>
<div><p class="font-label-sm text-label-sm text-on-surface font-semibold mb-1">${q}</p>
${correct_ans ? `<p class="text-sm text-emerald-700">Doğru: ${correct_ans}</p>` : ""}
${r.feedback ? `<p class="text-sm text-on-surface-variant mt-1">${r.feedback}</p>` : ""}
</div></div>`;
            })
            .join("") || "";
}

async function onLayoutReady() {
    await loadDropdowns();
    if (isTopicFlow()) {
        applyTopicFlowUI(displayTopicLabel(focusTopicFromUrl));
        applyStoredCredentialsToSelects();
        ensureTopicDefaults();
    }
}
