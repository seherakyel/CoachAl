import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from google.cloud.firestore import SERVER_TIMESTAMP
from pydantic import BaseModel, Field

from app.config.firebase_config import get_firestore
from app.config.settings import get_env
from app.middleware.auth import get_current_user
from app.services.feedback_service import generate_feedback


router = APIRouter()


class FeedbackBody(BaseModel):
    alignment_id: str = Field(..., min_length=1)
    session_id: str | None = Field(default=None)


def _summarize_session(sess: dict) -> dict | None:
    if not sess:
        return None
    answers = sess.get("user_answers") or []
    weak = []
    for a in answers:
        sc = a.get("score")
        if sc is None and a.get("is_correct") is False:
            sc = 0
        if sc is not None and sc < 60:
            weak.append({"question": a.get("question") or "", "score": sc})
    weak.sort(key=lambda x: x["score"])
    return {
        "mode": sess.get("mode"),
        "total_score": sess.get("total_score"),
        "weak_questions": weak[:6],
    }


@router.post("/feedback/generate")
async def feedback_generate(
    request: Request,
    body: FeedbackBody,
    uid: str = Depends(get_current_user),
):
    if not get_env("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=503, detail="GEMINI_API_KEY tanımlı değil."
        )
    db = get_firestore()
    a_snap = db.collection("alignment_results").document(body.alignment_id).get()
    if not a_snap.exists:
        raise HTTPException(status_code=404, detail="alignment_id bulunamadı")
    a_data = a_snap.to_dict() or {}
    if a_data.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Bu hizalama sonucuna erişim yok")

    profile_id = a_data.get("profile_id")
    cv_id = a_data.get("cv_id")
    company_name = (a_data.get("company_name") or "").strip()
    position = (a_data.get("position") or "").strip()
    if not company_name or not position:
        pr_data = {}
        if profile_id:
            ps = db.collection("company_profiles").document(str(profile_id)).get()
            pr_data = ps.to_dict() if ps.exists else {}
        if not company_name:
            company_name = pr_data.get("company_name") or ""
        if not position:
            position = pr_data.get("position") or ""

    sess_summary = None
    sess_data = None
    if body.session_id:
        s_snap = db.collection("interview_sessions").document(body.session_id).get()
        if not s_snap.exists:
            raise HTTPException(status_code=404, detail="session_id bulunamadı")
        sess_data = s_snap.to_dict() or {}
        if sess_data.get("user_id") != uid:
            raise HTTPException(status_code=403, detail="Bu oturuma erişim yok")
        sess_summary = _summarize_session(sess_data)

    payload = generate_feedback(
        company_name=company_name,
        position=position,
        score_percent=a_data.get("score") or 0,
        risk_level=a_data.get("risk_level") or "BİLİNMİYOR",
        matched_skills=a_data.get("matched_skills") or [],
        missing_skills=a_data.get("missing_skills") or [],
        interview_summary=sess_summary,
    )

    if not payload.get("action_plan") and not payload.get("strengths"):
        raise HTTPException(
            status_code=502,
            detail="Gemini geri bildirim üretemedi. Model veya kota kontrol edin.",
        )

    report_id = str(uuid.uuid4())
    db.collection("feedback_reports").document(report_id).set(
        {
            "user_id": uid,
            "alignment_id": body.alignment_id,
            "cv_id": cv_id,
            "profile_id": profile_id,
            "session_id": body.session_id,
            "company_name": company_name,
            "position": position,
            "score": a_data.get("score"),
            "risk_level": a_data.get("risk_level"),
            **payload,
            "generated_at": SERVER_TIMESTAMP,
        }
    )

    return {
        "report_id": report_id,
        "alignment_id": body.alignment_id,
        "session_id": body.session_id,
        "company_name": company_name,
        "position": position,
        "score": a_data.get("score"),
        "risk_level": a_data.get("risk_level"),
        **payload,
    }
