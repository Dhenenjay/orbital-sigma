"""
Live Feed Routes for Real-time 2025 Satellite Data

This module provides endpoints to fetch live 2025 satellite data
and compare it against 2024 AlphaEarth baselines for anomaly detection.

Architecture:
- Baseline: AlphaEarth 2024 embeddings (high-quality fingerprints)
- Live Feed: Real-time 2025 data from Sentinel, VIIRS, etc.
- Embedding Projection: Convert live data to same embedding space
- Change Detection: Vector deltas between baseline and live
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
import os
import json
import numpy as np
from datetime import datetime, timedelta
from dynamic_satellite_fetcher import satellite_fetcher, fetch_realtime_satellite_data

router = APIRouter(prefix="/live", tags=["live_feed"])

class LiveFeedRequest(BaseModel):
    """Request for live satellite data fetch"""
    aoi_ids: List[str]
    year: int = 2025
    baseline_year: int = 2024
    timeframe: str = "7d"  # 7d, 14d, 30d
    include_ais: bool = False  # Ship tracking for ports
    include_thermal: bool = False  # VIIRS thermal for energy

class AnomalyDetectionRequest(BaseModel):
    """Request for live anomaly detection"""
    aoi_id: str
    compare_with_baseline: bool = True
    detection_mode: str = "realtime"  # realtime, batch, historical

def _load_baseline_embedding(aoi_id: str, year: int = 2024) -> Dict[str, Any]:
    """Load AlphaEarth baseline embedding"""
    # Check if we're already in geo-service directory
    cwd = os.getcwd()
    if cwd.endswith('geo-service'):
        base_dir = os.path.join(cwd, "output", "alphaearth")
    else:
        base_dir = os.path.join(cwd, "geo-service", "output", "alphaearth")
    
    file_path = os.path.join(base_dir, f"{aoi_id}_{year}.json")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Baseline not found for {aoi_id} year {year}")
    
    with open(file_path, 'r') as f:
        return json.load(f)

def _fetch_live_embedding(aoi_id: str, timeframe: str = "7d") -> Dict[str, Any]:
    """
    Fetch live 2025 satellite data and convert to embedding format
    Uses Sentinel-2, VIIRS, and other near-realtime sources
    """
    # Parse timeframe
    days = 7
    if 'd' in timeframe:
        days = int(timeframe.replace('d', '').replace('_days', ''))
    
    # Create AOI structure (in production, load from catalog)
    aoi = {
        'id': aoi_id,
        'name': aoi_id.replace('-', ' ').title(),
        'type': _infer_aoi_type(aoi_id),
        'coordinates': _get_aoi_coordinates(aoi_id),
        'bbox': _get_aoi_bbox(aoi_id)
    }
    
    # Fetch live satellite data
    timeframe_dict = {'period': timeframe}
    satellite_data = satellite_fetcher.fetch_satellite_data(aoi, timeframe_dict)
    
    # Convert to embedding format matching AlphaEarth structure
    embedding = {
        "aoi": aoi_id,
        "year": 2025,
        "model": "LiveFeed_Sentinel2_VIIRS",
        "generated_at": datetime.now().isoformat(),
        "bands": ["NDVI_mean", "NDVI_stdDev", "NDWI_mean", "NDWI_stdDev", "B4_mean", "B8_mean"],
        "values": {
            "NDVI_mean": satellite_data.get('NDVI_mean', 0.5),
            "NDVI_stdDev": satellite_data.get('NDVI_stdDev', 0.1),
            "NDWI_mean": satellite_data.get('NDWI_mean', 0.0),
            "NDWI_stdDev": satellite_data.get('NDWI_stdDev', 0.1),
            "B4_mean": satellite_data.get('B4_mean', 0.1),
            "B8_mean": satellite_data.get('B8_mean', 0.3),
        },
        "source": "live_gee_fetch",
        "satellite_data": satellite_data  # Keep raw data for analysis
    }
    
    return embedding

def _calculate_embedding_delta(baseline: Dict[str, Any], live: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate vector delta between baseline and live embeddings
    This is the core change detection algorithm
    """
    baseline_values = baseline.get('values', {})
    live_values = live.get('values', {})
    
    # Calculate deltas for each band
    deltas = {}
    magnitudes = []
    
    for band in baseline_values.keys():
        if band in live_values:
            baseline_val = float(baseline_values[band])
            live_val = float(live_values[band])
            
            # Calculate absolute and relative change
            abs_delta = live_val - baseline_val
            rel_delta = abs_delta / (baseline_val + 0.001)  # Avoid division by zero
            
            deltas[band] = {
                'baseline': baseline_val,
                'live': live_val,
                'absolute_delta': abs_delta,
                'relative_delta': rel_delta,
                'significant': abs(rel_delta) > 0.15  # 15% change threshold
            }
            
            magnitudes.append(abs(rel_delta))
    
    # Calculate overall anomaly score
    overall_magnitude = np.mean(magnitudes) if magnitudes else 0.0
    max_magnitude = np.max(magnitudes) if magnitudes else 0.0
    
    # Determine anomaly level
    if max_magnitude > 0.5:
        anomaly_level = "critical"
    elif max_magnitude > 0.3:
        anomaly_level = "high"
    elif max_magnitude > 0.15:
        anomaly_level = "medium"
    elif overall_magnitude > 0.1:
        anomaly_level = "low"
    else:
        anomaly_level = "normal"
    
    return {
        'deltas': deltas,
        'overall_magnitude': float(overall_magnitude),
        'max_magnitude': float(max_magnitude),
        'anomaly_level': anomaly_level,
        'is_anomaly': anomaly_level not in ['normal', 'low'],
        'confidence': min(0.95, overall_magnitude * 2),  # Scale to confidence
        'timestamp': datetime.now().isoformat()
    }

