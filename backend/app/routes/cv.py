import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from google.cloud.firestore import SERVER_TIMESTAMP

from app.config.firebase_config import get_firestore
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import enforce_daily_quota, limiter
from app.services.cv_parser import extract_text_from_pdf
from app.services.gemini_client import extract_cv_structure_from_text

router = APIRouter()

MAX_BYTES = 10 * 1024 * 1024


@router.post("/cv/upload")
@limiter.limit("10/hour")
async def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    uid: str = Depends(get_current_user),
):
    enforce_daily_quota(uid, "cv_upload", "DAILY_QUOTA_CV_UPLOAD")
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyası yüklenebilir")
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Dosya boyutu en fazla 10 MB olabilir")
    if len(raw) < 100:
        raise HTTPException(status_code=400, detail="Dosya çok küçük veya bozuk")

    cv_id = str(uuid.uuid4())

    extracted_text = extract_text_from_pdf(raw)
    if not extracted_text:
        raise HTTPException(status_code=422, detail="PDF içinden metin çıkarılamadı")

    structured = extract_cv_structure_from_text(extracted_text)
    skills = structured.get("skills") or []
    experience_years = structured.get("experience_years")
    education_level = structured.get("education_level")

    db = get_firestore()
    doc_ref = db.collection("cv_documents").document(cv_id)
    doc_ref.set(
        {
            "user_id": uid,
            "file_name": file.filename,
            "extracted_text": extracted_text[:50000],
            "skills": skills,
            "experience_years": experience_years,
            "education_level": education_level,
            "uploaded_at": SERVER_TIMESTAMP,
            "parsed": True,
        }
    )

    return {
        "cv_id": cv_id,
        "skills": skills,
        "experience_years": experience_years,
        "education_level": education_level,
        "extracted_text_preview": extracted_text[:800],
    }


@router.get("/cv/list")
async def list_cv_documents(
    uid: str = Depends(get_current_user),
    limit: int = 20,
    cursor: str | None = None,
):
    limit = max(1, min(50, int(limit)))
    db = get_firestore()
    from google.cloud.firestore import Query

    q = (
        db.collection("cv_documents")
        .where("user_id", "==", uid)
        .order_by("uploaded_at", direction=Query.DESCENDING)
        .limit(limit + 1)
    )
    if cursor:
        cur_snap = db.collection("cv_documents").document(cursor).get()
        if cur_snap.exists:
            q = q.start_after(cur_snap)

    docs = list(q.stream())
    has_more = len(docs) > limit
    docs = docs[:limit]

    items = []
    for d in docs:
        data = d.to_dict() or {}
        skills = data.get("skills") or []
        ts = data.get("uploaded_at")
        items.append(
            {
                "cv_id": d.id,
                "skill_count": len(skills),
                "skills_preview": skills[:8],
                "experience_years": data.get("experience_years"),
                "education_level": data.get("education_level"),
                "uploaded_at": ts.isoformat() if hasattr(ts, "isoformat") else None,
            }
        )

    next_cursor = items[-1]["cv_id"] if items and has_more else None
    return {"items": items, "next_cursor": next_cursor, "limit": limit}
