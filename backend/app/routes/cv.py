import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from google.cloud.firestore import SERVER_TIMESTAMP

from app.config.firebase_config import get_firestore, get_storage
from app.middleware.auth import get_current_user
from app.services.cv_parser import extract_text_from_pdf
from app.services.gemini_client import extract_cv_structure_from_text

router = APIRouter()

MAX_BYTES = 10 * 1024 * 1024


@router.post("/cv/upload")
async def upload_cv(
    file: UploadFile = File(...),
    uid: str = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyası yüklenebilir")
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Dosya boyutu en fazla 10 MB olabilir")
    if len(raw) < 100:
        raise HTTPException(status_code=400, detail="Dosya çok küçük veya bozuk")

    cv_id = str(uuid.uuid4())
    storage_path = f"cvs/{uid}/{cv_id}.pdf"

    try:
        bucket = get_storage()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Storage kullanılamıyor: {e!s}. Firebase Storage etkin mi kontrol et.",
        )

    blob = bucket.blob(storage_path)
    blob.upload_from_string(raw, content_type="application/pdf")
    try:
        file_url = blob.generate_signed_url(expiration=timedelta(days=7))
    except Exception:
        file_url = f"gs://{bucket.name}/{storage_path}"

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
            "file_url": file_url,
            "storage_path": storage_path,
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
        "file_url": file_url,
        "skills": skills,
        "experience_years": experience_years,
        "education_level": education_level,
        "extracted_text_preview": extracted_text[:800],
    }


@router.get("/cv/list")
async def list_cv_documents(uid: str = Depends(get_current_user)):
    db = get_firestore()
    items = []
    for d in db.collection("cv_documents").where("user_id", "==", uid).stream():
        data = d.to_dict() or {}
        skills = data.get("skills") or []
        items.append(
            {
                "cv_id": d.id,
                "skill_count": len(skills),
                "skills_preview": skills[:8],
                "experience_years": data.get("experience_years"),
                "education_level": data.get("education_level"),
            }
        )
    items.sort(key=lambda x: x["cv_id"], reverse=True)
    return {"items": items}
