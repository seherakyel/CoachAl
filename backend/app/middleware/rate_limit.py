from datetime import datetime, timezone

from fastapi import HTTPException, Request
from google.cloud.firestore import Increment
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config.firebase_config import get_firestore
from app.config.settings import get_env, get_int_env


def _key_func(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer ") and len(auth) > 32:
        return f"bearer:{auth[-24:]}"
    return get_remote_address(request)


limiter = Limiter(
    key_func=_key_func,
    default_limits=[get_env("RATE_LIMIT_DEFAULT", "60/minute")],
    headers_enabled=False,
)


def _today_id(uid: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"{uid}_{today}"


def enforce_daily_quota(uid: str, action: str, limit_env_key: str) -> int:
    limit = get_int_env(limit_env_key, 30)
    if limit <= 0:
        return 0
    db = get_firestore()
    doc_ref = db.collection("usage_counters").document(_today_id(uid))
    snap = doc_ref.get()
    current = 0
    if snap.exists:
        current = int((snap.to_dict() or {}).get(action, 0) or 0)
    if current >= limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Günlük {action} kotanı doldurdun ({current}/{limit}). "
                "UTC gece yarısında sıfırlanır."
            ),
        )
    doc_ref.set(
        {action: Increment(1), "updated_at": datetime.now(timezone.utc).isoformat()},
        merge=True,
    )
    return current + 1


def get_daily_usage(uid: str) -> dict:
    db = get_firestore()
    snap = db.collection("usage_counters").document(_today_id(uid)).get()
    if not snap.exists:
        return {}
    data = snap.to_dict() or {}
    return {k: v for k, v in data.items() if k != "updated_at"}
