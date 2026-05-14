"""LinkedIn Voyager company typeahead — credentials from .env only."""

from __future__ import annotations

import json
import re
import urllib.parse

import requests
from fastapi import APIRouter, Depends, Query, Request

from app.config.settings import get_env
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import limiter

router = APIRouter()


def search_linkedin_companies(query: str, li_at: str, jsessionid: str) -> list[dict]:
    encoded_query = urllib.parse.quote(query)
    url = (
        "https://www.linkedin.com/voyager/api/graphql?variables=(query:"
        f"{encoded_query})&queryId=voyagerSearchDashTypeahead.fa9acbcb761f7b5ec2c808e6da796296"
    )
    cookies = {"li_at": li_at, "JSESSIONID": jsessionid}
    csrf = jsessionid.strip().strip('"').strip("'")
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
        "csrf-token": csrf,
        "x-restli-protocol-version": "2.0.0",
    }

    try:
        response = requests.get(url, cookies=cookies, headers=headers, timeout=10)
        response.encoding = "utf-8"
        if response.status_code != 200:
            return []

        data = response.json()
        results: list[dict] = []

        def extract_logo(obj):
            if isinstance(obj, dict):
                if "rootUrl" in obj and "artifacts" in obj:
                    artifacts = obj["artifacts"]
                    if isinstance(artifacts, list) and len(artifacts) > 0 and isinstance(artifacts[0], dict):
                        file_path = artifacts[0].get("fileIdentifyingUrlPathSegment", "")
                        return obj.get("rootUrl", "") + file_path
                for _, value in obj.items():
                    res = extract_logo(value)
                    if res:
                        return res
            elif isinstance(obj, list):
                for item in obj:
                    res = extract_logo(item)
                    if res:
                        return res
            return None

        def find_hits(obj):
            if isinstance(obj, dict):
                view = obj.get("entityLockupView")
                if isinstance(view, dict):
                    title_obj = view.get("title")
                    title = title_obj.get("text", "") if isinstance(title_obj, dict) else ""

                    sub_obj = view.get("subtitle") or view.get("subtext")
                    subtitle = sub_obj.get("text", "") if isinstance(sub_obj, dict) else ""

                    obj_str = json.dumps(obj)
                    uni_name = ""
                    url_match = re.search(r"company/([a-zA-Z0-9-]+)", obj_str)
                    if url_match:
                        uni_name = url_match.group(1)
                    else:
                        urn_match = re.search(
                            r"urn:li:(?:organization|company|fsd_company):(\d+)", obj_str
                        )
                        if urn_match:
                            uni_name = urn_match.group(1)

                    image_obj = view.get("image")
                    logo_url = extract_logo(image_obj) if isinstance(image_obj, dict) else ""

                    if title and uni_name:
                        if not any(r["universal_name"] == uni_name for r in results):
                            results.append(
                                {
                                    "name": title,
                                    "subtext": subtitle,
                                    "universal_name": uni_name,
                                    "logo_url": logo_url or "",
                                }
                            )
                for _, v in obj.items():
                    find_hits(v)
            elif isinstance(obj, list):
                for item in obj:
                    find_hits(item)

        find_hits(data)
        return results
    except Exception:
        return []


@router.get("/company/search")
@limiter.limit("60/minute")
async def company_search(
    request: Request,
    q: str = Query("", min_length=1, max_length=120),
    _uid: str = Depends(get_current_user),
):
    """LinkedIn typeahead; requires LINKEDIN_LI_AT and LINKEDIN_JSESSIONID in .env."""
    li_at = get_env("LINKEDIN_LI_AT")
    jsessionid = get_env("LINKEDIN_JSESSIONID")
    if not li_at or not jsessionid:
        return []
    return search_linkedin_companies(q.strip(), li_at, jsessionid)
