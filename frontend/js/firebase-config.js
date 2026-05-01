window._firebaseConfigReady = fetch("http://localhost:8000/api/config/firebase")
    .then(function(r) { return r.json(); })
    .then(function(cfg) { window.FIREBASE_CONFIG = cfg; });
