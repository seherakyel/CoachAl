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

/* ---------- menü geçişi ---------- */
document.querySelectorAll(".st-menu-item[data-panel]").forEach(function (btn) {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".st-menu-item[data-panel]").forEach(function (b) {
            b.classList.remove("active");
        });
        document.querySelectorAll(".settings-panel").forEach(function (p) {
            p.classList.remove("active");
        });
        btn.classList.add("active");
        var panel = document.getElementById("panel-" + btn.dataset.panel);
        if (panel) panel.classList.add("active");
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