def _infer_aoi_type(aoi_id: str) -> str:
    """Infer AOI type from ID"""
    if 'port' in aoi_id.lower():
        return 'port'
    elif 'mine' in aoi_id.lower():
        return 'mine'
    elif 'farm' in aoi_id.lower():
        return 'farm'
    elif 'energy' in aoi_id.lower() or 'solar' in aoi_id.lower():
        return 'energy'
    return 'general'

def _get_aoi_coordinates(aoi_id: str) -> Dict[str, float]:
    """Get AOI coordinates (would come from catalog in production)"""
    # Known coordinates for our test AOIs
    coordinates_map = {
        'port-los-angeles': {'lat': 33.7405, 'lng': -118.2723},
        'port-shanghai-yangshan': {'lat': 30.6418, 'lng': 122.0635},
        'port-rotterdam': {'lat': 51.9225, 'lng': 4.4792},
        'farm-iowa-cornbelt': {'lat': 42.0308, 'lng': -93.6319},
        'farm-central-valley': {'lat': 36.7783, 'lng': -119.4179},
        'mine-escondida': {'lat': -24.2530, 'lng': -69.0690},
        'mine-pilbara-iron': {'lat': -22.5900, 'lng': 118.2000},
        'energy-ghawar': {'lat': 25.4300, 'lng': 49.6200},
        'energy-permian-midland': {'lat': 31.9973, 'lng': -102.0779},
    }
    
    return coordinates_map.get(aoi_id, {'lat': 0, 'lng': 0})

def _get_aoi_bbox(aoi_id: str) -> List[float]:
    """Get bounding box for AOI"""
    coords = _get_aoi_coordinates(aoi_id)
    lat, lng = coords['lat'], coords['lng']
    
    # Create a ~10km box around the center
    delta = 0.1  # Roughly 10km at mid-latitudes
    return [lng - delta, lat - delta, lng + delta, lat + delta]

