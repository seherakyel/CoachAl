import json
import re
from google.api_core.exceptions import ResourceExhausted

from app.config.settings import get_env

_MODEL_FALLBACK = (
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
)

_TECH_TERMS = (
    "fastapi",
    "django",
    "flask",
    "javascript",
    "typescript",
    "react native",
    "react",
    "next.js",
    "node.js",
    "nodejs",
    "python",
    "java",
    "spring boot",
    "spring",
    "kotlin",
    "golang",
    "rust",
    "c++",
    "c#",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "graphql",
    "rest api",
    "tensorflow",
    "pytorch",
    "machine learning",
    "html",
    "css",
    "linux",
    "bash",
    "android",
    "ios",
    "swift",
    "flutter",
    "sql",
    "git",
    "php",
    "angular",
    "vue.js",
    "vue",
    "ruby",
    "scala",
    "elasticsearch",
)


def _model_chain() -> list[str]:
    preferred = (get_env("GEMINI_MODEL") or "").strip()
    out: list[str] = []
    if preferred:
        out.append(preferred)
    for m in _MODEL_FALLBACK:
        if m not in out:
            out.append(m)
    return out


def get_model(generation_config: dict | None = None, model_name: str | None = None):
    import google.generativeai as genai
    key = get_env("GEMINI_API_KEY")
    if not key:
        return None
    genai.configure(api_key=key)
    name = model_name or (get_env("GEMINI_MODEL") or "gemini-2.5-flash")
    return genai.GenerativeModel(name, generation_config=generation_config or {})


def _extract_response_text(response) -> str:
    if response is None:
        return ""
    try:
        t = getattr(response, "text", None)
        if t:
            return str(t).strip()
    except Exception:
        pass
    try:
        cands = getattr(response, "candidates", None) or []
        if cands:
            parts = getattr(cands[0].content, "parts", None) or []
            for p in parts:
                t = getattr(p, "text", None)
                if t:
                    return str(t).strip()
    except Exception:
        pass
    return ""


def _parse_json_object(raw: str) -> dict | None:
    s = (raw or "").strip()
    s = re.sub(r"^```(?:json)?\s*", "", s)
    s = re.sub(r"\s*```$", "", s)
    try:
        data = json.loads(s)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}", s)
    if m:
        try:
            data = json.loads(m.group(0))
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            pass
    return None


