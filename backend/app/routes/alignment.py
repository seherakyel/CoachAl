import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from google.cloud.firestore import SERVER_TIMESTAMP
from pydantic import BaseModel, Field

from app.config.firebase_config import get_firestore
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import enforce_daily_quota, limiter
from app.services.alignment_engine import compute_alignment
from app.services.gemini_client import alignment_advice


router = APIRouter()


class AlignmentScoreBody(BaseModel):
    cv_id: str = Field(..., min_length=1)
    profile_id: str = Field(..., min_length=1)


@router.post("/alignment/score")
@limiter.limit("30/hour")
async def alignment_score(
    request: Request,
    body: AlignmentScoreBody,
    uid: str = Depends(get_current_user),
):
    enforce_daily_quota(uid, "alignment_score", "DAILY_QUOTA_ALIGNMENT")
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

    advice = alignment_advice(
        company_name=company_name,
        position=position,
        matched_skills=result["matched_skills"],
        missing_skills=result["missing_skills"],
        score_percent=result["score_percent"],
        risk_level=result["risk_level"],
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
            "advice": advice,
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
        **{k: v for k, v in result.items() if k not in ("required_skills_used",)},
        "required_skills_used": result["required_skills_used"],
    }
