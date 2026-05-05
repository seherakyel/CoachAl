/**
 * Merkezi gelişim / mülakat hazırlık içeriği.
 * Erişim: window.coachingData[anahtar], eşleşme için window.coachingAliases
 */
(function (global) {
    var D = {};

    function w(title, url, duration) {
        return { title: title, url: url, duration: duration || "" };
    }
    function r(title, url, source) {
        return { title: title, url: url, source: source || "" };
    }
    function c(question, idealAnswer, coachTip) {
        return { question: question, idealAnswer: idealAnswer, coachTip: coachTip };
    }

    D.kafka = {
        watch: [
            w("Kafka Temelleri — giriş", "https://www.youtube.com/watch?v=Ch9V7JnfFkA", "≈10 dk"),
            w("Confluent — Kafka eğitim videoları", "https://developer.confluent.io/learn-kafka/", "Seri"),
        ],
        read: [
            r("Apache Kafka Documentation", "https://kafka.apache.org/documentation/", "Apache"),
            r("Kafka Introduction", "https://kafka.apache.org/intro", "Apache"),
        ],
        cheatSheet: [
            c(
                "Kafka’da broker ve topic ilişkisini nasıl açıklarsınız?",
                "Broker’lar fiziksel süreçlerdir; topic’ler mantıksal akış kanallarıdır. Producer mesajı partition’a yazar, partition’lar cluster içinde replike edilir; consumer group ile paralel okuma ve ölçekleme sağlanır.",
                "Bu soruda mutlaka partition, replication factor ve consumer group kavramlarından bahsedin."
            ),
            c(
                "At-least-once ve exactly-once teslimat arasındaki fark nedir?",
                "At-least-once’da başarısız işlem sonrası yeniden teslim mümkündür (duplicate riski). Exactly-once için idempotent producer ve transaction API ile okuma-yazma atomik hale getirilir.",
                "Bu soruda mutlaka idempotent producer ve transaction (veya Kafka Streams EOS) terimlerini anın."
            ),
            c(
                "Partition anahtarı (key) seçimi neden önemlidir?",
                "Key aynı değere sahip mesajların aynı partition’a düşmesini sağlar; sıra garantisi partition içindedir. Yanlış key dağılımı hotspot ve dengesiz yük oluşturur.",
                "Bu soruda mutlaka partition içi sıra ve key hashing çizgisinden bahsedin."
            ),
            c(
                "Kafka’yı neden mesaj kuyruğu (JMS) yerine tercih edersiniz?",
                "Yüksek verim, uzun süreli saklama (log), replay ve çoklu consumer group ile bağımsız tüketim; gevşek bağlı mikroservisler için uygun streaming omurgası sunar.",
                "Bu soruda mutlaka log tabanlı mimari ve replay senaryosundan örnek verin."
            ),
            c(
                "Retention ve compaction politikalarını ne zaman kullanırsınız?",
                "Retention süresi veya boyutu ile eski segmentler silinir; compaction ile topic başına son değer saklanır (changelog senaryoları). Birlikte maliyet ve okuma modeline göre seçilir.",
                "Bu soruda mutlaka retention.ms vs cleanup.policy=compact ayrımını netleştirin.",
            ),
        ],
    };

    D.spring_boot = {
        watch: [
            w("Spring Boot — hızlı başlangıç", "https://www.youtube.com/watch?v=9SGDpanQsQg", "Uzun form"),
            w("Spring Boot referans özeti", "https://spring.io/projects/spring-boot", "Resmi"),
        ],
        read: [
            r("Spring Boot Reference", "https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/", "Spring"),
            r("Spring Guides", "https://spring.io/guides", "Spring"),
        ],
        cheatSheet: [
            c(
                "Spring Boot’un servlet container’ı nasıl gömülü getirdiğini anlatır mısınız?",
                "Fat jar içinde gömülü Tomcat/Jetty ile tek artefakt olarak çalışır; autoconfigure classpath’teki starter’lara göre bean’leri kurar.",
                "Bu soruda mutlaka auto-configuration ve starter bağımlılıklarından bahsedin."
            ),
            c(
                "application.yml ile profile kullanımını nasıl yönetirsiniz?",
                "spring.profiles.active ile dev/prod ayrımı; profile özel yaml ile ortam değişkenleri ve secret’lar ayrıştırılır.",
                "Bu soruda mutlaka profile ve configuration binding kavramını vurgulayın."
            ),
            c(
                "REST endpoint’te validation ve global exception handling?",
                "Bean Validation ile @Valid; @ControllerAdvice ile merkezi hata gövdesi ve HTTP kodları.",
                "Bu soruda mutlaka @ControllerAdvice ve Problem Details tarzı yanıt örnekleyin."
            ),
            c(
                "Spring Boot’ta veritabanı migrasyonu için ne kullanırsınız?",
                "Flyway veya Liquibase ile şema versiyonlaması; CI/CD’de idempotent migrasyon.",
                "Bu soruda mutlaka Flyway/Liquibase ve migration sırasından bahsedin."
            ),
            c(
                "Actuator ile üretim gözlemini nasıl sunarsınız?",
                "Health, metrics, prometheus endpoint’leri; güvenlik için exposure kısıtlaması ve auth.",
                "Bu soruda mutlaka actuator endpoint exposure ve güvenlik etkisini anın.",
            ),
        ],
    };

    D.aws = {
        watch: [w("AWS Skill Builder", "https://skillbuilder.aws/", "Katalog")],
        read: [r("AWS Dokümantasyon", "https://docs.aws.amazon.com/", "AWS")],
        cheatSheet: [
            c("EC2 vs ECS Fargate seçiminde hangi kriterler öne çıkar?", "VM kontrolü vs sunucusuz konteyner işletimi; operasyon yükü, maliyet modeli ve ölçek hızına göre seçim.", "Bu soruda mutlaka pay-as-you-go ve operasyon sorumluluğu ayrımından bahsedin."),
            c("S3’te dayanıklılık ve erişim desenini nasıl tarif edersiniz?", "Versioning, lifecycle, replication; erişim için IAM ve bucket policy katmanı.", "Bu soruda mutlaka IAM least privilege ve bucket policy birlikteliğinden örnek verin."),
            c("VPC alt ağ ve güvenlik grubu ilişkisi?", "Subnet AZ’ye bağlı; SG stateful filtre; NACL opsiyonel ek katman.", "Bu soruda mutlaka security group stateful doğasından bahsedin."),
            c("RDS Multi-AZ ile okuma replikası farkı?", "Multi-AZ failover odaklı senkron; read replica okuma ölçekleme ve isteğe bağlı DR.", "Bu soruda mutlaka failover ve replika gecikme profilini ayırın."),
            c("CloudWatch ile alarm ve metrik akışı?", "Metrik filtreleri, alarm → SNS/Lambda; structured logging ile korelasyon.", "Bu soruda mutlaka alarm tetikleyici ve bildirim kanalından örnek verin."),
        ],
    };

    D.kubernetes = {
        watch: [w("Kubernetes Community — kanal", "https://www.youtube.com/c/KubernetesCommunity", "Çoklu video")],
        read: [r("Kubernetes Docs", "https://kubernetes.io/docs/", "CNCF")],
        cheatSheet: [
            c("Pod ve Deployment farkı nedir?", "Pod en küçük çalışma birimi; Deployment replica set ile rollout ve geri alma sağlar.", "Bu soruda mutlaka ReplicaSet ve rollout history kavramından bahsedin."),
            c("Service türleri (ClusterIP, NodePort, LoadBalancer) ne zaman seçilir?", "İç iletişim, dışa expose ve bulut LB entegrasyon senaryolarına göre.", "Bu soruda mutlaka ClusterIP vs LoadBalancer kullanımını örnekle anlatın."),
            c("ConfigMap ve Secret kullanımı?", "Konfigürasyon ayrıştırma; Secret base64 saklar, RBAC ve etcd şifreleme ile sertleştirilir.", "Bu soruda mutlaka Secret rotation ve RBAC ile birlikte düşünün."),
            c("Resource requests/limits neden kritik?", "Scheduler yerleştirme ve OOM/contention önleme; QoS sınıfları.", "Bu soruda mutlaka requests/limits ve QoS class etkisinden bahsedin."),
            c("Ingress controller rolü?", "L7 yönlendirme ve TLS sonlandırma; NGINX/ALB gibi controller seçimi.", "Bu soruda mutlaka Ingress vs Service L4 ayrımını netleştirin."),
        ],
    };

    D.docker = {
        watch: [w("Docker — resmi kanal", "https://www.youtube.com/c/Dockerinc", "Çoklu içerik")],
        read: [r("Docker Docs", "https://docs.docker.com/", "Docker Inc.")],
        cheatSheet: [
            c("Image katmanları ve cache avantajı?", "Her Dockerfile satırı katman üretir; değişmeyen katmanlar cache’ten gelir, build hızlanır.", "Bu soruda mutlaka layer cache ve multi-stage build deneyiminizi özetleyin."),
            c("CMD ile ENTRYPOINT farkı?", "ENTRYPOINT sabit çalıştırılabilir; CMD varsayılan argümanlar.", "Bu soruda mutlaka shell vs exec form farkından bahsedin."),
            c("Container güvenliği için hangi pratikleri uygularsınız?", "Non-root user, minimal base image, CVE tarama, read-only FS mümkün olduğunca.", "Bu soruda mutlaka least privilege ve image scanning araçlarından örnek verin."),
            c("Docker Compose ile prod uyumu?", "Geliştirme ve küçük ortamlar için ideal; prod’da çoğu zaman orchestrator tercih edilir.", "Bu soruda mutlaka Compose vs Kubernetes operasyon yükü karşılaştırması yapın."),
            c("Volume türleri ve veri kalıcılığı?", "Named volume vs bind mount; veritabanı için uygun driver ve yedekleme.", "Bu soruda mutlaka bind mount riskini (host bağımlılığı) anın."),
        ],
    };

    D.react = {
        watch: [w("React — giriş videoları", "https://react.dev/learn", "Resmi")],
        read: [r("React Beta Docs", "https://react.dev/", "Meta / React team")],
        cheatSheet: [
            c("Virtual DOM ve reconciliation avantajı?", "Minimal DOM güncellemesi ile performans; Fiber ile önceliklendirilmiş güncelleme.", "Bu soruda mutlaka reconciliation ve key prop öneminden bahsedin."),
            c("useEffect bağımlılık dizisini nasıl doğru kurarsınız?", "Eksik bağımlılık stale closure üretir; efekt içinde cleanup ile subscription sızıntısı önlenir.", "Bu soruda mutlaka cleanup fonksiyonu ve dependency array disiplininden örnek verin."),
            c("Server Components vs Client Components (uygun bağlamda)?", "Sunucuda render ile bundle küçültme; etkileşim için client boundary.", "Bu soruda mutlaka framework bağlamında (ör. Next) hidrasyon çizgisinden bahsedin."),
            c("State lifting ne zaman gerekir?", "İki kardeş bileşen ortak durumu paylaşıyorsa state ortak ata’ya taşınır.", "Bu soruda mutlaka tek doğruluk kaynağı ilkesini vurgulayın."),
            c("Performans için memoization araçları?", "React.memo, useMemo, useCallback — ölçülü kullanım; erken optimizasyon tuzakları.", "Bu soruda mutlaka referans eşitliği ve gereksiz memo maliyetinden bahsedin."),
        ],
    };

    D.python = {
        watch: [w("Python temelleri — playlist önerisi", "https://www.youtube.com/results?search_query=python+tutorial+turkish", "Arama")],
        read: [r("Python Tutorial", "https://docs.python.org/3/tutorial/", "Python.org")],
        cheatSheet: [
            c("GIL nedir ve çok iş parçacıklı CPU bağlı işlerde etkisi?", "Global Interpreter Lock tek thread’de bytecode çalıştırır; CPU-bound için multiprocessing veya native genişletme.", "Bu soruda mutlaka threading vs multiprocessing ayrımını örnekle anlatın."),
            c("List comprehension ile generator expression farkı?", "Comprehension liste üretir; generator lazy iterator ile bellek dostudur.", "Bu soruda mutlaka lazy evaluation ve bellek profilinden bahsedin."),
            c("Virtualenv ve bağımlılık kilidi?", "venv + pip-tools/poetry ile reproducible build.", "Bu soruda mutlaka reproducible environment ve semver kaynaklı kırılmalardan örnek verin."),
            c("Decorator pattern Python’da nasıl işler?", "Üst düzey fonksiyon ile meta programlama; logging ve auth için sık kullanılır.", "Bu soruda mutlaka closure ve functools.wraps etkisinden bahsedin."),
            c("Tip ipuçları (typing) neden önemli?", "IDE desteği ve statik analiz; Protocol ve TypedDict ile veri şekli.", "Bu soruda mutlaka mypy/pyright ile CI entegrasyonundan bahsedin."),
        ],
    };

    D.typescript = {
        watch: [w("TypeScript — resmi kanal", "https://www.youtube.com/c/TypeScriptOfficial", "Çoklu video")],
        read: [r("TypeScript Handbook", "https://www.typescriptlang.org/docs/handbook/intro.html", "Microsoft")],
        cheatSheet: [
            c("interface vs type alias ne zaman tercih edilir?", "interface merge edilebilir; union/intersection karmaşık tiplerde type kullanımı yaygın.", "Bu soruda mutlaka declaration merging ve union dağılımından bahsedin."),
            c("unknown ve any farkı?", "unknown güvenli üst küme; any kontrolü devre dışı bırakır.", "Bu soruda mutlaka unknown üzerinde daraltma (narrowing) örneği verin."),
            c("Generics ile API client tip güvenliği?", "T response gövdesini parametreler.", "Bu soruda mutlaka generic constraint ve keyof kullanımından örnek verin."),
            c("Strict mode ailesinin faydası?", "strictNullChecks ile null hataları erken yakalanır.", "Bu soruda mutlaka tsconfig strict bayraklarından bahsedin."),
            c("Utility types örnekleri?", "Partial, Pick, Omit — API DTO dönüşümleri için.", "Bu soruda mutlaka mapped types düşüncesini kısaca anlatın."),
        ],
    };

    D.sql = {
        watch: [w("SQL temelleri — Khan Academy", "https://www.khanacademy.org/computing/computer-programming/sql", "İngilizce")],
        read: [r("PostgreSQL Docs", "https://www.postgresql.org/docs/", "PostgreSQL")],
        cheatSheet: [
            c("İndeks seçimi ve sorgu planı?", "B-tree çoğu eşitlik/aralık için; composite indeks sütun sırası kritik.", "Bu soruda mutlaka EXPLAIN ANALYZE okumasını örnekle anlatın."),
            c("Transaction isolation ve phantom read?", "Isolation seviyesi anomalileri belirler; MVCC ile çoğu motor ölçeklenir.", "Bu soruda mutlaka isolation level tablosundan özet geçin."),
            c("JOIN türleri ve ne zaman kullanılır?", "INNER filtreler; LEFT sağ taraf boş kalabilir; FULL nadir.", "Bu soruda mutlaka semi-join ve anti-join ihtiyacından bahsedin."),
            c("Normalizasyon vs denormalizasyon?", "Yazma tutarlılığı için normalize; okuma performansı için kontrollü denormalize.", "Bu soruda mutlaka CQRS perspektifini kısaca bağlayın."),
            c("Window fonksiyonları ile ranking?", "ROW_NUMBER vs RANK vs DENSE_RANK farkları.", "Bu soruda mutlaka PARTITION BY kullanımından örnek verin."),
        ],
    };

    D.terraform = {
        watch: [w("HashiCorp Terraform", "https://www.youtube.com/c/HashiCorp", "Kanal")],
        read: [r("Terraform Docs", "https://developer.hashicorp.com/terraform/docs", "HashiCorp")],
        cheatSheet: [
            c("Terraform state’in önemi?", "Gerçek dünya ile konfigürasyon eşlemesi; remote state ve locking ile ekip çalışması.", "Bu soruda mutlaka state locking ve remote backend seçiminden bahsedin."),
            c("Plan ve apply ayrımı?", "Önce dry-run plan; sonra apply ile kontrollü değişiklik.", "Bu soruda mutlaka drift detection ihtiyacından örnek verin."),
            c("Module kullanımı?", "Tekrar kullanılabilir bileşenler; input/output sözleşmesi.", "Bu soruda mutlaka module versioning ve registry kullanımından bahsedin."),
            c("Workspaces vs dizin ayrımı?", "Workspace aynı kod farklı tfvars; mono-repo stratejisi.", "Bu soruda mutlaka ortam ayrımı pratiklerini karşılaştırın."),
            c("Provision sonrası yapılandırma (ör. helm) ile sınır?", "Terraform altyapı; üst katman süreçleri ile sorumluluk paylaşımı.", "Bu soruda mutlaka provisioning vs configuration management ayrımını netleştirin."),
        ],
    };

    D.git = {
        watch: [w("Git ve GitHub — popüler giriş videosu", "https://www.youtube.com/watch?v=RGOj5yH7evk", "Uzun")],
        read: [r("Pro Git book", "https://git-scm.com/book/en/v2", "Git SCM")],
        cheatSheet: [
            c("Merge ve rebase stratejisi?", "Merge tarih şeması korur; rebase doğrusal tarih üretir; ekip politikasına bağlı.", "Bu soruda mutlaka interactive rebase riskini (paylaşılan dal) anlatın."),
            c("Cherry-pick ne zaman?", "Tek commit seçerek taşıma; hotfix senaryoları.", "Bu soruda mutlaka conflict çözümünden örnek verin."),
            c("Git hooks ile kalite kapısı?", "pre-commit lint/test; CI ile tamamlayıcı.", "Bu soruda mutlaka client-side vs server-side hook güvenliği farkını anın."),
            c("Large file repo için çözümler?", "Git LFS veya repo parçalama; shallow clone.", "Bu soruda mutlaka monorepo ölçek sorunlarından bahsedin."),
            c("Signing commits ve güvenilir kaynak?", "SSH/GPG ile doğrulanmış commit.", "Bu soruda mutlaka supply chain güvenliği bağlamında önemini vurgulayın."),
        ],
    };

    D.graphql = {
        watch: [w("Apollo GraphQL", "https://www.youtube.com/c/ApolloGraphQL", "Kanal")],
        read: [r("GraphQL Learn", "https://graphql.org/learn/", "GraphQL Foundation")],
        cheatSheet: [
            c("REST’ten GraphQL’e geçiş motivasyonu?", "Tek endpoint, istemci ihtiyacına göre şekil alan veri; overfetch azaltma.", "Bu soruda mutlaka N+1 problemine ve DataLoader çözümünden bahsedin."),
            c("Schema tasarımında nullable kuralları?", "Varsayılan nullable; Required ile kontrat sıkılaştırılır.", "Bu soruda mutlaka error handling ve partial success politikasından örnek verin."),
            c("Mutation idempotency?", "İstemci üretilen idempotency key ile tekrar güvenli işlem.", "Bu soruda mutlaka ağ kesintisi senaryosundan bahsedin."),
            c("Subscription ve WebSocket ölçekleme?", "Bağlantı sayısı ve pub/sub omurgası.", "Bu soruda mutlaka backpressure ve fan-out maliyetinden bahsedin."),
            c("Versiyonlama stratejisi?", "Alan ekleme ve deprecation takvimi; şema kayıt defteri.", "Bu soruda mutlaka backward compatibility prensiplerinden bahsedin."),
        ],
    };

    D.elasticsearch = {
        watch: [w("Elastic training", "https://www.elastic.co/explore/training", "Video katalog")],
        read: [r("Elasticsearch Reference", "https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html", "Elastic")],
        cheatSheet: [
            c("Inverted index ile tam metin arama?", "Terim → doküman haritası; hızlı lookup.", "Bu soruda mutlaka analyzer ve tokenizer seçiminden örnek verin."),
            c("Shard ve replica ayarı?", "Ölçek ve hataya dayanıklılık; kaynak maliyeti dengesi.", "Bu soruda mutlaka split-brain riskinden ve quorum’dan bahsedin."),
            c("Mapping dinamik mi sabit mi?", "Üretimde mümkün olduğunca explicit mapping.", "Bu soruda mutlaka field type yanlış çıkarımı sorunundan örnek verin."),
            c("BM25 ve skorlama?", "Varsayılan relevance; boost ile iş kuralları.", "Bu soruda mutlaka function_score ile iş önceliği örneği verin."),
            c("Snapshot ve restore?", "Yedekleme politikası ve cluster restore testleri.", "Bu soruda mutlaka RPO/RTO hedefleriyle bağlayın."),
        ],
    };

    D.mongodb = {
        watch: [w("MongoDB — YouTube", "https://www.youtube.com/user/MongoDB", "Kanal")],
        read: [r("MongoDB Manual", "https://www.mongodb.com/docs/manual/", "MongoDB Inc.")],
        cheatSheet: [
            c("Embedding vs referencing?", "Tek dokümanda gömülü ilişki vs ayrı koleksiyon referansı; sorgu ve güncelleme desenine göre.", "Bu soruda mutlaka 1-N ve büyük belge bloğu riskinden bahsedin."),
            c("Index stratejisi?", "Compound index sırası sorgu şekline göre; covered query avantajı.", "Bu soruda mutlaka EXPLAIN çıktısı ve indeks kullanımından bahsedin."),
            c("Replica set seçimleri?", "Çoğunluk yazma; okuma tercihi secondary ile dikkatli eventual consistency.", "Bu soruda mutlaka read preference etkisinden örnek verin."),
            c("Aggregation pipeline gücü?", "Çok aşamalı dönüşüm; $lookup ile join benzeri işlem.", "Bu soruda mutlaka $facet ile paralel alt pipeline örneği verin."),
            c("Şema esnekliği ile migrasyon?", "Versiyon alanı ve lazy migration desenleri.", "Bu soruda mutlaka backward compatible document shape değişiminden bahsedin."),
        ],
    };

    D.vue = {
        watch: [w("Vue.js — resmi kanal", "https://www.youtube.com/@VueJS", "Playlist")],
        read: [r("Vue — Rehber", "https://vuejs.org/guide/introduction.html", "Vue")],
        cheatSheet: [
            c("Composition API’yi neden tercih edersiniz?", "Mantıksal endişe ayrımı ve tekrar kullanılabilir composable’lar; büyük bileşenlerde okunabilirlik artar.", "Bu soruda mutlaka ref/reactive ve composable örneklerinden bahsedin."),
            c("Vue’da reaktivite nasıl çalışır?", "Proxy ile izlenen nesne; bağımlılık takibi ile DOM güncellenir.", "Bu soruda mutlaka Proxy vs Vue 2 Object.defineProperty farkını kısaca anın."),
            c("provide / inject kullanımı?", "Derin prop drilling yerine bağımlılık enjeksiyonu; plugin ve tema senaryolarında yararlıdır.", "Bu soruda mutlaka symbol tabanlı anahtar ve tip güvenliği düşüncesinden örnek verin."),
            c("Vue Router’da navigation guard?", "beforeEnter ile yetkilendirme; lazy route ile code splitting.", "Bu soruda mutlaka async guard ve redirect zincirinden bahsedin."),
            c("SSR ve hidrasyon?", "Sunucuda HTML; istemcide Vue bağlar; dikkat edilmezse mismatch oluşur.", "Bu soruda mutlaka SSR güvenli yaşam döngüsünden örnek verin."),
        ],
    };

    D.angular = {
        watch: [w("Angular — Google Developers", "https://www.youtube.com/googledevelopers", "Kanal")],
        read: [r("Angular dokümantasyon", "https://angular.dev/overview", "Google")],
        cheatSheet: [
            c("Dependency Injection Angular’da nasıl?", "Hiyerarşik enjektör; tree-shakable provider’lar.", "Bu soruda mutlaka providedIn: root ve scope seçiminden bahsedin."),
            c("Zone.js olmadan Angular?", "Signal tabanlı veya manual change detection ile daha öngörülebilir güncelleme.", "Bu soruda mutlaka zone polyfill maliyetinden bahsedin."),
            c("Standalone components avantajı?", "NgModule’sız bileşen; lazy boundary kolaylaşır.", "Bu soruda mutlaka migration ve route lazy loading bağlantısı yapın."),
            c("RxJS ile async pipe?", "Subscription yönetimi şablonda otomatik; memory leak riskini azaltır.", "Bu soruda mutlaka takeUntilDestroyed veya async pipe tercihinden örnek verin."),
            c("Angular guard ve resolver?", "Yetkilendirme ve veri ön yükleme; route konfigürasyonunda sıra önemlidir.", "Bu soruda mutlaka functional guard’lardan bahsedin."),
        ],
    };

    D.node = {
        watch: [w("Node.js — öğren", "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs", "Resmi")],
        read: [
            r("Node.js dokümantasyon", "https://nodejs.org/docs/", "OpenJS"),
            r("Express — başlangıç", "https://expressjs.com/", "Express"),
        ],
        cheatSheet: [
            c("Event loop fazları?", "Timers, poll, check; blocking kod throughput düşürür.", "Bu soruda mutlaka libuv ve worker_threads/worker pool ayrımından bahsedin."),
            c("Stream kullanımı?", "Büyük dosya ve HTTP gövdelerinde bellek dostu işleme.", "Bu soruda mutlaka backpressure ve pipeline’dan örnek verin."),
            c("Cluster modülü?", "Çok çekirdek kullanımı; paylaşılan port ve IPC.", "Bu soruda mutlaka PM2 veya container ölçeklemesi ile karşılaştırın."),
            c("package.json script ve semver?", "Caret ile uyumlu güncelleme; lockfile ile deterministik build.", "Bu soruda mutlaka npm ci vs npm install farkını anın."),
            c("Güvenlik: prototype pollution?", "merge utils ve JSON parse riskleri; input doğrulama.", "Bu soruda mutlaka helmet ve rate limit örnekleri verin."),
        ],
    };

    D.redis = {
        watch: [w("Redis — YouTube", "https://www.youtube.com/@Redisinc", "Kanal")],
        read: [r("Redis dokümantasyon", "https://redis.io/docs/", "Redis Ltd.")],
        cheatSheet: [
            c("Redis veri yapılarından örnek?", "String, hash, list, set, sorted set; kullanım senaryosuna göre seçim.", "Bu soruda mutlaka ZSET ile leaderboard örneği verin."),
            c("Persistence AOF vs RDB?", "Anlık snapshot vs append log; kurtarma penceresi ve disk maliyeti.", "Bu soruda mutlaka fsync politikası trade-off’undan bahsedin."),
            c("Tekil instance vs cluster?", "Sharding ve hash slot; failover için sentinel/cluster.", "Bu soruda mutlaka CAP perspektifinden özet geçin."),
            c("Cache stampede önlemi?", "TTL jitter, lock veya singleflight deseni.", "Bu soruda mutlaka hot key sorunundan örnek verin."),
            c("Redis Streams vs Kafka?", "Operasyonel basitlik vs uzun süreli log/replay ihtiyacı.", "Bu soruda mutlaka mesaj boyutu ve retention’dan bahsedin."),
        ],
    };

    D.go = {
        watch: [w("Go — öğren", "https://go.dev/learn/", "Resmi")],
        read: [r("Effective Go", "https://go.dev/doc/effective_go", "Google")],
        cheatSheet: [
            c("Goroutine ve OS thread ilişkisi?", "M: N zamanlama; hafif ama yine de leak ve deadlock mümkün.", "Bu soruda mutlaka context ile iptal ve WaitGroup’dan bahsedin."),
            c("Channel buffering?", "Unbuffered senkron handshake; buffered ile üretici-tüketici dengesi.", "Bu soruda mutlaka select ve default ile timeout örneği verin."),
            c("Interface küçük ve örtük?", "Duck typing; compile-time kontrol.", "Bu soruda mutlaka interface{} vs generics geçişinden kısaca bahsedin."),
            c("Error handling disiplini?", "Çoklu dönüş değeri; wrap ile zincir.", "Bu soruda mutlaka errors.Is / errors.As kullanımından örnek verin."),
            c("Go modülleri ve minimal versiyon seçimi?", "go.mod ile reproducible build; GOPROXY.", "Bu soruda mutlaka supply chain ve checksum DB’den bahsedin."),
        ],
    };

    D.rust = {
        watch: [w("Rust — YouTube", "https://www.youtube.com/c/RustProgramming", "Kanal")],
        read: [r("The Rust Book", "https://doc.rust-lang.org/book/", "Rust project")],
        cheatSheet: [
            c("Ownership neyi çözer?", "Veri yarışı ve use-after-free; borrow checker ile compile-time güvenlik.", "Bu soruda mutlaka mutable alias kurallarından örnek verin."),
            c("Result ve Option ile hata?", "Panic yerine taşınabilir hata; ? operatörü.", "Bu soruda mutlaka map_err ve context zincirinden bahsedin."),
            c("Send ve Sync trait’leri?", "Paralel güvenli taşıma ve paylaşım.", "Bu soruda mutlaka Arc<Mutex<T>> deseninden örnek verin."),
            c("Lifetime annotasyonları ne zaman?", "Referans ilişkisini derleyiciye açıklama; API yüzeyinde sık görülür.", "Bu soruda mutlaka elision kurallarından kısaca bahsedin."),
            c("Cargo workspace?", "Monorepo ile çoklu crate paket yönetimi.", "Bu soruda mutlaka feature flag ve conditional compilation’dan örnek verin."),
        ],
    };

    global.coachingAliases = {
        spring: "spring_boot",
        springboot: "spring_boot",
        k8s: "kubernetes",
        kafka_streams: "kafka",
        postgres: "sql",
        postgresql: "sql",
        mysql: "sql",
        sqlite: "sql",
        vuejs: "vue",
        vue_js: "vue",
        angularjs: "angular",
        angular_js: "angular",
        nodejs: "node",
        node_js: "node",
        node_js: "node",
        express: "node",
        expressjs: "node",
        javascript: "react",
        js: "react",
        java: "spring_boot",
        ansible: "kubernetes",
        jenkins: "docker",
        golang: "go",
        rustlang: "rust",
        html: "react",
        css: "react",
        tailwind: "react",
        nginx: "kubernetes",
        linux: "docker",
        bash: "docker",
        microservices: "kubernetes",
        oauth: "graphql",
        jwt: "graphql",
        security: "graphql",
        elastic: "elasticsearch",
        opensearch: "elasticsearch",
    };

    global.coachingData = D;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
