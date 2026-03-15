from fastapi import HTTPException, Request
from firebase_admin import auth

from app.config.firebase_config import init_firebase


async def get_current_user(request: Request) -> str:
    init_firebase()
    header = request.headers.get("Authorization")
    if not header or not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header eksik veya geçersiz")
    token = header.split("Bearer ")[-1]
    try:
        decoded = auth.verify_id_token(token)
        return decoded["uid"]
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
