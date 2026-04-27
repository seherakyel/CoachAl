import uuid

from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore import SERVER_TIMESTAMP
from pydantic import BaseModel, Field

from app.config.firebase_config import get_firestore
from app.middleware.auth import get_current_user
from app.services.company_intel import analyze_company_profile
from app.config.settings import get_env


router = APIRouter()


class CompanyAnalyzeBody(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    position: str = Field(..., min_length=1, max_length=200)


@router.post("/company/analyze")
async def company_analyze(
    body: CompanyAnalyzeBody,
    uid: str = Depends(get_current_user),
):
    if not get_env("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY tanımlı değil. Şirket analizi için .env dosyasına ekleyin.",
        )

    company_name = body.company_name.strip()
    position = body.position.strip()
    profile = analyze_company_profile(company_name, position)

    if not profile.get("tech_stack") and not profile.get("culture_summary"):
        raise HTTPException(
            status_code=502,
            detail="Gemini şirket profili üretemedi. Model veya kota kontrol edin.",
        )

    profile_id = str(uuid.uuid4())
    db = get_firestore()
    doc_ref = db.collection("company_profiles").document(profile_id)
    doc_ref.set(
        {
            "user_id": uid,
            "company_name": company_name,
            "position": position,
            "tech_stack": profile["tech_stack"],
            "culture_summary": profile["culture_summary"],
            "interview_process": profile["interview_process"],
            "common_questions": profile["common_questions"],
            "key_traits": profile["key_traits"],
            "created_at": SERVER_TIMESTAMP,
        }
    )

    return {
        "profile_id": profile_id,
        "company_name": company_name,
        "position": position,
        **profile,
    }
