/* Settings page — menü geçişleri, profil güncelleme, şifre değiştirme, çıkış */

var _profileSnapshot = {};

/* ---------- toast ---------- */
function showToast(text, isError) {
    var el = document.getElementById("st-toast");
    if (!el) return;
    el.textContent = text;
    el.style.background = isError ? "#ba1a1a" : "#1b1b24";
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 2800);
}

/* ---------- CV listesi ---------- */
var _cvLoaded = false;

function formatDate(iso) {
    if (!iso) return "";
    try {
        var d = new Date(iso);
        return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) { return ""; }
}

async function loadCvList() {
    if (_cvLoaded) return;
    var wrap = document.getElementById("cv-list-wrap");
    if (!wrap) return;
    try {
        var tok = await getToken();
        var r = await fetch(API_BASE + "/api/cv/list?limit=20", {
            headers: { Authorization: "Bearer " + tok }
        });
        var data = await r.json();
        var items = (data && data.items) ? data.items : [];

        if (!items.length) {
            wrap.innerHTML =
                '<div class="flex flex-col items-center py-6 gap-3 text-center">' +
                '<span class="material-symbols-outlined text-[32px] text-slate-300">description</span>' +
                '<p class="text-sm text-slate-400">Henüz CV yüklenmemiş.</p>' +
                '</div>';
            _cvLoaded = true;
            return;
        }

        var html = '<div class="divide-y divide-slate-100">';
        items.forEach(function (cv) {
            var name = cv.cv_id ? cv.cv_id.slice(0, 8).toUpperCase() : "CV";
            var date = cv.uploaded_at ? formatDate(cv.uploaded_at) : "";
            var skills = cv.skill_count || 0;
            var exp = cv.experience_years != null ? cv.experience_years + " yıl deneyim" : "";
            var edu = cv.education_level || "";
            var meta = [exp, edu].filter(Boolean).join(" · ");
            html +=
                '<div class="flex items-center gap-3 py-3.5">' +
                '<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-primary-container">' +
                '<span class="material-symbols-outlined text-[20px]" style="font-variation-settings:\'FILL\' 1">description</span>' +
                '</div>' +
                '<div class="min-w-0 flex-1">' +
                '<p class="text-sm font-semibold text-slate-800 truncate">CV – ' + name + '</p>' +
                (meta ? '<p class="text-xs text-slate-400 mt-0.5 truncate">' + meta + '</p>' : '') +
                '<p class="text-xs text-slate-300 mt-0.5">' + (date ? date + ' · ' : '') + skills + ' yetenek</p>' +
                '</div>' +
                '<a href="cv-analysis.html" class="shrink-0 text-xs font-medium text-primary-container hover:text-primary transition-colors">Güncelle</a>' +
                '</div>';
        });
        html += '</div>';
        wrap.innerHTML = html;
        _cvLoaded = true;
    } catch (e) {
        var wrap2 = document.getElementById("cv-list-wrap");
        if (wrap2) wrap2.innerHTML = '<p class="py-4 text-sm text-red-400">CV listesi yüklenemedi.</p>';
    }
}

/* ---------- akordeon toggle ---------- */
document.querySelectorAll(".st-menu-item[data-panel]").forEach(function (btn) {
    btn.addEventListener("click", function () {
        var panelId = btn.dataset.panel;
        var panel = document.getElementById("panel-" + panelId);
        if (!panel) return;
        var isOpen = panel.classList.contains("open");

        /* hepsini kapat */
        document.querySelectorAll(".st-acc-panel").forEach(function (p) { p.classList.remove("open"); });
        document.querySelectorAll(".st-menu-item[data-panel]").forEach(function (b) { b.classList.remove("active"); });

        /* tıklanan kapalıysa aç */
        if (!isOpen) {
            panel.classList.add("open");
            btn.classList.add("active");
            /* CV paneli için lazy yükle */
            if (btn.dataset.lazy === "cv") loadCvList();
        }
    });
});

