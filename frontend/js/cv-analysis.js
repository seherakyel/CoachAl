var cvId = null;

var dropZone, fileInput, btnAnalyze, btnAnalyzeText, uploadStatus, uploadingState;
var skillsContainer, globalError, step2, step2Lock, step2Badge;
var companyInput, companyResultsEl, companySearchWrap;

function refreshCvAnalysisElements() {
    dropZone = document.getElementById("drop-zone");
    fileInput = document.getElementById("file-input");
    btnAnalyze = document.getElementById("btn-analyze");
    btnAnalyzeText = document.getElementById("btn-analyze-text");
    uploadStatus = document.getElementById("upload-status");
    uploadingState = document.getElementById("uploading-state");
    skillsContainer = document.getElementById("skills-container");
    globalError = document.getElementById("global-error");
    step2 = document.getElementById("step2");
    step2Lock = document.getElementById("step2-lock");
    step2Badge = document.getElementById("step2-badge");
    companyInput = document.getElementById("company");
    companyResultsEl = document.getElementById("company-results");
    companySearchWrap = document.getElementById("company-search-wrap");
}
var companySearchDebounceTimer = null;
var companySearchSeq = 0;

function hideCompanyResults() {
    if (!companyResultsEl) return;
    companyResultsEl.classList.add("hidden");
    companyResultsEl.innerHTML = "";
}

function showCompanyResultsLoading() {
    if (!companyResultsEl) return;
    companyResultsEl.classList.remove("hidden");
    companyResultsEl.innerHTML =
        '<div class="px-4 py-3 text-sm text-on-surface-variant text-center">Aranıyor…</div>';
}

function pickCompanyLogoUrl(item) {
    if (!item) return "";
    var url = item.logo_url || item.logo || item.image_url || "";
    url = String(url).trim();
    if (url.indexOf("//") === 0) url = "https:" + url;
    return url;
}

function fillCompanyLogoSlot(logoEl, item) {
    var url = pickCompanyLogoUrl(item);
    var name = item && item.name ? String(item.name) : "";
    var initial = name[0] ? name[0].toUpperCase() : "?";

    logoEl.innerHTML = "";
    logoEl.className =
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-highest text-xs font-bold text-on-surface-variant";

    if (!url) {
        logoEl.textContent = initial;
        return;
    }

    var img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.className = "h-full w-full object-contain bg-white p-0.5";
    img.referrerPolicy = "no-referrer";
    img.loading = "lazy";
    img.onerror = function () {
        img.remove();
        logoEl.textContent = initial;
    };
    logoEl.appendChild(img);
}

function renderCompanyResults(items) {
    if (!companyResultsEl) return;
    companyResultsEl.innerHTML = "";
    if (!items.length) {
        companyResultsEl.classList.remove("hidden");
        companyResultsEl.innerHTML =
            '<div class="px-4 py-3 text-sm text-on-surface-variant text-center">Sonuç bulunamadı.</div>';
        return;
    }
    var frag = document.createDocumentFragment();
    items.forEach(function(item) {
        var row = document.createElement("button");
        row.type = "button";
        row.className =
            "flex w-full cursor-pointer items-center gap-3 border-b border-outline-variant/60 px-4 py-3 text-left last:border-b-0 hover:bg-surface-container focus:bg-surface-container focus:outline-none";
        row.setAttribute("role", "option");

        var logo = document.createElement("div");
        fillCompanyLogoSlot(logo, item);

        var textWrap = document.createElement("div");
        textWrap.className = "min-w-0 flex-1";
        var name = document.createElement("div");
        name.className = "truncate font-medium text-on-surface";
        name.textContent = item.name || "";
        var sub = document.createElement("div");
        sub.className = "mt-0.5 truncate text-xs text-on-surface-variant";
        sub.textContent = item.subtext || "";
        textWrap.appendChild(name);
        textWrap.appendChild(sub);

        row.appendChild(logo);
        row.appendChild(textWrap);
        row.addEventListener("click", function() {
            if (companyInput) companyInput.value = item.name || "";
            sessionStorage.setItem("coachai_company_logo_url", pickCompanyLogoUrl(item));
            sessionStorage.setItem("coachai_company_universal_name", item.universal_name || "");
            hideCompanyResults();
            checkAnalyzeReady();
        });
        frag.appendChild(row);
    });
    companyResultsEl.classList.remove("hidden");
    companyResultsEl.appendChild(frag);
}

