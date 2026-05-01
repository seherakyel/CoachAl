function showMsg(text) {
    var el = document.getElementById("settings-msg");
    document.getElementById("settings-msg-text").textContent = text;
    el.classList.remove("hidden");
    setTimeout(function() { el.classList.add("hidden"); }, 3000);
}

function onLayoutReady(user) {
    document.getElementById("display-email").textContent = user.email || "—";
    var initial = user.email ? user.email[0].toUpperCase() : "U";
    document.getElementById("avatar-initial").textContent = initial;
    if (user.displayName) {
        document.getElementById("display-name").value = user.displayName;
    }
}

document.getElementById("btn-save-profile").addEventListener("click", async function() {
    var name = document.getElementById("display-name").value.trim();
    if (!name) return;
    var btn = this;
    btn.disabled = true;
    try {
        var a = firebase.auth();
        await a.currentUser.updateProfile({ displayName: name });
        showMsg("Profil güncellendi.");
    } catch(e) {
        showMsg("Güncelleme başarısız: " + (e.message || e));
    }
    btn.disabled = false;
});

document.getElementById("btn-change-pw").addEventListener("click", async function() {
    var pw = document.getElementById("new-password").value;
    var errEl = document.getElementById("pw-error");
    errEl.classList.add("hidden");
    if (pw.length < 6) {
        errEl.textContent = "Şifre en az 6 karakter olmalı.";
        errEl.classList.remove("hidden");
        return;
    }
    var btn = this;
    btn.disabled = true;
    try {
        await firebase.auth().currentUser.updatePassword(pw);
        document.getElementById("new-password").value = "";
        showMsg("Şifre başarıyla güncellendi.");
    } catch(e) {
        errEl.textContent = e.message || "Şifre güncellenemedi.";
        errEl.classList.remove("hidden");
    }
    btn.disabled = false;
});

document.getElementById("btn-logout").addEventListener("click", async function() {
    await logout();
    window.location.href = "login.html";
});
