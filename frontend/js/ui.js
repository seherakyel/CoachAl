const API_BASE = "http://localhost:8000";

/** Uygulama geneli: kart/buton geçişleri, CTA gradyanı (bir kez enjekte edilir) */
function injectCoachAiChromeStyles() {
    if (document.getElementById("coachai-chrome-styles")) return;
    var style = document.createElement("style");
    style.id = "coachai-chrome-styles";
    style.textContent =
        "button,.coachai-cta-primary,.ar-surface-card,.ar-skills-col-matched,.ar-skills-col-missing{" +
        "transition:all .3s ease}" +
        "#main-sidebar nav a{transition:all .3s ease}" +
        ".coachai-cta-primary{display:inline-flex;align-items:center;justify-content:center;" +
        "background:linear-gradient(135deg,#7c3aed 0%,#6366f1 46%,#2563eb 100%);" +
        "color:#fff!important;border:none;cursor:pointer;" +
        "box-shadow:0 4px 18px rgba(99,102,241,.38)}" +
        ".coachai-cta-primary:hover{transform:scale(1.03);filter:brightness(1.05);" +
        "box-shadow:0 8px 26px rgba(79,70,229,.48)}" +
        ".coachai-cta-primary:active{transform:scale(1.01)}" +
        ".coachai-cta-primary:focus-visible{outline:none;" +
        "box-shadow:0 0 0 3px #fff,0 0 0 5px rgba(129,140,248,.65),0 4px 18px rgba(99,102,241,.38)}";
    document.head.appendChild(style);
}

const _NAV = [
    { id: "dashboard",   icon: "dashboard",         label: "Panel",         href: "dashboard.html" },
    { id: "cv-analysis", icon: "description",        label: "CV Analizi",    href: "cv-analysis.html" },
    { id: "interviews",  icon: "record_voice_over",  label: "Mülakatlar",    href: "interviews.html" },
    { id: "reports",     icon: "analytics",          label: "Raporlar",      href: "reports.html" },
    { id: "settings",    icon: "settings",           label: "Ayarlar",       href: "settings.html" },
];

function _navLink(item, active) {
    const a = item.id === active;
    const cls = a
        ? "text-indigo-900 bg-gradient-to-r from-indigo-50 via-violet-50/90 to-white border-l-[4px] border-indigo-600 shadow-sm ring-1 ring-indigo-100/70 font-semibold"
        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium transition-all duration-300 ease-in-out";
    return `<a href="${item.href}" class="flex items-center gap-3 py-2.5 pr-3 pl-2.5 rounded-lg font-sans text-sm ${cls}"><span class="material-symbols-outlined text-[20px] shrink-0">${item.icon}</span>${item.label}</a>`;
}

function _sidebar(active) {
    return `<aside id="main-sidebar" class="fixed left-0 top-0 md:relative bg-white h-screen border-r border-slate-100 w-64 shadow-sm flex flex-col py-6 flex-shrink-0 z-50 -translate-x-full md:translate-x-0 transition-transform duration-300">
<div class="px-6 mb-8 flex items-center gap-3">
<div class="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm">C</div>
<div><div class="text-xl font-bold text-slate-900 leading-tight">CoachAI</div><div class="text-xs text-slate-500">AI Mülakat Koçu</div></div>
</div>
<nav class="flex-1 px-4 space-y-1">${_NAV.map(i => _navLink(i, active)).join("")}</nav>
<div class="px-4 mt-auto space-y-3">
<a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 text-sm font-medium transition-colors"><span class="material-symbols-outlined text-[20px]">help</span>Destek</a>
<button id="ui-signout" class="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 text-sm font-medium transition-colors"><span class="material-symbols-outlined text-[20px]">logout</span>Çıkış Yap</button>
</div></aside>
<div id="sidebar-overlay" class="hidden fixed inset-0 bg-black/40 z-40 md:hidden"></div>`;
}

