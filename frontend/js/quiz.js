const API_BASE = "http://localhost:8000";

const authHint = document.getElementById("auth-hint");
const quizError = document.getElementById("quiz-error");
const setupPanel = document.getElementById("setup-panel");
const quizPanel = document.getElementById("quiz-panel");
const quizResult = document.getElementById("quiz-result");
const selCv = document.getElementById("sel-cv");
const selProfile = document.getElementById("sel-profile");
const btnStart = document.getElementById("btn-start");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnSubmit = document.getElementById("btn-submit");
const qHost = document.getElementById("q-host");
const timerEl = document.getElementById("timer");
const progressEl = document.getElementById("quiz-progress");
const progressFill = document.getElementById("progress-fill");
const gauge = document.getElementById("gauge");
const scoreValue = document.getElementById("score-value");
const resultMeta = document.getElementById("result-meta");
const resultSummary = document.getElementById("result-summary");
const resultList = document.getElementById("result-list");

let session = null;
let questions = [];
let currentIdx = 0;
let answers = {};
let secondsPerQ = 60;
let remaining = 60;
let timerHandle = null;

function showError(msg) {
    quizError.textContent = msg;
    quizError.style.display = "block";
}

function clearError() {
    quizError.textContent = "";
    quizError.style.display = "none";
}

function gaugeColor(score) {
    if (score >= 75) return "#22c55e";
    if (score >= 50) return "#eab308";
    return "#ef4444";
}

function fillSelect(select, items, valueKey, labelFn, emptyMsg) {
    select.innerHTML = "";
    if (!items.length) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = emptyMsg;
        select.appendChild(o);
        return;
    }
    items.forEach((it) => {
        const o = document.createElement("option");
        o.value = it[valueKey];
        o.textContent = labelFn(it);
        select.appendChild(o);
    });
}

