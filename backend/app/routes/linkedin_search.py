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

        def _build_url(root: str, segment: str) -> str:
            """rootUrl ve fileIdentifyingUrlPathSegment'i güvenli birleştir."""
            root = root.rstrip("/")
            segment = segment.lstrip("/")
            return f"{root}/{segment}" if root and segment else ""

        def _vector_image_url(obj: dict) -> str:
            """
            LinkedIn VectorImage objesinden en yüksek çözünürlüklü URL'yi döner.
            artifacts listesinin sonuncusu genellikle en büyük boyutludur.
            """
            root = obj.get("rootUrl", "")
            artifacts = obj.get("artifacts")
            if not isinstance(artifacts, list) or not artifacts:
                return ""
            # En sona doğru git; geçerli dict bulduğun ilk yerden al
            for artifact in reversed(artifacts):
                if isinstance(artifact, dict):
                    seg = artifact.get("fileIdentifyingUrlPathSegment", "")
                    if seg:
                        return _build_url(root, seg)
            return ""

        def extract_logo(obj) -> str:
            """
            LinkedIn image wrapper'larından logo URL'sini çıkarır.
            Desteklenen stiller:
              1. Doğrudan VectorImage  { rootUrl, artifacts }
              2. attributes / nonCustomized içindeki VectorImage
              3. Herhangi bir derinlikte recursive tarama
            """
            if not isinstance(obj, dict):
                if isinstance(obj, list):
                    for item in obj:
                        res = extract_logo(item)
                        if res:
                            return res
                return ""

            # 1. Kendisi VectorImage mi?
            if "rootUrl" in obj and "artifacts" in obj:
                url = _vector_image_url(obj)
                if url:
                    return url

            # 2. LinkedIn typeahead'de sık görülen wrapper anahtarları
            for key in ("vectorImage", "com.linkedin.common.VectorImage",
                        "nonCustomized", "attributes"):
                child = obj.get(key)
                if isinstance(child, dict):
                    url = extract_logo(child)
                    if url:
                        return url
                elif isinstance(child, list):
                    for item in child:
                        url = extract_logo(item)
                        if url:
                            return url

            # 3. Kalan tüm değerleri recursive tara
            for value in obj.values():
                if isinstance(value, (dict, list)):
                    res = extract_logo(value)
                    if res:
                        return res

            return ""

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

                    # image wrapper'ı doğrudan extract_logo'ya ver;
                    # image None/str ise tam view'ı tara (bazı yanıtlarda üst katmanda gelir)
                    image_obj = view.get("image")
                    if isinstance(image_obj, dict):
                        logo_url = extract_logo(image_obj)
                    else:
                        logo_url = extract_logo(view)

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
