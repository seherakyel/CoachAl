import json
import re

from app.services.gemini_client import get_model


VALID_DIFFICULTIES = ("kolay", "orta", "zor")


def generate_quiz_questions(
    company_name: str,
    position: str,
    tech_stack: list,
    key_traits: list,
    cv_skills: list,
    focus_topic: str | None = None,
) -> list:
    model = get_model()
    if not model:
        return []
    tech = ", ".join(tech_stack[:15]) if tech_stack else "—"
    traits = ", ".join(key_traits[:10]) if key_traits else "—"
    have = ", ".join(cv_skills[:15]) if cv_skills else "—"
    focus_block = ""
    if focus_topic and str(focus_topic).strip():
        ft = str(focus_topic).strip()
        focus_block = f"""
ÖNEMLİ — ODAK KONU: "{ft}"
- En az 5 soruyu doğrudan bu konuyla ilişkilendir (terminoloji, pratik, tuzaklar, best practice).
- Kalan soruları şirket tech stack ve pozisyona göre tamamla.
"""
    prompt = f"""CoachAI uygulaması için çoktan seçmeli teknik quiz soruları üret.
Sadece geçerli JSON dizisi döndür, başka metin yazma.

Toplam 10 soru: 3 kolay + 4 orta + 3 zor.
Her soru için 4 şık olacak. Doğru cevap şıkkı kesinlikle 4 şık arasında bulunmalı.
Sorular Türkçe olmalı, şıklar da Türkçe veya teknik terim olabilir.

Her eleman:
- question: string, açık ve net (1-3 cümle)
- options: 4 elemanlı string dizisi
- correct_index: 0-3 arası tam sayı (doğru şıkkın indeksi)
- explanation: string, 1-2 cümle, doğru cevabı kısaca açıklar
- difficulty: "kolay" | "orta" | "zor"

Şirket: {company_name}
Pozisyon: {position}
Şirket teknolojileri: {tech}
Aranan özellikler: {traits}
Adayın CV yetenekleri: {have}
{focus_block}
Soruları şirketin tech stack'ine ve pozisyona uygun hazırla.
"""
    try:
        response = model.generate_content(prompt)
        raw = (response.text or "").strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
    except Exception:
        return []
    if not isinstance(data, list):
        return []

    out = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            continue
        q = str(item.get("question") or "").strip()
        opts = item.get("options") or []
        if not q or not isinstance(opts, list) or len(opts) != 4:
            continue
        opts = [str(o).strip() for o in opts]
        if any(not o for o in opts):
            continue
        try:
            correct = int(item.get("correct_index"))
        except (TypeError, ValueError):
            continue
        if correct < 0 or correct > 3:
            continue
        diff = str(item.get("difficulty") or "orta").strip().lower()
        if diff not in VALID_DIFFICULTIES:
            diff = "orta"
        explanation = str(item.get("explanation") or "").strip()
        out.append(
            {
                "index": len(out),
                "question": q,
                "options": opts,
                "correct_index": correct,
                "explanation": explanation,
                "difficulty": diff,
            }
        )
        if len(out) >= 10:
            break
    return out
