var cvId = null;

var dropZone = document.getElementById("drop-zone");
var fileInput = document.getElementById("file-input");
var btnAnalyze = document.getElementById("btn-analyze");
var btnAnalyzeText = document.getElementById("btn-analyze-text");
var uploadStatus = document.getElementById("upload-status");
var uploadingState = document.getElementById("uploading-state");
var skillsContainer = document.getElementById("skills-container");
var globalError = document.getElementById("global-error");
var step2 = document.getElementById("step2");
var step2Lock = document.getElementById("step2-lock");
var step2Badge = document.getElementById("step2-badge");

function showError(msg) {
    globalError.textContent = msg;
    globalError.classList.remove("hidden");
    globalError.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function clearError() { globalError.classList.add("hidden"); }

function unlockStep2() {
    step2Lock.classList.add("hidden");
    step2Badge.className = "w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-sm font-bold";
    step2.classList.remove("pointer-events-none");
    checkAnalyzeReady();
}

dropZone.addEventListener("click", function() { fileInput.click(); });
dropZone.addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
});
dropZone.addEventListener("dragover", function(e) {
    e.preventDefault();
    dropZone.classList.add("border-primary", "bg-surface-container");
});
dropZone.addEventListener("dragleave", function() {
    dropZone.classList.remove("border-primary", "bg-surface-container");
});
dropZone.addEventListener("drop", function(e) {
    e.preventDefault();
    dropZone.classList.remove("border-primary", "bg-surface-container");
    var f = e.dataTransfer.files[0];
    if (f) startUpload(f);
});
fileInput.addEventListener("change", function() {
    if (fileInput.files[0]) startUpload(fileInput.files[0]);
});

var btnReupload = document.getElementById("btn-reupload");
if (btnReupload) {
    btnReupload.addEventListener("click", function(e) {
        e.stopPropagation();
        cvId = null;
        sessionStorage.removeItem("coachai_cv_id");
        sessionStorage.removeItem("coachai_cv_name");
        uploadStatus.classList.add("hidden");
        step2Lock.classList.remove("hidden");
        step2Badge.className = "w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-label-sm font-bold";
        btnAnalyze.disabled = true;
        fileInput.value = "";
        clearError();
    });
}

async function startUpload(file) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        showError("Sadece PDF dosyası kabul edilir."); return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showError("Dosya boyutu 10MB'ı aşamaz."); return;
    }
    clearError();
    dropZone.classList.add("pointer-events-none", "opacity-60");
    uploadingState.classList.remove("hidden");
    uploadingState.classList.add("flex");
    uploadStatus.classList.add("hidden");

    try {
        var tok = await getToken();
        var form = new FormData();
        form.append("file", file);
        var r = await fetch(API_BASE + "/api/cv/upload", {
            method: "POST",
            headers: { Authorization: "Bearer " + tok },
            body: form
        });
        var d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail));

        cvId = d.cv_id;
        sessionStorage.setItem("coachai_cv_id", cvId);
        sessionStorage.setItem("coachai_cv_name", file.name);

        var skills = (d.parsed_data && d.parsed_data.skills) ? d.parsed_data.skills : [];
        document.getElementById("upload-filename").textContent = file.name + " — yüklendi";
        skillsContainer.innerHTML = skills.slice(0, 14).map(function(s) {
            return `<span class="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">${s}</span>`;
        }).join("") || "<span class='text-sm text-on-surface-variant'>Yetenek tespit edilemedi</span>";

        uploadStatus.classList.remove("hidden");
        unlockStep2();
    } catch(err) {
        showError("Yükleme başarısız: " + (err.message || "Sunucuya bağlanılamadı."));
    }

    uploadingState.classList.add("hidden");
    uploadingState.classList.remove("flex");
    dropZone.classList.remove("pointer-events-none", "opacity-60");
}

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
    btnAnalyzeText.textContent = "Analiz ediliyor…";

    try {
        var tok = await getToken();
        var cr = await fetch(API_BASE + "/api/company/analyze", {
            method: "POST",
            headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
            body: JSON.stringify({ company_name: company, target_position: position })
        });
        var cd = await cr.json();
        if (!cr.ok) throw new Error(typeof cd.detail === "string" ? cd.detail : JSON.stringify(cd.detail));

        var profileId = cd.profile_id;
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
        showError("Analiz başarısız: " + (err.message || "Sunucuya bağlanılamadı."));
        btnAnalyze.disabled = false;
        btnAnalyzeText.textContent = "Analizi Başlat";
    }
});

function onLayoutReady() {
    var savedCvId = sessionStorage.getItem("coachai_cv_id");
    if (savedCvId) {
        cvId = savedCvId;
        var name = sessionStorage.getItem("coachai_cv_name") || "Önceki CV";
        document.getElementById("upload-filename").textContent = name + " — önceki oturumdan";
        skillsContainer.innerHTML = "<span class='text-sm text-on-surface-variant'>Yetenekler önceden kaydedildi</span>";
        uploadStatus.classList.remove("hidden");
        unlockStep2();
    }
}
