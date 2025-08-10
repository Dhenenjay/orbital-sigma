"""
Anomaly detection routes for batch processing and monitoring
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
import os
import json
from datetime import datetime

from anomaly_scoring import AnomalyScorer, calculate_contextual_anomaly_score
from weights_loader import detect_domain_from_aoi
from routes_alphaearth import _load_embedding_from_disk, _cosine_similarity

router = APIRouter(prefix="/anomaly", tags=["anomaly"])


class AnomalyDetectionRequest(BaseModel):
    """Request model for batch anomaly detection"""
    aoi_ids: List[str]
    current_year: int = 2024
    baseline_year: Optional[int] = None
    include_historical: bool = False
    top_n: Optional[int] = None  # Return only top N anomalies


class AnomalyAlert(BaseModel):
    """Model for anomaly alerts"""
    aoi_id: str
    anomaly_score: float
    anomaly_level: str
    domain: str
    requires_attention: bool
    description: str
    recommended_action: str
    timestamp: str


@router.post("/detect")
def detect_anomalies(request: AnomalyDetectionRequest) -> Dict[str, Any]:
    """
    Detect anomalies across multiple AOIs
    
    Compares current year embeddings with baseline year and applies
    domain-specific anomaly scoring to identify areas requiring attention.
    """
    if request.baseline_year is None:
        request.baseline_year = request.current_year - 1
    
    scorer = AnomalyScorer()
    results = []
    errors = []
    
    for aoi_id in request.aoi_ids:
        try:
            # Load embeddings
            current = _load_embedding_from_disk(aoi_id, request.current_year)
            baseline = _load_embedding_from_disk(aoi_id, request.baseline_year)
            
            # Calculate raw magnitude
            bands = current.get("bands", [])
            if not bands:
                raise ValueError(f"No bands found for {aoi_id}")
            
            sim = _cosine_similarity(
                bands,
                current.get("values", {}),
                baseline.get("values", {})
            )
            
            if sim is None:
                raise ValueError(f"Could not calculate similarity for {aoi_id}")
            
            # Convert to magnitude
            magnitude = (1 - float(sim)) / 2
            magnitude = max(0.0, min(1.0, magnitude))
            
            # Auto-detect domain
            domain = detect_domain_from_aoi(aoi_id) or 'default'
            
            # Calculate anomaly score
            anomaly_result = scorer.calculate_anomaly_score(magnitude, domain)
            
            # Add historical context if requested
            if request.include_historical:
                # Try to load historical data (last 5 years)
                historical_magnitudes = []
                for hist_year in range(request.baseline_year - 4, request.baseline_year + 1):
                    try:
                        hist_embedding = _load_embedding_from_disk(aoi_id, hist_year)
                        # Calculate magnitude vs baseline year
                        hist_sim = _cosine_similarity(
                            bands,
                            hist_embedding.get("values", {}),
                            baseline.get("values", {})
                        )
                        if hist_sim is not None:
                            hist_mag = (1 - float(hist_sim)) / 2
                            historical_magnitudes.append(max(0.0, min(1.0, hist_mag)))
                    except:
                        pass  # Skip missing years
                
                if historical_magnitudes:
                    # Recalculate with historical context
                    anomaly_result = calculate_contextual_anomaly_score(
                        magnitude,
                        historical_magnitudes,
                        domain
                    )
            
            # Build result
            result = {
                "aoi_id": aoi_id,
                "current_year": request.current_year,
                "baseline_year": request.baseline_year,
                "raw_magnitude": round(magnitude, 4),
                "anomaly_score": anomaly_result['anomaly_score'],
                "anomaly_level": anomaly_result['anomaly_level'],
                "domain": anomaly_result['domain'],
                "domain_multiplier": anomaly_result['domain_multiplier'],
                "requires_attention": anomaly_result['requires_attention'],
                "interpretation": anomaly_result['interpretation']
            }
            
            # Add statistical context if available
            if 'statistical_context' in anomaly_result:
                result['statistical_context'] = anomaly_result['statistical_context']
            
            results.append(result)
            
        except Exception as e:
            errors.append({
                "aoi_id": aoi_id,
                "error": str(e)
            })
    
    # Sort by anomaly score
    results.sort(key=lambda x: x['anomaly_score'], reverse=True)
    
    # Apply top_n filter if requested
    if request.top_n and request.top_n > 0:
        results = results[:request.top_n]
    
    # Generate alerts for high/critical anomalies
    alerts = []
    for result in results:
        if result['requires_attention']:
            alert = AnomalyAlert(
                aoi_id=result['aoi_id'],
                anomaly_score=result['anomaly_score'],
                anomaly_level=result['anomaly_level'],
                domain=result['domain'],
                requires_attention=True,
                description=result['interpretation']['description'],
                recommended_action=result['interpretation']['recommended_action'],
                timestamp=datetime.utcnow().isoformat()
            )
            alerts.append(alert.dict())
    
    return {
        "success": True,
        "total_processed": len(request.aoi_ids),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "alerts": alerts,
        "errors": errors if errors else None,
        "summary": {
            "critical": sum(1 for r in results if r['anomaly_level'] == 'critical'),
            "high": sum(1 for r in results if r['anomaly_level'] == 'high'),
            "medium": sum(1 for r in results if r['anomaly_level'] == 'medium'),
            "low": sum(1 for r in results if r['anomaly_level'] == 'low'),
            "normal": sum(1 for r in results if r['anomaly_level'] == 'normal')
        }
    }


@router.get("/score/{aoi_id}")
def get_anomaly_score(
    aoi_id: str,
    year: int = 2024,
    baseline_year: Optional[int] = None,
    include_interpretation: bool = True
) -> Dict[str, Any]:
    """
    Get anomaly score for a single AOI
    
    Quick endpoint to check anomaly score for a specific AOI and year.
    """
    if baseline_year is None:
        baseline_year = year - 1
    
    try:
        # Load embeddings
        current = _load_embedding_from_disk(aoi_id, year)
        baseline = _load_embedding_from_disk(aoi_id, baseline_year)
        
        # Calculate similarity
        bands = current.get("bands", [])
        if not bands:
            raise HTTPException(status_code=400, detail="No bands found in embedding")
        
        sim = _cosine_similarity(
            bands,
            current.get("values", {}),
            baseline.get("values", {})
        )
        
        if sim is None:
            raise HTTPException(status_code=400, detail="Could not calculate similarity")
        
        # Convert to magnitude
        magnitude = (1 - float(sim)) / 2
        magnitude = max(0.0, min(1.0, magnitude))
        
        # Auto-detect domain and calculate anomaly score
        domain = detect_domain_from_aoi(aoi_id) or 'default'
        scorer = AnomalyScorer()
        anomaly_result = scorer.calculate_anomaly_score(magnitude, domain)
        
        response = {
            "aoi_id": aoi_id,
            "year": year,
            "baseline_year": baseline_year,
            "raw_magnitude": round(magnitude, 4),
            "anomaly_score": anomaly_result['anomaly_score'],
            "anomaly_level": anomaly_result['anomaly_level'],
            "domain": anomaly_result['domain'],
            "domain_multiplier": anomaly_result['domain_multiplier'],
            "requires_attention": anomaly_result['requires_attention']
        }
        
        if include_interpretation:
            response['interpretation'] = anomaly_result['interpretation']
        
        return response
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Embeddings not found for {aoi_id} year {year} or {baseline_year}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/multipliers")
def get_domain_multipliers() -> Dict[str, Any]:
    """
    Get all domain multipliers used in anomaly scoring
    
    Returns the weight multipliers applied to each domain type.
    """
    scorer = AnomalyScorer()
    multipliers = scorer.get_all_multipliers()
    
    return {
        "multipliers": multipliers,
        "description": "Domain-specific multipliers applied to raw magnitude scores",
        "domains": list(multipliers.keys())
    }


@router.get("/thresholds/{domain}")
def get_anomaly_thresholds(domain: str = "default") -> Dict[str, Any]:
    """
    Get anomaly detection thresholds for a specific domain
    
    Returns the threshold values used to classify anomaly levels.
    """
    scorer = AnomalyScorer()
    
    # Validate domain
    if domain not in scorer.domains and domain != 'default':
        available = list(scorer.domains.keys()) + ['default']
        raise HTTPException(
            status_code=400,
            detail=f"Unknown domain '{domain}'. Available: {available}"
        )
    
    # Get thresholds
    if domain in scorer.domains:
        thresholds = scorer.domains[domain].get('thresholds', {})
        domain_name = scorer.domains[domain]['name']
    else:
        thresholds = scorer.config['default'].get('thresholds', {})
        domain_name = "Default"
    
    # Map thresholds to levels
    levels = {
        "normal": f"< {thresholds.get('minor_change', 0.02)}",
        "low": f"{thresholds.get('minor_change', 0.02)} - {thresholds.get('moderate_change', 0.05)}",
        "medium": f"{thresholds.get('moderate_change', 0.05)} - {thresholds.get('major_change', 0.10)}",
        "high": f"{thresholds.get('major_change', 0.10)} - {thresholds.get('critical_change', 0.15)}",
        "critical": f">= {thresholds.get('critical_change', 0.15)}"
    }
    
    return {
        "domain": domain,
        "domain_name": domain_name,
        "thresholds": thresholds,
        "anomaly_levels": levels,
        "multiplier": scorer.get_domain_multiplier(domain)
    }
