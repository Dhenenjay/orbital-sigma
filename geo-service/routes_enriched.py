"""
Enhanced routes with full anomaly enrichment
Provides enriched embeddings with weights, confidence, and instrument data
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import os
import logging
from datetime import datetime

# Import all enrichment modules
from aoi_observation import AOIObservation, create_observation
from instrument_mapping import InstrumentRegistry, InstrumentReading
from anomaly_scoring import AnomalyScorer
from confidence_metrics import ConfidenceCalculator
from weights_loader import is_weights_loaded, auto_detect_domain, get_weights_by_domain
from weighted_analysis import apply_domain_weights, get_change_detection
from time_window_manager import TimeWindowManager

# Import original AlphaEarth functions
from routes_alphaearth import (
    fetch_alphaearth_embeddings,
    alphaearth_cosine_similarity,
    _load_embedding_from_disk,
    _get_aois_from_backend
)

from cache import cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/enriched", tags=["enriched"])

# Initialize global components
instrument_registry = InstrumentRegistry()
anomaly_scorer = AnomalyScorer()
time_window_manager = TimeWindowManager()


def get_historical_magnitudes(aoi_id: str, current_year: int, max_years: int = 5) -> List[float]:
    """Get historical magnitude values for an AOI"""
    historical = []
    
    for year in range(current_year - max_years, current_year):
        try:
            embedding = _load_embedding_from_disk(aoi_id, year)
            if embedding and "values" in embedding:
                values = embedding["values"]
                # Calculate magnitude from embedding
                magnitude = sum(v**2 for v in values.values()) ** 0.5
                magnitude = min(1.0, magnitude / (len(values) ** 0.5))  # Normalize
                historical.append(magnitude)
        except:
            continue
    
    return historical


def enrich_observation_with_instruments(
    observation: AOIObservation,
    registry: InstrumentRegistry
) -> Dict[str, Any]:
    """Enhance observation with instrument data and return enriched dict"""
    enhanced = observation.enhance_with_instruments(registry)
    
    # Add mock instrument readings based on domain
    if observation.domain == "port":
        enhanced.add_instrument_reading(InstrumentReading(
            instrument_id="SAT-SENTINEL2A",
            timestamp=datetime.utcnow(),
            value={"ndvi": 0.15, "ndwi": 0.72},
            unit="index",
            confidence=0.92,
            processing_level="L2A"
        ))
    elif observation.domain == "farm":
        enhanced.add_instrument_reading(InstrumentReading(
            instrument_id="DRONE-THERMAL-01",
            timestamp=datetime.utcnow(),
            value={"crop_health": 0.78},
            unit="index",
            confidence=0.90,
            processing_level="processed"
        ))
    
    return enhanced.to_dict()


@router.get("/fetch-embeddings")
async def fetch_enriched_embeddings(
    aoiId: str = Query(..., description="Area of Interest ID"),
    year: int = Query(2024, description="Year for analysis"),
    asset: Optional[str] = Query(None, description="AlphaEarth asset ID"),
    baselineYear: Optional[int] = Query(None, description="Baseline year for comparison"),
    includeWeights: bool = Query(True, description="Apply domain-specific weights"),
    includeConfidence: bool = Query(True, description="Calculate confidence metrics"),
    includeInstruments: bool = Query(True, description="Include instrument mapping"),
    includeTimeWindows: bool = Query(True, description="Include optimal time windows")
) -> Dict[str, Any]:
    """
    Fetch fully enriched embeddings with all analysis components:
    - Domain-specific weighted analysis
    - Confidence scoring based on historical stability
    - Instrument mapping and quality assessment
    - Optimal time window recommendations
    - Complete anomaly detection and scoring
    """
    
    # Validate AOI exists
    convex_url = os.getenv("CONVEX_URL") or os.getenv("NEXT_PUBLIC_CONVEX_URL")
    if not convex_url:
        raise HTTPException(status_code=500, detail="CONVEX_URL not configured")
    
    # Get AOI document
    cache_key = f"aois:{convex_url}:q={aoiId}"
    aois = cache.get(cache_key)
    if aois is None:
        aois = _get_aois_from_backend(convex_url, q=aoiId)
        cache.set(cache_key, aois)
    
    if not aois:
        raise HTTPException(status_code=404, detail=f"Unknown AOI: {aoiId}")
    
    aoi_doc = next((x for x in aois if x.get("id") == aoiId), None) or aois[0]
    aoiId = aoi_doc.get("id") or aoiId
    
    # Ensure asset is available
    effective_asset = asset or os.getenv("ALPHAEARTH_EMBEDDINGS_ASSET")
    if not effective_asset:
        raise HTTPException(
            status_code=400,
            detail="Missing AlphaEarth asset. Provide ?asset=... or set ALPHAEARTH_EMBEDDINGS_ASSET"
        )
    
    # Fetch embeddings
    _ = fetch_alphaearth_embeddings(year=year, q=aoiId, asset=effective_asset)
    
    # Get base similarity results
    base_results = alphaearth_cosine_similarity(
        aoi=aoiId,
        year=year,
        asset=effective_asset,
        baselineYear=baselineYear
    )
    
    if not base_results or len(base_results) == 0:
        raise HTTPException(status_code=404, detail="No embeddings found")
    
    result = base_results[0]
    
    # Auto-detect domain
    domain = auto_detect_domain(aoiId) or "default"
    
    # Get historical magnitudes for confidence calculation
    historical_magnitudes = []
    if includeConfidence:
        historical_magnitudes = get_historical_magnitudes(aoiId, year)
    
    # Create AOI observation
    observation = AOIObservation(
        aoi_id=aoiId,
        raw_magnitude=result.get("magnitude", 0.0),
        domain=domain,
        historical_magnitudes=historical_magnitudes,
        metadata={
            "year": year,
            "asset": effective_asset,
            "bbox": aoi_doc.get("bbox"),
            "baselineYear": baselineYear or year - 1
        }
    )
    
    # Process observation (calculates anomaly scores and confidence)
    observation.process(anomaly_scorer)
    
    # Build enriched response
    enriched_response = {
        "aoiId": aoiId,
        "year": year,
        "domain": {
            "type": domain,
            "multiplier": observation.domain_multiplier
        },
        "magnitude": {
            "raw": observation.raw_magnitude,
            "weighted": observation.weighted_magnitude,
            "scaled": observation.scaled_magnitude
        },
        "anomaly": {
            "score": observation.anomaly_score,
            "level": observation.anomaly_level,
            "requiresAttention": observation.requires_attention
        },
        "assessment": {
            "priority": observation.priority,
            "action": observation.recommended_action,
            "reliability": observation.reliability
        },
        "baseline": {
            "vector": result.get("baselineVector"),
            "year": baselineYear or year - 1,
            "similarity": result.get("metrics", {}).get("cosine", 0.0)
        },
        "thumbnails": {
            "before": result.get("beforeThumbUrl"),
            "after": result.get("afterThumbUrl")
        }
    }
    
    # Add confidence metrics
    if includeConfidence:
        confidence_result = {
            "level": observation.confidence_level,
            "score": observation.confidence_score,
            "stability": observation.confidence_stability,
            "observationCount": observation.observation_count
        }
        
        if historical_magnitudes:
            confidence_result["historicalMagnitudes"] = historical_magnitudes
            confidence_result["historicalStats"] = {
                "mean": sum(historical_magnitudes) / len(historical_magnitudes) if historical_magnitudes else 0,
                "count": len(historical_magnitudes)
            }
        
        enriched_response["confidence"] = confidence_result
    
    # Add weighted analysis
    if includeWeights and is_weights_loaded():
        try:
            # Load embedding values
            embedding = _load_embedding_from_disk(aoiId, year)
            if embedding and "values" in embedding:
                values = embedding["values"]
                
                # Apply domain weights
                weighted_result = apply_domain_weights(values, domain)
                
                enriched_response["weightedAnalysis"] = {
                    "weightedMagnitude": weighted_result["weighted_magnitude"],
                    "dominantDimensions": weighted_result["dominant_dimensions"][:10],
                    "topContributors": [
                        {
                            "dimension": dim["dimension"],
                            "weight": dim["weight"],
                            "value": dim["value"],
                            "contribution": dim["contribution"]
                        }
                        for dim in weighted_result["dominant_dimensions"][:5]
                    ]
                }
                
                # Add change detection if baseline available
                if baselineYear:
                    try:
                        baseline_embedding = _load_embedding_from_disk(aoiId, baselineYear)
                        if baseline_embedding and "values" in baseline_embedding:
                            baseline_values = baseline_embedding["values"]
                            baseline_weighted = apply_domain_weights(baseline_values, domain)
                            
                            change_info = get_change_detection(
                                weighted_result["weighted_magnitude"],
                                baseline_weighted["weighted_magnitude"],
                                domain
                            )
                            
                            enriched_response["weightedAnalysis"]["changeDetection"] = change_info
                    except:
                        pass
        except Exception as e:
            logger.warning(f"Could not apply weighted analysis: {e}")
    
    # Add instrument mapping
    if includeInstruments:
        enhanced_data = enrich_observation_with_instruments(observation, instrument_registry)
        
        enriched_response["instruments"] = enhanced_data["instruments"]
        enriched_response["adjustedConfidence"] = enhanced_data["adjusted_confidence"]
        
        # Add any instrument readings
        if "instrument_readings" in enhanced_data:
            enriched_response["instrumentReadings"] = enhanced_data["instrument_readings"]
    
    # Add optimal time windows
    if includeTimeWindows:
        try:
            # Get optimal windows for the domain and location
            latitude = None
            if aoi_doc.get("bbox"):
                # Calculate center latitude from bbox
                bbox = aoi_doc["bbox"]
                latitude = (bbox[1] + bbox[3]) / 2
            
            windows = time_window_manager.get_time_windows(
                domain=domain,
                year=year,
                latitude=latitude
            )
            
            enriched_response["timeWindows"] = {
                "optimal": windows["time_windows"],
                "priority": windows["priority_window"],
                "currentPeriod": windows.get("current_period"),
                "updateFrequency": windows.get("update_frequency"),
                "nextUpdate": windows.get("next_update")
            }
        except Exception as e:
            logger.warning(f"Could not get time windows: {e}")
    
    # Add interpretation summary
    enriched_response["interpretation"] = {
        "summary": f"{observation.anomaly_level.upper()} anomaly detected in {domain} domain",
        "description": observation.interpretation.get("description") if hasattr(observation, "interpretation") else None,
        "confidenceNote": f"Based on {observation.observation_count} historical observations" if observation.observation_count > 0 else "Limited historical data",
        "recommendation": observation.recommended_action,
        "requiresHumanReview": observation.requires_attention or observation.confidence_level in ["very_low", "insufficient_data"]
    }
    
    return enriched_response


@router.post("/batch-enrich")
async def batch_enrich_observations(
    aoiIds: List[str],
    year: int = 2024,
    asset: Optional[str] = None,
    includeWeights: bool = True,
    includeConfidence: bool = True,
    includeInstruments: bool = True
) -> Dict[str, Any]:
    """
    Batch process multiple AOIs and return enriched observations
    Sorted by priority for operational response
    """
    
    enriched_observations = []
    errors = []
    
    for aoi_id in aoiIds:
        try:
            result = await fetch_enriched_embeddings(
                aoiId=aoi_id,
                year=year,
                asset=asset,
                includeWeights=includeWeights,
                includeConfidence=includeConfidence,
                includeInstruments=includeInstruments,
                includeTimeWindows=False  # Skip for batch to reduce overhead
            )
            enriched_observations.append(result)
        except Exception as e:
            errors.append({
                "aoiId": aoi_id,
                "error": str(e)
            })
    
    # Sort by anomaly score (highest first)
    enriched_observations.sort(key=lambda x: x["anomaly"]["score"], reverse=True)
    
    # Calculate statistics
    total = len(aoiIds)
    processed = len(enriched_observations)
    critical_count = sum(1 for obs in enriched_observations if obs["anomaly"]["level"] == "critical")
    high_priority = sum(1 for obs in enriched_observations if obs["anomaly"]["requiresAttention"])
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "statistics": {
            "totalRequested": total,
            "successfullyProcessed": processed,
            "errors": len(errors),
            "criticalAnomalies": critical_count,
            "requireAttention": high_priority
        },
        "observations": enriched_observations,
        "errors": errors if errors else None
    }


@router.get("/aoi/{aoi_id}/history")
async def get_aoi_history(
    aoi_id: str,
    start_year: int = 2019,
    end_year: int = 2024,
    asset: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get historical analysis for an AOI across multiple years
    Shows trends and patterns over time
    """
    
    historical_data = []
    domain = auto_detect_domain(aoi_id) or "default"
    
    for year in range(start_year, end_year + 1):
        try:
            # Get embeddings for this year
            result = await fetch_enriched_embeddings(
                aoiId=aoi_id,
                year=year,
                asset=asset,
                includeWeights=True,
                includeConfidence=False,  # Skip confidence for individual years
                includeInstruments=False,
                includeTimeWindows=False
            )
            
            historical_data.append({
                "year": year,
                "magnitude": result["magnitude"],
                "anomaly": result["anomaly"],
                "weightedAnalysis": result.get("weightedAnalysis")
            })
        except:
            continue
    
    if not historical_data:
        raise HTTPException(status_code=404, detail="No historical data available")
    
    # Calculate trends
    magnitudes = [d["magnitude"]["raw"] for d in historical_data]
    anomaly_scores = [d["anomaly"]["score"] for d in historical_data]
    
    # Simple trend analysis
    trend = "stable"
    if len(magnitudes) >= 3:
        recent_avg = sum(magnitudes[-3:]) / 3
        older_avg = sum(magnitudes[:-3]) / max(1, len(magnitudes) - 3)
        
        if recent_avg > older_avg * 1.2:
            trend = "increasing"
        elif recent_avg < older_avg * 0.8:
            trend = "decreasing"
    
    return {
        "aoiId": aoi_id,
        "domain": domain,
        "period": {
            "start": start_year,
            "end": end_year,
            "years": len(historical_data)
        },
        "history": historical_data,
        "analysis": {
            "trend": trend,
            "averageMagnitude": sum(magnitudes) / len(magnitudes) if magnitudes else 0,
            "maxMagnitude": max(magnitudes) if magnitudes else 0,
            "minMagnitude": min(magnitudes) if magnitudes else 0,
            "averageAnomalyScore": sum(anomaly_scores) / len(anomaly_scores) if anomaly_scores else 0,
            "peakAnomalyYear": historical_data[anomaly_scores.index(max(anomaly_scores))]["year"] if anomaly_scores else None
        }
    }


# Export router
__all__ = ["router"]
