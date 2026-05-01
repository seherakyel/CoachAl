var currentAlignmentId = null;
var currentSessionId = null;

async function onLayoutReady(user) {
    await loadAlignments();
}

async function loadAlignments() {
    var tok;
    try { tok = await getToken(); } catch(e) { return; }
    try {
        var r = await fetch(API_BASE + "/api/alignment/list?limit=20", { headers: { Authorization: "Bearer " + tok } });
        var d = await r.json();
        var items = d.items || d.alignments || [];
        var sel = document.getElementById("alignment-select");
        sel.innerHTML = `<option value="">Eşleşme seçin…</option>` +
            items.map(function(a) {
                var label = (a.company_name || a.profile_id || a.id) + (a.position ? " — " + a.position : "");
                return `<option value="${a.id || a.alignment_id}">${label}</option>`;
            }).join("");
        sel.addEventListener("change", function() {
            currentAlignmentId = sel.value;
            if (currentAlignmentId) loadSessions();
        });
    } catch(e) {
        document.getElementById("alignment-select").innerHTML = "<option value=''>Yüklenemedi</option>";
    }
}

async function loadSessions() {
    var tok;
    try { tok = await getToken(); } catch(e) { return; }
    try {
        var r = await fetch(API_BASE + "/api/interview/list?limit=20", { headers: { Authorization: "Bearer " + tok } });
        var d = await r.json();
        var items = d.items || d.sessions || [];
        var sel = document.getElementById("session-select");
        sel.innerHTML = `<option value="">Yok (sadece CV analizi)</option>` +
            items.map(function(s) {
                var label = (s.type || "Sınav") + " — " + (s.created_at ? s.created_at.substring(0, 10) : s.id);
                return `<option value="${s.id || s.session_id}">${label}</option>`;
            }).join("");
        sel.addEventListener("change", function() { currentSessionId = sel.value || null; });
    } catch(e) {}
}

document.getElementById("btn-generate").addEventListener("click", async function() {
    if (!currentAlignmentId) {
        showSelectorError("Lütfen bir eşleşme seçin.");
        return;
    }
    clearSelectorError();
    document.getElementById("selector-panel").classList.add("hidden");
    document.getElementById("generating-state").classList.remove("hidden");
    try {
        var tok = await getToken();
        var body = { alignment_id: currentAlignmentId };
        if (currentSessionId) body.session_id = currentSessionId;
        var r = await fetch(API_BASE + "/api/feedback/generate", {
            method: "POST",
            headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        var d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail));
        renderReport(d);
    } catch(err) {
        document.getElementById("selector-panel").classList.remove("hidden");
        showSelectorError(err.message || "Rapor oluşturulamadı");
    }
    document.getElementById("generating-state").classList.add("hidden");
});

function renderReport(d) {
    document.getElementById("report-panel").classList.remove("hidden");

    var criticals = d.critical_warnings || d.elimination_risks || [];
    if (criticals.length > 0) {
        document.getElementById("critical-warning").classList.remove("hidden");
        document.getElementById("critical-list").innerHTML = criticals.map(function(c) {
            return `<li class="flex items-start gap-2"><span class="material-symbols-outlined text-error text-sm mt-1">dangerous</span><span class="font-body-md text-on-error-container">${c}</span></li>`;
        }).join("");
    }

    var strengths = d.strengths || [];
    document.getElementById("strengths-list").innerHTML = strengths.map(function(s) {
        var title = typeof s === "string" ? s : s.title || s;
        var detail = typeof s === "object" ? s.detail || "" : "";
        return `<li class="flex gap-3 items-start"><span class="material-symbols-outlined text-primary mt-0.5">check_circle</span><div><h4 class="font-label-sm text-label-sm text-on-surface mb-1">${title}</h4>${detail ? `<p class="font-body-md text-sm text-on-surface-variant">${detail}</p>` : ""}</div></li>`;
    }).join("") || "<li class='text-on-surface-variant text-sm'>Güçlü yön bulunamadı</li>";

    var weaknesses = d.weaknesses || d.areas_for_improvement || [];
    document.getElementById("weaknesses-list").innerHTML = weaknesses.map(function(w) {
        var title = typeof w === "string" ? w : w.title || w;
        var detail = typeof w === "object" ? w.detail || "" : "";
        return `<li class="flex gap-3 items-start"><span class="material-symbols-outlined text-tertiary mt-0.5">error</span><div><h4 class="font-label-sm text-label-sm text-on-surface mb-1">${title}</h4>${detail ? `<p class="font-body-md text-sm text-on-surface-variant">${detail}</p>` : ""}</div></li>`;
    }).join("") || "<li class='text-on-surface-variant text-sm'>Gelişim alanı bulunamadı</li>";

    var plan = d.action_plan || d.study_plan || [];
    document.getElementById("action-plan").innerHTML = plan.map(function(p, i) {
        var label = typeof p === "string" ? p : p.week || ("Hafta " + (i + 1));
        var title = typeof p === "object" ? p.title || p.goal || "" : p;
        var detail = typeof p === "object" ? p.description || p.detail || "" : "";
        var isFirst = i === 0;
        return `<div class="relative"><div class="absolute -left-[35px] top-1 h-6 w-6 rounded-full ${isFirst ? 'bg-primary' : 'bg-surface-variant'} border-4 border-surface-container-lowest"></div>
<div class="mb-1"><span class="font-label-sm text-label-sm ${isFirst ? 'text-primary bg-primary-fixed' : 'text-on-surface-variant bg-surface-variant'} px-2 py-0.5 rounded">${label}</span></div>
<h4 class="font-body-lg text-body-lg font-medium text-on-surface mb-1">${title}</h4>${detail ? `<p class="font-body-md text-on-surface-variant">${detail}</p>` : ""}</div>`;
    }).join("") || "<p class='text-on-surface-variant text-sm'>Plan bulunamadı</p>";

    var resources = d.resources || d.recommended_resources || [];
    document.getElementById("resources-list").innerHTML = resources.map(function(res) {
        var title = typeof res === "string" ? res : res.title || res;
        var url = typeof res === "object" ? res.url || "#" : "#";
        var desc = typeof res === "object" ? res.description || "" : "";
        var icon = typeof res === "object" ? (res.type === "video" ? "smart_display" : res.type === "article" ? "article" : "menu_book") : "menu_book";
        return `<a href="${url}" target="_blank" rel="noopener" class="block bg-surface-container-lowest p-4 rounded-xl border border-outline-variant hover:border-primary/50 hover:shadow-sm transition-all group">
<div class="flex items-start justify-between"><div class="flex items-center gap-3 mb-2"><div class="bg-surface-container-low p-2 rounded"><span class="material-symbols-outlined text-on-surface-variant">${icon}</span></div><h4 class="font-label-sm text-label-sm text-on-surface group-hover:text-primary transition-colors">${title}</h4></div><span class="material-symbols-outlined text-outline text-sm">open_in_new</span></div>${desc ? `<p class="font-body-md text-sm text-on-surface-variant line-clamp-2">${desc}</p>` : ""}</a>`;
    }).join("") || "<p class='text-on-surface-variant text-sm'>Kaynak bulunamadı</p>";
}

function showSelectorError(msg) {
    var el = document.getElementById("selector-error");
    el.textContent = msg; el.classList.remove("hidden");
}
function clearSelectorError() {
    document.getElementById("selector-error").classList.add("hidden");
}
