const API_BASE = "http://localhost:8000";

document.addEventListener("DOMContentLoaded", async () => {
    const statusEl = document.getElementById("status");
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        statusEl.textContent = data.message || data.status;
    } catch (err) {
        statusEl.textContent = "Backend bağlantısı kurulamadı.";
    }
});
