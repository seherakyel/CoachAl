from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_user

router = APIRouter()


@router.get("/auth/me")
async def auth_me(uid: str = Depends(get_current_user)):
    return {"status": "ok", "uid": uid}
