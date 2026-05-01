const API_BASE = "http://localhost:8000";

const authHint = document.getElementById("auth-hint");
const fbError = document.getElementById("fb-error");
const fbPanel = document.getElementById("fb-panel");
const fbResult = document.getElementById("fb-result");
const selAlign = document.getElementById("sel-align");
const selSession = document.getElementById("sel-session");
const btnGenerate = document.getElementById("btn-generate");
const fbMeta = document.getElementById("fb-meta");
const whyText = document.getElementById("why-text");
const listStrengths = document.getElementById("list-strengths");
const listWeaknesses = document.getElementById("list-weaknesses");
const actionText = document.getElementById("action-text");
const listResources = document.getElementById("list-resources");
const prepTime = document.getElementById("prep-time");

function showError(msg) {
    fbError.textContent = msg;
    fbError.style.display = "block";
}

function clearError() {
    fbError.textContent = "";
    fbError.style.display = "none";
}

function fillList(el, items) {
    el.innerHTML = "";
    (items || []).forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        el.appendChild(li);
    });
}

async function loadOptions(token) {
    const res = await fetch(`${API_BASE}/api/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        showError("Liste yüklenemedi.");
        return;
    }
    const summary = await res.json();
    selAlign.innerHTML = "";
    const apps = (summary.applications || []).filter((a) => a.alignment_id);
    if (!apps.length) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "Önce bir hizalama hesapla";
        selAlign.appendChild(o);
        btnGenerate.disabled = true;
    } else {
        apps.forEach((a) => {
            const o = document.createElement("option");
            o.value = a.alignment_id;
            o.textContent = `${a.company_name} — ${a.position} · skor ${Math.round(a.alignment_score)}%`;
            selAlign.appendChild(o);
        });
        btnGenerate.disabled = false;
    }

    const sRes = await fetch(`${API_BASE}/api/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    selSession.innerHTML = "";
    const optEmpty = document.createElement("option");
    optEmpty.value = "";
    optEmpty.textContent = "(opsiyonel) mülakat oturumu seç";
    selSession.appendChild(optEmpty);
}

btnGenerate.addEventListener("click", async () => {
    clearError();
    fbResult.classList.remove("visible");
    const alignmentId = selAlign.value;
    if (!alignmentId) {
        showError("Hizalama sonucu seç.");
        return;
    }
    const sessionId = selSession.value || null;
    const token = await getToken();
    if (!token) { showError("Oturum yok."); return; }
    btnGenerate.disabled = true;
    btnGenerate.textContent = "Üretiliyor…";
    try {
        const body = { alignment_id: alignmentId };
        if (sessionId) body.session_id = sessionId;
        const res = await fetch(`${API_BASE}/api/feedback/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data.detail ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)) : "Hata";
            showError(msg);
            return;
        }
        fbMeta.textContent = `${data.company_name} · ${data.position} · skor ${Math.round(data.score)}% · risk ${data.risk_level}`;
        whyText.textContent = data.why_can_be_eliminated || "Yorum üretilemedi.";
        fillList(listStrengths, data.strengths);
        fillList(listWeaknesses, data.weaknesses);
        actionText.textContent = data.action_plan || "—";
        fillList(listResources, data.recommended_resources);
        if (data.estimated_prep_time) {
            prepTime.textContent = `Tahmini hazırlık: ${data.estimated_prep_time}`;
            prepTime.style.display = "inline-block";
        } else {
            prepTime.style.display = "none";
        }
        fbResult.classList.add("visible");
    } catch (err) {
        showError(err.message || "Ağ hatası");
    } finally {
        btnGenerate.disabled = false;
        btnGenerate.textContent = "Geri bildirim üret";
    }
});

initAuth();
onAuthChange(async (user) => {
    if (!user) {
        authHint.textContent = "Geri bildirim için giriş yapmalısın.";
        fbPanel.style.display = "none";
        window.location.href = "login.html";
        return;
    }
    authHint.textContent = `Giriş: ${user.email}`;
    fbPanel.style.display = "block";
    const token = await user.getIdToken();
    try {
        await loadOptions(token);
    } catch (e) {
        showError("Listeler yüklenemedi.");
    }
});
