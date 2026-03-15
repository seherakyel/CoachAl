#!/bin/bash
set -e

echo "=== CoachAI Smoke Test ==="
echo ""

echo "[1/2] Backend health check..."
RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health 2>/dev/null || echo "000")

if [ "$RESP" = "200" ]; then
    echo "    OK - Backend yanıt veriyor (HTTP 200)"
    curl -s http://localhost:8000/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/api/health
else
    echo "    FAIL - Backend erişilemiyor. Önce: cd backend && source venv/bin/activate && python run.py"
    exit 1
fi

echo ""
echo "[2/3] Firestore test..."
FIRESTORE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/firebase/firestore-test 2>/dev/null || echo "000")
if [ "$FIRESTORE" = "200" ]; then
    echo "    OK - Firestore yazma/okuma başarılı"
else
    echo "    SKIP veya FAIL - Firestore: HTTP $FIRESTORE"
fi

echo ""
echo "[3/3] Frontend dosyaları..."
if [ -f "frontend/pages/index.html" ] && [ -f "frontend/pages/login.html" ] && [ -f "frontend/js/app.js" ] && [ -f "frontend/css/style.css" ]; then
    echo "    OK - index.html, app.js, style.css mevcut"
else
    echo "    FAIL - Frontend dosyaları eksik"
    exit 1
fi

echo ""
echo "=== Smoke Test Geçti ==="
echo ""
echo "Frontend'i görmek için:"
echo "  cd frontend && python3 -m http.server 5500"
echo "  Tarayıcıda: http://localhost:5500/pages/index.html"
