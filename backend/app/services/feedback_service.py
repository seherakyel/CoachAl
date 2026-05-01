import json
import re

from app.services.gemini_client import get_model


def _empty_payload() -> dict:
    return {
        "strengths": [],
        "weaknesses": [],
        "why_can_be_eliminated": "",
        "action_plan": "",
        "recommended_resources": [],
        "estimated_prep_time": "",
    }


def generate_feedback(
    company_name: str,
    position: str,
    score_percent: float,
    risk_level: str,
    matched_skills: list,
    missing_skills: list,
    interview_summary: dict | None,
) -> dict:
    model = get_model()
    if not model:
        return _empty_payload()

    matched = ", ".join(matched_skills[:20]) if matched_skills else "yok"
    missing = ", ".join(missing_skills[:20]) if missing_skills else "yok"

    interview_block = "Mülakat verisi yok."
    if interview_summary:
        mode = interview_summary.get("mode") or "—"
        total = interview_summary.get("total_score")
        weak_lines = []
        for q in (interview_summary.get("weak_questions") or [])[:5]:
            weak_lines.append(f"- ({q.get('score', '?')}/100) {q.get('question', '')[:200]}")
        weak_block = "\n".join(weak_lines) if weak_lines else "Zayıf soru bilgisi yok."
        interview_block = f"Mülakat modu: {mode}\nMülakat skoru: {total}\nEn zayıf cevaplar:\n{weak_block}"

    prompt = f"""CoachAI uygulaması için kapsamlı kişiselleştirilmiş geri bildirim üret.
Sadece geçerli JSON döndür, başka metin yazma.

Alanlar:
- strengths: string dizisi, 3-6 kısa madde, adayın güçlü yönleri
- weaknesses: string dizisi, 3-6 kısa madde, eksik veya zayıf yönler
- why_can_be_eliminated: string, 2-4 cümle, "Bu pozisyonda neden elenebilirsin?" sorusunun gerçekçi ve direkt cevabı (Türkçe, sert ama yapıcı ton)
- action_plan: string, düz paragraf 4-7 cümle, 2-4 haftalık somut adımlar
- recommended_resources: string dizisi, 3-6 madde, kaynak/teknik konu önerileri (kitap, kurs adı, konu)
- estimated_prep_time: string, "X hafta" formatında

Şirket: {company_name}
Pozisyon: {position}
Hizalama skoru (yüzde): {score_percent}
Elenme riski: {risk_level}
Eşleşen yetenekler: {matched}
Eksik gereksinimler: {missing}
{interview_block}
"""
    try:
        response = model.generate_content(prompt)
        raw = (response.text or "").strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
    except Exception:
        return _empty_payload()

    def as_str_list(key: str) -> list:
        v = data.get(key) or []
        if not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if str(x).strip()]

    return {
        "strengths": as_str_list("strengths"),
        "weaknesses": as_str_list("weaknesses"),
        "why_can_be_eliminated": str(data.get("why_can_be_eliminated") or "").strip(),
        "action_plan": str(data.get("action_plan") or "").strip(),
        "recommended_resources": as_str_list("recommended_resources"),
        "estimated_prep_time": str(data.get("estimated_prep_time") or "").strip(),
    }
