# CoachAI

Yapay zeka destekli mülakat simülasyonu ve CV analiz platformu.

## Kurulum

1. `.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur
2. `firebase-service-account.json` dosyasını proje köküne ekle
3. Firebase Console > Project Settings > General > Your apps bölümünden web uygulaması ekle
4. `frontend/js/firebase-config.js` içindeki `apiKey`, `messagingSenderId` ve `appId` değerlerini doldur

## Çalıştırma

**Backend:**
```bash
cd backend && source venv/bin/activate && pip install -r requirements.txt && python run.py
```

**Frontend:**
```bash
cd frontend && python3 -m http.server 5500
```

Tarayıcıda: http://localhost:5500/pages/index.html

## Firebase Storage

Storage testi için Firebase Console > Storage > Get Started ile bucket'ı etkinleştir.
