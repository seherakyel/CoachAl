var cvId = null;
var profileId = null;

var dropZone = document.getElementById("drop-zone");
var fileInput = document.getElementById("file-input");
var btnUpload = document.getElementById("btn-upload");
var btnAnalyze = document.getElementById("btn-analyze");
var btnAnalyzeText = document.getElementById("btn-analyze-text");
var uploadStatus = document.getElementById("upload-status");
var uploadingState = document.getElementById("uploading-state");
var skillsContainer = document.getElementById("skills-container");
var globalError = document.getElementById("global-error");
var step2 = document.getElementById("step2");

function showError(msg) {
    globalError.textContent = msg;
    globalError.classList.remove("hidden");
}
function clearError() { globalError.classList.add("hidden"); }

dropZone.addEventListener("click", function() { fileInput.click(); });
dropZone.addEventListener("keydown", function(e) { if (e.key === "Enter" || e.key === " ") fileInput.click(); });
dropZone.addEventListener("dragover", function(e) { e.preventDefault(); dropZone.classList.add("border-primary", "bg-surface-container"); });
dropZone.addEventListener("dragleave", function() { dropZone.classList.remove("border-primary", "bg-surface-container"); });
dropZone.addEventListener("drop", function(e) {
    e.preventDefault();
    dropZone.classList.remove("border-primary", "bg-surface-container");
    var f = e.dataTransfer.files[0];
    if (f) { fileInput.files = e.dataTransfer.files; handleFileSelected(f); }
});
fileInput.addEventListener("change", function() {
    if (fileInput.files[0]) handleFileSelected(fileInput.files[0]);
});

function handleFileSelected(file) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        showError("Sadece PDF dosyası kabul edilir."); return;
    }
    if (file.size > 10 * 1024 * 1024) { showError("Dosya 10MB'ı aşamaz."); return; }
    clearError();
    document.getElementById("upload-filename").textContent = file.name;
    btnUpload.disabled = false;
    uploadStatus.classList.add("hidden");
    skillsContainer.innerHTML = "";
}

btnUpload.addEventListener("click", async function() {
    if (!fileInput.files[0]) { showError("Lütfen bir dosya seçin."); return; }
    clearError();
    btnUpload.disabled = true;
    uploadingState.classList.remove("hidden");
    uploadStatus.classList.add("hidden");
    try {
        var tok = await getToken();
        var form = new FormData();
        form.append("file", fileInput.files[0]);
        var r = await fetch(API_BASE + "/api/cv/upload", { method: "POST", headers: { Authorization: "Bearer " + tok }, body: form });
        var d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail));
        cvId = d.cv_id;
        sessionStorage.setItem("coachai_cv_id", cvId);
        sessionStorage.setItem("coachai_cv_name", fileInput.files[0].name);
        var skills = d.parsed_data && d.parsed_data.skills ? d.parsed_data.skills : [];
        skillsContainer.innerHTML = skills.slice(0, 12).map(function(s) {
            return `<span class="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-label-sm text-sm border border-emerald-200">${s}</span>`;
        }).join("");
        uploadStatus.classList.remove("hidden");
        step2.classList.remove("opacity-50", "pointer-events-none");
        checkAnalyzeReady();
    } catch(err) { showError(err.message || "Yükleme başarısız"); }
    uploadingState.classList.add("hidden");
});

function checkAnalyzeReady() {
    var company = document.getElementById("company").value.trim();
    var position = document.getElementById("position").value.trim();
    btnAnalyze.disabled = !(cvId && company && position);
}

document.getElementById("company").addEventListener("input", checkAnalyzeReady);
document.getElementById("position").addEventListener("input", checkAnalyzeReady);

btnAnalyze.addEventListener("click", async function() {
    var company = document.getElementById("company").value.trim();
    var position = document.getElementById("position").value.trim();
    if (!cvId || !company || !position) return;
    clearError();
    btnAnalyze.disabled = true;
    btnAnalyzeText.textContent = "Analiz Ediliyor…";
    try {
        var tok = await getToken();
        var cr = await fetch(API_BASE + "/api/company/analyze", {
            method: "POST",
            headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
            body: JSON.stringify({ company_name: company, target_position: position })
        });
        var cd = await cr.json();
        if (!cr.ok) throw new Error(typeof cd.detail === "string" ? cd.detail : JSON.stringify(cd.detail));
        profileId = cd.profile_id;
        sessionStorage.setItem("coachai_profile_id", profileId);
        sessionStorage.setItem("coachai_company_name", company);
        sessionStorage.setItem("coachai_company_profile", JSON.stringify(cd));

        var ar = await fetch(API_BASE + "/api/alignment/score", {
            method: "POST",
            headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
            body: JSON.stringify({ cv_id: cvId, profile_id: profileId })
        });
        var ad = await ar.json();
        if (!ar.ok) throw new Error(typeof ad.detail === "string" ? ad.detail : JSON.stringify(ad.detail));
        sessionStorage.setItem("coachai_alignment", JSON.stringify(ad));
        window.location.href = "analysis-result.html";
    } catch(err) {
        showError(err.message || "Analiz başarısız");
        btnAnalyze.disabled = false;
        btnAnalyzeText.textContent = "Analizi Başlat";
    }
});

function onLayoutReady() {
    var savedCvId = sessionStorage.getItem("coachai_cv_id");
    if (savedCvId) {
        cvId = savedCvId;
        var name = sessionStorage.getItem("coachai_cv_name") || "Önceki CV";
        document.getElementById("upload-filename").textContent = name + " (önceki oturum)";
        uploadStatus.classList.remove("hidden");
        step2.classList.remove("opacity-50", "pointer-events-none");
    }
}
