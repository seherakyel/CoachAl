/**
 * CoachAI gelişim rehberi — Firestore koleksiyonu: coaching_content
 * Belge ID: teknoloji anahtarı (örn. kafka, spring_boot). Özel belge: _aliases → alan map { ham_anahtar: kanonik_id }
 */
(function (global) {
    var COLLECTION = "coaching_content";
    var ALIASES_DOC_ID = "_aliases";
    var LS_PREFIX = "coachai_coaching_v1";
    var LS_ALIASES_KEY = LS_PREFIX + ":aliases";
    var LS_DOC_PREFIX = LS_PREFIX + ":doc:";
    var LS_MISSING_LOG = LS_PREFIX + ":missing_topics_log";

    function lsDocKey(canonicalId) {
        return LS_DOC_PREFIX + canonicalId;
    }

    function safeParseJSON(raw, fallback) {
        try {
            if (raw == null || raw === "") return fallback;
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function normalizeCoachingLookupKey(skillRaw) {
        return String(skillRaw || "")
            .trim()
            .toLowerCase()
            .replace(/\./g, "_")
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_+#]/g, "")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
    }

    async function waitForFirebaseReady() {
        await (global._firebaseConfigReady || Promise.resolve());
        if (!global.FIREBASE_CONFIG || !global.FIREBASE_CONFIG.apiKey) {
            throw new Error("Firebase yapılandırması bulunamadı.");
        }
        if (typeof firebase === "undefined") {
            throw new Error("Firebase SDK yüklenmedi.");
        }
        if (typeof initAuth === "function") {
            initAuth();
        } else if (!firebase.apps.length) {
            firebase.initializeApp(global.FIREBASE_CONFIG);
        }
        if (!firebase.firestore) {
            throw new Error("Firestore SDK yüklenmedi (firebase-firestore-compat).");
        }
    }

    function getDb() {
        if (typeof firebase === "undefined" || !firebase.firestore) return null;
        if (typeof initAuth === "function") initAuth();
        else if (!firebase.apps.length && global.FIREBASE_CONFIG) firebase.initializeApp(global.FIREBASE_CONFIG);
        return firebase.firestore();
    }

    function normalizeFirestoreEntry(raw) {
        if (!raw || typeof raw !== "object") return null;
        return {
            watch: Array.isArray(raw.watch) ? raw.watch : [],
            read: Array.isArray(raw.read) ? raw.read : [],
            cheatSheet: Array.isArray(raw.cheatSheet) ? raw.cheatSheet : [],
        };
    }

    async function loadAliasMapCached() {
        var cached = safeParseJSON(global.localStorage.getItem(LS_ALIASES_KEY), null);
        if (cached && cached.map && typeof cached.map === "object") {
            return cached.map;
        }
        await waitForFirebaseReady();
        var db = getDb();
        if (!db) return {};
        var snap = await db.collection(COLLECTION).doc(ALIASES_DOC_ID).get();
        var map = {};
        if (snap.exists) {
            var data = snap.data();
            var m = data && data.map;
            if (m && typeof m === "object") map = m;
        }
        try {
            global.localStorage.setItem(LS_ALIASES_KEY, JSON.stringify({ map: map, cachedAt: Date.now() }));
        } catch (e) {}
        return map;
    }

    function resolveCanonicalId(rawKey, map) {
        if (!map || typeof map !== "object") return rawKey;
        var mapped = map[rawKey];
        if (mapped && typeof mapped === "string") return mapped;
        var lower = String(rawKey || "").toLowerCase();
        if (map[lower] && typeof map[lower] === "string") return map[lower];
        return rawKey;
    }

    async function fetchCoachingDocument(canonicalId) {
        var cacheKey = lsDocKey(canonicalId);
        var fromLs = safeParseJSON(global.localStorage.getItem(cacheKey), null);
        if (fromLs && (fromLs.watch || fromLs.read || fromLs.cheatSheet)) {
            return normalizeFirestoreEntry(fromLs);
        }
        await waitForFirebaseReady();
        var db = getDb();
        if (!db) return null;
        var snap = await db.collection(COLLECTION).doc(canonicalId).get();
        if (!snap.exists) return null;
        var entry = normalizeFirestoreEntry(snap.data());
        if (entry) {
            try {
                global.localStorage.setItem(cacheKey, JSON.stringify(entry));
            } catch (e) {}
        }
        return entry;
    }

    function appendMissingTopicLog(record) {
        try {
            var arr = safeParseJSON(global.localStorage.getItem(LS_MISSING_LOG), []);
            if (!Array.isArray(arr)) arr = [];
            arr.push(record);
            if (arr.length > 500) arr = arr.slice(-500);
            global.localStorage.setItem(LS_MISSING_LOG, JSON.stringify(arr));
        } catch (e) {}
    }

    function logMissingCoachingTopic(payload) {
        var rec = {
            t: new Date().toISOString(),
            docId: payload.docId,
            rawKey: payload.rawKey,
            skillLabel: payload.skillLabel,
            source: "coaching_content_miss",
        };
        global.console.warn("[CoachAI] Eksik coaching konusu (arama / indeks hazırlığı):", rec);
        appendMissingTopicLog(rec);
    }

    /**
     * @returns {Promise<{ entry: object | null, docId: string, rawKey: string }>}
     */
    async function fetchCoachingEntryForSkill(skillRaw) {
        var rawKey = normalizeCoachingLookupKey(skillRaw) || "unknown";
        var map = await loadAliasMapCached();
        var canonical = resolveCanonicalId(rawKey, map);
        var entry = await fetchCoachingDocument(canonical);
        var resolvedDocId = canonical;
        if (!entry && canonical !== rawKey) {
            entry = await fetchCoachingDocument(rawKey);
            if (entry) resolvedDocId = rawKey;
        }
        if (!entry) {
            logMissingCoachingTopic({
                docId: canonical,
                rawKey: rawKey,
                skillLabel: String(skillRaw || "").trim(),
            });
        }
        return { entry: entry, docId: resolvedDocId, rawKey: rawKey };
    }

    /** Önbelleği temizle (geliştirici / test; isteğe bağlı çağrı) */
    function clearCoachingLocalCache() {
        try {
            var keys = [];
            for (var i = 0; i < global.localStorage.length; i++) {
                var k = global.localStorage.key(i);
                if (k && k.indexOf(LS_PREFIX) === 0) keys.push(k);
            }
            keys.forEach(function (k) {
                global.localStorage.removeItem(k);
            });
        } catch (e) {}
    }

    global.normalizeCoachingLookupKey = normalizeCoachingLookupKey;
    global.fetchCoachingEntryForSkill = fetchCoachingEntryForSkill;
    global.clearCoachingLocalCache = clearCoachingLocalCache;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
