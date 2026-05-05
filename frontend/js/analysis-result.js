function safeParseJSON(raw, fallback) {
    try {
        if (raw == null || raw === "") return fallback;
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function escapeHtmlStr(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;");
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
        watch: [L("freeCodeCamp — video kurslar", "https://www.freecodecamp.org/"), L("The Odin Project", "https://www.theodinproject.com/")],
        read: [L("MDN Web Docs", "https://developer.mozilla.org/"), L("DevDocs.io", "https://devdocs.io/")],
        practice: [L("Exercism — kod alıştırması", "https://exercism.org/"), L("HackerRank", "https://www.hackerrank.com/")]
    };
    if (!s.trim()) return generic;

    if (/\baws\b|amazon web services/.test(s)) {
        return {
            watch: [L("AWS Skill Builder — videolar", "https://skillbuilder.aws/")],
            read: [L("AWS Dokümantasyonu", "https://docs.aws.amazon.com/")],
            practice: [L("AWS Workshops — eller serbest lab", "https://workshops.aws/"), L("AWS Hands-on training", "https://aws.amazon.com/training/")]
        };
    }
    if (/kubernetes|\bk8s\b/.test(s)) {
        return {
            watch: [L("Kubernetes — resmi YouTube kanalı", "https://www.youtube.com/c/KubernetesCommunity")],
            read: [L("Kubernetes.io dokümantasyon", "https://kubernetes.io/docs/")],
            practice: [
                L("Killercoda — Kubernetes senaryoları", "https://killercoda.com/kubernetes"),
                L("Play with Kubernetes", "https://labs.play-with-k8s.com/"),
                L("CNCF eğitim ve etkinlikler", "https://www.cncf.io/training/")
            ]
        };
    }
    if (/docker|\bcontainer\b/.test(s)) {
        return {
            watch: [L("Docker — resmi YouTube", "https://www.youtube.com/c/Dockerinc")],
            read: [L("Docker — Get Started", "https://docs.docker.com/get-started/"), L("Docker dokümantasyon", "https://docs.docker.com/")],
            practice: [L("Play with Docker", "https://labs.play-with-docker.com/"), L("Docker Hub", "https://hub.docker.com/")]
        };
    }
    if (/react|\bjsx\b/.test(s)) {
        return {
            watch: [L("freeCodeCamp React — içerik ve videolar", "https://www.freecodecamp.org/news/tag/react/")],
            read: [L("React dokümantasyon", "https://react.dev/"), L("React.dev — Learn", "https://react.dev/learn")],
            practice: [L("Full Stack Open — projeler", "https://fullstackopen.com/en/part1")]
        };
    }
    if (/vue\.?js|\bvue\b/.test(s)) {
        return {
            watch: [L("Vue.js — resmi YouTube", "https://www.youtube.com/@VueJS")],
            read: [L("Vue dokümantasyon", "https://vuejs.org/guide/introduction.html")],
            practice: [L("Vue.js — interaktif öğretici", "https://vuejs.org/tutorial/"), L("Vue School pratik", "https://vueschool.io/")]
        };
    }
    if (/angular/.test(s)) {
        return {
            watch: [L("Angular — YouTube (Google Developers)", "https://www.youtube.com/googledevelopers")],
            read: [L("Angular dokümantasyon", "https://angular.dev/overview")],
            practice: [L("Angular — ilk uygulama eğitimi", "https://angular.dev/tutorials/first-app"), L("Angular kaynaklar", "https://angular.dev/resources")]
        };
    }
    if (/\bnode\.?js\b|\bexpress\b/.test(s)) {
        return {
            watch: [L("freeCodeCamp Node.js içerikleri", "https://www.freecodecamp.org/news/tag/node-js/")],
            read: [
                L("Node.js dokümantasyon", "https://nodejs.org/docs/"),
                L("Node.js — başlangıç metni", "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs")
            ],
            practice: [L("Express — ilk kurulum ve örnek", "https://expressjs.com/en/starter/installing.html")]
        };
    }
    if (/python|\bdjango\b|\bfastapi\b|\bflask\b/.test(s)) {
        return {
            watch: [L("freeCodeCamp Python haberleri / kurslar", "https://www.freecodecamp.org/news/tag/python/")],
            read: [
                L("Python.org öğretici", "https://docs.python.org/3/tutorial/"),
                L("Python dokümantasyon", "https://docs.python.org/3/"),
                L("Real Python yazıları", "https://realpython.com/")
            ],
            practice: [L("PyData — topluluk ve örnek projeler", "https://pydata.org/")]
        };
    }
    if (/\bjava\b|\bspring\b/.test(s)) {
        return {
            watch: [L("Oracle Java SE öğren", "https://dev.java/learn/")],
            read: [L("Java dokümantasyon", "https://docs.oracle.com/en/java/")],
            practice: [L("Spring Guides — eller serbest örnekler", "https://spring.io/guides")]
        };
    }
    if (/terraform|\bhcl\b/.test(s)) {
        return {
            watch: [L("HashiCorp — YouTube kanalı", "https://www.youtube.com/c/HashiCorp")],
            read: [L("Terraform dokümantasyon", "https://developer.hashicorp.com/terraform/docs")],
            practice: [
                L("HashiCorp Learn — Terraform tutorial’ları", "https://developer.hashicorp.com/terraform/tutorials"),
                L("Terraform Registry", "https://registry.terraform.io/")
            ]
        };
    }
    if (/ansible/.test(s)) {
        return {
            watch: [L("Ansible — öğretici videolar", "https://www.ansible.com/resources/videos")],
            read: [
                L("Ansible — ilk adımlar", "https://docs.ansible.com/ansible/latest/getting_started/index.html"),
                L("Ansible dokümantasyon", "https://docs.ansible.com/")
            ],
            practice: [L("Ansible Galaxy — roller ve koleksiyonlar", "https://galaxy.ansible.com/")]
        };
    }
    if (/\bgolang\b/.test(s) || /^go$/i.test(String(skillRaw || "").trim())) {
        return {
            watch: [L("Go — öğren sayfası", "https://go.dev/learn/")],
            read: [L("Go dokümantasyon", "https://go.dev/doc/"), L("Effective Go", "https://go.dev/doc/effective_go")],
            practice: [L("A Tour of Go — tarayıcıda alıştırma", "https://go.dev/tour/")]
        };
    }
    if (/rust|\bcargo\b/.test(s)) {
        return {
            watch: [L("Rust — resmi YouTube", "https://www.youtube.com/c/RustProgramming")],
            read: [L("The Rust Book", "https://doc.rust-lang.org/book/"), L("Rust dokümantasyon", "https://doc.rust-lang.org/")],
            practice: [L("Rustlings — alıştırma seti", "https://github.com/rust-lang/rustlings"), L("Rust by Example", "https://doc.rust-lang.org/rust-by-example/")]
        };
    }
    if (/typescript|\bts\b/.test(s)) {
        return {
            watch: [L("TypeScript — resmi YouTube", "https://www.youtube.com/c/TypeScriptOfficial")],
            read: [
                L("TypeScript — el kitabı", "https://www.typescriptlang.org/docs/handbook/intro.html"),
                L("TypeScript dokümantasyon", "https://www.typescriptlang.org/docs/")
            ],
            practice: [L("TS Deep Dive — örnekler", "https://basarat.gitbook.io/typescript/")]
        };
    }
    if (/javascript|\bjs\b|ecmascript/.test(s)) {
        return {
            watch: [L("freeCodeCamp JavaScript", "https://www.freecodecamp.org/news/tag/javascript/")],
            read: [L("MDN JavaScript", "https://developer.mozilla.org/en-US/docs/Web/JavaScript"), L("JavaScript.info", "https://javascript.info/")],
            practice: [L("Eloquent JavaScript — interaktif kitap", "https://eloquentjavascript.net/")]
        };
    }
    if (/sql|postgres|postgresql|mysql|sqlite|redis/.test(s)) {
        return {
            watch: [L("Khan Academy — SQL", "https://www.khanacademy.org/computing/computer-programming/sql")],
            read: [L("PostgreSQL dokümantasyon", "https://www.postgresql.org/docs/"), L("MongoDB dokümantasyon", "https://www.mongodb.com/docs/")],
            practice: [L("SQLBolt — interaktif alıştırma", "https://sqlbolt.com/"), L("Use The Index, Luke! (SQL)", "https://use-the-index-luke.com/")]
        };
    }
    if (/kafka/.test(s)) {
        return {
            watch: [L("Confluent — Kafka eğitim videoları", "https://developer.confluent.io/learn-kafka/")],
            read: [L("Apache Kafka dokümantasyon", "https://kafka.apache.org/documentation/")],
            practice: [L("Kafka quickstart — kurulum ve deneme", "https://kafka.apache.org/quickstart")]
        };
    }
    if (/graphql/.test(s)) {
        return {
            watch: [L("Apollo GraphQL — YouTube", "https://www.youtube.com/c/ApolloGraphQL")],
            read: [L("GraphQL öğren", "https://graphql.org/learn/"), L("GraphQL spesifikasyon", "https://spec.graphql.org/")],
            practice: [L("How to GraphQL — adım adım", "https://www.howtographql.com/")]
        };
    }
    if (/nginx/.test(s)) {
        return {
            watch: [L("NGINX — resmi YouTube", "https://www.youtube.com/c/nginxinc")],
            read: [L("NGINX dokümantasyon", "https://nginx.org/en/docs/"), L("NGINX başlangıç kılavuzu", "https://docs.nginx.com/nginx/admin-guide/")],
            practice: [L("NGINX wiki örnekleri", "https://www.nginx.com/resources/wiki/")]
        };
    }
    if (/linux|\bbash\b|\bshell\b|unix/.test(s)) {
        return {
            watch: [L("freeCodeCamp Linux içerikleri", "https://www.freecodecamp.org/news/tag/linux/")],
            read: [L("GNU Bash manual", "https://www.gnu.org/software/bash/manual/"), L("Arch Wiki (referans)", "https://wiki.archlinux.org/")],
            practice: [L("Linux Journey — interaktif", "https://linuxjourney.com/")]
        };
    }
    if (/\bgit\b|github|gitlab/.test(s)) {
        return {
            watch: [L("Git ve GitHub — video kurs (freeCodeCamp)", "https://www.youtube.com/watch?v=RGOj5yH7evk")],
            read: [L("Git dokümantasyon", "https://git-scm.com/doc"), L("Pro Git kitap", "https://git-scm.com/book/en/v2")],
            practice: [L("Learn Git Branching — interaktif", "https://learngitbranching.js.org/"), L("GitHub Skills — eller serbest lab", "https://skills.github.com/")]
        };
    }
    if (/jenkins|\bci\b|\bcd\b|pipeline|github actions/.test(s)) {
        return {
            watch: [L("Jenkins — resmi YouTube", "https://www.youtube.com/c/JenkinsCI")],
            read: [L("GitHub Actions dokümantasyon", "https://docs.github.com/en/actions"), L("Jenkins kullanıcı kılavuzu", "https://www.jenkins.io/doc/")],
            practice: [L("GitLab CI/CD — pratik konular", "https://about.gitlab.com/topics/ci-cd/")]
        };
    }
    if (/microservice|micro-service|distributed/.test(s)) {
        return {
            watch: [L("Microservices açıklayıcı videolar", "https://www.youtube.com/results?search_query=microservices+architecture+explained")],
            read: [L("Microservices.io kalıpları", "https://microservices.io/"), L("Martin Fowler — mikroservis", "https://martinfowler.com/microservices/")],
            practice: [L("12 Factor App — üretim pratikleri", "https://12factor.net/")]
        };
    }
    if (/oauth|jwt|security|ssl|tls|encryption/.test(s)) {
        return {
            watch: [L("OAuth ve güvenlik videoları", "https://www.youtube.com/results?search_query=oauth+2.0+explained")],
            read: [L("OAuth 2.0 / OpenID", "https://oauth.net/2/"), L("OWASP Top 10", "https://owasp.org/www-project-top-ten/")],
            practice: [L("JWT.io — token oluştur ve doğrula", "https://jwt.io/")]
        };
    }
    if (/html|css|tailwind|frontend|web geliştir/.test(s)) {
        return {
            watch: [L("Kevin Powell — CSS ve HTML", "https://www.youtube.com/@KevinPowellDotCo")],
            read: [L("MDN HTML/CSS öğren", "https://developer.mozilla.org/en-US/docs/Learn"), L("Can I use", "https://caniuse.com/")],
            practice: [L("web.dev — öğren ve dene", "https://web.dev/learn")]
        };
    }
    if (/elastic|opensearch|solr/.test(s)) {
        return {
            watch: [L("Elastic — eğitim videoları", "https://www.elastic.co/explore/training")],
            read: [
                L("Elasticsearch referans", "https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html"),
                L("Elastic dokümantasyon indeksi", "https://www.elastic.co/guide/index.html")
            ],
            practice: [L("Elastic ücretsiz hands-on", "https://www.elastic.co/training/free")]
        };
    }

    return generic;
}

/** Konu başlığına göre sabit “canlı” içerik — İzle / Oku / Pratik üçlüsü */
function arLearnCuratedTopics() {
    function L(label, href) {
        return { label: label, href: href };
    }
    return {
        spring_boot: {
            watch: [L("Spring Boot — hızlı başlangıç (video)", "https://www.youtube.com/watch?v=9SGDpanQsQg")],
            read: [L("Spring Boot Reference Documentation", "https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/")],
            practice: [L("Spring Boot ile REST web servisi — Building a RESTful Web Service", "https://spring.io/guides/gs/rest-service/")]
        },
        kafka: {
            watch: [L("Kafka Temelleri — 10 dakika", "https://www.youtube.com/watch?v=Ch9V7JnfFkA")],
            read: [L("Apache Kafka Resmi Dokümantasyonu", "https://kafka.apache.org/documentation/")],
            practice: [L("Kafka ile Message Queue Uygulaması — Quickstart & örnekler", "https://kafka.apache.org/quickstart")]
        },
        aws: {
            watch: [L("AWS Skill Builder — başlangıç videoları", "https://skillbuilder.aws/")],
            read: [L("AWS Dokümantasyon Merkezi", "https://docs.aws.amazon.com/")],
            practice: [L("AWS Workshops — eller serbest laboratuvar", "https://workshops.aws/")]
        },
        kubernetes: {
            watch: [L("Kubernetes — giriş serisi (CNCF)", "https://www.youtube.com/c/KubernetesCommunity")],
            read: [L("Kubernetes.io — Resmi Dokümantasyon", "https://kubernetes.io/docs/")],
            practice: [L("Killercoda — Kubernetes senaryoları", "https://killercoda.com/kubernetes")]
        },
        docker: {
            watch: [L("Docker — temeller (resmi kanal)", "https://www.youtube.com/c/Dockerinc")],
            read: [L("Docker Dokümantasyon — Get Started", "https://docs.docker.com/get-started/")],
            practice: [L("Play with Docker — Tarayıcıda pratik", "https://labs.play-with-docker.com/")]
        },
        react: {
            watch: [L("React — tam kurs girişi (video)", "https://www.youtube.com/watch?v=SqcY0GlETPk")],
            read: [L("React.dev — Resmi Dokümantasyon ve Learn", "https://react.dev/")],
            practice: [L("React.dev — interaktif öğren", "https://react.dev/learn")]
        },
        python: {
            watch: [L("Python — sıfırdan (video serisi)", "https://www.youtube.com/watch?v=kqtD5dpn9C8")],
            read: [L("Python.org — Öğretici ve dil referansı", "https://docs.python.org/3/tutorial/")],
            practice: [L("Exercism — Python alıştırmaları", "https://exercism.org/tracks/python")]
        },
        typescript: {
            watch: [L("TypeScript — resmi kanal videoları", "https://www.youtube.com/c/TypeScriptOfficial")],
            read: [L("TypeScript El Kitabı ve Dil Referansı", "https://www.typescriptlang.org/docs/")],
            practice: [L("TypeScript Playground — Canlı dene", "https://www.typescriptlang.org/play")]
        },
        sql: {
            watch: [L("SQL — Temeller (Khan Academy)", "https://www.khanacademy.org/computing/computer-programming/sql")],
            read: [L("PostgreSQL Dokümantasyonu", "https://www.postgresql.org/docs/")],
            practice: [L("SQLBolt — İnteraktif alıştırma", "https://sqlbolt.com/")]
        },
        terraform: {
            watch: [L("Terraform — HashiCorp öğretici videoları", "https://www.youtube.com/c/HashiCorp")],
            read: [L("Terraform Dokümantasyonu", "https://developer.hashicorp.com/terraform/docs")],
            practice: [L("HashiCorp Learn — Terraform tutorial’ları", "https://developer.hashicorp.com/terraform/tutorials")]
        },
        git: {
            watch: [L("Git ve GitHub — Komple kurs (video)", "https://www.youtube.com/watch?v=RGOj5yH7evk")],
            read: [L("Git — Resmi dokümantasyon", "https://git-scm.com/doc")],
            practice: [L("Learn Git Branching — İnteraktif", "https://learngitbranching.js.org/")]
        },
        graphql: {
            watch: [L("GraphQL — Apollo kanalı", "https://www.youtube.com/c/ApolloGraphQL")],
            read: [L("GraphQL — Öğren ve Spesifikasyon", "https://graphql.org/learn/")],
            practice: [L("How to GraphQL — Adım adım pratik", "https://www.howtographql.com/")]
        },
        elasticsearch: {
            watch: [L("Elastic — Video eğitim merkezi", "https://www.elastic.co/explore/training")],
            read: [L("Elasticsearch Referans Kılavuzu", "https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html")],
            practice: [L("Elastic — Ücretsiz hands-on lab", "https://www.elastic.co/training/free")]
        },
        mongodb: {
            watch: [L("MongoDB — resmi YouTube", "https://www.youtube.com/user/MongoDB")],
            read: [L("MongoDB Manual", "https://www.mongodb.com/docs/manual/")],
            practice: [L("MongoDB University — ücretsiz kurslar", "https://learn.mongodb.com/")]
        }
    };
}

/** İlk eşleşen konunun sabit paketini döndürür */
function matchCuratedLearningPack(skillRaw) {
    var s = String(skillRaw || "");
    var C = arLearnCuratedTopics();
    var rules = [
        [/spring\s*boot|springboot/i, "spring_boot"],
        [/\bspring\b/i, "spring_boot"],
        [/\bkafka\b/i, "kafka"],
        [/\baws\b|amazon web services/i, "aws"],
        [/kubernetes|\bk8s\b/i, "kubernetes"],
        [/docker|\bcontainer\b/i, "docker"],
        [/react|\bjsx\b/i, "react"],
        [/python|\bdjango\b|\bfastapi\b|\bflask\b/i, "python"],
        [/typescript|\bts\b/i, "typescript"],
        [/mongodb/i, "mongodb"],
        [/sql|postgres|postgresql|mysql|sqlite|redis/i, "sql"],
        [/terraform|\bhcl\b/i, "terraform"],
        [/\bgit\b|github|gitlab/i, "git"],
        [/graphql/i, "graphql"],
        [/elastic|opensearch|solr/i, "elasticsearch"]
    ];
    for (var i = 0; i < rules.length; i++) {
        if (rules[i][0].test(s)) {
            var pack = C[rules[i][1]];
            if (pack) return pack;
        }
    }
    return null;
}

/** Dinamik + sabit içeriği birleştirir; boş sekmeleri genel listeden doldurur */
function resolveLearningPack(skillRaw) {
    var dyn = learningResourcesForSkill(skillRaw);
    var cur = matchCuratedLearningPack(skillRaw);
    var gen = learningResourcesForSkill("");
    function uniqMerge(a, b) {
        var seen = {};
        var out = [];
        function add(arr) {
            if (!arr || !arr.length) return;
            arr.forEach(function(item) {
                var h = item.href || "";
                if (!h || seen[h]) return;
                seen[h] = true;
                out.push(item);
            });
        }
        add(a);
        add(b);
        return out;
    }
    var pack = cur
        ? {
              watch: uniqMerge(cur.watch, dyn.watch),
              read: uniqMerge(cur.read, dyn.read),
              practice: uniqMerge(cur.practice, dyn.practice)
          }
        : dyn;
    return {
        watch: pack.watch && pack.watch.length ? pack.watch : gen.watch || [],
        read: pack.read && pack.read.length ? pack.read : gen.read || [],
        practice: pack.practice && pack.practice.length ? pack.practice : gen.practice || []
    };
}

function linkListHtmlForLearnModal(links, esc, tabKind) {
    var escapeHtml = esc || escapeHtmlStr;
    var kind = tabKind || "read";
    var iconVideo =
        '<svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>';
    var iconBook =
        '<svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>';
    var iconPractice =
        '<svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
    var lead = kind === "watch" ? iconVideo : kind === "practice" ? iconPractice : iconBook;
    var emptyState =
        '<div class="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/90 p-4 text-sm leading-relaxed text-slate-600">' +
        '<svg class="h-5 w-5 shrink-0 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
        '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>' +
        "</svg>" +
        "<span>Yapay zeka bu konu için en güncel kaynakları tarıyor<span class=\"text-indigo-400\">…</span></span>" +
        "</div>";
    if (!links || !links.length) {
        return emptyState;
    }
    return (
        '<ul class="m-0 list-none space-y-3 p-0">' +
        links
            .map(function(Li) {
                return (
                    '<li><a class="group flex items-start gap-4 rounded-xl border border-transparent bg-gray-50 p-4 text-sm leading-snug text-slate-800 shadow-sm transition hover:border-indigo-500 hover:bg-gray-50" href="' +
                    escapeHtml(Li.href) +
                    '" target="_blank" rel="noopener noreferrer">' +
                    lead +
                    '<span class="min-w-0 flex-1 pt-0.5 text-slate-800 group-hover:text-indigo-900">' +
                    escapeHtml(Li.label) +
                    '</span><span class="mt-1 shrink-0 text-xs text-slate-400 group-hover:text-indigo-600" aria-hidden="true">↗</span></a></li>'
                );
            })
            .join("") +
        "</ul>"
    );
}

function setArLearnModalTab(tab) {
    ["watch", "read", "practice"].forEach(function(t) {
        var panel = document.getElementById("ar-learn-panel-" + t);
        var btn = document.getElementById("ar-learn-tab-" + t);
        var sel = t === tab;
        if (panel) {
            panel.classList.toggle("hidden", !sel);
            panel.hidden = !sel;
        }
        if (btn) btn.setAttribute("aria-selected", sel ? "true" : "false");
    });
}

function closeArLearnModal() {
    var modal = document.getElementById("ar-learn-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
}

function openArLearnModal(skillRaw) {
    var esc = escapeHtmlStr;
    var pack = resolveLearningPack(skillRaw);
    var skillTrim = String(skillRaw || "").trim() || "Bu konu";
    var titleEl = document.getElementById("ar-learn-modal-title");
    var watchEl = document.getElementById("ar-learn-panel-watch");
    var readEl = document.getElementById("ar-learn-panel-read");
    var practiceEl = document.getElementById("ar-learn-panel-practice");
    var simEl = document.getElementById("ar-learn-sim-cta");
    if (titleEl) titleEl.textContent = skillTrim + " Gelişim Rehberi";
    if (watchEl) watchEl.innerHTML = linkListHtmlForLearnModal(pack.watch, esc, "watch");
    if (readEl) readEl.innerHTML = linkListHtmlForLearnModal(pack.read, esc, "read");
    if (practiceEl) practiceEl.innerHTML = linkListHtmlForLearnModal(pack.practice, esc, "practice");
    if (simEl)
        simEl.href =
            "interviews.html?topic=" +
            encodeURIComponent(skillTrim) +
            "&mode=fast-track";
    var modal = document.getElementById("ar-learn-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    setArLearnModalTab("watch");
}

/** Tek modal — backdrop, X, Escape, sekme geçişleri */
function initArLearnModalUi() {
    if (initArLearnModalUi._done) return;
    initArLearnModalUi._done = true;

    document.addEventListener("click", function(e) {
        var trig = e.target.closest(".ar-missing-learn-btn");
        var ms = document.getElementById("missing-skills");
        if (trig && ms && ms.contains(trig)) {
            e.preventDefault();
            var sk = trig.getAttribute("data-ar-skill");
            if (sk != null && sk !== "") openArLearnModal(sk);
            return;
        }
        if (e.target.id === "ar-learn-modal-backdrop") {
            closeArLearnModal();
        }
    });

    var closeBtn = document.getElementById("ar-learn-modal-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", function() {
            closeArLearnModal();
        });
    }

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            var modal = document.getElementById("ar-learn-modal");
            if (modal && !modal.classList.contains("hidden")) closeArLearnModal();
        }
    });

    ["watch", "read", "practice"].forEach(function(t) {
        var btn = document.getElementById("ar-learn-tab-" + t);
        if (btn) {
            btn.addEventListener("click", function() {
                setArLearnModalTab(t);
            });
        }
    });
}

function missingSkillRowHtml(label, detail, index, escapeHtml) {
    var d = (detail || "").trim();
    var safeLabel = escapeHtml(label);
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
        '<button type="button" class="ar-missing-learn-btn inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-transparent px-2 py-1 text-[10px] font-light leading-none text-indigo-500 transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-200/90 focus-visible:ring-offset-1" title="Gelişim rehberi ve kaynaklar" aria-haspopup="dialog" aria-controls="ar-learn-modal" data-ar-skill="' +
        escapeHtmlAttr(label) +
        '" id="ar-learn-btn-' +
        index +
        '">' +
        bookOpenSvg +
        '<span class="whitespace-nowrap">Kaynakları Gör</span>' +
        "</button>" +
        "</div>" +
        "</div>" +
        "</div></div></div></li>"
    );
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

    initArLearnModalUi();

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
