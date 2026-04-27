import json
import re
from app.config.settings import get_env


def get_model():
    import google.generativeai as genai
    key = get_env("GEMINI_API_KEY")
    if not key:
        return None
    genai.configure(api_key=key)
    return genai.GenerativeModel(get_env("GEMINI_MODEL", "gemini-2.0-flash"))


def extract_cv_structure_from_text(cv_text: str) -> dict:
    model = get_model()
    if not model:
        return {
            "skills": [],
            "experience_years": None,
            "education_level": None,
        }
    prompt = f"""Aşağıdaki metin bir CV. Sadece geçerli JSON döndür, başka metin yazma.
Alanlar:
- skills: string dizisi, teknik ve profesyonel yetenekler (kısa anahtar kelimeler, İngilizce veya Türkçe karışık olabilir)
- experience_years: sayı, toplam profesyonel iş deneyimi yılı (tam sayı veya ondalık bir yıl, tahmin edilemiyorsa null)
- education_level: string, şunlardan biri: lise, on_lisans, lisans, yuksek_lisans, doktora, bilinmiyor

CV metni:
---
{cv_text[:12000]}
---
"""
    try:
        response = model.generate_content(prompt)
        raw = (response.text or "").strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
    except Exception:
        return {"skills": [], "experience_years": None, "education_level": None}
    skills = data.get("skills") or []
    if not isinstance(skills, list):
        skills = []
    skills = [str(s).strip() for s in skills if str(s).strip()]
    exp = data.get("experience_years")
    if exp is not None:
        try:
            exp = float(exp)
        except (TypeError, ValueError):
            exp = None
    edu = data.get("education_level")
    if edu is not None:
        edu = str(edu).strip().lower()
    return {"skills": skills, "experience_years": exp, "education_level": edu}
