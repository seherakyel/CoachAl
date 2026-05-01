from fastapi import APIRouter, Depends

from app.config.settings import get_int_env
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import get_daily_usage


router = APIRouter()

QUOTA_KEYS = {
    "cv_upload": "DAILY_QUOTA_CV_UPLOAD",
    "company_analyze": "DAILY_QUOTA_COMPANY_ANALYZE",
    "alignment_score": "DAILY_QUOTA_ALIGNMENT",
    "classic_exam": "DAILY_QUOTA_CLASSIC_EXAM",
    "quiz": "DAILY_QUOTA_QUIZ",
    "feedback": "DAILY_QUOTA_FEEDBACK",
}


@router.get("/usage/today")
async def usage_today(uid: str = Depends(get_current_user)):
    used = get_daily_usage(uid)
    return {
        "items": [
            {
                "action": action,
                "used": int(used.get(action, 0) or 0),
                "limit": get_int_env(env_key, 30),
            }
            for action, env_key in QUOTA_KEYS.items()
        ]
    }
