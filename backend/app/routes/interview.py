import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from google.cloud import firestore
from google.cloud.firestore import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, Field, model_validator

from app.config.firebase_config import get_firestore
from app.config.settings import get_env
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import enforce_daily_quota, limiter
from app.services.answer_evaluator import evaluate_classic_answer, overall_classic_feedback
from app.services.question_generator import generate_classic_questions
from app.services.quiz_generator import generate_quiz_questions


router = APIRouter()


def _started_at_sort_key(ts) -> float:
    if ts is None:
        return 0.0
    if hasattr(ts, "timestamp"):
        try:
            return float(ts.timestamp())
        except (TypeError, ValueError, OSError):
            return 0.0
    return 0.0


def _format_started_at(ts) -> str | None:
    if ts is None:
        return None
    if hasattr(ts, "isoformat"):
        try:
            return ts.isoformat()
        except (TypeError, ValueError):
            return None
    return str(ts) if ts else None


def _session_status(d: dict) -> str:
    if d.get("completed_at") or d.get("status") == "completed":
        return "completed"
    return str(d.get("status") or "in_progress")


def _quiz_correct_count(answers: list) -> int:
    return sum(1 for a in answers if a.get("is_correct"))


def _session_list_item(doc_id: str, d: dict) -> dict:
    mode = d.get("mode") or d.get("type") or "classic"
    answers = d.get("user_answers") or []
    questions = d.get("questions") or []
    q_count = int(d.get("question_count") or len(questions) or 0)
    correct = d.get("correct_count")
    if correct is None and mode == "quiz" and answers:
        correct = _quiz_correct_count(answers)
    status = _session_status(d)
    cv_name = (d.get("cv_name") or "").strip() or "CV"
    company = (d.get("company_name") or "").strip() or "Şirket"
    position = (d.get("position") or "").strip() or "Pozisyon"
    align_score = d.get("alignment_score")
    exam_score = d.get("total_score")
    weak_count = 0
    for a in answers:
        sc = a.get("score")
        if sc is not None and sc < 60:
            weak_count += 1
        elif a.get("is_correct") is False:
            weak_count += 1
    mode_tr = "Teknik quiz" if mode == "quiz" else "Klasik sınav"
    item = {
        "id": doc_id,
        "session_id": doc_id,
        "alignment_id": d.get("alignment_id") or "",
        "mode": mode,
        "mode_label": mode_tr,
        "type": mode,
        "status": status,
        "cv_id": d.get("cv_id") or "",
        "profile_id": d.get("profile_id") or "",
        "cv_name": cv_name,
        "company_name": company,
        "position": position,
        "focus_topic": d.get("focus_topic") or "",
        "alignment_score": align_score,
        "risk_level": d.get("risk_level") or "",
        "question_count": q_count,
        "correct_count": correct,
        "weak_answer_count": weak_count,
        "total_score": exam_score,
        "score": exam_score,
        "feedback": (d.get("feedback") or "")[:280],
        "feedback_preview": (d.get("feedback") or "")[:320],
        "completed_at": _format_started_at(d.get("completed_at")),
        "started_at": _format_started_at(d.get("started_at")),
        "created_at": _format_started_at(d.get("started_at")),
        "list_label": (
            f"{mode_tr} · {cv_name} → {company} · {position}"
            + (f" · eşleşme %{round(float(align_score))}" if align_score is not None else "")
            + (f" · sınav %{round(float(exam_score))}" if exam_score is not None else "")
        ),
    }
    return item


def _completed_sessions_list_sync(uid: str, limit: int) -> list[dict]:
    """Tamamlanmış sınavlar — rapor sayfası ana listesi."""
    db = get_firestore()
    snapshots = list(
        db.collection("interview_sessions")
        .where(filter=FieldFilter("user_id", "==", uid))
        .limit(120)
        .stream()
    )
    snapshots.sort(
        key=lambda doc: _started_at_sort_key((doc.to_dict() or {}).get("started_at")),
        reverse=True,
    )

    align_cache: dict[str, dict] = {}
    items: list[dict] = []
    for doc in snapshots:
        d = doc.to_dict() or {}
        if _session_status(d) != "completed":
            continue
        if d.get("alignment_score") is None:
            aid = (d.get("alignment_id") or "").strip()
            if aid:
                if aid not in align_cache:
                    a_snap = db.collection("alignment_results").document(aid).get()
                    align_cache[aid] = a_snap.to_dict() if a_snap.exists else {}
                a_data = align_cache[aid]
                if a_data.get("score") is not None:
                    d = {**d, "alignment_score": a_data.get("score")}
                if not d.get("risk_level"):
                    d = {**d, "risk_level": a_data.get("risk_level") or ""}
                if not (d.get("cv_name") or "").strip():
                    d = {**d, "cv_name": a_data.get("cv_name") or ""}
        items.append(_session_list_item(doc.id, d))
        if len(items) >= limit:
            break
    return items


