/**
 * Basit SPA yönlendirme — sidebar/header sabit, yalnızca #app-main güncellenir.
 * Vanilla JS + Fetch API; tam sayfa yenilemesi yok.
 */
(function () {
    var LOGIN_PAGE = "login.html";
    var PAGE_STYLE_ID = "coachai-page-styles";

    /** @type {Record<string, { pageId: string, scripts?: string[], readyFn?: string }>} */
    var ROUTES = {
        "dashboard.html": { pageId: "dashboard", scripts: ["../js/dialogs.js", "../js/dashboard.js"] },
        "cv-analysis.html": {
            pageId: "cv-analysis",
            scripts: ["../js/dialogs.js", "../js/cv-documents.js", "../js/cv-analysis.js"],
        },
        "interviews.html": { pageId: "interviews", scripts: ["../js/dialogs.js", "../js/interviews.js"] },
        "reports.html": { pageId: "reports", scripts: ["../js/dialogs.js", "../js/reports.js"] },
        "profile.html": {
            pageId: "profile",
            scripts: ["../js/dialogs.js", "../js/cv-documents.js", "../js/profile.js"],
        },
        "settings.html": {
            pageId: "profile",
            scripts: ["../js/dialogs.js", "../js/cv-documents.js", "../js/profile.js"],
        },
        "analysis-result.html": {
            pageId: "cv-analysis",
            scripts: [
                "../js/dialogs.js",
                "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js",
                "../js/coaching-firestore.js",
                "../js/analysis-result.js",
            ],
        },
        "interview-prep.html": {
            pageId: "interviews",
            scripts: ["../js/dialogs.js", "../js/interview-prep.js"],
            readyFn: "onInterviewPrepReady",
        },
        "exam.html": { pageId: "interviews", scripts: ["../js/dialogs.js", "../js/exam.js"] },
        "quiz.html": { pageId: "interviews", scripts: ["../js/dialogs.js", "../js/quiz.js"] },
    };

    var _navigating = false;
    var _pageAbort = null;
    var _routerReady = false;

    function pageNameFromHref(href) {
        try {
            var url = new URL(href, window.location.href);
            var parts = url.pathname.split("/");
            return parts[parts.length - 1] || "";
        } catch (e) {
            return "";
        }
    }

    function isSpaPage(name) {
        return !!(name && ROUTES[name] && name !== LOGIN_PAGE);
    }

    function isSpaLink(anchor) {
        if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
        var href = anchor.getAttribute("href");
        if (!href || href.charAt(0) === "#") return false;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
        try {
            var url = new URL(href, window.location.href);
            if (url.origin !== window.location.origin) return false;
            var name = pageNameFromHref(url.href);
            return isSpaPage(name);
        } catch (e) {
            return false;
        }
    }

    function abortPreviousPage() {
        if (_pageAbort) _pageAbort.abort();
        _pageAbort = new AbortController();
        window.coachaiPageSignal = _pageAbort.signal;
    }

    function applyPageStyles(doc) {
        var host = document.getElementById(PAGE_STYLE_ID);
        if (!host) {
            host = document.createElement("div");
            host.id = PAGE_STYLE_ID;
            document.head.appendChild(host);
        }
        var chunks = [];
        doc.querySelectorAll("head style").forEach(function (el) {
            var text = (el.textContent || "").trim();
            if (text.length > 120) chunks.push("<style>" + text + "</style>");
        });
        host.innerHTML = chunks.join("");
    }

    function loadScript(src) {
        var base = src.split("?")[0];
        if (base.indexOf("firebase-firestore") !== -1 && window.firebase && firebase.firestore) {
            return Promise.resolve();
        }
        var prev = document.querySelector('script[data-coachai-page="' + base + '"]');
        if (prev) prev.remove();

        return new Promise(function (resolve, reject) {
            var s = document.createElement("script");
            s.src = base + "?_=" + Date.now();
            s.setAttribute("data-coachai-page", base);
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error("Script failed: " + base)); };
            document.body.appendChild(s);
        });
    }

    async function loadPageScripts(route) {
        abortPreviousPage();
        var list = route.scripts || [];
        for (var i = 0; i < list.length; i++) {
            await loadScript(list[i]);
        }
    }

    async function invokePageReady(route) {
        var user = typeof getCoachAiShellUser === "function" ? getCoachAiShellUser() : null;
        if (route.readyFn && typeof window[route.readyFn] === "function") {
            await window[route.readyFn](user);
            return;
        }
        if (typeof onLayoutReady === "function") {
            await onLayoutReady(user);
        }
    }

    async function navigate(href, options) {
        var push = !options || options.push !== false;
        var name = pageNameFromHref(href);
        if (!isSpaPage(name)) {
            window.location.href = href;
            return;
        }

        var url = new URL(href, window.location.href);
        var same =
            pageNameFromHref(window.location.href) === name &&
            window.location.search === url.search;
        if (same && !options.force) return;

        if (_navigating) return;
        _navigating = true;

        var appMain = document.getElementById("app-main");
        if (!appMain) {
            window.location.href = href;
            _navigating = false;
            return;
        }

        try {
            var res = await fetch(name + url.search, { credentials: "same-origin" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            var html = await res.text();
            var doc = new DOMParser().parseFromString(html, "text/html");
            var main = doc.querySelector("main");
            if (!main) throw new Error("main not found");

            appMain.className = main.className;
            appMain.id = "app-main";
            appMain.innerHTML = main.innerHTML;
            appMain.scrollTop = 0;

            var titleEl = doc.querySelector("title");
            if (titleEl) document.title = titleEl.textContent;

            applyPageStyles(doc);

            var route = ROUTES[name];
            await loadPageScripts(route);

            if (typeof setActivePage === "function") setActivePage(route.pageId);

            if (push) {
                history.pushState({ coachaiSpa: true, page: name }, "", name + url.search);
            }

            await invokePageReady(route);
        } catch (err) {
            console.error("[coachai router]", err);
            window.location.href = href;
        } finally {
            _navigating = false;
        }
    }

    function onLinkClick(e) {
        var anchor = e.target.closest("a[href]");
        if (!isSpaLink(anchor)) return;
        e.preventDefault();
        navigate(anchor.href, { push: true });
    }

    function onPopState() {
        navigate(window.location.href, { push: false, force: true });
    }

    function initSpaRouter() {
        if (_routerReady || !document.getElementById("app-main")) return;
        _routerReady = true;
        abortPreviousPage();
        document.addEventListener("click", onLinkClick);
        window.addEventListener("popstate", onPopState);
    }

    window.coachaiNavigate = function (href) {
        return navigate(href, { push: true });
    };

    window.initSpaRouter = initSpaRouter;
    window.coachaiSpaNavigate = navigate;
})();

function coachaiGo(href) {
    if (typeof window.coachaiNavigate === "function") {
        return window.coachaiNavigate(href);
    }
    window.location.href = href;
}
