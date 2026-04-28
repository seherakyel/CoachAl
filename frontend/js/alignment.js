const API_BASE = "http://localhost:8000";

const authHint = document.getElementById("auth-hint");
const alignPanel = document.getElementById("align-panel");
const alignError = document.getElementById("align-error");
const selCv = document.getElementById("sel-cv");
const selProfile = document.getElementById("sel-profile");
const btnScore = document.getElementById("btn-score");
const alignResult = document.getElementById("align-result");
const gauge = document.getElementById("gauge");
const scoreValue = document.getElementById("score-value");
const companyLine = document.getElementById("company-line");
const riskBadge = document.getElementById("risk-badge");
const valS = document.getElementById("val-s");
const valE = document.getElementById("val-e");
const valD = document.getElementById("val-d");
const adviceText = document.getElementById("advice-text");
const listMatched = document.getElementById("list-matched");
const listMissing = document.getElementById("list-missing");

function showError(msg) {
    alignError.textContent = msg;
    alignError.style.display = "block";
}

function clearError() {
    alignError.textContent = "";
    alignError.style.display = "none";
}

function riskClass(risk) {
    if (risk === "DÜŞÜK") return "risk-low";
    if (risk === "ORTA") return "risk-mid";
    return "risk-high";
}

function gaugeColor(risk) {
    if (risk === "DÜŞÜK") return "#22c55e";
    if (risk === "ORTA") return "#eab308";
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

function fillList(el, items) {
    el.innerHTML = "";
    (items || []).forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        el.appendChild(li);
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
    btnScore.disabled = !cvs.length || !profiles.length;
}

btnScore.addEventListener("click", async () => {
    clearError();
    alignResult.classList.remove("visible");
    const cvId = selCv.value;
    const profileId = selProfile.value;
    if (!cvId || !profileId) {
        showError("CV ve şirket profili seç.");
        return;
    }
    const token = await getToken();
    if (!token) {
        showError("Oturum yok.");
        return;
    }
    btnScore.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/api/alignment/score`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ cv_id: cvId, profile_id: profileId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            let errMsg = res.statusText || "Hata";
            if (data.detail) {
                errMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
            }
            showError(errMsg);
        } else {
        const pct = Math.min(100, Math.max(0, Number(data.score_percent) || 0));
        gauge.style.setProperty("--score", String(pct));
        gauge.style.setProperty("--gauge-color", gaugeColor(data.risk_level));
        scoreValue.textContent = `${pct}%`;
        companyLine.textContent = `${data.company_name} · ${data.position}`;
        riskBadge.textContent = `Elenme riski: ${data.risk_level}`;
        riskBadge.className = "risk-badge " + riskClass(data.risk_level);
        valS.textContent = data.S != null ? data.S : "—";
        valE.textContent = data.E != null ? data.E : "—";
        valD.textContent = data.D != null ? data.D : "—";
        adviceText.textContent = data.advice || "Gemini tavsiyesi için GEMINI_API_KEY tanımlı olmalı.";
        fillList(listMatched, data.matched_skills);
        fillList(listMissing, data.missing_skills);
        alignResult.classList.add("visible");
        }
    } catch (err) {
        showError(err.message || "Ağ hatası");
    } finally {
        btnScore.disabled = false;
    }
});

initAuth();
onAuthChange(async (user) => {
    if (!user) {
        authHint.textContent = "Skor için giriş yapmalısın.";
        alignPanel.style.display = "none";
        window.location.href = "login.html";
        return;
    }
    authHint.textContent = `Giriş: ${user.email}`;
    alignPanel.style.display = "block";
    const token = await user.getIdToken();
    try {
        await loadOptions(token);
    } catch (e) {
        showError("Listeler yüklenemedi.");
    }
});
