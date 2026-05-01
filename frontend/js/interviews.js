function onLayoutReady() {
    var cvId = sessionStorage.getItem("coachai_cv_id");
    var company = sessionStorage.getItem("coachai_company_name");
    var cvName = sessionStorage.getItem("coachai_cv_name");

    if (cvId && company) {
        var info = document.getElementById("session-info");
        info.classList.remove("hidden");
        document.getElementById("session-cv-text").textContent =
            (cvName || "CV") + " → " + company + " için hazır";
    }

    var btnClear = document.getElementById("btn-clear-session");
    if (btnClear) {
        btnClear.addEventListener("click", function() {
            sessionStorage.removeItem("coachai_cv_id");
            sessionStorage.removeItem("coachai_profile_id");
            sessionStorage.removeItem("coachai_cv_name");
            sessionStorage.removeItem("coachai_company_name");
            sessionStorage.removeItem("coachai_alignment");
            sessionStorage.removeItem("coachai_company_profile");
            window.location.href = "cv-analysis.html";
        });
    }
}
