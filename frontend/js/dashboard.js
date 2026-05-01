const API_BASE = "http://localhost:8000";

const authHint = document.getElementById("auth-hint");
const dashError = document.getElementById("dash-error");
const dashLoading = document.getElementById("dash-loading");
const dashContent = document.getElementById("dash-content");
const statCv = document.getElementById("stat-cv");
const statCompany = document.getElementById("stat-company");
const statInterview = document.getElementById("stat-interview");
const statAvg = document.getElementById("stat-avg");
const appGrid = document.getElementById("app-grid");

let chartBar = null;
let chartRadar = null;

function showError(msg) {
    dashError.textContent = msg;
    dashError.style.display = "block";
}

function clearError() {
    dashError.textContent = "";
    dashError.style.display = "none";
}

function riskClass(risk) {
    if (risk === "DÜŞÜK") return "risk-low";
    if (risk === "ORTA") return "risk-mid";
    if (risk === "YÜKSEK") return "risk-high";
    return "";
}

function renderStats(summary) {
    statCv.textContent = summary.cv_count || 0;
    statCompany.textContent = summary.company_count || 0;
    statInterview.textContent = summary.interview_count || 0;
    const scores = (summary.applications || [])
        .map((a) => a.alignment_score)
        .filter((s) => s !== null && s !== undefined);
    if (scores.length) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        statAvg.textContent = `${Math.round(avg)}%`;
    } else {
        statAvg.textContent = "—";
    }
}

function renderApps(applications) {
    appGrid.innerHTML = "";
    if (!applications.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "Henüz şirket profili yok. Şirket Analizi sayfasından ekleyin.";
        appGrid.appendChild(empty);
        return;
    }
    applications.forEach((a) => {
        const card = document.createElement("div");
        card.className = "app-card";
        const head = document.createElement("div");
        head.style.display = "flex";
        head.style.justifyContent = "space-between";
        head.style.alignItems = "flex-start";
        head.style.gap = "0.5rem";
        const titleWrap = document.createElement("div");
        const h = document.createElement("h3");
        h.textContent = a.company_name || "—";
        const pos = document.createElement("div");
        pos.className = "pos";
        pos.textContent = a.position || "";
        titleWrap.appendChild(h);
        titleWrap.appendChild(pos);
        head.appendChild(titleWrap);
        if (a.risk_level) {
            const risk = document.createElement("span");
            risk.className = `risk-badge ${riskClass(a.risk_level)}`;
            risk.textContent = a.risk_level;
            head.appendChild(risk);
        }
        card.appendChild(head);

        const lines = [
            { label: "Hizalama", value: a.alignment_score },
            { label: "Klasik", value: a.classic_best },
            { label: "Quiz", value: a.quiz_best },
        ];
        lines.forEach(({ label, value }) => {
            const row = document.createElement("div");
            row.className = "bar-line";
            const lab = document.createElement("span");
            lab.className = "label";
            lab.textContent = label;
            const bar = document.createElement("div");
            bar.className = "bar";
            const fill = document.createElement("span");
            fill.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
            bar.appendChild(fill);
            const num = document.createElement("span");
            num.className = "num";
            num.textContent = value === null || value === undefined ? "—" : `${Math.round(value)}%`;
            row.appendChild(lab);
            row.appendChild(bar);
            row.appendChild(num);
            card.appendChild(row);
        });

        const actions = document.createElement("div");
        actions.className = "app-actions";
        actions.appendChild(makeLink("Hizalama", "alignment.html"));
        actions.appendChild(makeLink("Klasik sınav", "exam.html"));
        actions.appendChild(makeLink("Quiz", "quiz.html"));
        if (a.alignment_id) {
            actions.appendChild(makeLink("CV Doktoru", "feedback.html"));
        }
        card.appendChild(actions);

        appGrid.appendChild(card);
    });
}

function makeLink(text, href) {
    const a = document.createElement("a");
    a.textContent = text;
    a.href = href;
    return a;
}

function renderBarChart(applications) {
    const ctx = document.getElementById("chart-bar").getContext("2d");
    const labels = applications.map((a) => a.company_name || "—");
    const align = applications.map((a) => a.alignment_score || 0);
    const classic = applications.map((a) => a.classic_best || 0);
    const quiz = applications.map((a) => a.quiz_best || 0);
    if (chartBar) chartBar.destroy();
    chartBar = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Hizalama", data: align, backgroundColor: "#6366f1" },
                { label: "Klasik sınav", data: classic, backgroundColor: "#22c55e" },
                { label: "Quiz", data: quiz, backgroundColor: "#eab308" },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: "#a1a1aa" } },
            },
            scales: {
                x: { ticks: { color: "#a1a1aa" }, grid: { color: "#27272a" } },
                y: { min: 0, max: 100, ticks: { color: "#a1a1aa" }, grid: { color: "#27272a" } },
            },
        },
    });
}

function renderRadar(applications) {
    const target = applications
        .filter((a) => a.alignment_score !== null && a.alignment_score !== undefined)
        .sort((a, b) => (b.alignment_score || 0) - (a.alignment_score || 0))[0];
    const ctx = document.getElementById("chart-radar").getContext("2d");
    if (chartRadar) chartRadar.destroy();
    if (!target) {
        ctx.canvas.parentElement.innerHTML =
            '<p style="color:#71717a;text-align:center;">Radar için en az bir hizalama gerekli.</p>';
        return;
    }
    chartRadar = new Chart(ctx, {
        type: "radar",
        data: {
            labels: ["Hizalama", "Klasik sınav", "Quiz"],
            datasets: [
                {
                    label: `${target.company_name} — ${target.position}`,
                    data: [
                        target.alignment_score || 0,
                        target.classic_best || 0,
                        target.quiz_best || 0,
                    ],
                    backgroundColor: "rgba(99, 102, 241, 0.25)",
                    borderColor: "#6366f1",
                    pointBackgroundColor: "#6366f1",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: "#a1a1aa" } } },
            scales: {
                r: {
                    suggestedMin: 0,
                    suggestedMax: 100,
                    angleLines: { color: "#3f3f46" },
                    grid: { color: "#27272a" },
                    pointLabels: { color: "#a1a1aa" },
                    ticks: { color: "#71717a", backdropColor: "transparent" },
                },
            },
        },
    });
}

async function loadDashboard(token) {
    const res = await fetch(`${API_BASE}/api/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.detail || "Dashboard yüklenemedi.");
        dashLoading.style.display = "none";
        return;
    }
    const summary = await res.json();
    renderStats(summary);
    renderApps(summary.applications || []);
    if ((summary.applications || []).length) {
        renderBarChart(summary.applications);
        renderRadar(summary.applications);
    }
    dashLoading.style.display = "none";
    dashContent.style.display = "block";
}

initAuth();
onAuthChange(async (user) => {
    if (!user) {
        authHint.textContent = "Dashboard için giriş yapmalısın.";
        window.location.href = "login.html";
        return;
    }
    authHint.textContent = `Giriş: ${user.email}`;
    const token = await user.getIdToken();
    try {
        await loadDashboard(token);
    } catch (e) {
        showError(e.message || "Yükleme hatası");
        dashLoading.style.display = "none";
    }
});
