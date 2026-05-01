from fastapi import APIRouter, Depends

from app.config.firebase_config import get_firestore
from app.middleware.auth import get_current_user


router = APIRouter()


def _doc_id_iso(d) -> str | None:
    try:
        ts = d.create_time
        return ts.isoformat() if ts else None
    except Exception:
        return None


@router.get("/dashboard/summary")
async def dashboard_summary(uid: str = Depends(get_current_user)):
    db = get_firestore()

    cv_count = 0
    for _ in db.collection("cv_documents").where("user_id", "==", uid).stream():
        cv_count += 1

    profiles = []
    for d in db.collection("company_profiles").where("user_id", "==", uid).stream():
        data = d.to_dict() or {}
        profiles.append(
            {
                "profile_id": d.id,
                "company_name": data.get("company_name") or "",
                "position": data.get("position") or "",
            }
        )

    alignment_by_profile: dict[str, dict] = {}
    alignments_all = []
    for d in db.collection("alignment_results").where("user_id", "==", uid).stream():
        data = d.to_dict() or {}
        item = {
            "alignment_id": d.id,
            "profile_id": data.get("profile_id"),
            "cv_id": data.get("cv_id"),
            "score": data.get("score") or 0,
            "risk_level": data.get("risk_level"),
        }
        alignments_all.append(item)
        pid = item["profile_id"]
        if pid:
            best = alignment_by_profile.get(pid)
            if not best or (item["score"] or 0) > (best["score"] or 0):
                alignment_by_profile[pid] = item

    interview_by_profile: dict[str, dict] = {}
    interview_count = 0
    for d in db.collection("interview_sessions").where("user_id", "==", uid).stream():
        data = d.to_dict() or {}
        if not data.get("completed_at"):
            continue
        interview_count += 1
        pid = data.get("profile_id")
        mode = data.get("mode")
        score = data.get("total_score") or 0
        if not pid:
            continue
        agg = interview_by_profile.setdefault(
            pid, {"classic": {"best": None, "count": 0}, "quiz": {"best": None, "count": 0}}
        )
        if mode in agg:
            agg[mode]["count"] += 1
            if agg[mode]["best"] is None or score > agg[mode]["best"]:
                agg[mode]["best"] = score

    applications = []
    for p in profiles:
        a = alignment_by_profile.get(p["profile_id"])
        i = interview_by_profile.get(p["profile_id"]) or {
            "classic": {"best": None, "count": 0},
            "quiz": {"best": None, "count": 0},
        }
        applications.append(
            {
                "profile_id": p["profile_id"],
                "company_name": p["company_name"],
                "position": p["position"],
                "alignment_score": a["score"] if a else None,
                "alignment_id": a["alignment_id"] if a else None,
                "risk_level": a["risk_level"] if a else None,
                "classic_best": i["classic"]["best"],
                "classic_count": i["classic"]["count"],
                "quiz_best": i["quiz"]["best"],
                "quiz_count": i["quiz"]["count"],
            }
        )
    applications.sort(
        key=lambda x: (x["alignment_score"] is None, -(x["alignment_score"] or 0))
    )

    recent_alignments = sorted(
        alignments_all, key=lambda x: x["alignment_id"], reverse=True
    )[:5]

    return {
        "cv_count": cv_count,
        "company_count": len(profiles),
        "interview_count": interview_count,
        "applications": applications,
        "recent_alignments": recent_alignments,
    }