async function runCompanySearch(query) {
    if (!companyResultsEl) return;
    var trimmed = query.trim();
    if (trimmed.length < 2) {
        hideCompanyResults();
        return;
    }

    var seq = ++companySearchSeq;
    showCompanyResultsLoading();

    try {
        var tok = await getToken();
        var r = await fetch(
            API_BASE + "/api/company/search?q=" + encodeURIComponent(trimmed),
            { headers: { Authorization: "Bearer " + tok } }
        );
        if (seq !== companySearchSeq) return;
        var data = await r.json();
        if (!r.ok) {
            renderCompanyResults([]);
            return;
        }
        renderCompanyResults(Array.isArray(data) ? data : []);
    } catch (e) {
        if (seq !== companySearchSeq) return;
        renderCompanyResults([]);
    }
}

function showError(msg) {
    if (typeof coachaiToast === "function") {
        coachaiToast(msg, { variant: "error", duration: 4500 });
    }
    if (globalError) {
        globalError.textContent = msg;
        globalError.classList.remove("hidden");
        globalError.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}
function clearError() {
    if (globalError) globalError.classList.add("hidden");
}

function unlockStep2() {
    if (step2Lock) step2Lock.classList.add("hidden");
    if (step2Badge) {
        step2Badge.className =
            "w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-sm font-bold";
    }
    if (step2) step2.classList.remove("pointer-events-none");
    checkAnalyzeReady();
}

function applyCvSelection(cvIdValue, fileName, parsedData) {
    cvId = cvIdValue;
    persistSelectedCv(cvIdValue, fileName, parsedData);
    refreshCvAnalysisElements();
    var nameEl = document.getElementById("upload-filename");
    if (nameEl) nameEl.textContent = (fileName || "CV") + " — kayıtlı";
    renderCvParsed(parsedData || {});
    if (uploadStatus) uploadStatus.classList.remove("hidden");
    unlockStep2();
    clearError();
}

async function selectSavedCvById(cvIdValue) {
    if (!cvIdValue) return;
    var listEl = document.getElementById("saved-cv-list");
    if (listEl) {
        listEl.classList.add("opacity-60", "pointer-events-none");
    }
    try {
        var detail = await fetchCvDetail(cvIdValue);
        applyCvSelection(
            detail.cv_id,
            detail.file_name || cvDisplayLabel(detail),
            detail.parsed_data || {}
        );
        await loadSavedCvList();
    } catch (err) {
        showError(err.message || "CV seçilemedi.");
    } finally {
        if (listEl) listEl.classList.remove("opacity-60", "pointer-events-none");
    }
}

async function loadSavedCvList() {
    var wrap = document.getElementById("saved-cv-list");
    if (!wrap) return;
    wrap.innerHTML =
        '<div class="flex items-center gap-2 py-4 text-sm text-on-surface-variant">' +
        '<div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"></div>' +
        "CV'ler yükleniyor…</div>";
    try {
        var res = await fetchUserCvList(20);
        var items = res.items;
        var hintEl = document.getElementById("saved-cv-limit-hint");
        if (hintEl) {
            hintEl.textContent =
                res.cv_count >= res.max_cvs
                    ? "CV limitine ulaştınız. Yeni yüklemek için Profil sayfasından bir CV silin."
                    : "Listeden bir CV seçerek yeni bir hedef analizi başlatabilir veya aşağıdan yeni PDF yükleyebilirsiniz.";
        }
        wrap.innerHTML = renderCvListItems(items, {
            selectedId: cvId,
            actionLabel: "Bu CV'yi kullan",
        });
        wrap.querySelectorAll("[data-cv-select]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var id = btn.getAttribute("data-cv-select");
                if (id && id !== cvId) selectSavedCvById(id);
            });
        });
    } catch (e) {
        wrap.innerHTML =
            '<p class="py-4 text-sm text-error">CV listesi yüklenemedi. Lütfen yenileyin.</p>';
    }
}