@router.post("/fetch")
def fetch_live_feed(request: LiveFeedRequest) -> Dict[str, Any]:
    """
    Fetch live 2025 satellite data for multiple AOIs
    Compare with 2024 baselines to detect changes
    """
    results = []
    errors = []
    anomalies_detected = []
    
    for aoi_id in request.aoi_ids:
        try:
            # Load baseline (AlphaEarth 2024)
            baseline = _load_baseline_embedding(aoi_id, request.baseline_year)
            
            # Fetch live data (2025)
            live = _fetch_live_embedding(aoi_id, request.timeframe)
            
            # Calculate change/anomaly
            delta = _calculate_embedding_delta(baseline, live)
            
            result = {
                'aoi_id': aoi_id,
                'baseline_year': request.baseline_year,
                'live_year': request.year,
                'baseline_model': baseline.get('model', 'AlphaEarth'),
                'live_model': live.get('model', 'LiveFeed'),
                'embedding_delta': delta,
                'is_anomaly': delta['is_anomaly'],
                'anomaly_level': delta['anomaly_level'],
                'confidence': delta['confidence'],
                'magnitude': delta['overall_magnitude']
            }
            
            results.append(result)
            
            if delta['is_anomaly']:
                anomalies_detected.append({
                    'aoi_id': aoi_id,
                    'aoi_name': aoi_id.replace('-', ' ').title(),
                    'domain': _infer_aoi_type(aoi_id),
                    'magnitude': delta['overall_magnitude'],
                    'confidence': delta['confidence'],
                    'anomaly_level': delta['anomaly_level'],
                    'description': f"Detected {delta['anomaly_level']} anomaly with {delta['max_magnitude']:.1%} change",
                    'timestamp': datetime.now().isoformat()
                })
                
        except FileNotFoundError as e:
            errors.append({
                'aoi_id': aoi_id,
                'error': 'baseline_not_found',
                'message': str(e)
            })
        except Exception as e:
            errors.append({
                'aoi_id': aoi_id,
                'error': 'processing_error',
                'message': str(e)
            })
    
    return {
        'success': len(results) > 0,
        'processed': len(request.aoi_ids),
        'successful': len(results),
        'failed': len(errors),
        'results': results,
        'anomalies': anomalies_detected,
        'errors': errors if errors else None,
        'summary': {
            'total_anomalies': len(anomalies_detected),
            'critical': sum(1 for a in anomalies_detected if a['anomaly_level'] == 'critical'),
            'high': sum(1 for a in anomalies_detected if a['anomaly_level'] == 'high'),
            'medium': sum(1 for a in anomalies_detected if a['anomaly_level'] == 'medium'),
        }
    }

@router.get("/status/{aoi_id}")
def get_live_status(aoi_id: str, include_raw: bool = False) -> Dict[str, Any]:
    """
    Get current live status for a single AOI
    Quick endpoint for checking real-time conditions
    """
    try:
        # Fetch current live data
        live = _fetch_live_embedding(aoi_id, "1d")  # Last 24 hours
        
        # Try to load baseline for comparison
        try:
            baseline = _load_baseline_embedding(aoi_id, 2024)
            delta = _calculate_embedding_delta(baseline, live)
            has_baseline = True
        except:
            delta = None
            has_baseline = False
        
        response = {
            'aoi_id': aoi_id,
            'status': 'live',
            'timestamp': datetime.now().isoformat(),
            'has_baseline': has_baseline,
            'current_values': live['values'],
            'data_source': live.get('source', 'unknown'),
            'model': live.get('model', 'unknown')
        }
        
        if delta:
            response['change_detected'] = delta['is_anomaly']
            response['anomaly_level'] = delta['anomaly_level']
            response['confidence'] = delta['confidence']
            response['magnitude'] = delta['overall_magnitude']
        
        if include_raw and 'satellite_data' in live:
            response['raw_satellite_data'] = live['satellite_data']
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/anomaly/detect")
def detect_live_anomaly(request: AnomalyDetectionRequest) -> Dict[str, Any]:
    """
    Real-time anomaly detection for a single AOI
    Compares live 2025 data against 2024 baseline
    """
    try:
        # Fetch live data
        live = _fetch_live_embedding(request.aoi_id, "7d")
        
        if request.compare_with_baseline:
            # Load baseline and compare
            baseline = _load_baseline_embedding(request.aoi_id, 2024)
            delta = _calculate_embedding_delta(baseline, live)
            
            return {
                'aoi_id': request.aoi_id,
                'is_anomaly': delta['is_anomaly'],
                'anomaly_level': delta['anomaly_level'],
                'confidence': delta['confidence'],
                'magnitude': delta['overall_magnitude'],
                'deltas': delta['deltas'],
                'detection_mode': request.detection_mode,
                'baseline_year': 2024,
                'live_year': 2025,
                'timestamp': datetime.now().isoformat()
            }
        else:
            # Analyze live data without baseline
            # Use domain-specific thresholds
            aoi_type = _infer_aoi_type(request.aoi_id)
            anomaly_score = satellite_fetcher.compute_anomaly_score(
                live['satellite_data'], 
                baseline_data=None
            )
            
            return {
                'aoi_id': request.aoi_id,
                'is_anomaly': anomaly_score > 0.5,
                'anomaly_level': 'high' if anomaly_score > 0.7 else 'medium' if anomaly_score > 0.5 else 'low',
                'confidence': min(0.95, anomaly_score + 0.2),
                'magnitude': anomaly_score,
                'detection_mode': request.detection_mode,
                'baseline_year': None,
                'live_year': 2025,
                'timestamp': datetime.now().isoformat()
            }
            
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, 
            detail=f"Baseline not found for {request.aoi_id}. Run /alphaearth/fetch first."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
