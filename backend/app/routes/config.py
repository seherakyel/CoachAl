from fastapi import APIRouter, HTTPException
from app.config.settings import get_env

router = APIRouter()


@router.get("/config/firebase")
async def firebase_web_config():
    project_id = get_env("FIREBASE_PROJECT_ID")
    api_key = get_env("FIREBASE_WEB_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Undefined")
    return {
        "apiKey": api_key,
        "authDomain": f"{project_id}.firebaseapp.com",
        "projectId": project_id,
        "storageBucket": f"{project_id}.firebasestorage.app",
        "messagingSenderId": get_env("FIREBASE_WEB_MESSAGING_SENDER_ID"),
        "appId": get_env("FIREBASE_WEB_APP_ID"),
    }