function bindCvAnalysisPage() {
    refreshCvAnalysisElements();
    var signal = window.coachaiPageSignal;
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener("click", function() { fileInput.click(); }, { signal: signal });
    dropZone.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.key === " ") fileInput.click();
    }, { signal: signal });
    dropZone.addEventListener("dragover", function(e) {
        e.preventDefault();
        dropZone.classList.add("border-primary", "bg-surface-container");
    }, { signal: signal });
    dropZone.addEventListener("dragleave", function() {
        dropZone.classList.remove("border-primary", "bg-surface-container");
    }, { signal: signal });
    dropZone.addEventListener("drop", function(e) {
        e.preventDefault();
        dropZone.classList.remove("border-primary", "bg-surface-container");
        var f = e.dataTransfer.files[0];
        if (f) startUpload(f);
    }, { signal: signal });
    fileInput.addEventListener("change", function() {
        if (fileInput.files[0]) startUpload(fileInput.files[0]);
    }, { signal: signal });

    var btnReupload = document.getElementById("btn-reupload");
    if (btnReupload) {
        btnReupload.addEventListener("click", function(e) {
        e.stopPropagation();
        cvId = null;
        sessionStorage.removeItem("coachai_cv_id");
        sessionStorage.removeItem("coachai_cv_name");
        sessionStorage.removeItem("coachai_cv_parsed");
        sessionStorage.removeItem("coachai_company_logo_url");
        sessionStorage.removeItem("coachai_company_universal_name");
        uploadStatus.classList.add("hidden");
        var note = document.getElementById("cv-ai-note");
        if (note) note.classList.add("hidden");
        if (document.getElementById("cv-summary-text")) document.getElementById("cv-summary-text").textContent = "";
        if (document.getElementById("cv-analysis-text")) document.getElementById("cv-analysis-text").textContent = "";
        if (skillsContainer) skillsContainer.innerHTML = "";
        step2Lock.classList.remove("hidden");
        step2Badge.className = "w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-label-sm font-bold";
        btnAnalyze.disabled = true;
        fileInput.value = "";
        clearError();
        void loadSavedCvList();
        }, { signal: signal });
    }

    var btnRefreshCv = document.getElementById("btn-refresh-cv-list");
    if (btnRefreshCv) {
        btnRefreshCv.addEventListener("click", function () {
            loadSavedCvList();
        }, { signal: signal });
    }

    if (companyInput) {
        companyInput.addEventListener("input", function() {
            checkAnalyzeReady();
            var v = companyInput.value;
            clearTimeout(companySearchDebounceTimer);
            companySearchDebounceTimer = setTimeout(function() {
                runCompanySearch(v);
            }, 400);
        }, { signal: signal });
    }
    var positionEl = document.getElementById("position");
    if (positionEl) {
        positionEl.addEventListener("input", checkAnalyzeReady, { signal: signal });
    }
    document.addEventListener("click", function(e) {
        if (companySearchWrap && !e.target.closest("#company-search-wrap")) {
            hideCompanyResults();
        }
    }, { signal: signal });
    if (btnAnalyze) {
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
                    body: JSON.stringify({ company_name: company, position: position })
                });
                var cd = await cr.json();
                if (!cr.ok) throw new Error(cd.detail || "Şirket analizi başarısız");
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
                if (!ar.ok) throw new Error(ad.detail || "Eşleşme analizi başarısız");
                sessionStorage.setItem("coachai_alignment", JSON.stringify(ad));
                sessionStorage.setItem("coachai_alignment_id", ad.result_id || "");
                if (typeof prependAlignmentListCache === "function") {
                    var listEntry = alignmentEntryFromScoreResponse(ad, cvId, profileId);
                    if (listEntry) prependAlignmentListCache(listEntry);
                }
                coachaiGo("analysis-result.html");
            } catch(err) {
                showError("Analiz başarısız: " + (err.message || "Sunucuya bağlanılamadı."));
                btnAnalyze.disabled = false;
                btnAnalyzeText.textContent = "Analizi Başlat";
            }
        }, { signal: signal });
    }
}

