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
MIN_BYTES = 100
MIN_TEXT_CHARS = 40


@router.post("/cv/upload")
@limiter.limit("10/hour")
async def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    uid: str = Depends(get_current_user),
):
    enforce_daily_quota(uid, "cv_upload", "DAILY_QUOTA_CV_UPLOAD")

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Dosya bulunamadı")

    filename = file.filename
    content_type = (file.content_type or "").lower()
    is_pdf_mime = content_type == "application/pdf"
    is_pdf_ext = filename.lower().endswith(".pdf")
    if not is_pdf_ext or (content_type and not is_pdf_mime):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyası yüklenebilir")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Dosya boş, içerik bulunamadı")
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Dosya boyutu en fazla 10 MB olabilir")
    if len(raw) < MIN_BYTES:
        raise HTTPException(status_code=400, detail="Dosya çok küçük veya bozuk")
    if not raw.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Geçerli bir PDF değil")

    try:
        extracted_text = extract_text_from_pdf(raw)
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="PDF okunamadı, dosya bozuk veya şifreli olabilir",
        )

    if not extracted_text or len(extracted_text) < MIN_TEXT_CHARS:
        raise HTTPException(
            status_code=422,
            detail=(
                "PDF metin katmanı içermiyor. Lütfen Word, Google Docs veya "
                "Canva gibi bir araçtan dijital olarak oluşturulmuş bir dosya "
                "yükleyin (taranmış veya fotoğraflanmış PDF'ler desteklenmez)."
            ),
        )

    parsed = extract_cv_structure_from_text(extracted_text)

    cv_id = str(uuid.uuid4())
    db = get_firestore()
    db.collection("cv_documents").document(cv_id).set(
        {
            "user_id": uid,
            "file_name": filename,
            "extracted_text": extracted_text[:50000],
            "skills": parsed.get("skills") or [],
            "experience_years": parsed.get("experience_years"),
            "education_level": parsed.get("education_level"),
            "summary": parsed.get("summary") or "",
            "match_score_logic": parsed.get("match_score_logic") or "",
            "uploaded_at": SERVER_TIMESTAMP,
            "parsed": True,
        }
    )

    return {
        "cv_id": cv_id,
        "file_name": filename,
        "parsed_data": {
            "skills": parsed.get("skills") or [],
            "experience_years": parsed.get("experience_years"),
            "education_level": parsed.get("education_level"),
            "summary": parsed.get("summary") or "",
            "match_score_logic": parsed.get("match_score_logic") or "",
        },
        "extracted_text_preview": extracted_text[:800],
    }


def _uploaded_at_sort_key(ts) -> float:
    """Firestore timestamp → sortable float (missing → oldest)."""
    if ts is None:
        return 0.0
    if hasattr(ts, "timestamp"):
        try:
            return float(ts.timestamp())
        except (TypeError, ValueError, OSError):
            return 0.0
    return 0.0


def _format_uploaded_at(ts) -> str | None:
    if ts is None:
        return None
    if hasattr(ts, "isoformat"):
        try:
            return ts.isoformat()
        except (TypeError, ValueError):
            return None
    return None


@router.get("/cv/list")
async def list_cv_documents(
    uid: str = Depends(get_current_user),
    limit: int = 20,
    cursor: str | None = None,
):
    limit = max(1, min(50, int(limit)))
    db = get_firestore()

    # user_id + order_by(uploaded_at) composite index gerektirir; bellek içi sıralama daha güvenilir.
    max_fetch = min(100, max(limit * 5, 50))
    snapshots = list(
        db.collection("cv_documents")
        .where("user_id", "==", uid)
        .limit(max_fetch)
        .stream()
    )
    snapshots.sort(
        key=lambda d: _uploaded_at_sort_key((d.to_dict() or {}).get("uploaded_at")),
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
        skills = data.get("skills") or []
        if not isinstance(skills, list):
            skills = []
        items.append(
            {
                "cv_id": d.id,
                "file_name": data.get("file_name") or "",
                "skill_count": len(skills),
                "skills_preview": [str(s) for s in skills[:8]],
                "experience_years": data.get("experience_years"),
                "education_level": data.get("education_level") or "",
                "summary": str(data.get("summary") or "")[:160],
                "uploaded_at": _format_uploaded_at(data.get("uploaded_at")),
            }
        )

    next_cursor = items[-1]["cv_id"] if items and has_more else None
    return {"items": items, "next_cursor": next_cursor, "limit": limit}


@router.get("/cv/{cv_id}")
async def get_cv_document(
    cv_id: str,
    uid: str = Depends(get_current_user),
):
    db = get_firestore()
    snap = db.collection("cv_documents").document(cv_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="CV bulunamadı")
    data = snap.to_dict() or {}
    if data.get("user_id") != uid:
        raise HTTPException(status_code=404, detail="CV bulunamadı")

    skills = data.get("skills") or []
    return {
        "cv_id": snap.id,
        "file_name": data.get("file_name") or "",
        "uploaded_at": _format_uploaded_at(data.get("uploaded_at")),
        "parsed_data": {
            "skills": skills,
            "experience_years": data.get("experience_years"),
            "education_level": data.get("education_level"),
            "summary": data.get("summary") or "",
            "match_score_logic": data.get("match_score_logic") or "",
        },
    }