/* ---------- layout hazır ---------- */
function onLayoutReady(user) {
    var name  = user.displayName || "";
    var email = user.email || "";
    var initial = name ? name[0].toUpperCase() : (email ? email[0].toUpperCase() : "?");

    var avatarCircle = document.getElementById("avatar-circle");
    var avatarName   = document.getElementById("avatar-name");
    var avatarTitle  = document.getElementById("avatar-title");

    if (avatarCircle) avatarCircle.textContent = initial;
    if (avatarName)   avatarName.textContent   = name || email;

    /* display-name & email */
    var nameEl  = document.getElementById("display-name");
    var emailEl = document.getElementById("display-email");
    if (nameEl)  nameEl.value  = name;
    if (emailEl) emailEl.value = email;

    /* Firestore'dan ek profil alanlarını çek */
    try {
        var db = firebase.firestore();
        db.collection("user_profiles").doc(user.uid).get().then(function (doc) {
            var data = doc.exists ? doc.data() : {};
            var titleVal = data.title || "";
            var bioVal   = data.bio   || "";

            var titleEl = document.getElementById("display-title");
            var bioEl   = document.getElementById("display-bio");
            if (titleEl) titleEl.value = titleVal;
            if (bioEl)   bioEl.value   = bioVal;

            if (avatarTitle) avatarTitle.textContent = titleVal || "Ünvan ekleyin";

            /* snapshot — iptal için */
            _profileSnapshot = { name: name, title: titleVal, bio: bioVal };
        }).catch(function () {
            _profileSnapshot = { name: name, title: "", bio: "" };
        });
    } catch (e) {
        _profileSnapshot = { name: name, title: "", bio: "" };
    }
}

/* ---------- profil kaydet ---------- */
var btnSave = document.getElementById("btn-save-profile");
if (btnSave) {
    btnSave.addEventListener("click", async function () {
        var name  = (document.getElementById("display-name")  || {}).value || "";
        var title = (document.getElementById("display-title") || {}).value || "";
        var bio   = (document.getElementById("display-bio")   || {}).value || "";

        if (!name.trim()) { showToast("Ad Soyad boş olamaz.", true); return; }

        btnSave.disabled = true;
        try {
            var auth = firebase.auth();
            await auth.currentUser.updateProfile({ displayName: name.trim() });

            /* Ek alanları Firestore'a yaz */
            try {
                var db = firebase.firestore();
                await db.collection("user_profiles").doc(auth.currentUser.uid).set(
                    { title: title.trim(), bio: bio.trim() },
                    { merge: true }
                );
            } catch (dbErr) { /* Firestore yazma hatası sessizce geç */ }

            /* Avatar güncelle */
            var avatarCircle = document.getElementById("avatar-circle");
            var avatarName   = document.getElementById("avatar-name");
            var avatarTitle  = document.getElementById("avatar-title");
            if (avatarCircle) avatarCircle.textContent = name.trim()[0].toUpperCase();
            if (avatarName)   avatarName.textContent   = name.trim();
            if (avatarTitle)  avatarTitle.textContent  = title.trim() || "Ünvan ekleyin";

            _profileSnapshot = { name: name.trim(), title: title.trim(), bio: bio.trim() };
            showToast("Profil güncellendi.");
        } catch (e) {
            showToast("Güncelleme başarısız: " + (e.message || e), true);
        }
        btnSave.disabled = false;
    });
}

/* ---------- iptal ---------- */
var btnCancel = document.getElementById("btn-cancel-profile");
if (btnCancel) {
    btnCancel.addEventListener("click", function () {
        var nameEl  = document.getElementById("display-name");
        var titleEl = document.getElementById("display-title");
        var bioEl   = document.getElementById("display-bio");
        if (nameEl)  nameEl.value  = _profileSnapshot.name  || "";
        if (titleEl) titleEl.value = _profileSnapshot.title || "";
        if (bioEl)   bioEl.value   = _profileSnapshot.bio   || "";
    });
}

/* ---------- şifre göster/gizle ---------- */
var pwEye = document.getElementById("pw-eye");
if (pwEye) {
    pwEye.addEventListener("click", function () {
        var inp = document.getElementById("new-password");
        if (!inp) return;
        var isVisible = inp.type === "text";
        inp.type = isVisible ? "password" : "text";
        pwEye.textContent = isVisible ? "visibility_off" : "visibility";
    });
}

/* ---------- şifre değiştir ---------- */
var btnChangePw = document.getElementById("btn-change-pw");
if (btnChangePw) {
    btnChangePw.addEventListener("click", async function () {
        var pw    = (document.getElementById("new-password") || {}).value || "";
        var errEl = document.getElementById("pw-error");
        if (errEl) errEl.classList.add("hidden");

        if (pw.length < 6) {
            if (errEl) { errEl.textContent = "Şifre en az 6 karakter olmalı."; errEl.classList.remove("hidden"); }
            return;
        }
        btnChangePw.disabled = true;
        try {
            await firebase.auth().currentUser.updatePassword(pw);
            var inp = document.getElementById("new-password");
            if (inp) inp.value = "";
            showToast("Şifre başarıyla güncellendi.");
        } catch (e) {
            if (errEl) { errEl.textContent = e.message || "Şifre güncellenemedi."; errEl.classList.remove("hidden"); }
        }
        btnChangePw.disabled = false;
    });
}

/* ---------- çıkış ---------- */
var btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
    btnLogout.addEventListener("click", async function () {
        await logout();
        window.location.href = "login.html";
    });
}