function renderCvParsed(pd) {
    var skills = Array.isArray(pd.skills) ? pd.skills : [];
    var summary = (pd.summary || "").trim();
    var logic = (pd.match_score_logic || "").trim();
    if (!skillsContainer) return;
    if (skills.length > 0) {
        skillsContainer.innerHTML = skills.slice(0, 20).map(function(s) {
            return '<li class="flex gap-2 items-start"><span class="text-emerald-600 mt-0.5 shrink-0">•</span><span>' +
                String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</span></li>";
        }).join("");
    } else {
        skillsContainer.innerHTML = "<li class=\"text-on-surface-variant\">Yetenek tespit edilemedi</li>";
    }
    var note = document.getElementById("cv-ai-note");
    var sumEl = document.getElementById("cv-summary-text");
    var anaEl = document.getElementById("cv-analysis-text");
    if (note && sumEl && anaEl) {
        if (summary || logic) {
            note.classList.remove("hidden");
            sumEl.textContent = summary || "—";
            anaEl.textContent = logic || "—";
        } else {
            note.classList.add("hidden");
            sumEl.textContent = "";
            anaEl.textContent = "";
        }
    }
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
        if (!r.ok) {
            var uploadMsg = typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail);
            throw new Error(uploadMsg);
        }

        var pd = d.parsed_data || {};
        applyCvSelection(d.cv_id, file.name, pd);
        document.getElementById("upload-filename").textContent = file.name + " — yüklendi";
        await loadSavedCvList();
    } catch(err) {
        showError("Yükleme başarısız: " + (err.message || "Sunucuya bağlanılamadı."));
    }

    uploadingState.classList.add("hidden");
    uploadingState.classList.remove("flex");
    dropZone.classList.remove("pointer-events-none", "opacity-60");
}

function checkAnalyzeReady() {
    if (!btnAnalyze) return;
    var companyEl = document.getElementById("company");
    var positionEl = document.getElementById("position");
    var company = companyEl ? companyEl.value.trim() : "";
    var position = positionEl ? positionEl.value.trim() : "";
    btnAnalyze.disabled = !(cvId && company && position);
}

async function onLayoutReady() {
    refreshCvAnalysisElements();
    bindCvAnalysisPage();
    await loadSavedCvList();

    var params = new URLSearchParams(window.location.search);
    var queryCvId = params.get("cv_id");
    if (queryCvId) {
        await selectSavedCvById(queryCvId);
        return;
    }

    var savedCvId = sessionStorage.getItem("coachai_cv_id");
    if (!savedCvId) return;

    try {
        var detail = await fetchCvDetail(savedCvId);
        applyCvSelection(detail.cv_id, detail.file_name, detail.parsed_data || {});
        document.getElementById("upload-filename").textContent =
            (detail.file_name || "CV") + " — önceki oturumdan";
    } catch (e) {
        cvId = savedCvId;
        var name = sessionStorage.getItem("coachai_cv_name") || "Önceki CV";
        var nameEl = document.getElementById("upload-filename");
        if (nameEl) nameEl.textContent = name + " — önceki oturumdan";
        try {
            var raw = sessionStorage.getItem("coachai_cv_parsed");
            if (raw) {
                renderCvParsed(JSON.parse(raw));
            } else if (skillsContainer) {
                skillsContainer.innerHTML =
                    '<li class="text-on-surface-variant">Yetenek ayrıntıları için listeden CV\'yi yeniden seçin.</li>';
            }
        } catch (err) {
            if (skillsContainer) {
                skillsContainer.innerHTML =
                    '<li class="text-on-surface-variant">Yetenekler yüklenemedi; listeden CV seçin.</li>';
            }
        }
        if (uploadStatus) uploadStatus.classList.remove("hidden");
        unlockStep2();
    }
}

