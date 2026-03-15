from fastapi import APIRouter, HTTPException
from app.config.firebase_config import get_firestore, get_storage
from datetime import datetime, timezone
from google.api_core.exceptions import NotFound

router = APIRouter()


@router.get("/firebase/firestore-test")
async def firestore_test():
    try:
        db = get_firestore()
        doc_ref = db.collection("_coachai_test").document("smoke")
        doc_ref.set({"timestamp": datetime.now(timezone.utc).isoformat(), "source": "CoachAI"})
        doc = doc_ref.get()
        data = doc.to_dict()
        doc_ref.delete()
        return {"status": "ok", "message": "Firestore yazma/okuma başarılı", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/firebase/storage-test")
async def storage_test():
    try:
        bucket = get_storage()
        blob = bucket.blob("_coachai_test/smoke.txt")
        blob.upload_from_string("CoachAI smoke test", content_type="text/plain")
        content = blob.download_as_text()
        blob.delete()
        return {"status": "ok", "message": "Storage yazma/okuma başarılı", "content": content}
    except NotFound:
        raise HTTPException(
            status_code=503,
            detail="Storage bucket bulunamadı. Firebase Console > Storage > Get Started ile etkinleştirin."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
