from google.api_core.exceptions import ResourceExhausted

from app.services.gemini_client import (
    _extract_response_text,
    _model_chain,
    _parse_json_object,
    get_model,
)


def _fallback_profile(company_name: str, position: str) -> dict:
    """Model tamamen başarısız olsa bile route'un geçebileceği minimum geçerli profil."""
    pos_lower = (position or "").lower()
    cn = (company_name or "Şirket").strip() or "Şirket"
    role_label = (position or "").strip() or "bu rol"
    if any(k in pos_lower for k in ("backend", "java", "spring", "kotlin", "microservice")):
        tech = ["Java", "Spring Boot", "PostgreSQL", "Docker", "Kafka", "REST"]
    elif any(k in pos_lower for k in ("frontend", "react", "vue", "angular", "web")):
        tech = ["JavaScript", "TypeScript", "React", "HTML/CSS", "REST"]
    elif any(k in pos_lower for k in ("data", "ml", "machine", "python")):
        tech = ["Python", "SQL", "Git", "Cloud", "REST"]
    elif any(k in pos_lower for k in ("mobile", "android", "ios", "swift", "kotlin")):
        tech = ["Git", "REST", "CI/CD", "SQL"]
    else:
        tech = ["Git", "SQL", "REST API", "Docker", "Cloud"]
    return {
        "tech_stack": tech,
        "culture_summary": (
            f"{cn} için tipik teknoloji ortamında çevik ekipler, ürün odaklı çalışma ve sürekli öğrenme öne çıkar. "
            f"{(position or 'Bu rol').strip()} pozisyonunda iş birliği ve net iletişim beklenir."
        ),
        "interview_process": (
            "Tipik akış: ön görüşme (İK veya recruiter), ardından teknik mülakat ve "
            "takım veya kültür uyumu görüşmesi; bazı şirketlerde kodlama veya vaka çalışması da olabilir."
        ),
        "common_questions": [
            f"{cn} bünyesinde yüksek trafikli bir serviste gecikmeyi nasıl ele aldınız veya ele alırsınız?",
            f"“{role_label}” rolünde takımla teknik kararları nasıl uzlaştırırsınız? (şirket: {cn})",
            f"{cn} benzeri ölçekte üretim ortamında yaşadığınız bir olayı ve çıkarımlarınızı anlatın.",
            f"“{role_label}” kapsamında güvenlik veya uyumluluk baskısı altında önceliklendirme nasıl yaparsınız?",
        ],
        "key_traits": [
            "Problem çözme",
            "İletişim ve iş birliği",
            "Sorumluluk alma",
            "Öğrenmeye açıklık",
        ],
    }


def _normalize_profile_dict(data: dict) -> dict:
    def as_str_list(key: str) -> list[str]:
        v = data.get(key) or []
        if not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if str(x).strip()]

    interview_raw = data.get("interview_process")
    if isinstance(interview_raw, list):
        interview_s = " ".join(str(x).strip() for x in interview_raw if str(x).strip())
    else:
        interview_s = str(interview_raw or "").strip()

    return {
        "tech_stack": as_str_list("tech_stack"),
        "culture_summary": str(data.get("culture_summary") or "").strip(),
        "interview_process": interview_s,
        "common_questions": as_str_list("common_questions"),
        "key_traits": as_str_list("key_traits"),
    }


def _merge_fallback(parsed: dict, company_name: str, position: str) -> dict:
    fb = _fallback_profile(company_name, position)
    out = dict(parsed)
    if not out.get("tech_stack"):
        out["tech_stack"] = fb["tech_stack"]
    if not out.get("culture_summary"):
        out["culture_summary"] = fb["culture_summary"]
    if not out.get("interview_process"):
        out["interview_process"] = fb["interview_process"]
    if not out.get("common_questions"):
        out["common_questions"] = fb["common_questions"]
    if not out.get("key_traits"):
        out["key_traits"] = fb["key_traits"]
    return out


def _gemini_try_models_json(prompt: str) -> dict | None:
    for model_id in _model_chain():
        model = get_model({"response_mime_type": "application/json"}, model_id)
        if not model:
            continue
        try:
            response = model.generate_content(prompt)
            raw = _extract_response_text(response)
            data = _parse_json_object(raw)
            if isinstance(data, dict) and data:
                return data
        except ResourceExhausted:
            continue
        except Exception:
            continue
    return None


def _gemini_try_models_plain(prompt: str) -> dict | None:
    for model_id in _model_chain():
        model = get_model(None, model_id)
        if not model:
            continue
        try:
            response = model.generate_content(prompt)
            raw = _extract_response_text(response)
            data = _parse_json_object(raw)
            if isinstance(data, dict) and data:
                return data
        except ResourceExhausted:
            continue
        except Exception:
            continue
    return None


def analyze_company_profile(company_name: str, position: str) -> dict:
    cn = company_name.strip()
    pos = position.strip()
    if not get_model():
        return _fallback_profile(cn, pos)

    prompt = f"""Sen bir kariyer ve teknoloji araştırma asistanısın. Aşağıdaki şirket ve pozisyon için kamuya yönelik bilinen bilgiler ve makul çıkarımlarla kısa bir profil üret.
Sadece geçerli JSON döndür, başka metin yazma. Bilgi kesin değilse yine de makul tahminler kullan, alanları boş bırakma (en azından kısa metin veya birkaç madde).

Alanlar:
- tech_stack: string dizisi, şirketin bu pozisyon bağlamında muhtemel kullandığı teknolojiler (kısa isimler)
- culture_summary: string, 2-4 cümle, çalışma kültürü ve ekip tarzı
- interview_process: string, 2-4 cümle, tipik mülakat süreci (tahmini)
- common_questions: string dizisi, 5-8 madde. Her madde, aşağıdaki Şirket adı ve Pozisyon ile doğrudan ilişkili olsun: mülakatı {cn} bünyesinde ve {pos} rolü açısından düşün; sektör, ürün/ölçek, teknoloji yığını veya bilinen alışılagelmiş mülakat pratiğine atıf yap. Genel geçer klişe cümlelerden kaçın; mümkünse şirket adını veya onu çağrıştıran unvanı cümle içinde kullan.
- key_traits: string dizisi, aranan 4-8 özellik veya yetkinlik

Şirket: {cn}
Pozisyon: {pos}
"""

    data: dict | None = _gemini_try_models_json(prompt)
    if not data:
        data = _gemini_try_models_plain(prompt)

    if not data:
        return _fallback_profile(cn, pos)

    normalized = _normalize_profile_dict(data)
    return _merge_fallback(normalized, cn, pos)
