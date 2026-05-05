function safeParseJSON(raw, fallback) {
    try {
        if (raw == null || raw === "") return fallback;
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function splitLongInterviewParagraph(text) {
    var s = (text || "").trim();
    if (s.length <= 120) return [s];
    var chunks = s.replace(/([.!?])\s+/g, "$1\n").split("\n").map(function(x) { return x.trim(); }).filter(Boolean);
    return chunks.length > 1 ? chunks : [s];
}

/** Üçüncü adım için genel kapanış metni (API’de yeterli madde yoksa) */
var AR_INTERVIEW_THIRD_PLACEHOLDER =
    "Kapanış, referans ve teklif aşamaları şirket içi prosedüre göre sonlandırılır.";

function splitSentencesForInterview(text) {
    return String(text || "")
        .replace(/([.!?])\s+/g, "$1\n")
        .split("\n")
        .map(function(x) {
            return x.trim();
        })
        .filter(Boolean);
}

/** Tek blok metni cümlelere veya uzunluğa göre tam 3 adıma böler */
function splitIntoThreeBySentences(text) {
    var sents = splitSentencesForInterview(text);
    var n = sents.length;
    if (n >= 3) {
        var i1 = Math.ceil(n / 3);
        var i2 = Math.ceil((n - i1) / 2) + i1;
        return [sents.slice(0, i1).join(" "), sents.slice(i1, i2).join(" "), sents.slice(i2).join(" ")];
    }
    if (n === 2) {
        return [sents[0], sents[1], AR_INTERVIEW_THIRD_PLACEHOLDER];
    }
    var t = sents[0] || String(text).trim();
    if (!t) {
        return [AR_INTERVIEW_THIRD_PLACEHOLDER, AR_INTERVIEW_THIRD_PLACEHOLDER, AR_INTERVIEW_THIRD_PLACEHOLDER];
    }
    if (t.length > 200) {
        var third = Math.ceil(t.length / 3);
        return [t.slice(0, third), t.slice(third, 2 * third), t.slice(2 * third)];
    }
    return [t, AR_INTERVIEW_THIRD_PLACEHOLDER, AR_INTERVIEW_THIRD_PLACEHOLDER];
}

/** Mülakat sürecini her zaman tam 3 adımda gösterir (boş girdi → []) */
function normalizeInterviewStepsToThree(rawSteps) {
    var list = rawSteps.map(function(x) {
        return String(x).trim();
    }).filter(Boolean);
    if (list.length === 0) return [];

    if (list.length >= 3) {
        return [list[0], list[1], list.slice(2).join(" ")];
    }
    if (list.length === 2) {
        return [list[0], list[1], AR_INTERVIEW_THIRD_PLACEHOLDER];
    }

    var one = list[0];
    var expanded = one.length > 120 ? splitLongInterviewParagraph(one) : [one];

    if (expanded.length >= 3) {
        return [expanded[0], expanded[1], expanded.slice(2).join(" ")];
    }
    if (expanded.length === 2) {
        return [expanded[0], expanded[1], AR_INTERVIEW_THIRD_PLACEHOLDER];
    }
    return splitIntoThreeBySentences(expanded[0]);
}

/** Eksik yetenek satırı için anahtar kelimeye göre öğrenme bağlantıları (harici URL’ler sabit) */
function learningResourcesForSkill(skillRaw) {
    var s = String(skillRaw || "").toLowerCase();
    function L(label, href) {
        return { label: label, href: href };
    }
    var generic = {
        free: [L("freeCodeCamp", "https://www.freecodecamp.org/"), L("The Odin Project", "https://www.theodinproject.com/")],
        docs: [L("MDN Web Docs", "https://developer.mozilla.org/"), L("DevDocs.io", "https://devdocs.io/")],
        courses: [L("Coursera", "https://www.coursera.org/"), L("edX", "https://www.edx.org/")]
    };
    if (!s.trim()) return generic;

    if (/\baws\b|amazon web services/.test(s)) {
        return {
            free: [L("AWS Skill Builder", "https://skillbuilder.aws/"), L("AWS Workshops", "https://workshops.aws/")],
            docs: [L("AWS Dokümantasyonu", "https://docs.aws.amazon.com/")],
            courses: [L("AWS Training & sertifikasyon", "https://aws.amazon.com/training/")]
        };
    }
    if (/kubernetes|\bk8s\b/.test(s)) {
        return {
            free: [L("Killercoda — Kubernetes", "https://killercoda.com/kubernetes"), L("Play with Kubernetes", "https://labs.play-with-k8s.com/")],
            docs: [L("Kubernetes.io dokümantasyon", "https://kubernetes.io/docs/")],
            courses: [L("CNCF eğitimler", "https://www.cncf.io/training/")]
        };
    }
    if (/docker|\bcontainer\b/.test(s)) {
        return {
            free: [L("Docker — başlangıç kılavuzu", "https://docs.docker.com/get-started/"), L("Play with Docker", "https://labs.play-with-docker.com/")],
            docs: [L("Docker dokümantasyon", "https://docs.docker.com/")],
            courses: [L("Docker Hub / resmi kaynaklar", "https://hub.docker.com/")]
        };
    }
    if (/react|\bjsx\b/.test(s)) {
        return {
            free: [L("React.dev — öğren", "https://react.dev/learn"), L("freeCodeCamp React", "https://www.freecodecamp.org/news/tag/react/")],
            docs: [L("React dokümantasyon", "https://react.dev/")],
            courses: [L("Full Stack Open (ücretsiz)", "https://fullstackopen.com/en/part1")]
        };
    }
    if (/vue\.?js|\bvue\b/.test(s)) {
        return {
            free: [L("Vue.js — öğretici", "https://vuejs.org/tutorial/")],
            docs: [L("Vue dokümantasyon", "https://vuejs.org/guide/introduction.html")],
            courses: [L("Vue School ücretsiz içerikler", "https://vueschool.io/")]
        };
    }
    if (/angular/.test(s)) {
        return {
            free: [L("Angular — ilk uygulama", "https://angular.dev/tutorials/first-app")],
            docs: [L("Angular dokümantasyon", "https://angular.dev/overview")],
            courses: [L("Angular.io kaynaklar", "https://angular.dev/resources")]
        };
    }
    if (/\bnode\.?js\b|\bexpress\b/.test(s)) {
        return {
            free: [L("Node.js — başlangıç", "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs")],
            docs: [L("Node.js dokümantasyon", "https://nodejs.org/docs/")],
            courses: [L("Express rehberi", "https://expressjs.com/en/starter/installing.html")]
        };
    }
    if (/python|\bdjango\b|\bfastapi\b|\bflask\b/.test(s)) {
        return {
            free: [L("Python.org öğretici", "https://docs.python.org/3/tutorial/"), L("Real Python (ücretsiz yazılar)", "https://realpython.com/")],
            docs: [L("Python dokümantasyon", "https://docs.python.org/3/")],
            courses: [L("PyData / Python eğitim kaynakları", "https://pydata.org/")]
        };
    }
    if (/\bjava\b|\bspring\b/.test(s)) {
        return {
            free: [L("Oracle Java SE öğren", "https://dev.java/learn/")],
            docs: [L("Java dokümantasyon", "https://docs.oracle.com/en/java/")],
            courses: [L("Spring dokümantasyon", "https://spring.io/guides")]
        };
    }
    if (/terraform|\bhcl\b/.test(s)) {
        return {
            free: [L("HashiCorp Learn", "https://developer.hashicorp.com/terraform/tutorials")],
            docs: [L("Terraform dokümantasyon", "https://developer.hashicorp.com/terraform/docs")],
            courses: [L("Terraform registry", "https://registry.terraform.io/")]
        };
    }
    if (/ansible/.test(s)) {
        return {
            free: [L("Ansible — ilk adımlar", "https://docs.ansible.com/ansible/latest/getting_started/index.html")],
            docs: [L("Ansible dokümantasyon", "https://docs.ansible.com/")],
            courses: [L("Ansible Galaxy", "https://galaxy.ansible.com/")]
        };
    }
    if (/\bgolang\b/.test(s) || /^go$/i.test(String(skillRaw || "").trim())) {
        return {
            free: [L("A Tour of Go", "https://go.dev/tour/")],
            docs: [L("Go dokümantasyon", "https://go.dev/doc/")],
            courses: [L("Effective Go", "https://go.dev/doc/effective_go")]
        };
    }
    if (/rust|\bcargo\b/.test(s)) {
        return {
            free: [L("Rust Book", "https://doc.rust-lang.org/book/"), L("Rustlings", "https://github.com/rust-lang/rustlings")],
            docs: [L("Rust dokümantasyon", "https://doc.rust-lang.org/")],
            courses: [L("Rust by Example", "https://doc.rust-lang.org/rust-by-example/")]
        };
    }
    if (/typescript|\bts\b/.test(s)) {
        return {
            free: [L("TypeScript — el kitabı", "https://www.typescriptlang.org/docs/handbook/intro.html")],
            docs: [L("TypeScript dokümantasyon", "https://www.typescriptlang.org/docs/")],
            courses: [L("TS Deep Dive (basarat)", "https://basarat.gitbook.io/typescript/")]
        };
    }
    if (/javascript|\bjs\b|ecmascript/.test(s)) {
        return {
            free: [L("JavaScript.info", "https://javascript.info/"), L("freeCodeCamp JS", "https://www.freecodecamp.org/news/tag/javascript/")],
            docs: [L("MDN JavaScript", "https://developer.mozilla.org/en-US/docs/Web/JavaScript")],
            courses: [L("Eloquent JavaScript (kitap)", "https://eloquentjavascript.net/")]
        };
    }
    if (/sql|postgres|postgresql|mysql|sqlite|mongodb|redis/.test(s)) {
        return {
            free: [L("SQLBolt — interaktif SQL", "https://sqlbolt.com/"), L("PostgreSQL egzersizleri", "https://www.postgresql.org/docs/")],
            docs: [L("PostgreSQL dokümantasyon", "https://www.postgresql.org/docs/"), L("MongoDB dokümantasyon", "https://www.mongodb.com/docs/")],
            courses: [L("Use The Index, Luke! (SQL)", "https://use-the-index-luke.com/")]
        };
    }
    if (/kafka/.test(s)) {
        return {
            free: [L("Kafka quickstart", "https://kafka.apache.org/quickstart")],
            docs: [L("Apache Kafka dokümantasyon", "https://kafka.apache.org/documentation/")],
            courses: [L("Confluent Kafka ücretsiz kurslar", "https://developer.confluent.io/learn-kafka/")]
        };
    }
    if (/graphql/.test(s)) {
        return {
            free: [L("GraphQL öğren", "https://graphql.org/learn/")],
            docs: [L("GraphQL spesifikasyon", "https://spec.graphql.org/")],
            courses: [L("How to GraphQL", "https://www.howtographql.com/")]
        };
    }
    if (/nginx/.test(s)) {
        return {
            free: [L("NGINX başlangıç", "https://docs.nginx.com/nginx/admin-guide/")],
            docs: [L("NGINX dokümantasyon", "https://nginx.org/en/docs/")],
            courses: [L("NGINX konfigürasyon örnekleri", "https://www.nginx.com/resources/wiki/")]
        };
    }
    if (/linux|\bbash\b|\bshell\b|unix/.test(s)) {
        return {
            free: [L("Linux Journey", "https://linuxjourney.com/")],
            docs: [L("GNU Bash manual", "https://www.gnu.org/software/bash/manual/")],
            courses: [L("Arch Wiki (referans)", "https://wiki.archlinux.org/")]
        };
    }
    if (/\bgit\b|github|gitlab/.test(s)) {
        return {
            free: [L("GitHub Skills", "https://skills.github.com/"), L("Learn Git Branching", "https://learngitbranching.js.org/")],
            docs: [L("Git dokümantasyon", "https://git-scm.com/doc")],
            courses: [L("Pro Git kitap", "https://git-scm.com/book/en/v2")]
        };
    }
    if (/jenkins|\bci\b|\bcd\b|pipeline|github actions/.test(s)) {
        return {
            free: [L("GitHub Actions dokümantasyon", "https://docs.github.com/en/actions")],
            docs: [L("Jenkins kullanıcı kılavuzu", "https://www.jenkins.io/doc/")],
            courses: [L("CI/CD genel giriş", "https://about.gitlab.com/topics/ci-cd/")]
        };
    }
    if (/microservice|micro-service|distributed/.test(s)) {
        return {
            free: [L("Microservices.io kalıpları", "https://microservices.io/")],
            docs: [L("Martin Fowler — mikroservis", "https://martinfowler.com/microservices/")],
            courses: [L("12 Factor App", "https://12factor.net/")]
        };
    }
    if (/oauth|jwt|security|ssl|tls|encryption/.test(s)) {
        return {
            free: [L("OAuth 2.0 / OpenID connect", "https://oauth.net/2/")],
            docs: [L("OWASP Top 10", "https://owasp.org/www-project-top-ten/")],
            courses: [L("JWT giriş", "https://jwt.io/introduction")]
        };
    }
    if (/html|css|tailwind|frontend|web geliştir/.test(s)) {
        return {
            free: [L("MDN HTML/CSS", "https://developer.mozilla.org/en-US/docs/Learn")],
            docs: [L("Can I use", "https://caniuse.com/")],
            courses: [L("web.dev öğren", "https://web.dev/learn")]
        };
    }
    if (/elastic|opensearch|solr/.test(s)) {
        return {
            free: [L("Elastic başlangıç", "https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html")],
            docs: [L("Elasticsearch kılavuzu", "https://www.elastic.co/guide/index.html")],
            courses: [L("Elastic ücretsiz eğitimler", "https://www.elastic.co/training/free")]
        };
    }

    return generic;
}

function buildLearningResourcesInnerHtml(skillRaw, escapeHtml) {
    var pack = learningResourcesForSkill(skillRaw);
    function section(title, links) {
        if (!links || !links.length) return "";
        return (
            '<div class="border-t border-slate-100 pt-2.5 mt-2.5 first:border-t-0 first:pt-0 first:mt-0">' +
            '<p class="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">' +
            escapeHtml(title) +
            "</p>" +
            '<ul class="m-0 list-none space-y-1 p-0">' +
            links
                .map(function(Li) {
                    return (
                        '<li><a class="block text-[11px] leading-snug text-indigo-600 underline decoration-indigo-200 underline-offset-2 transition-colors hover:text-indigo-800" href="' +
                        escapeHtml(Li.href) +
                        '" target="_blank" rel="noopener noreferrer">' +
                        escapeHtml(Li.label) +
                        "</a></li>"
                    );
                })
                .join("") +
            "</ul></div>"
        );
    }
    var headline = String(skillRaw || "Bu başlık").trim() || "Bu başlık";
    return (
        '<div class="p-3">' +
        '<p class="mb-2.5 text-[11px] font-semibold leading-snug text-slate-800">' +
        escapeHtml(headline) +
        " — önerilen kaynaklar</p>" +
        section("Ücretsiz eğitimler", pack.free) +
        section("Dokümantasyon", pack.docs) +
        section("Önerilen kurslar", pack.courses) +
        "</div>"
    );
}

function missingSkillRowHtml(label, detail, index, escapeHtml) {
    var d = (detail || "").trim();
    var safeLabel = escapeHtml(label);
    var inner = buildLearningResourcesInnerHtml(label, escapeHtml);
    var leftEdge = "border-b border-solid border-slate-100 border-l-[4px] border-indigo-200 [border-left-style:dashed]";
    var iconHtml =
        '<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-indigo-200 bg-slate-50 text-slate-400">' +
        '<span class="material-symbols-outlined text-[20px]" style="font-variation-settings:\'FILL\' 0,\'wght\' 400">change_circle</span></div>';
    /** Lucide BookOpen — inline SVG (font bağımlılığı yok) */
    var bookOpenSvg =
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 7v14"/>' +
        '<path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>' +
        "</svg>";
    return (
        '<li class="border-b border-slate-100 py-3 pl-4 ' +
        leftEdge +
        ' last:border-b-0">' +
        '<div class="flex items-start gap-3">' +
        iconHtml +
        '<div class="min-w-0 flex-1">' +
        '<div class="flex flex-col gap-0">' +
        '<span class="block text-sm font-semibold text-slate-800">' +
        safeLabel +
        "</span>" +
        (d ? '<span class="ar-skill-detail block text-xs leading-snug text-slate-600">' + escapeHtml(d) + "</span>" : "") +
        '<div class="mt-1.5">' +
        '<div class="ar-missing-learn-wrap relative inline-block max-w-full">' +
        '<button type="button" class="ar-missing-learn-btn inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-transparent px-2 py-1 text-[10px] font-light leading-none text-indigo-500 transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-200/90 focus-visible:ring-offset-1" title="Ücretsiz eğitim, dokümantasyon ve kurs linkleri" aria-expanded="false" aria-haspopup="dialog" aria-controls="ar-learn-panel-' +
        index +
        '" id="ar-learn-btn-' +
        index +
        '">' +
        bookOpenSvg +
        '<span class="whitespace-nowrap">Kaynakları Gör</span>' +
        "</button>" +
        '<div id="ar-learn-panel-' +
        index +
        '" role="dialog" tabindex="-1" class="ar-missing-learn-panel fixed z-[200] hidden max-h-[min(70vh,320px)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-slate-200 bg-white p-0 text-left shadow-xl ring-1 ring-slate-900/[0.06]">' +
        inner +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div></div></div></li>"
    );
}

/** Eksik yetenek — kaynak paneli: tek seferlik dinleyiciler + kaydırınca kapanma */
function initMissingSkillLearnResourcesUi() {
    if (initMissingSkillLearnResourcesUi._docBound) return;
    initMissingSkillLearnResourcesUi._docBound = true;

    function closeAllLearnPanels() {
        document.querySelectorAll(".ar-missing-learn-panel").forEach(function(p) {
            p.classList.add("hidden");
        });
        document.querySelectorAll(".ar-missing-learn-btn").forEach(function(b) {
            b.setAttribute("aria-expanded", "false");
        });
    }

    function positionLearnPanel(panel, anchorBtn) {
        var margin = 8;
        var width = 272;
        panel.style.width = width + "px";
        panel.classList.remove("hidden");
        var r = anchorBtn.getBoundingClientRect();
        var ph = panel.offsetHeight || 0;
        var top = r.bottom + margin;
        if (top + ph > window.innerHeight - margin) {
            top = Math.max(margin, r.top - ph - margin);
        }
        var left = r.right - width;
        if (left < margin) left = margin;
        if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
        panel.style.left = left + "px";
        panel.style.top = top + "px";
    }

    document.addEventListener("click", function(e) {
        var ms = document.getElementById("missing-skills");
        if (!ms) return;
        var btn = e.target.closest(".ar-missing-learn-btn");
        if (btn && ms.contains(btn)) {
            e.preventDefault();
            var panel = document.getElementById(btn.getAttribute("aria-controls"));
            if (!panel) return;
            var wasHidden = panel.classList.contains("hidden");
            closeAllLearnPanels();
            if (wasHidden) {
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        btn.setAttribute("aria-expanded", "true");
                        positionLearnPanel(panel, btn);
                    });
                });
            }
            return;
        }
        if (e.target.closest(".ar-missing-learn-panel")) return;
        closeAllLearnPanels();
    });

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") closeAllLearnPanels();
    });

    window.addEventListener(
        "resize",
        function() {
            var open = document.querySelector(".ar-missing-learn-panel:not(.hidden)");
            var activeBtn = document.querySelector('.ar-missing-learn-btn[aria-expanded="true"]');
            if (open && activeBtn) positionLearnPanel(open, activeBtn);
        },
        { passive: true }
    );

    var scrollEl = document.getElementById("missing-skills-scroll");
    if (scrollEl && !scrollEl.dataset.arLearnScrollBound) {
        scrollEl.dataset.arLearnScrollBound = "1";
        scrollEl.addEventListener(
            "scroll",
            function() {
                closeAllLearnPanels();
            },
            { passive: true }
        );
    }
}