async function loadOptions(token) {
    const [r1, r2] = await Promise.all([
        fetch(`${API_BASE}/api/cv/list`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/company/list`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const cvs = r1.ok ? (await r1.json()).items : [];
    const profiles = r2.ok ? (await r2.json()).items : [];
    fillSelect(selCv, cvs, "cv_id", (it) => `${it.cv_id.slice(0, 8)}… · ${it.skill_count || 0} yetenek`, "Önce CV yükleyin");
    fillSelect(
        selProfile,
        profiles,
        "profile_id",
        (it) => `${it.company_name} — ${it.position}`,
        "Önce şirket analizi yapın"
    );
    btnStart.disabled = !cvs.length || !profiles.length;
}

function stopTimer() {
    if (timerHandle) {
        clearInterval(timerHandle);
        timerHandle = null;
    }
}

function startTimer() {
    stopTimer();
    remaining = secondsPerQ;
    updateTimerDisplay();
    timerHandle = setInterval(() => {
        remaining -= 1;
        updateTimerDisplay();
        if (remaining <= 0) {
            stopTimer();
            goNext(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    timerEl.textContent = String(Math.max(0, remaining));
    if (remaining <= 10) timerEl.classList.add("urgent");
    else timerEl.classList.remove("urgent");
}

function renderQuestion() {
    const q = questions[currentIdx];
    progressEl.textContent = `Soru ${currentIdx + 1}/${questions.length}`;
    progressFill.style.width = `${((currentIdx + 1) / questions.length) * 100}%`;
    qHost.innerHTML = "";
    const card = document.createElement("div");
    card.className = "q-card";
    const meta = document.createElement("div");
    meta.className = "q-meta";
    const tNo = document.createElement("span");
    tNo.className = "tag";
    tNo.textContent = `#${q.index + 1}`;
    const tDiff = document.createElement("span");
    tDiff.className = `tag diff-${q.difficulty || "orta"}`;
    tDiff.textContent = q.difficulty || "orta";
    meta.appendChild(tNo);
    meta.appendChild(tDiff);
    const text = document.createElement("p");
    text.className = "q-text";
    text.textContent = q.question;
    const opts = document.createElement("div");
    opts.className = "options";
    q.options.forEach((opt, i) => {
        const lbl = document.createElement("label");
        lbl.className = "option" + (answers[q.index] === i ? " selected" : "");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `q-${q.index}`;
        input.value = String(i);
        input.checked = answers[q.index] === i;
        input.addEventListener("change", () => {
            answers[q.index] = i;
            opts.querySelectorAll(".option").forEach((el) => el.classList.remove("selected"));
            lbl.classList.add("selected");
        });
        const span = document.createElement("span");
        span.textContent = opt;
        lbl.appendChild(input);
        lbl.appendChild(span);
        opts.appendChild(lbl);
    });
    card.appendChild(meta);
    card.appendChild(text);
    card.appendChild(opts);
    qHost.appendChild(card);

    btnPrev.disabled = currentIdx === 0;
    const isLast = currentIdx === questions.length - 1;
    btnNext.style.display = isLast ? "none" : "";
    btnSubmit.style.display = isLast ? "" : "none";
    startTimer();
}

function goNext(timeoutTriggered = false) {
    if (currentIdx < questions.length - 1) {
        currentIdx += 1;
        renderQuestion();
    } else if (timeoutTriggered) {
        submitQuiz();
    }
}

function goPrev() {
    if (currentIdx > 0) {
        currentIdx -= 1;
        renderQuestion();
    }
}

async function submitQuiz() {
    if (!session) return;
    stopTimer();
    btnSubmit.disabled = true;
    btnNext.disabled = true;
    btnPrev.disabled = true;
    btnSubmit.textContent = "Gönderiliyor…";
    const token = await getToken();
    if (!token) { showError("Oturum yok."); return; }
    const payload = {
        session_id: session.session_id,
        answers: questions.map((q) => ({
            question_index: q.index,
            selected_index: answers[q.index] === undefined ? null : answers[q.index],
        })),
    };
    try {
        const res = await fetch(`${API_BASE}/api/interview/quiz/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data.detail ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)) : "Hata";
            showError(msg);
            btnSubmit.disabled = false;
            btnNext.disabled = false;
            btnSubmit.textContent = "Bitir ve gönder";
            return;
        }
        renderResult(data);
    } catch (err) {
        showError(err.message || "Ağ hatası");
        btnSubmit.disabled = false;
        btnNext.disabled = false;
        btnSubmit.textContent = "Bitir ve gönder";
    }
}

function renderResult(data) {
    quizPanel.style.display = "none";
    quizResult.classList.add("visible");
    const pct = Math.min(100, Math.max(0, Number(data.total_score) || 0));
    gauge.style.setProperty("--score", String(pct));
    gauge.style.setProperty("--gauge-color", gaugeColor(pct));
    scoreValue.textContent = `${pct}%`;
    resultMeta.textContent = `${session.company_name} · ${session.position}`;
    resultSummary.textContent = `${data.correct_count} / ${data.total_questions} doğru`;
    resultList.innerHTML = "";
    (data.per_question || []).forEach((p) => {
        const wrap = document.createElement("div");
        wrap.className = "q-result";
        const head = document.createElement("div");
        head.className = "head";
        const left = document.createElement("div");
        left.style.flex = "1";
        const num = document.createElement("strong");
        num.textContent = `#${p.question_index + 1} `;
        const qt = document.createElement("span");
        qt.style.color = "#e4e4e7";
        qt.textContent = p.question;
        left.appendChild(num);
        left.appendChild(qt);
        const tag = document.createElement("span");
        tag.className = p.is_correct ? "r-correct" : "r-wrong";
        tag.textContent = p.is_correct ? "Doğru" : "Yanlış";
        head.appendChild(left);
        head.appendChild(tag);
        wrap.appendChild(head);
        (p.options || []).forEach((opt, i) => {
            const line = document.createElement("div");
            line.className = "opt-line";
            const isUser = i === p.selected_index;
            const isRight = i === p.correct_index;
            if (isRight) line.classList.add("right");
            else if (isUser) line.classList.add("user");
            const prefix = isRight ? "✓ " : isUser ? "✗ " : "  ";
            line.textContent = `${prefix}${String.fromCharCode(65 + i)}. ${opt}`;
            wrap.appendChild(line);
        });
        if (p.explanation) {
            const ex = document.createElement("p");
            ex.className = "expl";
            ex.textContent = `Açıklama: ${p.explanation}`;
            wrap.appendChild(ex);
        }
        resultList.appendChild(wrap);
    });
}

btnStart.addEventListener("click", async () => {
    clearError();
    const cvId = selCv.value;
    const profileId = selProfile.value;
    if (!cvId || !profileId) { showError("CV ve şirket profili seç."); return; }
    const token = await getToken();
    if (!token) { showError("Oturum yok."); return; }
    btnStart.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/api/interview/quiz`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ cv_id: cvId, profile_id: profileId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data.detail ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)) : "Hata";
            showError(msg);
            btnStart.disabled = false;
            return;
        }
        session = data;
        questions = data.questions || [];
        secondsPerQ = data.seconds_per_question || 60;
        currentIdx = 0;
        answers = {};
        setupPanel.style.display = "none";
        quizPanel.style.display = "block";
        renderQuestion();
    } catch (err) {
        showError(err.message || "Ağ hatası");
        btnStart.disabled = false;
    }
});

btnPrev.addEventListener("click", () => goPrev());
btnNext.addEventListener("click", () => goNext(false));
btnSubmit.addEventListener("click", () => submitQuiz());

initAuth();
onAuthChange(async (user) => {
    if (!user) {
        authHint.textContent = "Quiz için giriş yapmalısın.";
        setupPanel.style.display = "none";
        window.location.href = "login.html";
        return;
    }
    authHint.textContent = `Giriş: ${user.email}`;
    setupPanel.style.display = "block";
    const token = await user.getIdToken();
    try {
        await loadOptions(token);
    } catch (e) {
        showError("Listeler yüklenemedi.");
    }
});
