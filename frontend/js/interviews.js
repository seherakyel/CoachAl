(function () {
    var params = new URLSearchParams(window.location.search);
    var topic = params.get("topic");
    var mode = (params.get("mode") || "").toLowerCase();
    if (topic && mode === "fast-track") {
        window.location.replace(
            "quiz.html?topic=" + encodeURIComponent(topic) + "&mode=fast-track"
        );
    }
})();

function highlightTechQuizCard(topic, params) {
    var tech = document.getElementById("card-tech-quiz");
    var classic = document.getElementById("card-classic-exam");
    var voice = document.getElementById("card-voice-interview");
    var link = document.getElementById("link-tech-quiz");
    if (!tech || !link) return;

    var qs = new URLSearchParams();
    qs.set("topic", topic);
    var modeVal = params.get("mode");
    if (modeVal) qs.set("mode", modeVal);
    link.href = "quiz.html?" + qs.toString();

    tech.classList.add(
        "ring-2",
        "ring-primary",
        "border-primary",
        "shadow-[0_8px_30px_rgba(53,37,205,0.15)]",
        "relative",
        "z-10"
    );
    [classic, voice].forEach(function (card) {
        if (!card) return;
        card.classList.add("opacity-40", "pointer-events-none");
    });
}

function onLayoutReady() {
    var params = new URLSearchParams(window.location.search);
    var topic = params.get("topic");
    var mode = (params.get("mode") || "").toLowerCase();

    if (topic && mode !== "fast-track") {
        highlightTechQuizCard(topic, params);
    }

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
        btnClear.addEventListener("click", function () {
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
