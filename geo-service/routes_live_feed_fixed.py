"""
Fixed Live Feed Routes with proper GEE integration
Uses the fixed GEE service with updated Sentinel-2 dataset
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import logging
from datetime import datetime

from gee_service_fixed import gee_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live", tags=["live-feed"])

class LiveFeedRequest(BaseModel):
    aoi_ids: List[str]
    year: int = 2025
    baseline_year: int = 2024
    timeframe: str = "14d"  # Default 14 days

class AnomalyDetectionRequest(BaseModel):
    aoi_id: str
    compare_with_baseline: bool = True
    detection_mode: str = "realtime"  # realtime or historical

# Initialize GEE service on startup
@router.on_event("startup")
async def startup_event():
    """Initialize the fixed GEE service"""
    result = gee_service.initialize()
    if result.get("initialized"):
        logger.info(f"✅ GEE Service initialized: {result}")
    else:
        logger.warning(f"⚠️ GEE Service in mock mode: {result}")

@router.post("/fetch")
async def fetch_live_data(request: LiveFeedRequest):
    """
    Fetch live satellite data for multiple AOIs with NRT anomaly detection
    """
    try:
        # Parse timeframe
        time_window_days = 14  # Default
        if request.timeframe.endswith('d'):
            time_window_days = int(request.timeframe[:-1])
        
        anomalies = []
        
        # Get AOI bounds from catalog (mock for now)
        aoi_bounds_map = {
            "port_singapore": [103.6, 1.2, 104.0, 1.5],
            "port_shanghai": [121.3, 31.0, 121.7, 31.4],
            "mine_chile_copper": [-70.5, -23.5, -70.0, -23.0],
            "farm_brazil_soy": [-48.0, -16.0, -47.5, -15.5],
        }
        
        for aoi_id in request.aoi_ids:
            # Get AOI bounds (use default if not found)
            aoi_bounds = aoi_bounds_map.get(aoi_id, [-180, -90, 180, 90])
            
            # Run NRT anomaly detection
            result = gee_service.detect_anomaly_nrt(
                aoi_bounds=aoi_bounds,
                current_year=request.year,
                baseline_year=request.baseline_year,
                time_window_days=time_window_days
            )
            
            if result["is_anomaly"]:
                anomalies.append({
                    "aoi_id": aoi_id,
                    "aoi_name": aoi_id.replace('_', ' ').title(),
                    "domain": aoi_id.split('_')[0],  # Extract domain from ID
                    "magnitude": result["magnitude"],
                    "confidence": result["confidence"],
                    "anomaly_level": result["anomaly_level"],
                    "timestamp": datetime.now().isoformat(),
                    "description": f"{result['anomaly_level'].capitalize()} anomaly detected",
                    "location": {
                        "lat": (aoi_bounds[1] + aoi_bounds[3]) / 2,
                        "lng": (aoi_bounds[0] + aoi_bounds[2]) / 2
                    },
                    "data_source": result["data_source"],
                    "time_window": result["time_window"]
                })
        
        return {
            "success": True,
            "anomalies": anomalies,
            "metadata": {
                "total_aois": len(request.aoi_ids),
                "anomalies_detected": len(anomalies),
                "detection_rate": len(anomalies) / max(len(request.aoi_ids), 1),
                "timeframe": request.timeframe,
                "year": request.year,
                "baseline_year": request.baseline_year,
                "gee_status": "active" if gee_service.initialized else "mock"
            }
        }
        
    except Exception as e:
        logger.error(f"Error in live feed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/anomaly/detect")
async def detect_anomaly(request: AnomalyDetectionRequest):
    """
    Detect anomalies for a specific AOI using real satellite data
    """
    try:
        # Get AOI bounds (mock for demonstration)
        aoi_bounds_map = {
            "port_singapore": [103.6, 1.2, 104.0, 1.5],
            "port_shanghai": [121.3, 31.0, 121.7, 31.4],
            "mine_chile_copper": [-70.5, -23.5, -70.0, -23.0],
            "farm_brazil_soy": [-48.0, -16.0, -47.5, -15.5],
        }
        
        aoi_bounds = aoi_bounds_map.get(request.aoi_id, [-180, -90, 180, 90])
        
        # Run anomaly detection
        result = gee_service.detect_anomaly_nrt(
            aoi_bounds=aoi_bounds,
            current_year=2025,
            baseline_year=2024 if request.compare_with_baseline else 2025,
            time_window_days=14
        )
        
        return {
            "success": True,
            "aoi_id": request.aoi_id,
            "is_anomaly": result["is_anomaly"],
            "magnitude": result["magnitude"],
            "confidence": result["confidence"],
            "anomaly_level": result["anomaly_level"],
            "detection_mode": request.detection_mode,
            "embeddings": {
                "current": result["current_embeddings"],
                "baseline": result["baseline_embeddings"]
            },
            "anomaly_scores": result["anomaly_scores"],
            "time_window": result["time_window"],
            "data_source": result["data_source"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in anomaly detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{aoi_id}")
async def get_live_status(aoi_id: str):
    """
    Get current live status for an AOI
    """
    try:
        # Quick status check
        aoi_bounds_map = {
            "port_singapore": [103.6, 1.2, 104.0, 1.5],
            "port_shanghai": [121.3, 31.0, 121.7, 31.4],
            "mine_chile_copper": [-70.5, -23.5, -70.0, -23.0],
            "farm_brazil_soy": [-48.0, -16.0, -47.5, -15.5],
        }
        
        aoi_bounds = aoi_bounds_map.get(aoi_id, [-180, -90, 180, 90])
        
        # Get latest satellite pass info (mock)
        last_pass = datetime.now().isoformat()
        next_pass = datetime.now().isoformat()
        
        return {
            "aoi_id": aoi_id,
            "status": "active",
            "last_satellite_pass": last_pass,
            "next_satellite_pass": next_pass,
            "data_availability": {
                "sentinel2": True,
                "landsat": True,
                "viirs": False
            },
            "monitoring_active": True,
            "gee_status": "active" if gee_service.initialized else "mock"
        }
        
    except Exception as e:
        logger.error(f"Error getting live status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Check if the live feed service is healthy"""
    return {
        "status": "healthy",
        "gee_initialized": gee_service.initialized,
        "mock_mode": gee_service.mock_mode,
        "timestamp": datetime.now().isoformat()
    }
