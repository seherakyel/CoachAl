import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from google.cloud import firestore
from google.cloud.firestore import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, Field

from app.config.firebase_config import get_firestore
from app.middleware.auth import get_current_user
from app.services.alignment_engine import compute_alignment
from app.services.gemini_client import alignment_coaching, enrich_skill_display_items


router = APIRouter()


def _calculated_at_sort_key(ts) -> float:
    if ts is None:
        return 0.0
    if hasattr(ts, "timestamp"):
        try:
            return float(ts.timestamp())
        except (TypeError, ValueError, OSError):
            return 0.0
    return 0.0


def _format_calculated_at(ts) -> str | None:
    if ts is None:
        return None
    if hasattr(ts, "isoformat"):
        try:
            return ts.isoformat()
        except (TypeError, ValueError):
            return None
    return None


def _alignment_list_items_sync(uid: str, limit: int) -> list[dict]:
    """Tek Firestore sorgusu — ek CV/şirket okuması yok (denormalize alanlar)."""
    db = get_firestore()
    base = db.collection("alignment_results").where(
        filter=FieldFilter("user_id", "==", uid)
    )

    try:
        snapshots = list(
            base.order_by("calculated_at", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
    except Exception:
        snapshots = list(base.limit(min(limit * 3, 50)).stream())
        snapshots.sort(
            key=lambda doc: _calculated_at_sort_key((doc.to_dict() or {}).get("calculated_at")),
            reverse=True,
        )
        snapshots = snapshots[:limit]

    items = []
    for doc in snapshots:
        d = doc.to_dict() or {}
        cv_id = str(d.get("cv_id") or "")
        profile_id = str(d.get("profile_id") or "")
        if not cv_id or not profile_id:
            continue

        cv_name = (d.get("cv_name") or "").strip() or f"CV {cv_id[:8]}"
        company_name = (d.get("company_name") or "").strip() or "Şirket"
        position = (d.get("position") or d.get("target_position") or "").strip() or "Pozisyon"

        score_val = d.get("score")
        if score_val is None:
            score_val = 0

        items.append(
            {
                "id": doc.id,
                "alignment_id": doc.id,
                "cv_id": cv_id,
                "profile_id": profile_id,
                "cv_name": cv_name,
                "company_name": company_name,
                "position": position,
                "target_position": position,
                "score": score_val,
                "risk_level": d.get("risk_level") or "",
                "created_at": _format_calculated_at(d.get("calculated_at")),
            }
        )

    return items


@router.get("/alignment/list")
async def alignment_list(
    limit: int = 20,
    uid: str = Depends(get_current_user),
):
    """Exam/quiz dropdown — yalnızca Firestore, Gemini yok."""
    limit = max(1, min(50, int(limit)))
    items = await asyncio.to_thread(_alignment_list_items_sync, uid, limit)
    return {"items": items, "total": len(items)}


@router.get("/alignment/{alignment_id}")
async def alignment_get(
    alignment_id: str,
    uid: str = Depends(get_current_user),
):
    """Kayıtlı hizalama + ilişkili şirket profili (web analysis-result ile aynı veri sözlüğü)."""
    db = get_firestore()
    snap = db.collection("alignment_results").document(alignment_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="alignment bulunamadı")
    d = snap.to_dict() or {}
    if d.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Bu hizalama sonucuna erişim yok")

    pr_data: dict = {}
    pid = d.get("profile_id")
    if pid:
        ps = db.collection("company_profiles").document(str(pid)).get()
        if ps.exists:
            pr_data = ps.to_dict() or {}

    score_val = d.get("score")
    if score_val is None:
        score_val = 0

    return {
        "result_id": alignment_id,
        "cv_id": d.get("cv_id") or "",
        "profile_id": d.get("profile_id") or "",
        "company_name": pr_data.get("company_name") or "",
        "position": pr_data.get("position") or "",
        "culture_summary": pr_data.get("culture_summary") or "",
        "key_traits": pr_data.get("key_traits") or [],
        "advice": d.get("advice") or "",
        "next_steps": d.get("next_steps") or [],
        "matched_skills_ui": d.get("matched_skills_ui") or [],
        "missing_skills_ui": d.get("missing_skills_ui") or [],
        "score_percent": score_val,
        "risk_level": d.get("risk_level") or "",
        "S": d.get("S"),
        "E": d.get("E"),
        "D": d.get("D"),
        "matched_skills": d.get("matched_skills") or [],
        "missing_skills": d.get("missing_skills") or [],
    }


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

    cv_name = (cv_data.get("file_name") or "").strip() or f"CV {body.cv_id[:8]}"

    result_id = str(uuid.uuid4())
    db.collection("alignment_results").document(result_id).set(
        {
            "user_id": uid,
            "cv_id": body.cv_id,
            "profile_id": body.profile_id,
            "cv_name": cv_name,
            "company_name": company_name,
            "position": position,
            "tech_stack": tech_stack,
            "key_traits": key_traits,
            "cv_skills": cv_data.get("skills") or [],
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
        "cv_name": cv_name,
        "company_name": company_name,
        "position": position,
        "advice": advice,
        "next_steps": next_steps,
        "matched_skills_ui": matched_ui,
        "missing_skills_ui": missing_ui,
        **{k: v for k, v in result.items() if k not in ("required_skills_used",)},
        "required_skills_used": result["required_skills_used"],
    }
