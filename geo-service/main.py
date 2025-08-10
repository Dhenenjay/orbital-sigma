from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from typing import Optional, List
import logging

import ee

from gee_auth import GEEAuthError, init_ee_from_service_account
from weights_loader import load_weights, get_all_domains, is_weights_loaded

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from a local .env, if present
load_dotenv()

app = FastAPI(title="orbital-sigma geo-service")

# Mount catalog routes (AOIs proxy)
try:
    from routes_catalog import router as catalog_router
    app.include_router(catalog_router)
except:
    # Fallback to local catalog if Convex is not accessible
    from routes_catalog_local import router as catalog_router_local
    app.include_router(catalog_router_local)

# Mount AlphaEarth routes
from routes_alphaearth import router as alphaearth_router
app.include_router(alphaearth_router)

# Mount Anomaly detection routes
from routes_anomaly import router as anomaly_router
app.include_router(anomaly_router)

# Mount Time Window routes
from routes_time_windows import router as time_window_router
app.include_router(time_window_router)

# Mount Enriched routes (enhanced fetch-embeddings)
from routes_enriched import router as enriched_router
app.include_router(enriched_router)

# Mount Live Feed routes (2025 real-time satellite data)
try:
    from routes_live_feed_fixed import router as live_feed_router
    app.include_router(live_feed_router)
except ImportError:
    # Fallback to original if fixed version not available
    from routes_live_feed import router as live_feed_router
    app.include_router(live_feed_router)

# Define explicit endpoints to avoid any router import edge cases
from routes_catalog import get_aois as _catalog_get_aois
from routes_alphaearth import fetch_embeddings as _fetch_embeddings

@app.get("/aois")
def aois_proxy(type: Optional[str] = None, q: Optional[str] = None):
    return _catalog_get_aois(type=type, q=q)

@app.get("/fetch-embeddings")
def fetch_embeddings_proxy(aoiId: str, year: int = 2024, asset: Optional[str] = None):
    return _fetch_embeddings(aoiId=aoiId, year=year, asset=asset)

class HealthResponse(BaseModel):
    status: str


class GEEInfo(BaseModel):
    initialized: bool
    service_account_email: str | None = None
    error: str | None = None


class AlphaEarthInfo(BaseModel):
    assetId: str
    count: int
    bands: List[str]


@app.on_event("startup")
def _init_weights():
    """Load domain-specific weights at startup"""
    try:
        weights_data = load_weights()
        app.state.weights_loaded = True
        app.state.weights_version = weights_data.get('version', 'unknown')
        app.state.available_domains = get_all_domains()
        
        logger.info(f"✅ Loaded weights v{app.state.weights_version}")
        logger.info(f"   Available domains: {app.state.available_domains}")
    except Exception as e:
        logger.error(f"Failed to load weights: {e}")
        app.state.weights_loaded = False
        app.state.weights_version = None
        app.state.available_domains = []

@app.on_event("startup")
def _init_gee():
    # Check if we should use mock mode (for testing)
    use_mock = os.getenv("USE_MOCK_GEE", "false").lower() == "true"
    
    # Try to use the fixed GEE service first
    try:
        from gee_service_fixed import gee_service
        result = gee_service.initialize()
        app.state.gee_info = {
            "initialized": result.get("initialized", False),
            "service_account_email": result.get("service_account_email"),
            "error": result.get("error"),
            "mock_mode": result.get("mock_mode", False)
        }
        logger.info(f"Using fixed GEE service: {app.state.gee_info}")
        return
    except ImportError:
        logger.warning("Fixed GEE service not available, falling back to original")
    
    if use_mock:
        # Use mock GEE for testing
        from gee_auth_mock import init_ee_mock
        info = init_ee_mock()
        app.state.gee_info = info
    else:
        try:
            info = init_ee_from_service_account()
            # Store minimal info for introspection endpoints
            app.state.gee_info = {
                "initialized": True,
                "service_account_email": info.get("service_account_email"),
                "error": None,
            }
        except GEEAuthError as e:
            # If GEE fails and we're in development, fall back to mock
            if os.getenv("GEE_SERVICE_ACCOUNT_JSON", "") == "":
                from gee_auth_mock import init_ee_mock
                info = init_ee_mock()
                app.state.gee_info = info
            else:
                app.state.gee_info = {
                    "initialized": False,
                    "service_account_email": None,
                    "error": str(e),
                }


