# CoachAI

Yapay zeka destekli mülakat simülasyonu ve CV analiz platformu.

## Kurulum

1. `.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur
2. `firebase-service-account.json` dosyasını proje köküne ekle
3. Firebase Console > Project Settings > General > Your apps bölümünden web uygulaması ekle
4. `frontend/js/firebase-config.js` içindeki `apiKey`, `messagingSenderId` ve `appId` değerlerini doldur
5. `.env` içine `GEMINI_API_KEY` ekle (Google AI Studio). İsteğe bağlı: `GEMINI_MODEL` (varsayılan `gemini-2.0-flash`)

## CV yükleme (Aşama 3)

1. Giriş yap (`/pages/login.html`)
2. `http://localhost:5500/pages/upload.html` — PDF sürükle-bırak veya seç, **Yükle ve analiz et**
3. Firestore `cv_documents` koleksiyonunda kayıt oluşur; PDF Storage’da `cvs/{uid}/...` altında

## Şirket analizi (Aşama 4)

1. Giriş yap
2. `http://localhost:5500/pages/company.html` — şirket adı ve pozisyon gir, **Analiz et ve kaydet**
3. Sonuç ekranda gösterilir; Firestore `company_profiles` koleksiyonuna yazılır (`GEMINI_API_KEY` gerekli)

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
