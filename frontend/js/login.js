const errorEl = document.getElementById("auth-error");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
}

function clearError() {
    errorEl.textContent = "";
    errorEl.style.display = "none";
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
        await login(email, password);
        window.location.href = "index.html";
    } catch (err) {
        showError(err.message || "Giriş başarısız");
    }
});

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    try {
        await register(email, password);
        window.location.href = "index.html";
    } catch (err) {
        showError(err.message || "Kayıt başarısız");
    }
});
