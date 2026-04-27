import json
import re

from app.services.gemini_client import get_model


def analyze_company_profile(company_name: str, position: str) -> dict:
    model = get_model()
    if not model:
        return {
            "tech_stack": [],
            "culture_summary": "",
            "interview_process": "",
            "common_questions": [],
            "key_traits": [],
        }
    prompt = f"""Sen bir kariyer ve teknoloji araştırma asistanısın. Aşağıdaki şirket ve pozisyon için kamuya yönelik bilinen bilgiler ve makul çıkarımlarla kısa bir profil üret.
Sadece geçerli JSON döndür, başka metin yazma. Bilgi kesin değilse yine de makul tahminler kullan, alanları boş bırakma (en azından kısa metin veya birkaç madde).

Alanlar:
- tech_stack: string dizisi, şirketin bu pozisyon bağlamında muhtemel kullandığı teknolojiler (kısa isimler)
- culture_summary: string, 2-4 cümle, çalışma kültürü ve ekip tarzı
- interview_process: string, 2-4 cümle, tipik mülakat süreci (tahmini)
- common_questions: string dizisi, bu pozisyon için sık sorulabilecek 5-8 teknik veya davranışsal soru
- key_traits: string dizisi, aranan 4-8 özellik veya yetkinlik

Şirket: {company_name.strip()}
Pozisyon: {position.strip()}
"""
    try:
        response = model.generate_content(prompt)
        raw = (response.text or "").strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
    except Exception:
        return {
            "tech_stack": [],
            "culture_summary": "",
            "interview_process": "",
            "common_questions": [],
            "key_traits": [],
        }

    def as_str_list(key: str) -> list:
        v = data.get(key) or []
        if not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if str(x).strip()]

    return {
        "tech_stack": as_str_list("tech_stack"),
        "culture_summary": str(data.get("culture_summary") or "").strip(),
        "interview_process": str(data.get("interview_process") or "").strip(),
        "common_questions": as_str_list("common_questions"),
        "key_traits": as_str_list("key_traits"),
    }