/** tech_stack maddesinin eşleşen / eksik yetenek satırlarıyla örtüşüp örtüşmediği */
function arTechTokensOverlap(tech, phrase) {
    var a = String(tech).toLowerCase().trim();
    var b = String(phrase).toLowerCase().trim();
    if (!a || !b) return false;
    if (b.indexOf(a) !== -1 || a.indexOf(b) !== -1) return true;
    var strip = function(s) {
        return s.replace(/[^a-z0-9+#.]/g, "");
    };
    var sa = strip(a);
    var sb = strip(b);
    if (sa.length >= 3 && sb.indexOf(sa) !== -1) return true;
    if (sb.length >= 3 && sa.indexOf(sb) !== -1) return true;
    var words = a.split(/[\s,/]+/).filter(function(w) {
        return w.length > 2;
    });
    return words.some(function(w) {
        return b.indexOf(w) !== -1;
    });
}

function arTechBadgeKind(tech, matchedUi, missingUi) {
    var m = matchedUi.some(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        return arTechTokensOverlap(tech, lab);
    });
    if (m) return "matched";
    var g = missingUi.some(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        return arTechTokensOverlap(tech, lab);
    });
    if (g) return "gap";
    return "gap";
}

/** Skor bileşenleri: yüzde ve bar 0'dan hedefe animasyon */
function animateScoreBreakdownPcts() {
    var rows = document.querySelectorAll("[data-ar-score-row]");
    if (!rows || !rows.length) return;
    rows.forEach(function(row) {
        var pctEl = row.querySelector(".ar-score-pct");
        var barEl = row.querySelector(".ar-score-bar-fill");
        if (!pctEl || !barEl) return;
        var target = parseInt(pctEl.getAttribute("data-target"), 10);
        if (Number.isNaN(target)) target = 0;
        target = Math.min(100, Math.max(0, target));
        pctEl.textContent = "0%";
        barEl.style.width = "0%";
        var startTs = null;
        var duration = 1000;
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }
        function step(ts) {
            if (startTs === null) startTs = ts;
            var u = Math.min(1, (ts - startTs) / duration);
            var v = Math.round(target * easeOutCubic(u));
            pctEl.textContent = v + "%";
            barEl.style.width = v + "%";
            if (u < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    });
}

/** Aranan profil rozeti — minik Material ikon veya yıldız */
function traitBadgeLeadingGraphic(label) {
    var s = String(label).toLowerCase();
    function matIcon(name, fillOne) {
        return (
            '<span class="material-symbols-outlined text-[15px] text-indigo-500 shrink-0" style="font-variation-settings:\'FILL\' ' +
            (fillOne ? "1" : "0") +
            ',\'wght\' 500">' +
            name +
            "</span>"
        );
    }
    if (/react|vue|angular|svelte|javascript|typescript|css|html|web|ui|ux|geliştir|website|frontend/.test(s)) return matIcon("code", true);
    if (/python|java|go|rust|kotlin|php|ruby|backend|api|microservice|spring|node/.test(s)) return matIcon("terminal", true);
    if (/cloud|aws|azure|gcp|docker|kubernetes|devops|infra|sunucu/.test(s)) return matIcon("cloud", false);
    if (/sql|nosql|data|analytics|machine|learning|\bai\b|ml|veri|kafka/.test(s)) return matIcon("database", false);
    if (/lead|manager|takım|team|iletişim|communication|english|soft|collaboration|agile|scrum/.test(s)) return matIcon("groups", true);
    if (/güvenlik|security|auth|oauth|encrypt/.test(s)) return matIcon("shield", false);
    if (/tasarım|design|figma|mobil|mobile|ios|android/.test(s)) return matIcon("palette", false);
    return (
        '<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100/90 text-[12px] leading-none text-indigo-600" aria-hidden="true">\u2726</span>'
    );
}

function populateAnalysisResult() {
    var alignment = safeParseJSON(sessionStorage.getItem("coachai_alignment"), null);
    var companyProfile = safeParseJSON(sessionStorage.getItem("coachai_company_profile"), null);

    if (alignment == null || companyProfile == null) {
        window.location.href = "cv-analysis.html";
        return;
    }

    function escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function pct01(v) {
        var n = Number(v);
        if (Number.isNaN(n)) return 0;
        return Math.round(Math.min(1, Math.max(0, n)) * 100);
    }

    var rawPct = alignment.score_percent != null ? Number(alignment.score_percent) : NaN;
    if (Number.isNaN(rawPct) && alignment.score != null) {
        var s = Number(alignment.score);
        rawPct = s <= 1 ? s * 100 : s;
    }
    if (Number.isNaN(rawPct)) rawPct = 0;
    var score = Math.round(rawPct);

    var scoreValEl = document.getElementById("score-value");
    var riskBadgeEl = document.getElementById("score-risk-badge");
    var riskIconEl = document.getElementById("score-risk-icon");
    var riskLabelEl = document.getElementById("score-risk-label");
    var glowWrap = document.getElementById("score-glow-wrap");
    var arcEl = document.getElementById("score-arc");
    if (scoreValEl) scoreValEl.textContent = score;

    var risk = score >= 80 ? "Düşük Risk" : score >= 60 ? "Orta Risk" : "Yüksek Risk";
    var badgeBase =
        "mt-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-700";
    if (riskLabelEl) riskLabelEl.textContent = risk;
    if (riskIconEl) {
        riskIconEl.setAttribute("style", "font-variation-settings:'FILL' 1,'wght' 500");
    }
    if (riskBadgeEl && riskIconEl) {
        if (score >= 80) {
            riskBadgeEl.className = badgeBase;
            riskIconEl.textContent = "verified";
            riskIconEl.className = "material-symbols-outlined text-[18px] text-emerald-600";
        } else if (score >= 60) {
            riskBadgeEl.className = badgeBase;
            riskIconEl.textContent = "priority_high";
            riskIconEl.className = "material-symbols-outlined text-[18px] text-amber-500";
        } else {
            riskBadgeEl.className = badgeBase;
            riskIconEl.textContent = "warning";
            riskIconEl.className = "material-symbols-outlined text-[18px] text-rose-600";
        }
    }
    if (glowWrap) {
        glowWrap.className = "ar-score-glow-wrap relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72";
        if (score >= 80) glowWrap.classList.add("ar-glow-indigo");
        else if (score >= 60) glowWrap.classList.add("ar-glow-amber");
        else glowWrap.classList.add("ar-glow-red");
    }
    if (scoreValEl) {
        if (score >= 80) scoreValEl.className = "text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-indigo-600 leading-none";
        else if (score >= 60) scoreValEl.className = "text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-amber-600 leading-none";
        else scoreValEl.className = "text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-rose-600 leading-none";
    }

    if (arcEl) {
        var circumference = 283;
        var offset = circumference - (score / 100) * circumference;
        arcEl.style.strokeDashoffset = offset;
        if (score >= 80) arcEl.style.stroke = "#4f46e5";
        else if (score >= 60) arcEl.style.stroke = "#f59e0b";
        else arcEl.style.stroke = "#f43f5e";
    }

    var company = companyProfile.company_name || sessionStorage.getItem("coachai_company_name") || "—";
    document.getElementById("company-name").textContent = company;
    var companyKey = String(company).trim().toLowerCase();
    var logoTrendy = document.getElementById("company-logo-trendyol");
    var logoFallback = document.getElementById("company-logo-fallback");
    var initialEl = document.getElementById("company-initial");
    if (companyKey.indexOf("trendyol") !== -1) {
        if (logoTrendy) logoTrendy.classList.remove("hidden");
        if (logoFallback) logoFallback.classList.add("hidden");
    } else {
        if (logoTrendy) logoTrendy.classList.add("hidden");
        if (logoFallback) logoFallback.classList.remove("hidden");
        if (initialEl) initialEl.textContent = company[0] ? company[0].toUpperCase() : "—";
    }
    document.getElementById("company-industry").textContent = companyProfile.industry || "Technology";
    var targetPos = (companyProfile.position || alignment.position || "").trim();
    var posEl = document.getElementById("company-position");
    if (targetPos && posEl) {
        posEl.textContent = "Hedef rol · " + targetPos;
        posEl.classList.remove("hidden");
    }
    document.getElementById("result-subtitle").textContent = "Profilinizin " + company + " beklentileriyle eşleşme analizi.";
    document.getElementById("company-culture").textContent = companyProfile.culture_summary || "—";
    document.getElementById("ai-advice").textContent = alignment.advice || companyProfile.preparation_tips || "Analiziniz tamamlandı. Mülakat moduna geçebilirsiniz.";

    var processRaw = companyProfile.interview_process;
    var interviewSteps = [];
    if (Array.isArray(processRaw)) {
        interviewSteps = processRaw.map(function(p) {
            return String(p);
        });
    } else if (typeof processRaw === "string" && processRaw.trim()) {
        interviewSteps = processRaw.split(/\r?\n+/).map(function(s) {
            return s.trim();
        }).filter(Boolean);
    }
    interviewSteps = normalizeInterviewStepsToThree(interviewSteps);
    document.getElementById("interview-process").innerHTML = interviewSteps.length
        ? '<div class="ar-ip-plain">' +
          interviewSteps
              .map(function(p, i) {
                  return (
                      '<div class="ar-ip-row pl-2.5 border-l-2 border-indigo-400">' +
                      '<span class="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Adım ' +
                      (i + 1) +
                      "</span>" +
                      '<p class="mt-1 text-slate-700 leading-snug">' +
                      escapeHtml(p) +
                      "</p></div>"
                  );
              })
              .join("") +
          "</div>"
        : "<span class='text-on-surface-variant text-sm'>Şirket profilinde mülakat adımları metin olarak geldi; yukarıdaki özetten takip edebilirsiniz.</span>";

    var traitLabels = [
        { key: "S", label: "Yetenek eşleşmesi", hint: "CV’deki yeteneklerin şirket profiline uyumu", icon: "psychology" },
        { key: "E", label: "Deneyim uyumu", hint: "Deneyim süresi ile rol beklentisi", icon: "work_history" },
        { key: "D", label: "Eğitim faktörü", hint: "Eğitim seviyesi", icon: "school" }
    ];
    document.getElementById("score-breakdown").innerHTML = traitLabels.map(function(t) {
        var v = alignment[t.key];
        var p = pct01(v);
        return (
            '<div data-ar-score-row class="flex gap-3 rounded-xl border border-slate-100/95 bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-900/[0.03] transition-shadow duration-300 hover:shadow-md">' +
            '<div class="ar-score-row-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-indigo-100 self-start mt-0.5">' +
            '<span class="material-symbols-outlined text-[18px]" style="font-variation-settings:\'FILL\' 1">' +
            t.icon +
            "</span></div>" +
            '<div class="min-w-0 flex-1">' +
            '<div class="flex items-baseline justify-between gap-2 mb-1">' +
            '<span class="text-sm font-semibold text-slate-800 leading-tight">' +
            escapeHtml(t.label) +
            '</span><span class="ar-score-pct text-sm font-bold tabular-nums tracking-tight text-indigo-700" data-target="' +
            p +
            '">0%</span></div>' +
            '<div class="ar-score-bar-track mb-1.5">' +
            '<div class="ar-score-bar-fill"></div></div>' +
            '<p class="text-[11px] leading-snug text-slate-600">' +
            escapeHtml(t.hint) +
            "</p></div></div>"
        );
    }).join("");
    requestAnimationFrame(function() {
        requestAnimationFrame(animateScoreBreakdownPcts);
    });

    var traits = companyProfile.key_traits || [];
    if (Array.isArray(traits) && traits.length) {
        document.getElementById("key-traits-section").classList.remove("hidden");
        document.getElementById("key-traits").innerHTML = traits
            .map(function(t) {
                var raw = String(t);
                return (
                    '<span class="ar-trait-badge inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-200/75 bg-indigo-50/30 px-3.5 py-2 text-left text-xs font-medium text-slate-700">' +
                    traitBadgeLeadingGraphic(raw) +
                    "<span class=\"min-w-0 break-words leading-snug\">" +
                    escapeHtml(raw) +
                    "</span></span>"
                );
            })
            .join("");
    }

    function rowHtml(kind, label, detail) {
        var d = (detail || "").trim();
        var leftEdge =
            kind === "matched"
                ? "border-b border-solid border-slate-100 border-l-[4px] border-indigo-600"
                : "border-b border-solid border-slate-100 border-l-[4px] border-indigo-200 [border-left-style:dashed]";
        var iconHtml =
            kind === "matched"
                ? '<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shadow-sm ring-1 ring-indigo-200/90">' +
                  '<span class="material-symbols-outlined text-[22px]" style="font-variation-settings:\'FILL\' 1,\'wght\' 500">check_circle</span></div>'
                : '<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-indigo-200 bg-slate-50 text-slate-400">' +
                  '<span class="material-symbols-outlined text-[20px]" style="font-variation-settings:\'FILL\' 0,\'wght\' 400">change_circle</span></div>';
        return (
            '<li class="border-b border-slate-100 py-4 pl-4 ' +
            leftEdge +
            ' last:border-b-0">' +
            '<div class="flex items-start gap-3">' +
            iconHtml +
            '<div class="min-w-0"><span class="block text-sm font-semibold text-slate-800">' +
            escapeHtml(label) +
            "</span>" +
            (d
                ? '<span class="ar-skill-detail mt-2 block text-xs text-slate-600">' +
                  escapeHtml(d) +
                  "</span>"
                : "") +
            "</div></div></li>"
        );
    }

    var matchedUi = alignment.matched_skills_ui;
    var missingUi = alignment.missing_skills_ui;
    var legacyM = alignment.matched_skills || [];
    var legacyX = alignment.missing_skills || [];

    if (!matchedUi || !matchedUi.length) {
        matchedUi = legacyM.map(function(s) {
            if (typeof s === "object" && s !== null && (s.skill || s.detail)) return s;
            var lab = typeof s === "string" ? s : (s.skill || "");
            return { skill: lab, detail: "Bu başlık CV’niz ve ilan profiliyle uyumlu görünüyor." };
        });
    }
    if (!missingUi || !missingUi.length) {
        missingUi = legacyX.map(function(s) {
            if (typeof s === "object" && s !== null && (s.skill || s.detail)) return s;
            var lab = typeof s === "string" ? s : (s.skill || "");
            return { skill: lab, detail: "Bu alanı güçlendirmek mülakatta öne çıkmanıza yardımcı olur." };
        });
    }

    var techStack = companyProfile.tech_stack || [];
    document.getElementById("tech-stack").innerHTML = techStack
        .map(function(t) {
            var raw = String(t);
            var kind = arTechBadgeKind(raw, matchedUi, missingUi);
            var check =
                '<span class="material-symbols-outlined text-[15px] text-indigo-600 shrink-0" style="font-variation-settings:\'FILL\' 1,\'wght\' 500">check_circle</span>';
            var plus =
                '<span class="material-symbols-outlined text-[15px] text-indigo-300 shrink-0" style="font-variation-settings:\'FILL\' 0,\'wght\' 400">add_circle</span>';
            var shell =
                kind === "matched"
                    ? "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                    : "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600";
            return (
                "<span class='" +
                shell +
                "'>" +
                (kind === "matched" ? check : plus) +
                "<span>" +
                escapeHtml(raw) +
                "</span></span>"
            );
        })
        .join("") || "<span class='text-on-surface-variant text-sm'>—</span>";

    document.getElementById("matched-skills").innerHTML = matchedUi.map(function(row) {
        var lab = row.skill != null ? String(row.skill) : "";
        var det = row.detail != null ? String(row.detail) : "";
        return rowHtml("matched", lab, det);
    }).join("") || "<li class='border-b border-slate-100 py-4 text-sm text-slate-500 last:border-0'>Eşleşen yetenek listesi için analizi yeniden çalıştırın.</li>";

    document.getElementById("missing-skills").innerHTML = missingUi
        .map(function(row, idx) {
            var lab = row.skill != null ? String(row.skill) : "";
            var det = row.detail != null ? String(row.detail) : "";
            return missingSkillRowHtml(lab, det, idx, escapeHtml);
        })
        .join("") || "<li class='border-b border-slate-100 py-4 text-sm text-slate-500 last:border-0'>Gelişim alanı listesi için analizi yeniden çalıştırın.</li>";

    initMissingSkillLearnResourcesUi();

    var root = document.getElementById("analysis-root");
    if (root) root.classList.add("analysis-ready");
}

function onLayoutReady() {
    try {
        populateAnalysisResult();
    } catch (e) {
        console.error("analysis-result populate:", e);
        window.location.href = "cv-analysis.html";
    }
}
