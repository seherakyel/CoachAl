import uuid

from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore import SERVER_TIMESTAMP
from pydantic import BaseModel, Field

from app.config.firebase_config import get_firestore
from app.config.settings import get_env
from app.middleware.auth import get_current_user
from app.services.answer_evaluator import evaluate_classic_answer, overall_classic_feedback
from app.services.question_generator import generate_classic_questions


router = APIRouter()


class InterviewStartBody(BaseModel):
    cv_id: str = Field(..., min_length=1)
    profile_id: str = Field(..., min_length=1)


class AnswerItem(BaseModel):
    question_index: int = Field(..., ge=0)
    answer: str = Field(default="", max_length=20000)


class InterviewSubmitBody(BaseModel):
    session_id: str = Field(..., min_length=1)
    answers: list[AnswerItem]


def _load_cv_and_profile(db, uid: str, cv_id: str, profile_id: str) -> tuple[dict, dict]:
    cv_snap = db.collection("cv_documents").document(cv_id).get()
    pr_snap = db.collection("company_profiles").document(profile_id).get()
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
    return cv_data, pr_data


@router.post("/interview/classic")
async def start_classic(
    body: InterviewStartBody,
    uid: str = Depends(get_current_user),
):
    if not get_env("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY tanımlı değil. .env dosyasına ekleyin.",
        )

    db = get_firestore()
    cv_data, pr_data = _load_cv_and_profile(db, uid, body.cv_id, body.profile_id)

    company_name = pr_data.get("company_name") or ""
    position = pr_data.get("position") or ""

    questions = generate_classic_questions(
        company_name=company_name,
        position=position,
        tech_stack=pr_data.get("tech_stack") or [],
        key_traits=pr_data.get("key_traits") or [],
        cv_skills=cv_data.get("skills") or [],
        missing_skills=[],
    )
    if not questions:
        raise HTTPException(
            status_code=502, detail="Gemini soru üretemedi. Model veya kota kontrol edin."
        )

    session_id = str(uuid.uuid4())
    db.collection("interview_sessions").document(session_id).set(
        {
            "user_id": uid,
            "cv_id": body.cv_id,
            "profile_id": body.profile_id,
            "mode": "classic",
            "company_name": company_name,
            "position": position,
            "questions": questions,
            "user_answers": [],
            "total_score": None,
            "feedback": "",
            "started_at": SERVER_TIMESTAMP,
            "completed_at": None,
        }
    )

    public_questions = [
        {
            "index": q["index"],
            "type": q["type"],
            "difficulty": q["difficulty"],
            "question": q["question"],
        }
        for q in questions
    ]

    return {
        "session_id": session_id,
        "company_name": company_name,
        "position": position,
        "mode": "classic",
        "questions": public_questions,
    }


@router.post("/interview/evaluate")
async def evaluate_classic(
    body: InterviewSubmitBody,
    uid: str = Depends(get_current_user),
):
    db = get_firestore()
    sess_ref = db.collection("interview_sessions").document(body.session_id)
    sess_snap = sess_ref.get()
    if not sess_snap.exists:
        raise HTTPException(status_code=404, detail="session_id bulunamadı")
    sess = sess_snap.to_dict() or {}
    if sess.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Bu oturuma erişim yok")
    if sess.get("mode") != "classic":
        raise HTTPException(status_code=400, detail="Bu oturum klasik mod değil")
    if sess.get("completed_at"):
        raise HTTPException(status_code=400, detail="Bu oturum zaten tamamlanmış")

    questions = sess.get("questions") or []
    by_index = {int(q.get("index", i)): q for i, q in enumerate(questions)}

    company_name = sess.get("company_name") or ""
    position = sess.get("position") or ""

    per_question = []
    total = 0.0
    counted = 0
    for ans in body.answers:
        q = by_index.get(ans.question_index)
        if not q:
            continue
        result = evaluate_classic_answer(
            company_name=company_name,
            position=position,
            question=q.get("question") or "",
            ideal_answer=q.get("ideal_answer") or "",
            user_answer=ans.answer or "",
        )
        score = result["score"]
        feedback = result["feedback"]
        per_question.append(
            {
                "question_index": ans.question_index,
                "question": q.get("question") or "",
                "type": q.get("type"),
                "difficulty": q.get("difficulty"),
                "answer": ans.answer or "",
                "score": score,
                "feedback": feedback,
            }
        )
        total += score
        counted += 1

    total_score = round(total / counted, 2) if counted else 0.0

    summary = overall_classic_feedback(
        company_name=company_name,
        position=position,
        total_score=total_score,
        per_question=per_question,
    )

    sess_ref.update(
        {
            "user_answers": per_question,
            "total_score": total_score,
            "feedback": summary,
            "completed_at": SERVER_TIMESTAMP,
        }
    )

    return {
        "session_id": body.session_id,
        "total_score": total_score,
        "feedback": summary,
        "per_question": per_question,
    }
