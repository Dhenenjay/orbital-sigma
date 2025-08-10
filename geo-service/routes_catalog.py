from fastapi import APIRouter, HTTPException
import os
import requests
from typing import Optional

router = APIRouter()

# Proxies AOIs from Convex HTTP endpoint to the geo-service
@router.get("/aois")
def get_aois(type: Optional[str] = None, q: Optional[str] = None):
    convex_url = os.getenv("CONVEX_URL") or os.getenv("NEXT_PUBLIC_CONVEX_URL")
    if not convex_url:
        raise HTTPException(status_code=500, detail="CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) env var is not set")

    params = {}
    if type:
        params["type"] = type
    if q:
        params["q"] = q

    try:
        # Convex http router is deployed at {CONVEX_URL}/{path}
        url = f"{convex_url}/aois"
        resp = requests.get(url, params=params, timeout=20)
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch AOIs: {e}")

