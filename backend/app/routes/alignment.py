import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from google.cloud.firestore import SERVER_TIMESTAMP
from pydantic import BaseModel, Field

from app.config.firebase_config import get_firestore
from app.middleware.auth import get_current_user
from app.services.alignment_engine import compute_alignment
from app.services.gemini_client import alignment_coaching, enrich_skill_display_items


router = APIRouter()


@router.get("/alignment/list")
async def alignment_list(
    limit: int = 20,
    uid: str = Depends(get_current_user),
):
    db = get_firestore()
    docs = (
        db.collection("alignment_results")
        .where("user_id", "==", uid)
        .limit(min(limit, 50))
        .stream()
    )
    items = []
    for doc in docs:
        d = doc.to_dict() or {}
        items.append({
            "id": doc.id,
            "company_name": d.get("company_name", ""),
            "target_position": d.get("position", ""),
            "score": d.get("score", 0),
            "risk_level": d.get("risk_level", ""),
            "created_at": str(d.get("calculated_at", "")),
            "cv_id": d.get("cv_id", ""),
            "profile_id": d.get("profile_id", ""),
        })
    return {"items": items, "total": len(items)}


class AlignmentScoreBody(BaseModel):
    cv_id: str = Field(..., min_length=1)
    profile_id: str = Field(..., min_length=1)


@router.post("/alignment/score")
async def alignment_score(
    request: Request,
    body: AlignmentScoreBody,
    uid: str = Depends(get_current_user),
):
    db = get_firestore()
    cv_ref = db.collection("cv_documents").document(body.cv_id)
    pr_ref = db.collection("company_profiles").document(body.profile_id)
    cv_snap = cv_ref.get()
    pr_snap = pr_ref.get()
    if not cv_snap.exists:
        raise HTTPException(status_code=404, detail="cv_id bulunamadı")
    if not pr_snap.exists:
        raise HTTPException(status_code=404, detail="profile_id bulunamadı")
    cv_data = cv_snap.to_dict() or {}
    pr_data = pr_snap.to_dict() or {}
    if cv_data.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Bu CV kaydına erişim yok")
    if pr_data.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Bu şirket profiline erişim yok")

    company_name = pr_data.get("company_name") or ""
    position = pr_data.get("position") or ""
    tech_stack = pr_data.get("tech_stack") or []
    key_traits = pr_data.get("key_traits") or []

    result = compute_alignment(
        cv_skills=cv_data.get("skills") or [],
        cv_experience_years=cv_data.get("experience_years"),
        cv_education_level=cv_data.get("education_level"),
        tech_stack=tech_stack,
        key_traits=key_traits,
        position=position,
    )

    coaching = alignment_coaching(
        company_name=company_name,
        position=position,
        matched_skills=result["matched_skills"],
        missing_skills=result["missing_skills"],
        score_percent=result["score_percent"],
        risk_level=result["risk_level"],
    )
    advice = coaching["advice"]
    next_steps = coaching.get("next_steps") or []

    matched_ui, missing_ui = enrich_skill_display_items(
        company_name,
        position,
        result["matched_skills"],
        result["missing_skills"],
    )

    result_id = str(uuid.uuid4())
    db.collection("alignment_results").document(result_id).set(
        {
            "user_id": uid,
            "cv_id": body.cv_id,
            "profile_id": body.profile_id,
            "score": result["score_percent"],
            "risk_level": result["risk_level"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
            "matched_skills_ui": matched_ui,
            "missing_skills_ui": missing_ui,
            "advice": advice,
            "next_steps": next_steps,
            "S": result["S"],
            "E": result["E"],
            "D": result["D"],
            "calculated_at": SERVER_TIMESTAMP,
        }
    )

    return {
        "result_id": result_id,
        "cv_id": body.cv_id,
        "profile_id": body.profile_id,
        "company_name": company_name,
        "position": position,
        "advice": advice,
        "next_steps": next_steps,
        "matched_skills_ui": matched_ui,
        "missing_skills_ui": missing_ui,
        **{k: v for k, v in result.items() if k not in ("required_skills_used",)},
        "required_skills_used": result["required_skills_used"],
    }
