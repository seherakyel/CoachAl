import json
import re

from app.services.gemini_client import get_model


def evaluate_classic_answer(
    company_name: str,
    position: str,
    question: str,
    ideal_answer: str,
    user_answer: str,
) -> dict:
    if not (user_answer or "").strip():
        return {"score": 0, "feedback": "Cevap boş bırakıldı."}
    model = get_model()
    if not model:
        return {"score": 0, "feedback": "GEMINI_API_KEY tanımlı değil; otomatik değerlendirme yapılamadı."}
    prompt = f"""CoachAI uygulaması için bir mülakat cevabını değerlendir.
Sadece geçerli JSON döndür, başka metin yazma.

Alanlar:
- score: 0 ile 100 arası tam sayı
- feedback: 2-4 cümle Türkçe geri bildirim (güçlü ve zayıf yönler, eksikler, somut iyileştirme önerisi)

Şirket: {company_name}
Pozisyon: {position}

Soru:
{question}

Beklenen ideal cevabın özeti (referans):
{ideal_answer or '—'}

Adayın cevabı:
{user_answer.strip()[:6000]}
"""
    try:
        response = model.generate_content(prompt)
        raw = (response.text or "").strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
    except Exception:
        return {"score": 0, "feedback": "Değerlendirme üretilemedi."}
    score = data.get("score")
    try:
        score = int(round(float(score)))
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(100, score))
    fb = str(data.get("feedback") or "").strip()
    return {"score": score, "feedback": fb}


def overall_classic_feedback(
    company_name: str,
    position: str,
    total_score: float,
    per_question: list,
) -> str:
    model = get_model()
    if not model:
        return ""
    summary_lines = []
    for item in per_question[:10]:
        idx = item.get("question_index")
        q = (item.get("question") or "")[:200]
        sc = item.get("score")
        fb = (item.get("feedback") or "")[:300]
        summary_lines.append(f"Soru {idx+1} ({sc}/100): {q} | {fb}")
    summary = "\n".join(summary_lines)
    prompt = f"""CoachAI klasik sınav sonucu için kısa Türkçe genel değerlendirme yaz (4-6 cümle, düz paragraf).
Güçlü konuları, zayıf konuları ve aksiyon önerisini içersin.

Şirket: {company_name}
Pozisyon: {position}
Toplam skor (100 üzerinden): {round(total_score, 2)}

Soru bazında özet:
{summary}
"""
    try:
        response = model.generate_content(prompt)
        return (response.text or "").strip()
    except Exception:
        return ""
