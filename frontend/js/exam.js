const API_BASE = "http://localhost:8000";

const authHint = document.getElementById("auth-hint");
const examError = document.getElementById("exam-error");
const setupPanel = document.getElementById("setup-panel");
const examPanel = document.getElementById("exam-panel");
const examInfo = document.getElementById("exam-info");
const examForm = document.getElementById("exam-form");
const btnStart = document.getElementById("btn-start");
const btnSubmit = document.getElementById("btn-submit");
const selCv = document.getElementById("sel-cv");
const selProfile = document.getElementById("sel-profile");
const examResult = document.getElementById("exam-result");
const gauge = document.getElementById("gauge");
const scoreValue = document.getElementById("score-value");
const resultMeta = document.getElementById("result-meta");
const summaryText = document.getElementById("summary-text");
const resultList = document.getElementById("result-list");

let currentSession = null;

function showError(msg) {
    examError.textContent = msg;
    examError.style.display = "block";
}

function clearError() {
    examError.textContent = "";
    examError.style.display = "none";
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

function renderQuestions(questions) {
    examForm.innerHTML = "";
    questions.forEach((q) => {
        const card = document.createElement("div");
        card.className = "question-card";
        const meta = document.createElement("div");
        meta.className = "question-meta";
        const tType = document.createElement("span");
        tType.className = "tag type";
        tType.textContent = q.type;
        const tDiff = document.createElement("span");
        tDiff.className = `tag diff-${q.difficulty}`;
        tDiff.textContent = q.difficulty;
        const tNo = document.createElement("span");
        tNo.className = "tag";
        tNo.textContent = `#${q.index + 1}`;
        meta.appendChild(tNo);
        meta.appendChild(tType);
        meta.appendChild(tDiff);
        const text = document.createElement("p");
        text.className = "question-text";
        text.textContent = q.question;
        const ta = document.createElement("textarea");
        ta.dataset.index = String(q.index);
        ta.placeholder = "Cevabını yaz…";
        card.appendChild(meta);
        card.appendChild(text);
        card.appendChild(ta);
        examForm.appendChild(card);
    });
}

btnStart.addEventListener("click", async () => {
    clearError();
    examResult.classList.remove("visible");
    const cvId = selCv.value;
    const profileId = selProfile.value;
    if (!cvId || !profileId) {
        showError("CV ve şirket profili seç.");
        return;
    }
    const token = await getToken();
    if (!token) { showError("Oturum yok."); return; }
    btnStart.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/api/interview/classic`, {
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
        currentSession = data;
        examInfo.textContent = `${data.company_name} · ${data.position} · ${data.questions.length} soru`;
        renderQuestions(data.questions);
        setupPanel.style.display = "none";
        examPanel.style.display = "block";
    } catch (err) {
        showError(err.message || "Ağ hatası");
        btnStart.disabled = false;
    }
});

btnSubmit.addEventListener("click", async () => {
    if (!currentSession) return;
    clearError();
    const answers = [];
    examForm.querySelectorAll("textarea").forEach((ta) => {
        answers.push({
            question_index: parseInt(ta.dataset.index, 10),
            answer: ta.value || "",
        });
    });
    const token = await getToken();
    if (!token) { showError("Oturum yok."); return; }
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Değerlendiriliyor…";
    try {
        const res = await fetch(`${API_BASE}/api/interview/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ session_id: currentSession.session_id, answers }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data.detail ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)) : "Hata";
            showError(msg);
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Cevapları gönder";
            return;
        }
        const total = Math.min(100, Math.max(0, Number(data.total_score) || 0));
        gauge.style.setProperty("--score", String(total));
        gauge.style.setProperty("--gauge-color", gaugeColor(total));
        scoreValue.textContent = `${total}`;
        resultMeta.textContent = `${currentSession.company_name} · ${currentSession.position}`;
        summaryText.textContent = data.feedback || "Genel özet üretilemedi.";
        resultList.innerHTML = "";
        (data.per_question || []).forEach((p) => {
            const wrap = document.createElement("div");
            wrap.className = "q-result";
            const head = document.createElement("div");
            head.className = "q-head";
            const left = document.createElement("div");
            left.style.flex = "1";
            const num = document.createElement("strong");
            num.textContent = `#${p.question_index + 1} `;
            const qtext = document.createElement("span");
            qtext.style.color = "#e4e4e7";
            qtext.textContent = p.question;
            left.appendChild(num);
            left.appendChild(qtext);
            const sc = document.createElement("span");
            sc.className = "q-score";
            sc.textContent = `${p.score}/100`;
            head.appendChild(left);
            head.appendChild(sc);
            const fb = document.createElement("p");
            fb.className = "q-feedback";
            fb.textContent = p.feedback || "—";
            wrap.appendChild(head);
            wrap.appendChild(fb);
            resultList.appendChild(wrap);
        });
        examPanel.style.display = "none";
        examResult.classList.add("visible");
    } catch (err) {
        showError(err.message || "Ağ hatası");
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Cevapları gönder";
    }
});

initAuth();
onAuthChange(async (user) => {
    if (!user) {
        authHint.textContent = "Sınav için giriş yapmalısın.";
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