@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok"}

@app.get("/")
def index():
    return {
        "status": "ok",
        "endpoints": [
            "/health",
            "/gee/info",
            "/weights/info",
            "/aois",
            "/alphaearth/fetch (POST)",
            "/alphaearth/similarity",
            "/fetch-embeddings",
            "/enriched/fetch-embeddings (enhanced)",
            "/enriched/batch-enrich (POST)",
            "/enriched/aoi/{aoi_id}/history",
            "/live/fetch (POST) - Live 2025 satellite data",
            "/live/status/{aoi_id} - Current live status",
            "/live/anomaly/detect (POST) - Real-time anomaly detection",
            "/anomaly/detect (POST)",
            "/anomaly/score/{aoi_id}",
            "/anomaly/multipliers",
            "/anomaly/thresholds/{domain}",
            "/time-windows/info/{domain}",
            "/time-windows/compare",
            "/time-windows/aoi/{aoi_id}",
            "/time-windows/calendar/{year}",
        ],
        "weights_loaded": getattr(app.state, "weights_loaded", False),
        "domains_available": getattr(app.state, "available_domains", []),
        "anomaly_scoring_enabled": True,
    }


@app.get("/gee/info", response_model=GEEInfo)
def gee_info():
    info = getattr(app.state, "gee_info", None) or {
        "initialized": False,
        "service_account_email": None,
        "error": "GEE not initialized",
    }
    return info


@app.get("/weights/info")
def weights_info():
    """Get information about loaded domain weights"""
    from weights_loader import get_weights_by_domain, get_metadata
    
    if not getattr(app.state, "weights_loaded", False):
        return {
            "loaded": False,
            "error": "Weights not loaded"
        }
    
    domains_info = {}
    for domain in app.state.available_domains:
        weights = get_weights_by_domain(domain)
        if weights:
            domains_info[domain] = {
                "num_dimensions": len(weights),
                "non_zero_weights": sum(1 for w in weights.values() if w != 0),
                "sample_weights": {k: v for k, v in list(weights.items())[:5]}  # Show first 5
            }
    
    metadata = get_metadata()
    
    return {
        "loaded": True,
        "version": app.state.weights_version,
        "available_domains": app.state.available_domains,
        "domains": domains_info,
        "metadata": metadata
    }


@app.get("/gee/alphaearth", response_model=AlphaEarthInfo)
def alphaearth_info(asset: Optional[str] = None):
    """
    Load AlphaEarth Foundations embeddings collection and return basic info.
    Provide the asset ID via ?asset=... or set ALPHAEARTH_EMBEDDINGS_ASSET in env.
    """
    if not getattr(app.state, "gee_info", {}).get("initialized", False):
        raise HTTPException(status_code=500, detail="GEE not initialized")

    asset_id = asset or os.getenv("ALPHAEARTH_EMBEDDINGS_ASSET")
    if not asset_id:
        raise HTTPException(
            status_code=400,
            detail="Missing 'asset' query param and ALPHAEARTH_EMBEDDINGS_ASSET env var",
        )

    try:
        col = ee.ImageCollection(asset_id)
        # A small server-side computation to get counts and band names
        count = col.size().getInfo()
        # Get first image bands as a proxy for band list
        first = ee.Image(col.first())
        band_names = first.bandNames().getInfo() if count and count > 0 else []
        return AlphaEarthInfo(assetId=asset_id, count=int(count or 0), bands=band_names)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load asset '{asset_id}': {e}")