def _session_detail_payload(doc_id: str, d: dict) -> dict:
    item = _session_list_item(doc_id, d)
    mode = item["mode"]
    answers = d.get("user_answers") or []
    per_question = []
    for a in answers:
        row = {
            "question_index": a.get("question_index"),
            "question": a.get("question") or "",
            "difficulty": a.get("difficulty"),
            "type": a.get("type"),
        }
        if mode == "quiz":
            row.update(
                {
                    "options": a.get("options") or [],
                    "selected_index": a.get("selected_index"),
                    "correct_index": a.get("correct_index"),
                    "is_correct": a.get("is_correct"),
                    "explanation": a.get("explanation") or "",
                }
            )
        else:
            row.update(
                {
                    "answer": a.get("answer") or "",
                    "score": a.get("score"),
                    "feedback": a.get("feedback") or "",
                }
            )
        per_question.append(row)
    per_question.sort(key=lambda x: int(x.get("question_index") or 0))
    item["per_question"] = per_question
    item["feedback_full"] = d.get("feedback") or ""
    item["mode_label"] = "Teknik quiz" if mode == "quiz" else "Klasik sınav"
    if item.get("alignment_score") is None:
        item["alignment_score"] = d.get("alignment_score")
    return item


def _sessions_for_alignment_sync(uid: str, alignment_id: str, limit: int) -> list[dict]:
    db = get_firestore()
    a_snap = db.collection("alignment_results").document(alignment_id).get()
    if not a_snap.exists:
        return []
    a_data = a_snap.to_dict() or {}
    if a_data.get("user_id") != uid:
        return []

    cv_id = str(a_data.get("cv_id") or "")
    profile_id = str(a_data.get("profile_id") or "")
    seen: set[str] = set()
    merged: list = []

    def _collect(query_snapshots):
        for doc in query_snapshots:
            if doc.id in seen:
                continue
            seen.add(doc.id)
            merged.append(doc)

    try:
        by_align = list(
            db.collection("interview_sessions")
            .where(filter=FieldFilter("user_id", "==", uid))
            .where(filter=FieldFilter("alignment_id", "==", alignment_id))
            .order_by("started_at", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        _collect(by_align)
    except Exception:
        by_align = list(
            db.collection("interview_sessions")
            .where(filter=FieldFilter("user_id", "==", uid))
            .where(filter=FieldFilter("alignment_id", "==", alignment_id))
            .limit(limit)
            .stream()
        )
        _collect(by_align)

    if cv_id and profile_id and len(merged) < limit:
        try:
            by_pair = list(
                db.collection("interview_sessions")
                .where(filter=FieldFilter("user_id", "==", uid))
                .where(filter=FieldFilter("cv_id", "==", cv_id))
                .where(filter=FieldFilter("profile_id", "==", profile_id))
                .order_by("started_at", direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream()
            )
            for doc in by_pair:
                d = doc.to_dict() or {}
                aid = (d.get("alignment_id") or "").strip()
                if aid and aid != alignment_id:
                    continue
                if doc.id in seen:
                    continue
                seen.add(doc.id)
                merged.append(doc)
        except Exception:
            pass

    merged.sort(
        key=lambda doc: _started_at_sort_key((doc.to_dict() or {}).get("started_at")),
        reverse=True,
    )

    items = []
    for doc in merged[:limit]:
        d = doc.to_dict() or {}
        if _session_status(d) != "completed":
            continue
        items.append(_session_list_item(doc.id, d))
    return items


def _interview_list_items_sync(
    uid: str, limit: int, cv_id: str | None, profile_id: str | None
) -> list[dict]:
    db = get_firestore()
    snapshots = list(
        db.collection("interview_sessions")
        .where(filter=FieldFilter("user_id", "==", uid))
        .limit(80)
        .stream()
    )
    snapshots.sort(
        key=lambda doc: _started_at_sort_key((doc.to_dict() or {}).get("started_at")),
        reverse=True,
    )

    items = []
    for doc in snapshots:
        d = doc.to_dict() or {}
        doc_cv = str(d.get("cv_id") or "")
        doc_pr = str(d.get("profile_id") or "")
        if cv_id and doc_cv != cv_id:
            continue
        if profile_id and doc_pr != profile_id:
            continue

        items.append(_session_list_item(doc.id, d))
        if len(items) >= limit:
            break

    return items


@router.get("/interview/completed")
async def interview_completed_list(
    limit: int = 30,
    uid: str = Depends(get_current_user),
):
    """Raporlar: tamamlanmış sınav sonuçları (analiz bağlamı dahil)."""
    limit = max(1, min(50, int(limit)))
    items = await asyncio.to_thread(_completed_sessions_list_sync, uid, limit)
    return {"items": items, "total": len(items)}


@router.get("/interview/by-alignment/{alignment_id}")
async def interview_list_by_alignment(
    alignment_id: str,
    limit: int = 20,
    uid: str = Depends(get_current_user),
):
    limit = max(1, min(30, int(limit)))
    a_snap = await asyncio.to_thread(
        lambda: get_firestore().collection("alignment_results").document(alignment_id).get()
    )
    if not a_snap.exists:
        raise HTTPException(status_code=404, detail="Analiz bulunamadı")
    if (a_snap.to_dict() or {}).get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Bu analize erişim yok")
    items = await asyncio.to_thread(_sessions_for_alignment_sync, uid, alignment_id, limit)
    return {"alignment_id": alignment_id, "items": items, "total": len(items)}


@router.get("/interview/session/{session_id}")
async def interview_session_detail(
    session_id: str,
    uid: str = Depends(get_current_user),
):
    def _read():
        db = get_firestore()
        snap = db.collection("interview_sessions").document(session_id).get()
        if not snap.exists:
            return None
        d = snap.to_dict() or {}
        if d.get("user_id") != uid:
            return "forbidden"
        return _session_detail_payload(snap.id, d)

    result = await asyncio.to_thread(_read)
    if result is None:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    if result == "forbidden":
        raise HTTPException(status_code=403, detail="Bu oturuma erişim yok")
    return result


@router.get("/interview/list")
async def interview_list(
    limit: int = 20,
    cv_id: str | None = None,
    profile_id: str | None = None,
    uid: str = Depends(get_current_user),
):
    limit = max(1, min(50, int(limit)))
    cv_filter = (cv_id or "").strip() or None
    pr_filter = (profile_id or "").strip() or None
    items = await asyncio.to_thread(
        _interview_list_items_sync, uid, limit, cv_filter, pr_filter
    )
    return {"items": items, "total": len(items)}


class InterviewStartBody(BaseModel):
    cv_id: str | None = Field(default=None, min_length=1)
    profile_id: str | None = Field(default=None, min_length=1)
    alignment_id: str | None = Field(default=None, min_length=1)
    focus_topic: str | None = Field(default=None, max_length=220)

    @model_validator(mode="after")
    def require_target(self):
        if self.alignment_id:
            return self
        if self.cv_id and self.profile_id:
            return self
        raise ValueError("alignment_id veya cv_id ve profile_id gerekli")


class AnswerItem(BaseModel):
    question_index: int = Field(..., ge=0)
    answer: str = Field(default="", max_length=20000)


class InterviewSubmitBody(BaseModel):
    session_id: str = Field(..., min_length=1)
    answers: list[AnswerItem]


class QuizAnswerItem(BaseModel):
    question_index: int = Field(..., ge=0)
    selected_index: int | None = Field(default=None, ge=0, le=3)


class QuizSubmitBody(BaseModel):
    session_id: str = Field(..., min_length=1)
    answers: list[QuizAnswerItem]


def _new_session_doc(
    uid: str,
    ctx: dict,
    body: InterviewStartBody,
    mode: str,
    questions: list,
    focus_topic: str | None = None,
) -> dict:
    return {
        "user_id": uid,
        "cv_id": ctx["cv_id"],
        "profile_id": ctx["profile_id"],
        "alignment_id": (body.alignment_id or "").strip(),
        "cv_name": ctx.get("cv_name") or "",
        "alignment_score": ctx.get("alignment_score"),
        "risk_level": ctx.get("risk_level") or "",
        "mode": mode,
        "company_name": ctx["company_name"],
        "position": ctx["position"],
        "focus_topic": (focus_topic or "").strip(),
        "status": "in_progress",
        "question_count": len(questions),
        "correct_count": None,
        "questions": questions,
        "user_answers": [],
        "total_score": None,
        "feedback": "",
        "started_at": SERVER_TIMESTAMP,
        "completed_at": None,
    }


def _ctx_from_alignment_doc(align_data: dict, cv_id: str, profile_id: str) -> dict:
    """Alignment snapshot — cv_skills alanı eski kayıtlarda olmayabilir."""
    cv_skills = align_data.get("cv_skills")
    if not isinstance(cv_skills, list) or not cv_skills:
        matched = align_data.get("matched_skills")
        cv_skills = matched if isinstance(matched, list) else []
    return {
        "cv_id": cv_id,
        "profile_id": profile_id,
        "cv_name": (align_data.get("cv_name") or "").strip() or f"CV {cv_id[:8]}",
        "company_name": (align_data.get("company_name") or "").strip(),
        "position": (align_data.get("position") or align_data.get("target_position") or "").strip(),
        "alignment_score": align_data.get("score"),
        "risk_level": align_data.get("risk_level") or "",
        "tech_stack": align_data.get("tech_stack") or [],
        "key_traits": align_data.get("key_traits") or [],
        "cv_skills": cv_skills,
        "missing_skills": align_data.get("missing_skills") or [],
    }


def _merge_profile_into_ctx(ctx: dict, pr_data: dict) -> None:
    if not ctx.get("company_name"):
        ctx["company_name"] = (pr_data.get("company_name") or "").strip()
    if not ctx.get("position"):
        ctx["position"] = (pr_data.get("position") or "").strip()
    if not ctx.get("tech_stack"):
        ctx["tech_stack"] = pr_data.get("tech_stack") or []
    if not ctx.get("key_traits"):
        ctx["key_traits"] = pr_data.get("key_traits") or []


def _merge_cv_into_ctx(ctx: dict, cv_data: dict, cv_id: str) -> None:
    if not ctx.get("cv_skills"):
        ctx["cv_skills"] = cv_data.get("skills") or []
    fn = (cv_data.get("file_name") or "").strip()
    if fn and (not ctx.get("cv_name") or str(ctx["cv_name"]).startswith("CV ")):
        ctx["cv_name"] = fn


def _load_profile_doc(db, uid: str, profile_id: str) -> dict:
    pr_snap = db.collection("company_profiles").document(profile_id).get()
    if not pr_snap.exists:
        raise HTTPException(
            status_code=404,
            detail="Şirket profili bulunamadı. CV Analizi ile yeni bir eşleşme oluşturun.",
        )
    pr_data = pr_snap.to_dict() or {}
    if pr_data.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Bu şirket profiline erişim yok")
    return pr_data


def _interview_context_from_body(db, uid: str, body: InterviewStartBody) -> dict:
    """Mülakat soru üretimi — alignment snapshot öncelikli; silinmiş CV için 404 vermez."""
    cv_id = str(body.cv_id or "").strip()
    profile_id = str(body.profile_id or "").strip()
    align_data: dict | None = None

    if body.alignment_id:
        snap = db.collection("alignment_results").document(body.alignment_id).get()
        if not snap.exists:
            raise HTTPException(
                status_code=404,
                detail="Seçilen analiz kaydı bulunamadı. Listeyi yenileyip tekrar deneyin.",
            )
        align_data = snap.to_dict() or {}
        if align_data.get("user_id") != uid:
            raise HTTPException(status_code=403, detail="Bu analiz kaydına erişim yok")
        cv_id = str(align_data.get("cv_id") or cv_id).strip()
        profile_id = str(align_data.get("profile_id") or profile_id).strip()
        if not cv_id or not profile_id:
            raise HTTPException(
                status_code=400,
                detail="Bu analiz kaydında CV veya şirket bilgisi eksik. Yeni bir analiz yapın.",
            )

        ctx = _ctx_from_alignment_doc(align_data, cv_id, profile_id)

        if not ctx["company_name"] or not ctx["position"] or not ctx["tech_stack"]:
            pr_data = _load_profile_doc(db, uid, profile_id)
            _merge_profile_into_ctx(ctx, pr_data)

        if not ctx["cv_skills"]:
            cv_snap = db.collection("cv_documents").document(cv_id).get()
            if cv_snap.exists():
                cv_data = cv_snap.to_dict() or {}
                if cv_data.get("user_id") == uid:
                    _merge_cv_into_ctx(ctx, cv_data, cv_id)

        if not ctx["company_name"] and not ctx["position"]:
            raise HTTPException(
                status_code=400,
                detail="Bu analiz kaydında şirket bilgisi eksik. Yeni bir eşleşme analizi yapın.",
            )
        return ctx

    if not cv_id or not profile_id:
        raise HTTPException(
            status_code=400,
            detail="alignment_id veya cv_id ve profile_id gerekli",
        )

    cv_data, pr_data = _load_cv_and_profile(db, uid, cv_id, profile_id)
    cv_name = (cv_data.get("file_name") or "").strip() or f"CV {cv_id[:8]}"
    if align_data and align_data.get("cv_name"):
        cv_name = align_data.get("cv_name") or cv_name
    return {
        "cv_id": cv_id,
        "profile_id": profile_id,
        "cv_name": cv_name,
        "company_name": pr_data.get("company_name") or "",
        "position": pr_data.get("position") or "",
        "alignment_score": (align_data or {}).get("score"),
        "risk_level": (align_data or {}).get("risk_level") or "",
        "tech_stack": pr_data.get("tech_stack") or [],
        "key_traits": pr_data.get("key_traits") or [],
        "cv_skills": cv_data.get("skills") or [],
        "missing_skills": (align_data or {}).get("missing_skills") or [],
    }


def _load_cv_and_profile(db, uid: str, cv_id: str, profile_id: str) -> tuple[dict, dict]:
    cv_snap = db.collection("cv_documents").document(cv_id).get()
    pr_snap = db.collection("company_profiles").document(profile_id).get()
    if not cv_snap.exists:
        raise HTTPException(
            status_code=404,
            detail="CV bulunamadı (silinmiş olabilir). Profilden CV'yi kontrol edin veya yeni analiz yapın.",
        )
    if not pr_snap.exists:
        raise HTTPException(
            status_code=404,
            detail="Şirket profili bulunamadı. CV Analizi ile yeni bir eşleşme oluşturun.",
        )
    cv_data = cv_snap.to_dict() or {}
    pr_data = pr_snap.to_dict() or {}
    if cv_data.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Bu CV kaydına erişim yok")
    if pr_data.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Bu şirket profiline erişim yok")
    return cv_data, pr_data


@router.post("/interview/classic")
@limiter.limit("10/hour")
async def start_classic(
    request: Request,
    body: InterviewStartBody,
    uid: str = Depends(get_current_user),
):
    enforce_daily_quota(uid, "classic_exam", "DAILY_QUOTA_CLASSIC_EXAM")
    if not get_env("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY tanımlı değil. .env dosyasına ekleyin.",
        )

    db = get_firestore()
    ctx = _interview_context_from_body(db, uid, body)
    cv_id = ctx["cv_id"]
    profile_id = ctx["profile_id"]
    company_name = ctx["company_name"]
    position = ctx["position"]

    questions = generate_classic_questions(
        company_name=company_name,
        position=position,
        tech_stack=ctx["tech_stack"],
        key_traits=ctx["key_traits"],
        cv_skills=ctx["cv_skills"],
        missing_skills=ctx["missing_skills"],
    )
    if not questions:
        raise HTTPException(
            status_code=502, detail="Gemini soru üretemedi. Model veya kota kontrol edin."
        )

    session_id = str(uuid.uuid4())
    db.collection("interview_sessions").document(session_id).set(
        _new_session_doc(uid, ctx, body, "classic", questions)
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
        "alignment_id": body.alignment_id or "",
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
            "status": "completed",
            "correct_count": None,
            "completed_at": SERVER_TIMESTAMP,
        }
    )

    return {
        "session_id": body.session_id,
        "total_score": total_score,
        "feedback": summary,
        "per_question": per_question,
    }


@router.post("/interview/quiz")
@limiter.limit("15/hour")
async def start_quiz(
    request: Request,
    body: InterviewStartBody,
    uid: str = Depends(get_current_user),
):
    enforce_daily_quota(uid, "quiz", "DAILY_QUOTA_QUIZ")
    if not get_env("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=503, detail="GEMINI_API_KEY tanımlı değil. .env dosyasına ekleyin."
        )

    db = get_firestore()
    ctx = _interview_context_from_body(db, uid, body)
    cv_id = ctx["cv_id"]
    profile_id = ctx["profile_id"]
    company_name = ctx["company_name"]
    position = ctx["position"]

    focus = (body.focus_topic or "").strip() or None
    questions = generate_quiz_questions(
        company_name=company_name,
        position=position,
        tech_stack=ctx["tech_stack"],
        key_traits=ctx["key_traits"],
        cv_skills=ctx["cv_skills"],
        focus_topic=focus,
    )
    if not questions:
        raise HTTPException(
            status_code=502, detail="Gemini quiz soruları üretemedi. Model veya kota kontrol edin."
        )

    session_id = str(uuid.uuid4())
    db.collection("interview_sessions").document(session_id).set(
        _new_session_doc(uid, ctx, body, "quiz", questions, focus_topic=focus)
    )

    public_questions = [
        {
            "index": q["index"],
            "question": q["question"],
            "options": q["options"],
            "difficulty": q["difficulty"],
        }
        for q in questions
    ]

    return {
        "session_id": session_id,
        "company_name": company_name,
        "position": position,
        "mode": "quiz",
        "seconds_per_question": 60,
        "questions": public_questions,
    }


@router.post("/interview/quiz/submit")
async def submit_quiz(
    body: QuizSubmitBody,
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
    if sess.get("mode") != "quiz":
        raise HTTPException(status_code=400, detail="Bu oturum quiz mod değil")
    if sess.get("completed_at"):
        raise HTTPException(status_code=400, detail="Bu oturum zaten tamamlanmış")

    questions = sess.get("questions") or []
    by_index = {int(q.get("index", i)): q for i, q in enumerate(questions)}

    by_user: dict[int, int | None] = {}
    for ans in body.answers:
        by_user[int(ans.question_index)] = (
            None if ans.selected_index is None else int(ans.selected_index)
        )

    per_question = []
    correct_count = 0
    for idx, q in by_index.items():
        sel = by_user.get(idx)
        is_correct = sel is not None and sel == int(q.get("correct_index", -1))
        if is_correct:
            correct_count += 1
        per_question.append(
            {
                "question_index": idx,
                "question": q.get("question") or "",
                "options": q.get("options") or [],
                "selected_index": sel,
                "correct_index": int(q.get("correct_index", -1)),
                "is_correct": bool(is_correct),
                "difficulty": q.get("difficulty"),
                "explanation": q.get("explanation") or "",
            }
        )

    per_question.sort(key=lambda x: x["question_index"])
    total = len(per_question) or 1
    total_score = round((correct_count / total) * 100, 2)

    sess_ref.update(
        {
            "user_answers": per_question,
            "total_score": total_score,
            "feedback": f"{correct_count}/{total} doğru cevap",
            "status": "completed",
            "correct_count": correct_count,
            "question_count": total,
            "completed_at": SERVER_TIMESTAMP,
        }
    )

    return {
        "session_id": body.session_id,
        "correct_count": correct_count,
        "total_questions": total,
        "total_score": total_score,
        "per_question": per_question,
    }


@router.post("/interview/voice", status_code=501)
async def voice_interview_placeholder(
    body: InterviewStartBody,
    uid: str = Depends(get_current_user),
):
    raise HTTPException(
        status_code=501,
        detail="Sesli mülakat yakında. Bu özellik henüz aktif değil.",
    )
