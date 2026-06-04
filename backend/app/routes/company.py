import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from google.cloud.firestore import SERVER_TIMESTAMP
from pydantic import BaseModel, Field

from app.config.firebase_config import get_firestore
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import enforce_daily_quota, limiter
from app.services.company_intel import analyze_company_profile
from app.config.settings import get_env


router = APIRouter()


class CompanyAnalyzeBody(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    position: str = Field(..., min_length=1, max_length=200)


@router.post("/company/analyze")
@limiter.limit("15/hour")
async def company_analyze(
    request: Request,
    body: CompanyAnalyzeBody,
    uid: str = Depends(get_current_user),
):
    enforce_daily_quota(uid, "company_analyze", "DAILY_QUOTA_COMPANY_ANALYZE")
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


def _created_at_sort_key(ts) -> float:
    if ts is None:
        return 0.0
    if hasattr(ts, "timestamp"):
        try:
            return float(ts.timestamp())
        except (TypeError, ValueError, OSError):
            return 0.0
    return 0.0


def _format_created_at(ts) -> str | None:
    if ts is None:
        return None
    if hasattr(ts, "isoformat"):
        try:
            return ts.isoformat()
        except (TypeError, ValueError):
            return None
    return None


@router.get("/company/list")
async def list_company_profiles(
    uid: str = Depends(get_current_user),
    limit: int = 20,
    cursor: str | None = None,
):
    limit = max(1, min(50, int(limit)))
    db = get_firestore()

    snapshots = list(
        db.collection("company_profiles").where("user_id", "==", uid).limit(100).stream()
    )
    snapshots.sort(
        key=lambda d: _created_at_sort_key((d.to_dict() or {}).get("created_at")),
        reverse=True,
    )

    if cursor:
        ids = [s.id for s in snapshots]
        if cursor in ids:
            snapshots = snapshots[ids.index(cursor) + 1 :]

    page = snapshots[: limit + 1]
    has_more = len(page) > limit
    page = page[:limit]

    items = []
    for d in page:
        data = d.to_dict() or {}
        items.append(
            {
                "profile_id": d.id,
                "company_name": data.get("company_name") or "",
                "position": data.get("position") or "",
                "tech_stack_preview": (data.get("tech_stack") or [])[:6],
                "created_at": _format_created_at(data.get("created_at")),
            }
        )

    next_cursor = items[-1]["profile_id"] if items and has_more else None
    return {"items": items, "next_cursor": next_cursor, "limit": limit}