function _header(email) {
    const init = email ? email[0].toUpperCase() : "U";
    return `<header class="bg-white/80 backdrop-blur-md w-full h-16 sticky top-0 z-40 border-b border-slate-100 shadow-sm flex items-center justify-between px-4 md:px-8 flex-shrink-0">
<div class="flex items-center gap-3">
<button id="sidebar-toggle" class="md:hidden p-2 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors" aria-label="Menüyü aç">
<span class="material-symbols-outlined text-[22px]">menu</span></button>
<div class="relative hidden md:block w-56">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">search</span>
<input id="global-search" class="w-full pl-10 pr-4 py-1.5 bg-surface-container-low border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" placeholder="Ara..."/>
</div></div>
<div class="flex items-center gap-3">
<span class="text-sm text-on-surface-variant hidden md:block">${email || ""}</span>
<div class="relative">
<button id="notif-btn" class="text-slate-500 hover:text-indigo-500 transition-colors p-2 rounded-full hover:bg-slate-50" aria-label="Bildirimler">
<span class="material-symbols-outlined text-[22px]">notifications</span></button>
<div id="notif-panel" class="hidden absolute right-0 top-12 w-72 bg-white rounded-xl border border-slate-100 shadow-xl z-50 p-4">
<div class="flex items-center justify-between mb-3">
<span class="text-sm font-semibold text-on-surface">Sistem Bildirimleri</span>
<span class="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">0 yeni</span>
</div>
<div class="flex flex-col items-center justify-center py-6 gap-2">
<span class="material-symbols-outlined text-[32px] text-slate-300">notifications_none</span>
<p class="text-xs text-on-surface-variant">Yeni bildirim yok</p>
</div>
</div>
</div>
<div class="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm border-2 border-primary-fixed-dim">${init}</div>
</div></header>`;
}

var _shellUser = null;
var _shellBound = false;

function getCoachAiShellUser() {
    return _shellUser;
}

function setActivePage(pageId) {
    var nav = document.querySelector("#main-sidebar nav");
    if (!nav) return;
    nav.innerHTML = _NAV.map(function (i) { return _navLink(i, pageId); }).join("");
}

function bindShellEvents() {
    if (_shellBound) return;
    _shellBound = true;

    var so = document.getElementById("ui-signout");
    if (so) {
        so.addEventListener("click", function () {
            logout().then(function () { window.location.href = "login.html"; });
        });
    }

    var toggleBtn = document.getElementById("sidebar-toggle");
    var sidebar = document.getElementById("main-sidebar");
    var overlay = document.getElementById("sidebar-overlay");
    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener("click", function () {
            sidebar.classList.toggle("-translate-x-full");
            overlay.classList.toggle("hidden");
        });
        overlay.addEventListener("click", function () {
            sidebar.classList.add("-translate-x-full");
            overlay.classList.add("hidden");
        });
    }

    var notifBtn = document.getElementById("notif-btn");
    var notifPanel = document.getElementById("notif-panel");
    if (notifBtn && notifPanel) {
        notifBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            notifPanel.classList.toggle("hidden");
        });
        document.addEventListener("click", function (e) {
            if (notifPanel && !notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
                notifPanel.classList.add("hidden");
            }
        });
    }
}

function ensureShell(user, pageId) {
    _shellUser = user;
    injectCoachAiChromeStyles();
    var sc = document.getElementById("sidebar-container");
    var hc = document.getElementById("header-container");
    if (!document.getElementById("main-sidebar")) {
        if (sc) sc.innerHTML = _sidebar(pageId);
        if (hc) hc.innerHTML = _header(user.email);
        bindShellEvents();
    } else {
        setActivePage(pageId);
    }
}

function initLayout(pageId) {
    onAuthChange(function (user) {
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        ensureShell(user, pageId);
        if (typeof initSpaRouter === "function") initSpaRouter();
        if (typeof onLayoutReady === "function") onLayoutReady(user);
    });
}
