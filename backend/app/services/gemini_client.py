import json
import re
from app.config.settings import get_env


def get_model(generation_config: dict | None = None):
    import google.generativeai as genai
    key = get_env("GEMINI_API_KEY")
    if not key:
        return None
    genai.configure(api_key=key)
    return genai.GenerativeModel(
        get_env("GEMINI_MODEL", "gemini-2.0-flash"),
        generation_config=generation_config or {},
    )


def _coerce_skills(value) -> list[str]:
    if not isinstance(value, list):
        return []
    out = []
    for item in value:
        s = str(item).strip()
        if s:
            out.append(s)
    return out


def _coerce_education(value) -> str | None:
    if value is None:
        return None
    edu = str(value).strip().lower()
    valid = {"lise", "on_lisans", "lisans", "yuksek_lisans", "doktora", "bilinmiyor"}
    return edu if edu in valid else "bilinmiyor"


def _coerce_experience(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def extract_cv_structure_from_text(cv_text: str) -> dict:
    empty = {
        "skills": [],
        "experience_years": None,
        "education_level": None,
        "summary": "",
        "match_score_logic": "",
    }
    model = get_model({"response_mime_type": "application/json"})
    if not model:
        return empty

    prompt = (
        "Aşağıdaki metin bir CV'den çıkarılmıştır. İçinde fotoğraf veya grafikler "
        "olabilir, sadece metne odaklan. Bu bilgileri analiz et ve aşağıdaki JSON "
        "şemasında döndür. Şemada belirtilen alanlar dışında alan ekleme.\n\n"
        "Şema:\n"
        "{\n"
        '  "skills": ["string"],            // teknik ve profesyonel anahtar yetenekler\n'
        '  "experience_years": number|null, // toplam profesyonel deneyim (yıl)\n'
        '  "education_level": "string",     // lise|on_lisans|lisans|yuksek_lisans|doktora|bilinmiyor\n'
        '  "summary": "string",             // 2-3 cümlelik aday özeti (Türkçe)\n'
        '  "match_score_logic": "string"    // adayın güçlü/zayıf yanlarının kısa analizi\n'
        "}\n\n"
        "CV metni:\n---\n"
        f"{cv_text[:14000]}\n---"
    )

    try:
        response = model.generate_content(prompt)
        raw = (response.text or "").strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
    except Exception:
        return empty

    return {
        "skills": _coerce_skills(data.get("skills")),
        "experience_years": _coerce_experience(data.get("experience_years")),
        "education_level": _coerce_education(data.get("education_level")),
        "summary": str(data.get("summary") or "").strip(),
        "match_score_logic": str(data.get("match_score_logic") or "").strip(),
    }


def alignment_advice(
    company_name: str,
    position: str,
    matched_skills: list,
    missing_skills: list,
    score_percent: float,
    risk_level: str,
) -> str:
    model = get_model()
    if not model:
        return ""
    ms = ", ".join(missing_skills[:20]) if missing_skills else "yok"
    ok = ", ".join(matched_skills[:15]) if matched_skills else "yok"
    prompt = f"""CoachAI uygulaması için kısa, net Türkçe koçluk metni yaz (maksimum 6 cümle).
Şirket: {company_name}
Pozisyon: {position}
Hizalama skoru (yüzde): {score_percent}
Risk: {risk_level} (YÜKSEK=elenme riski yüksek, DÜŞÜK=daha güçlü aday)
Öne çıkan eşleşen yetenekler: {ok}
Eksik veya zayıf görünen gereksinimler: {ms}

Kullanıcıya: hangi eksikleri kapatması gerektiğini ve 2-4 haftalık somut bir aksiyon öner. Başlık veya madde işareti kullanma; düz paragraf.
"""
    try:
        response = model.generate_content(prompt)
        return (response.text or "").strip()
    except Exception:
        return ""
