import json
import re

from app.services.gemini_client import get_model


CLASSIC_TYPES = ["algorithm", "system_design", "behavioral", "company_specific"]


def generate_classic_questions(
    company_name: str,
    position: str,
    tech_stack: list,
    key_traits: list,
    cv_skills: list,
    missing_skills: list,
) -> list:
    model = get_model()
    if not model:
        return []
    tech = ", ".join(tech_stack[:15]) if tech_stack else "—"
    traits = ", ".join(key_traits[:10]) if key_traits else "—"
    have = ", ".join(cv_skills[:15]) if cv_skills else "—"
    miss = ", ".join(missing_skills[:15]) if missing_skills else "—"
    prompt = f"""CoachAI uygulaması için klasik (yazılı, açık uçlu) mülakat soruları üret.
Sadece geçerli JSON döndür, başka metin yazma. Tek bir JSON dizisi olarak döndür.

Her eleman şu alanlara sahip olmalı:
- type: "algorithm" | "system_design" | "behavioral" | "company_specific"
- difficulty: "kolay" | "orta" | "zor"
- question: string, Türkçe, 1-3 cümle
- ideal_answer: string, kısa örnek bir cevap özeti (2-4 cümle)

Karışım:
- 2 algorithm
- 2 system_design
- 1 behavioral
- 1 veya 2 company_specific (şirketin tech stack'ine veya kültürüne özel)

Toplam 6 ile 7 soru üret.

Şirket: {company_name}
Pozisyon: {position}
Şirket teknolojileri: {tech}
Şirket kültürü/aranan özellikler: {traits}
Adayın CV yetenekleri: {have}
Adayın eksik veya zayıf görünen yetenekleri: {miss}

Soruları adayın eksiklerini ve şirketin tech stack'ini test edecek şekilde tasarla.
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
    questions = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            continue
        q = str(item.get("question") or "").strip()
        if not q:
            continue
        qtype = str(item.get("type") or "").strip().lower()
        if qtype not in CLASSIC_TYPES:
            qtype = "company_specific"
        diff = str(item.get("difficulty") or "orta").strip().lower()
        if diff not in ("kolay", "orta", "zor"):
            diff = "orta"
        ideal = str(item.get("ideal_answer") or "").strip()
        questions.append(
            {
                "index": i,
                "type": qtype,
                "difficulty": diff,
                "question": q,
                "ideal_answer": ideal,
            }
        )
    return questions[:7]
