const API_BASE = "http://localhost:8000";

const authHint = document.getElementById("auth-hint");
const companyPanel = document.getElementById("company-panel");
const companyError = document.getElementById("company-error");
const companyForm = document.getElementById("company-form");
const btnAnalyze = document.getElementById("btn-analyze");
const companyResult = document.getElementById("company-result");
const companyMeta = document.getElementById("company-meta");
const listTech = document.getElementById("list-tech");
const textCulture = document.getElementById("text-culture");
const textInterview = document.getElementById("text-interview");
const listQuestions = document.getElementById("list-questions");
const listTraits = document.getElementById("list-traits");

function showError(msg) {
    companyError.textContent = msg;
    companyError.style.display = "block";
}

function clearError() {
    companyError.textContent = "";
    companyError.style.display = "none";
}

function fillList(el, items) {
    el.innerHTML = "";
    (items || []).forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        el.appendChild(li);
    });
}

companyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    companyResult.classList.remove("visible");
    const companyName = document.getElementById("company-name").value.trim();
    const position = document.getElementById("position").value.trim();
    const token = await getToken();
    if (!token) {
        showError("Oturum yok. Giriş yap.");
        return;
    }
    btnAnalyze.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/api/company/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ company_name: companyName, position }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            let errMsg = res.statusText || "İstek başarısız";
            if (data.detail) {
                errMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
            }
            showError(errMsg);
            return;
        }
        companyMeta.textContent = `profile_id: ${data.profile_id}`;
        fillList(listTech, data.tech_stack);
        textCulture.textContent = data.culture_summary || "—";
        textInterview.textContent = data.interview_process || "—";
        fillList(listQuestions, data.common_questions);
        fillList(listTraits, data.key_traits);
        companyResult.classList.add("visible");
    } catch (err) {
        showError(err.message || "Ağ hatası");
    }
    btnAnalyze.disabled = false;
});

initAuth();
onAuthChange((user) => {
    if (!user) {
        authHint.textContent = "Şirket analizi için giriş yapmalısın.";
        companyPanel.style.display = "none";
        window.location.href = "login.html";
        return;
    }
    authHint.textContent = `Giriş: ${user.email}`;
    companyPanel.style.display = "block";
});
