var tabLogin = document.getElementById("tab-login");
var tabRegister = document.getElementById("tab-register");
var loginForm = document.getElementById("login-form");
var registerForm = document.getElementById("register-form");
var authError = document.getElementById("auth-error");

function showErr(msg) {
    authError.textContent = msg;
    authError.classList.remove("hidden");
}
function clearErr() { authError.classList.add("hidden"); }

tabLogin.addEventListener("click", function() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    tabLogin.classList.add("text-primary", "border-primary");
    tabLogin.classList.remove("text-on-surface-variant", "border-transparent");
    tabRegister.classList.remove("text-primary", "border-primary");
    tabRegister.classList.add("text-on-surface-variant", "border-transparent");
    clearErr();
});

tabRegister.addEventListener("click", function() {
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    tabRegister.classList.add("text-primary", "border-primary");
    tabRegister.classList.remove("text-on-surface-variant", "border-transparent");
    tabLogin.classList.remove("text-primary", "border-primary");
    tabLogin.classList.add("text-on-surface-variant", "border-transparent");
    clearErr();
    clearErr();
});

loginForm.addEventListener("submit", async function(e) {
    e.preventDefault(); clearErr();
    var btn = loginForm.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Giriş yapılıyor…";
    try {
        await login(document.getElementById("email").value, document.getElementById("password").value);
        window.location.href = "dashboard.html";
    } catch(err) { showErr(err.message || "Giriş başarısız. E-posta veya şifre hatalı."); }
    btn.disabled = false; btn.textContent = "Giriş Yap";
});

registerForm.addEventListener("submit", async function(e) {
    e.preventDefault(); clearErr();
    var btn = registerForm.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Kayıt olunuyor…";
    try {
        await register(document.getElementById("reg-email").value, document.getElementById("reg-password").value);
        window.location.href = "dashboard.html";
    } catch(err) { showErr(err.message || "Hesap oluşturulamadı."); }
    btn.disabled = false; btn.textContent = "Hesap Oluştur";
});

initAuth();
onAuthChange(function(user) {
    if (user) window.location.href = "dashboard.html";
});
