let auth = null;

function initAuth() {
    if (typeof firebase === "undefined") return null;
    if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) return null;
    if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    auth = firebase.auth();
    return auth;
}

async function register(email, password) {
    const a = auth || initAuth();
    if (!a) throw new Error("Firebase config eksik");
    const cred = await a.createUserWithEmailAndPassword(email, password);
    return cred.user;
}

async function login(email, password) {
    const a = auth || initAuth();
    if (!a) throw new Error("Firebase config eksik");
    const cred = await a.signInWithEmailAndPassword(email, password);
    return cred.user;
}

async function logout() {
    if (auth) await auth.signOut();
}

function onAuthChange(callback) {
    var ready = window._firebaseConfigReady || Promise.resolve();
    ready.then(function() {
        var a = initAuth();
        if (!a) return;
        a.onAuthStateChanged(callback);
    });
}

function getToken() {
    var user = auth ? auth.currentUser : null;
    if (user) return user.getIdToken();
    return (window._firebaseConfigReady || Promise.resolve()).then(function() {
        initAuth();
        var u = auth ? auth.currentUser : null;
        return u ? u.getIdToken() : null;
    });
}
