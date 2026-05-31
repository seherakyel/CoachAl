/**
 * Uygulama geneli toast, alert ve onay diyalogları (native alert/confirm yok).
 */
(function () {
    var TOAST_MS = 3200;

    function injectDialogStyles() {
        if (document.getElementById("coachai-dialog-styles")) return;
        var style = document.createElement("style");
        style.id = "coachai-dialog-styles";
        style.textContent =
            "#coachai-toast-host{position:fixed;bottom:24px;left:50%;z-index:10050;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:8px;transform:translateX(-50%);max-width:min(420px,calc(100vw - 32px))}" +
            ".coachai-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:12px;font-size:14px;font-weight:500;line-height:1.45;color:#fff;background:#1b1b24;box-shadow:0 12px 40px rgba(27,27,36,.22);opacity:0;transform:translateY(10px);transition:opacity .22s ease,transform .22s ease}" +
            ".coachai-toast.is-visible{opacity:1;transform:translateY(0)}" +
            ".coachai-toast--success{background:linear-gradient(135deg,#3525cd 0%,#4f46e5 100%)}" +
            ".coachai-toast--error{background:#ba1a1a}" +
            ".coachai-toast--info{background:#464555}" +
            ".coachai-toast .material-symbols-outlined{font-size:20px;flex-shrink:0;margin-top:1px}" +
            "#coachai-modal-host{position:fixed;inset:0;z-index:10040;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;visibility:hidden;transition:opacity .2s ease,visibility .2s ease}" +
            "#coachai-modal-host.is-open{opacity:1;visibility:visible}" +
            ".coachai-modal-backdrop{position:absolute;inset:0;background:rgba(27,27,36,.45);backdrop-filter:blur(3px)}" +
            ".coachai-modal-card{position:relative;width:100%;max-width:400px;background:#fff;border:1px solid #e4e1ee;border-radius:16px;box-shadow:0 24px 48px rgba(53,37,205,.12);padding:24px;transform:scale(.96);transition:transform .2s ease}" +
            "#coachai-modal-host.is-open .coachai-modal-card{transform:scale(1)}" +
            ".coachai-modal-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}" +
            ".coachai-modal-icon--danger{background:#ffdad6;color:#ba1a1a}" +
            ".coachai-modal-icon--primary{background:#e2dfff;color:#4f46e5}" +
            ".coachai-modal-title{font-size:17px;font-weight:600;color:#1b1b24;margin:0 0 8px}" +
            ".coachai-modal-body{font-size:14px;line-height:1.55;color:#464555;margin:0 0 20px}" +
            ".coachai-modal-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}" +
            ".coachai-modal-btn{padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s,opacity .15s;border:none;font-family:inherit}" +
            ".coachai-modal-btn:disabled{opacity:.55;cursor:not-allowed}" +
            ".coachai-modal-btn--ghost{background:#f5f2ff;color:#464555;border:1px solid #e4e1ee}" +
            ".coachai-modal-btn--ghost:hover{background:#f0ecf9}" +
            ".coachai-modal-btn--primary{background:#4f46e5;color:#fff}" +
            ".coachai-modal-btn--primary:hover{background:#3525cd}" +
            ".coachai-modal-btn--danger{background:#ba1a1a;color:#fff}" +
            ".coachai-modal-btn--danger:hover{background:#93000a}";
        document.head.appendChild(style);
    }

    function ensureHosts() {
        injectDialogStyles();
        if (!document.getElementById("coachai-toast-host")) {
            var th = document.createElement("div");
            th.id = "coachai-toast-host";
            th.setAttribute("aria-live", "polite");
            document.body.appendChild(th);
        }
        if (!document.getElementById("coachai-modal-host")) {
            var mh = document.createElement("div");
            mh.id = "coachai-modal-host";
            mh.setAttribute("role", "dialog");
            mh.setAttribute("aria-modal", "true");
            mh.innerHTML =
                '<div class="coachai-modal-backdrop" data-coachai-modal-dismiss></div>' +
                '<div class="coachai-modal-card">' +
                '<div id="coachai-modal-icon" class="coachai-modal-icon coachai-modal-icon--primary" aria-hidden="true"></div>' +
                '<h2 id="coachai-modal-title" class="coachai-modal-title"></h2>' +
                '<p id="coachai-modal-body" class="coachai-modal-body"></p>' +
                '<div id="coachai-modal-actions" class="coachai-modal-actions"></div>' +
                "</div>";
            document.body.appendChild(mh);
        }
    }

    var _modalResolve = null;
    var _modalMode = null;

    function closeModal(result) {
        var host = document.getElementById("coachai-modal-host");
        if (!host) return;
        host.classList.remove("is-open");
        document.body.style.overflow = "";
        var fn = _modalResolve;
        _modalResolve = null;
        _modalMode = null;
        if (fn) fn(result);
    }

    function openModal(opts) {
        ensureHosts();
        var host = document.getElementById("coachai-modal-host");
        var iconEl = document.getElementById("coachai-modal-icon");
        var titleEl = document.getElementById("coachai-modal-title");
        var bodyEl = document.getElementById("coachai-modal-body");
        var actionsEl = document.getElementById("coachai-modal-actions");

        var variant = opts.variant || "primary";
        iconEl.className =
            "coachai-modal-icon " +
            (variant === "danger" ? "coachai-modal-icon--danger" : "coachai-modal-icon--primary");
        iconEl.innerHTML =
            '<span class="material-symbols-outlined">' +
            (variant === "danger" ? "delete" : "info") +
            "</span>";

        titleEl.textContent = opts.title || (variant === "danger" ? "Emin misiniz?" : "Bilgi");
        bodyEl.textContent = opts.message || "";

        actionsEl.innerHTML = "";
        (opts.buttons || []).forEach(function (b) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "coachai-modal-btn " + (b.className || "coachai-modal-btn--primary");
            btn.textContent = b.label;
            btn.addEventListener("click", function () {
                closeModal(b.value);
            });
            actionsEl.appendChild(btn);
        });

        _modalMode = opts.mode;
        host.classList.add("is-open");
        document.body.style.overflow = "hidden";

        var firstBtn = actionsEl.querySelector("button");
        if (firstBtn) window.setTimeout(function () { firstBtn.focus(); }, 50);
    }

    function bindModalOnce() {
        if (document.body.dataset.coachaiModalBound) return;
        document.body.dataset.coachaiModalBound = "1";
        document.addEventListener("keydown", function (e) {
            var host = document.getElementById("coachai-modal-host");
            if (!host || !host.classList.contains("is-open")) return;
            if (e.key === "Escape") {
                if (_modalMode === "confirm") closeModal(false);
                else closeModal(true);
            }
        });
        var host = document.getElementById("coachai-modal-host");
        if (host) {
            host.addEventListener("click", function (e) {
                if (e.target.hasAttribute("data-coachai-modal-dismiss")) {
                    if (_modalMode === "confirm") closeModal(false);
                    else closeModal(true);
                }
            });
        }
    }

    function coachaiToast(message, options) {
        options = options || {};
        var variant = options.variant || "info";
        ensureHosts();
        bindModalOnce();

        var host = document.getElementById("coachai-toast-host");
        var el = document.createElement("div");
        el.className = "coachai-toast coachai-toast--" + variant;
        var icon =
            variant === "success"
                ? "check_circle"
                : variant === "error"
                  ? "error"
                  : "info";
        el.innerHTML =
            '<span class="material-symbols-outlined" aria-hidden="true">' +
            icon +
            "</span><span>" +
            String(message || "").replace(/</g, "&lt;") +
            "</span>";
        host.appendChild(el);
        requestAnimationFrame(function () {
            el.classList.add("is-visible");
        });
        window.setTimeout(function () {
            el.classList.remove("is-visible");
            window.setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 240);
        }, options.duration || TOAST_MS);
    }

    function coachaiAlert(message, options) {
        options = options || {};
        ensureHosts();
        bindModalOnce();
        return new Promise(function (resolve) {
            _modalResolve = resolve;
            openModal({
                mode: "alert",
                title: options.title || "Bilgi",
                message: message,
                variant: options.variant || "primary",
                buttons: [
                    {
                        label: options.okLabel || "Tamam",
                        value: true,
                        className: "coachai-modal-btn--primary",
                    },
                ],
            });
        });
    }

    function coachaiConfirm(message, options) {
        options = options || {};
        ensureHosts();
        bindModalOnce();
        return new Promise(function (resolve) {
            _modalResolve = resolve;
            openModal({
                mode: "confirm",
                title: options.title || "Emin misiniz?",
                message: message,
                variant: options.variant || "danger",
                buttons: [
                    {
                        label: options.cancelLabel || "İptal",
                        value: false,
                        className: "coachai-modal-btn--ghost",
                    },
                    {
                        label: options.confirmLabel || "Onayla",
                        value: true,
                        className:
                            options.variant === "danger"
                                ? "coachai-modal-btn--danger"
                                : "coachai-modal-btn--primary",
                    },
                ],
            });
        });
    }

    window.injectCoachAiDialogs = ensureHosts;
    window.coachaiToast = coachaiToast;
    window.coachaiAlert = coachaiAlert;
    window.coachaiConfirm = coachaiConfirm;
})();
