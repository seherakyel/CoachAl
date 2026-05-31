/* Profil sayfası — menü geçişleri, profil güncelleme, şifre değiştirme, çıkış */

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

async function loadCvList(force) {
    if (_cvLoaded && !force) return;
    var wrap = document.getElementById("cv-list-wrap");
    if (!wrap) return;
    wrap.innerHTML =
        '<div class="flex items-center gap-2 py-4 text-sm text-slate-400">' +
        '<div class="w-4 h-4 border-2 border-slate-300 border-t-primary-container rounded-full animate-spin shrink-0"></div>' +
        "Yükleniyor…</div>";
    try {
        var res = await fetchUserCvList(20);
        var items = res.items;
        var countEl = document.getElementById("cv-list-count");
        if (countEl) {
            countEl.textContent =
                res.cv_count + " / " + res.max_cvs + " CV (en fazla " + res.max_cvs + ")";
        }
        wrap.innerHTML = renderCvListItems(items, {
            showDelete: true,
            actionLabel: "Analizde kullan",
            actionClass:
                "shrink-0 rounded-lg bg-primary-container px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary transition-colors",
        });
        wrap.querySelectorAll("[data-cv-select]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var id = btn.getAttribute("data-cv-select");
                if (!id) return;
                var href = "cv-analysis.html?cv_id=" + encodeURIComponent(id);
                if (typeof coachaiGo === "function") {
                    coachaiGo(href);
                } else {
                    window.location.href = href;
                }
            });
        });
        wrap.querySelectorAll("[data-cv-delete]").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                var id = btn.getAttribute("data-cv-delete");
                if (!id) return;
                var label = btn.closest("[data-cv-id]");
                var name =
                    label && label.querySelector("p")
                        ? label.querySelector("p").textContent
                        : "bu CV";
                if (!confirm(name + " silinsin mi? Bu işlem geri alınamaz.")) return;
                btn.disabled = true;
                try {
                    await deleteCvDocument(id);
                    clearSelectedCvIfDeleted(id);
                    showToast("CV silindi.");
                    _cvLoaded = false;
                    await loadCvList(true);
                } catch (err) {
                    showToast(err.message || "CV silinemedi.", true);
                    btn.disabled = false;
                }
            });
        });
        _cvLoaded = true;
    } catch (e) {
        wrap.innerHTML = '<p class="py-4 text-sm text-red-400">CV listesi yüklenemedi.</p>';
    }
}

function bindProfileAccordion() {
    document.querySelectorAll(".st-menu-item[data-panel]").forEach(function (btn) {
        if (btn.dataset.bound === "1") return;
        btn.dataset.bound = "1";
        btn.addEventListener("click", function () {
            var panelId = btn.dataset.panel;
            var panel = document.getElementById("panel-" + panelId);
            if (!panel) return;
            var isOpen = panel.classList.contains("open");

            document.querySelectorAll(".st-acc-panel").forEach(function (p) {
                p.classList.remove("open");
            });
            document.querySelectorAll(".st-menu-item[data-panel]").forEach(function (b) {
                b.classList.remove("active");
            });

            if (!isOpen) {
                panel.classList.add("open");
                btn.classList.add("active");
                if (btn.dataset.lazy === "cv") loadCvList(true);
            }
        });
    });
}

/* ---------- layout hazır ---------- */
function onLayoutReady(user) {
    _cvLoaded = false;
    bindProfileAccordion();

    var name = user.displayName || "";
    var email = user.email || "";
    var initial = name ? name[0].toUpperCase() : email ? email[0].toUpperCase() : "?";

    var avatarCircle = document.getElementById("avatar-circle");
    var avatarName = document.getElementById("avatar-name");
    var avatarTitle = document.getElementById("avatar-title");

    if (avatarCircle) avatarCircle.textContent = initial;
    if (avatarName) avatarName.textContent = name || email;

    var nameEl = document.getElementById("display-name");
    var emailEl = document.getElementById("display-email");
    if (nameEl) nameEl.value = name;
    if (emailEl) emailEl.value = email;

    var cvPanel = document.getElementById("panel-cvdosyalar");
    if (cvPanel && cvPanel.classList.contains("open")) {
        loadCvList(true);
    }

    try {
        var db = firebase.firestore();
        db.collection("user_profiles")
            .doc(user.uid)
            .get()
            .then(function (doc) {
                var data = doc.exists ? doc.data() : {};
                var titleVal = data.title || "";
                var bioVal = data.bio || "";

                var titleEl = document.getElementById("display-title");
                var bioEl = document.getElementById("display-bio");
                if (titleEl) titleEl.value = titleVal;
                if (bioEl) bioEl.value = bioVal;

                if (avatarTitle) avatarTitle.textContent = titleVal || "Ünvan ekleyin";

                _profileSnapshot = { name: name, title: titleVal, bio: bioVal };
            })
            .catch(function () {
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
        var name = (document.getElementById("display-name") || {}).value || "";
        var title = (document.getElementById("display-title") || {}).value || "";
        var bio = (document.getElementById("display-bio") || {}).value || "";

        if (!name.trim()) {
            showToast("Ad Soyad boş olamaz.", true);
            return;
        }

        btnSave.disabled = true;
        try {
            var auth = firebase.auth();
            await auth.currentUser.updateProfile({ displayName: name.trim() });

            try {
                var db = firebase.firestore();
                await db.collection("user_profiles").doc(auth.currentUser.uid).set(
                    { title: title.trim(), bio: bio.trim() },
                    { merge: true }
                );
            } catch (dbErr) {}

            var avatarCircle = document.getElementById("avatar-circle");
            var avatarName = document.getElementById("avatar-name");
            var avatarTitle = document.getElementById("avatar-title");
            if (avatarCircle) avatarCircle.textContent = name.trim()[0].toUpperCase();
            if (avatarName) avatarName.textContent = name.trim();
            if (avatarTitle) avatarTitle.textContent = title.trim() || "Ünvan ekleyin";

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
        var nameEl = document.getElementById("display-name");
        var titleEl = document.getElementById("display-title");
        var bioEl = document.getElementById("display-bio");
        if (nameEl) nameEl.value = _profileSnapshot.name || "";
        if (titleEl) titleEl.value = _profileSnapshot.title || "";
        if (bioEl) bioEl.value = _profileSnapshot.bio || "";
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
        var pw = (document.getElementById("new-password") || {}).value || "";
        var errEl = document.getElementById("pw-error");
        if (errEl) errEl.classList.add("hidden");

        if (pw.length < 6) {
            if (errEl) {
                errEl.textContent = "Şifre en az 6 karakter olmalı.";
                errEl.classList.remove("hidden");
            }
            return;
        }
        btnChangePw.disabled = true;
        try {
            await firebase.auth().currentUser.updatePassword(pw);
            var inp = document.getElementById("new-password");
            if (inp) inp.value = "";
            showToast("Şifre başarıyla güncellendi.");
        } catch (e) {
            if (errEl) {
                errEl.textContent = e.message || "Şifre güncellenemedi.";
                errEl.classList.remove("hidden");
            }
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
