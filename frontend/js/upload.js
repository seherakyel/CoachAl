const API_BASE = "http://localhost:8000";

const authHint = document.getElementById("auth-hint");
const uploadPanel = document.getElementById("upload-panel");
const uploadError = document.getElementById("upload-error");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const fileNameEl = document.getElementById("file-name");
const btnUpload = document.getElementById("btn-upload");
const uploadResult = document.getElementById("upload-result");
const resultMeta = document.getElementById("result-meta");
const resultSkills = document.getElementById("result-skills");
const resultPreview = document.getElementById("result-preview");

let selectedFile = null;

function showUploadError(msg) {
    uploadError.textContent = msg;
    uploadError.style.display = "block";
}

function clearUploadError() {
    uploadError.textContent = "";
    uploadError.style.display = "none";
}

function setFile(file) {
    if (!file || file.type !== "application/pdf") {
        showUploadError("Lütfen PDF seç.");
        return;
    }
    selectedFile = file;
    fileNameEl.textContent = file.name;
    btnUpload.disabled = false;
    clearUploadError();
}

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
    }
});

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
});

fileInput.addEventListener("change", () => {
    const f = fileInput.files[0];
    if (f) setFile(f);
});

btnUpload.addEventListener("click", async () => {
    if (!selectedFile) return;
    clearUploadError();
    uploadResult.classList.remove("visible");
    btnUpload.disabled = true;
    const token = await getToken();
    if (!token) {
        showUploadError("Oturum yok. Giriş yap.");
        btnUpload.disabled = false;
        return;
    }
    const form = new FormData();
    form.append("file", selectedFile);
    try {
        const res = await fetch(`${API_BASE}/api/cv/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            let errMsg = res.statusText || "Yükleme başarısız";
            if (data.detail) {
                errMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
            }
            showUploadError(errMsg);
            btnUpload.disabled = false;
            return;
        }
        resultMeta.textContent = `cv_id: ${data.cv_id} · Deneyim (yıl): ${data.experience_years ?? "—"} · Eğitim: ${data.education_level ?? "—"}`;
        resultSkills.innerHTML = "";
        (data.skills || []).forEach((s) => {
            const li = document.createElement("li");
            li.textContent = s;
            resultSkills.appendChild(li);
        });
        resultPreview.textContent = data.extracted_text_preview || "";
        uploadResult.classList.add("visible");
    } catch (err) {
        showUploadError(err.message || "Ağ hatası");
    }
    btnUpload.disabled = !selectedFile;
});

initAuth();
onAuthChange((user) => {
    if (!user) {
        authHint.textContent = "CV yüklemek için giriş yapmalısın.";
        uploadPanel.style.display = "none";
        window.location.href = "login.html";
        return;
    }
    authHint.textContent = `Giriş: ${user.email}`;
    uploadPanel.style.display = "block";
});