def _coerce_skills(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        parts = re.split(r"[,;]\s*|\n", value)
        return [p.strip() for p in parts if p.strip()]
    if isinstance(value, list):
        out = []
        for item in value:
            if isinstance(item, dict):
                name = item.get("name") or item.get("skill") or item.get("title")
                if name:
                    out.append(str(name).strip())
            else:
                s = str(item).strip()
                if s:
                    out.append(s)
        return out
    return []


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


def _normalize_parsed(data: dict | None) -> dict:
    if not data:
        return {
            "skills": [],
            "experience_years": None,
            "education_level": None,
            "summary": "",
            "match_score_logic": "",
        }
    return {
        "skills": _coerce_skills(data.get("skills")),
        "experience_years": _coerce_experience(data.get("experience_years")),
        "education_level": _coerce_education(data.get("education_level")),
        "summary": str(data.get("summary") or "").strip(),
        "match_score_logic": str(data.get("match_score_logic") or "").strip(),
    }


def _skills_from_keywords(cv_text: str) -> list[str]:
    blob = " " + cv_text.lower().replace("\n", " ") + " "
    found: list[str] = []
    seen_lower = set()
    for term in sorted(_TECH_TERMS, key=len, reverse=True):
        needle = term.lower()
        if needle in blob and needle not in seen_lower:
            label = term
            if label == "c++":
                label = "C++"
            elif label == "c#":
                label = "C#"
            else:
                label = " ".join(w.capitalize() for w in label.split())
            if label.lower() not in seen_lower:
                found.append(label)
                seen_lower.add(needle)
                if len(found) >= 20:
                    break
    return found


def _run_cv_prompt(model, prompt: str) -> dict | None:
    try:
        response = model.generate_content(prompt)
        raw = _extract_response_text(response)
        return _parse_json_object(raw)
    except ResourceExhausted:
        raise
    except Exception:
        return None


def extract_cv_structure_from_text(cv_text: str) -> dict:
    empty = _normalize_parsed(None)
    snippet = cv_text[:14000]
    base_instruction = (
        "Aşağıdaki metin bir CV'den çıkarılmıştır. Fotoğraf veya grafik yok say; yalnızca metne bak.\n"
        "Geçerli JSON döndür. Başka metin yazma.\n"
        "Şema:\n"
        '{"skills":["string"],"experience_years":number_or_null,'
        '"education_level":"lise|on_lisans|lisans|yuksek_lisans|doktora|bilinmiyor",'
        '"summary":"string","match_score_logic":"string"}\n\n'
    )
    full_prompt = base_instruction + "CV metni:\n---\n" + snippet + "\n---"
    fallback_prompt = (
        base_instruction
        + "CV metni:\n---\n"
        + snippet
        + "\n---\n"
        "skills alanına en az 5 teknik veya profesyonel anahtar kelime koy. "
        "summary 2-3 cümle Türkçe olsun. match_score_logic kısa güçlü/zayıf analiz olsun."
    )
    short_prompt = (
        "Sadece şu JSON formatında yanıt ver, başka hiçbir şey yazma:\n"
        '{"skills":["örnek"],"experience_years":null,'
        '"education_level":"bilinmiyor","summary":"özet","match_score_logic":"analiz"}\n'
        "Bu şemayı CV metnine göre doldur:\n---\n"
        + snippet
        + "\n---"
    )

    for model_id in _model_chain():
        model_json = get_model({"response_mime_type": "application/json"}, model_id)
        if not model_json:
            continue
        try:
            data = _run_cv_prompt(model_json, full_prompt)
            result = _normalize_parsed(data)
            if result["skills"]:
                return result
        except ResourceExhausted:
            continue

        model_plain = get_model({}, model_id)
        if not model_plain:
            continue
        try:
            data = _run_cv_prompt(model_plain, fallback_prompt) or _run_cv_prompt(
                model_plain, short_prompt
            )
            result = _normalize_parsed(data)
            if result["skills"]:
                return result
        except ResourceExhausted:
            continue

    kw = _skills_from_keywords(cv_text)
    if not kw:
        return empty
    return {
        "skills": kw,
        "experience_years": None,
        "education_level": "bilinmiyor",
        "summary": (
            "Yapay zeka kotası veya ağ nedeniyle tam analiz yapılamadı; "
            "yetenekler CV metninden anahtar kelime eşleştirmesiyle çıkarıldı."
        ),
        "match_score_logic": (
            "Bu liste otomatik anahtar kelime taramasıdır; "
            "PROJECT_REPORT ve şirket profiliyle birlikte kullanın."
        ),
    }


def enrich_skill_display_items(
    company_name: str,
    position: str,
    matched_labels: list[str],
    missing_labels: list[str],
) -> tuple[list[dict], list[dict]]:
    def _default_m(s: str) -> dict:
        return {
            "skill": s,
            "detail": (
                f"{s}, şirket profilindeki teknoloji beklentisiyle örtüşüyor; "
                "mülakatta bu konuda örnekler verin."
            ),
        }

    def _default_g(s: str) -> dict:
        return {
            "skill": s,
            "detail": (
                f"{s} bu pozisyon için sık aranan bir başlık; "
                "kısa bir proje veya hands-on pratik ile seviyenizi göstermeniz iyi olur."
            ),
        }

    m_in = [str(x).strip() for x in (matched_labels or []) if str(x).strip()][:16]
    g_in = [str(x).strip() for x in (missing_labels or []) if str(x).strip()][:16]
    if not m_in and not g_in:
        return [], []

    if not get_env("GEMINI_API_KEY"):
        return ([_default_m(s) for s in m_in], [_default_g(s) for s in g_in])

    prompt = (
        "Sen kariyer koçusun. Sadece geçerli JSON döndür.\n"
        'Şema: {"matched":[{"skill":"string","detail":"string"}],'
        '"missing":[{"skill":"string","detail":"string"}]}\n'
        "detail alanları Türkçe, tek cümle, yapıcı ve somut olsun.\n\n"
        f"Şirket: {company_name}\nPozisyon: {position}\n"
        f"Eşleşen etiketler (sırayı koru): {m_in}\n"
        f"Eksik / geliştirilebilir etiketler (sırayı koru): {g_in}\n"
        "Her dizideki öğe sayısı yukarıdaki etiket sayısıyla aynı olmalı."
    )
    for model_id in _model_chain():
        model = get_model({"response_mime_type": "application/json"}, model_id)
        if not model:
            continue
        try:
            data = _run_cv_prompt(model, prompt)
            if not data:
                continue
            m_out = data.get("matched") or []
            g_out = data.get("missing") or []
            if not isinstance(m_out, list):
                m_out = []
            if not isinstance(g_out, list):
                g_out = []
            m_norm: list[dict] = []
            for i, lab in enumerate(m_in):
                det = ""
                if i < len(m_out) and isinstance(m_out[i], dict):
                    det = str(m_out[i].get("detail") or "").strip()
                m_norm.append({"skill": lab, "detail": det or _default_m(lab)["detail"]})
            g_norm: list[dict] = []
            for i, lab in enumerate(g_in):
                det = ""
                if i < len(g_out) and isinstance(g_out[i], dict):
                    det = str(g_out[i].get("detail") or "").strip()
                g_norm.append({"skill": lab, "detail": det or _default_g(lab)["detail"]})
            return (m_norm, g_norm)
        except ResourceExhausted:
            continue
        except Exception:
            continue

    return ([_default_m(s) for s in m_in], [_default_g(s) for s in g_in])


def alignment_advice(
    company_name: str,
    position: str,
    matched_skills: list,
    missing_skills: list,
    score_percent: float,
    risk_level: str,
) -> str:
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
    key = get_env("GEMINI_API_KEY")
    if not key:
        return ""
    for model_id in _model_chain():
        model = get_model({}, model_id)
        if not model:
            continue
        try:
            response = model.generate_content(prompt)
            return _extract_response_text(response)
        except ResourceExhausted:
            continue
        except Exception:
            return ""
    return ""
