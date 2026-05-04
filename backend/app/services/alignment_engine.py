W_SKILL = 0.50
W_EXP = 0.30
W_EDU = 0.20

EDU_SCORE = {
    "lise": 0.3,
    "on_lisans": 0.5,
    "ön_lisans": 0.5,
    "lisans": 0.6,
    "yuksek_lisans": 0.8,
    "yüksek_lisans": 0.8,
    "doktora": 1.0,
    "bilinmiyor": 0.4,
    "unknown": 0.4,
}


def _norm(s: str) -> str:
    return " ".join(str(s).lower().strip().split())


def required_skills_from_profile(tech_stack: list, key_traits: list) -> list:
    out = []
    for item in tech_stack or []:
        t = str(item).strip()
        if t:
            out.append(t)
    for item in key_traits or []:
        t = str(item).strip()
        if not t:
            continue
        for part in t.replace(";", ",").split(","):
            p = part.strip()
            if p:
                out.append(p)
    seen = set()
    uniq = []
    for x in out:
        k = _norm(x)
        if k and k not in seen:
            seen.add(k)
            uniq.append(x.strip())
    return uniq


def infer_required_experience_years(position: str) -> float:
    p = (position or "").lower()
    if any(x in p for x in ("intern", "staj", "junior", "jr", "graduate")):
        return 1.0
    if any(x in p for x in ("senior", "sr.", "lead", "principal", "staff", "architect", "head")):
        return 5.0
    if any(x in p for x in ("mid", "middle", "medior")):
        return 3.0
    return 3.0


def skill_match_sets(cv_skills: list, required_skills: list) -> tuple[float, list[str], list[str]]:
    if not required_skills:
        return 1.0, [], []

    cv_norms = [_norm(c) for c in (cv_skills or []) if str(c).strip()]
    matched_labels = []
    for req in required_skills:
        rn = _norm(req)
        if not rn:
            continue
        hit = False
        for cn in cv_norms:
            if not cn:
                continue
            if rn == cn or rn in cn or cn in rn:
                hit = True
                break
        if hit:
            matched_labels.append(req.strip())

    matched_set = list(dict.fromkeys(matched_labels))
    missing = [r.strip() for r in required_skills if r.strip() not in matched_set]
    s = len(matched_set) / len(required_skills) if required_skills else 1.0
    s = min(1.0, max(0.0, s))
    return s, matched_set, missing


def experience_factor(cv_years: float | None, required_years: float) -> float:
    if required_years <= 0:
        return 1.0
    y = float(cv_years) if cv_years is not None else 0.0
    e = y / required_years
    return min(1.0, max(0.0, e))


def education_factor(education_level: str | None) -> float:
    if not education_level:
        return EDU_SCORE["bilinmiyor"]
    key = str(education_level).strip().lower().replace(" ", "_")
    return EDU_SCORE.get(key, EDU_SCORE["bilinmiyor"])


def risk_level(percentage: float) -> str:
    if percentage >= 75:
        return "DÜŞÜK"
    if percentage >= 50:
        return "ORTA"
    return "YÜKSEK"


def compute_alignment(
    cv_skills: list,
    cv_experience_years: float | None,
    cv_education_level: str | None,
    tech_stack: list,
    key_traits: list,
    position: str,
) -> dict:
    required = required_skills_from_profile(tech_stack, key_traits)
    if not required and tech_stack:
        required = [str(x).strip() for x in tech_stack if str(x).strip()]
    s, matched, missing = skill_match_sets(cv_skills, required)
    req_years = infer_required_experience_years(position)
    e = experience_factor(cv_experience_years, req_years)
    d = education_factor(cv_education_level)
    raw = (W_SKILL * s) + (W_EXP * e) + (W_EDU * d)
    pct = round(raw * 100, 2)
    return {
        "S": round(s, 4),
        "E": round(e, 4),
        "D": round(d, 4),
        "W_skill": W_SKILL,
        "W_exp": W_EXP,
        "W_edu": W_EDU,
        "score_percent": pct,
        "risk_level": risk_level(pct),
        "matched_skills": matched,
        "missing_skills": missing,
        "required_skills_used": required,
        "required_experience_years": req_years,
    }
