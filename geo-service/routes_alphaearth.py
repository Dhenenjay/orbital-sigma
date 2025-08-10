from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
import os
import json
import requests
import ee
from cache import cache

router = APIRouter()


def _get_aois_from_backend(convex_url: str, type: Optional[str] = None, q: Optional[str] = None) -> List[Dict[str, Any]]:
  # Try Convex first
  try:
    params = {}
    if type:
      params["type"] = type
    if q:
      params["q"] = q
    url = f"{convex_url}/aois"
    resp = requests.get(url, params=params, timeout=5)
    if resp.ok:
      return resp.json()
  except:
    pass
  
  # Fallback to local data
  data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'aois.json')
  if os.path.exists(data_path):
    with open(data_path, 'r') as f:
      aois = json.load(f)
    
    # Apply filters
    if type:
      aois = [a for a in aois if a.get('type') == type]
    if q:
      q_lower = q.lower()
      aois = [a for a in aois if 
             q_lower in a.get('id', '').lower() or 
             q_lower in a.get('name', '').lower() or 
             q_lower in a.get('description', '').lower()]
    return aois
  
  raise HTTPException(status_code=404, detail="AOIs not available")


def _ensure_dir(p: str) -> None:
  os.makedirs(p, exist_ok=True)


@router.post("/alphaearth/fetch")
def fetch_alphaearth_embeddings(year: int = 2024, type: Optional[str] = None, q: Optional[str] = None, asset: Optional[str] = None, use_domain_windows: bool = True):
  # Config
  convex_url = os.getenv("CONVEX_URL") or os.getenv("NEXT_PUBLIC_CONVEX_URL")
  if not convex_url:
    raise HTTPException(status_code=500, detail="CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) env var is not set")
  asset_id = asset or os.getenv("ALPHAEARTH_EMBEDDINGS_ASSET")
  if not asset_id:
    raise HTTPException(status_code=400, detail="Missing 'asset' or ALPHAEARTH_EMBEDDINGS_ASSET")

  # Validate GEE is initialized by performing a trivial call
  try:
    _ = ee.Number(1).getInfo()
  except Exception:
    raise HTTPException(status_code=500, detail="GEE not initialized in server")

  # Try cache for AOIs list used in this request signature
  cache_key = f"aois:{convex_url}:type={type}:q={q}"
  aois = cache.get(cache_key)
  if aois is None:
    aois = _get_aois_from_backend(convex_url, type=type, q=q)
    cache.set(cache_key, aois)
  if not aois:
    return {"ok": True, "processed": 0, "saved": 0}

  # Import time window manager if using domain windows
  if use_domain_windows:
    from time_window_manager import TimeWindowManager
    from weights_loader import detect_domain_from_aoi
    time_manager = TimeWindowManager()
  
  results: List[Dict[str, Any]] = []
  saved = 0

  out_dir = os.path.join(os.getcwd(), "geo-service", "output", "alphaearth")
  _ensure_dir(out_dir)

  for a in aois:
    try:
      bbox = a.get("bbox")
      if not (isinstance(bbox, list) and len(bbox) == 4):
        raise ValueError("Invalid bbox")
      # minLon, minLat, maxLon, maxLat
      geom = ee.Geometry.Rectangle(bbox)
      
      # Determine domain and time windows
      aoi_id = a.get("id")
      if use_domain_windows:
        # Auto-detect domain
        domain = detect_domain_from_aoi(aoi_id) or 'default'
        
        # Get latitude from bbox center for regional adjustments
        lat_center = (bbox[1] + bbox[3]) / 2
        
        # Get domain-specific time windows
        windows = time_manager.get_time_windows(domain, year, lat_center)
        
        # Apply temporal filtering
        col = ee.ImageCollection(asset_id)
        filtered_collections = []
        for start_date, end_date in windows:
          filtered = col.filterDate(start_date, end_date).filterBounds(geom)
          filtered_collections.append(filtered)
        
        # Merge collections from different windows
        if filtered_collections:
          col = filtered_collections[0]
          for fc in filtered_collections[1:]:
            col = col.merge(fc)
        else:
          # Fallback to full year
          col = ee.ImageCollection(asset_id).filterDate(f"{year}-01-01", f"{year}-12-31").filterBounds(geom)
        
        # Get aggregation method for this domain
        aggregation_method = time_manager.get_aggregation_method(domain)
        cloud_threshold = time_manager.get_cloud_threshold(domain)
      else:
        # Use standard full-year window
        col = ee.ImageCollection(asset_id).filterDate(f"{year}-01-01", f"{year}-12-31").filterBounds(geom)
        domain = 'default'
        aggregation_method = 'mean'
      
      count = col.size().getInfo()
      if not count or count == 0:
        payload = {
          "aoi": aoi_id,
          "type": a.get("type"),
          "year": year,
          "assetId": asset_id,
          "count": int(count or 0),
          "bands": [],
          "values": {},
          "domain": domain if use_domain_windows else None,
          "time_windows": windows if use_domain_windows else None,
        }
      else:
        # Apply domain-specific aggregation
        if use_domain_windows:
          if aggregation_method == 'median':
            img = col.median()
          elif aggregation_method == 'max' or aggregation_method == 'greenest':
            img = col.max()
          elif aggregation_method == 'min':
            img = col.min()
          elif aggregation_method == 'clearest':
            # Use median for clearest (simplified)
            img = col.median()
          else:
            img = col.mean()
        else:
          img = col.mean()
        
        bands = img.bandNames().getInfo() or []
        # Use a coarse scale to keep costs low; adjust as needed
        stats = img.reduceRegion(
          reducer=ee.Reducer.mean(),
          geometry=geom,
          scale=1000,
          maxPixels=1e13,
        ).getInfo() or {}
        payload = {
          "aoi": aoi_id,
          "type": a.get("type"),
          "year": year,
          "assetId": asset_id,
          "count": int(count or 0),
          "bands": bands,
          "values": stats,
          "domain": domain if use_domain_windows else None,
          "time_windows": windows if use_domain_windows else None,
          "aggregation": aggregation_method if use_domain_windows else 'mean',
        }
      # Save to disk
      fname = f"{a.get('id')}_{year}.json"
      fpath = os.path.join(out_dir, fname)
      with open(fpath, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
      results.append({"aoi": a.get("id"), "saved": fpath})
      saved += 1
    except HTTPException:
      raise
    except Exception as e:
      # Continue on error for other AOIs
      results.append({"aoi": a.get("id"), "error": str(e)})

  return {"ok": True, "processed": len(aois), "saved": saved, "results": results}


def _load_embedding_from_disk(aoi_id: str, year: int) -> Dict[str, Any]:
  out_dir = os.path.join(os.getcwd(), "geo-service", "output", "alphaearth")
  fpath = os.path.join(out_dir, f"{aoi_id}_{year}.json")
  if not os.path.isfile(fpath):
    raise FileNotFoundError(f"Embedding file not found: {fpath}")
  with open(fpath, "r", encoding="utf-8") as f:
    return json.load(f)


def _cosine_similarity(bands_ref: List[str], values_a: Dict[str, Any], values_b: Dict[str, Any]) -> Optional[float]:
  # Build aligned vectors following bands_ref order; missing values treated as 0.0
  va: List[float] = []
  vb: List[float] = []
  for name in bands_ref:
    va.append(float(values_a.get(name, 0.0) or 0.0))
    vb.append(float(values_b.get(name, 0.0) or 0.0))
  # Compute cosine similarity without numpy
  dot = sum(x*y for x, y in zip(va, vb))
  na2 = sum(x*x for x in va)
  nb2 = sum(y*y for y in vb)
  if na2 <= 0 or nb2 <= 0:
    return None
  import math
  return dot / (math.sqrt(na2) * math.sqrt(nb2))


@router.get("/alphaearth/similarity")
def alphaearth_cosine_similarity(aoi: str, year: int = 2024, baselineAoi: Optional[str] = None, baselineYear: Optional[int] = None, asset: Optional[str] = None):
  """
  Compute cosine similarity between an AOI's embedding for `year` and a baseline.
  Also generate before/after thumbnail URLs using the AlphaEarth collection for the AOI bbox.
  The baseline can be another AOI (baselineAoi + baselineYear) or the same AOI in a different year.
  Both embeddings must have been saved previously by /alphaearth/fetch.
  """
  if baselineAoi is None:
    baselineAoi = aoi
  if baselineYear is None:
    baselineYear = year - 1

  try:
    cur = _load_embedding_from_disk(aoi, year)
    base = _load_embedding_from_disk(baselineAoi, int(baselineYear))
  except FileNotFoundError as e:
    raise HTTPException(status_code=404, detail=str(e))
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed to load embeddings: {e}")

  bands = cur.get("bands") or []
  if not bands:
    raise HTTPException(status_code=400, detail="Current embedding has no bands/values")
  sim = _cosine_similarity(bands, cur.get("values") or {}, base.get("values") or {})
  if sim is None:
    raise HTTPException(status_code=400, detail="Cannot compute similarity with zero-norm vector(s)")
  # Scale similarity delta to 0–1 magnitude: 0 when identical (cos=1), 1 when opposite (cos=-1)
  magnitude = (1 - float(sim)) / 2
  if magnitude < 0:
    magnitude = 0.0
  if magnitude > 1:
    magnitude = 1.0
  # Build baseline vector aligned to current bands
  base_values = base.get("values") or {}
  baseline_vector = [float(base_values.get(name, 0.0) or 0.0) for name in bands]

  # Optional: generate before/after thumbnail URLs using EE imagery of the AOI bbox
  beforeThumbUrl = None
  afterThumbUrl = None
  try:
    convex_url = os.getenv("CONVEX_URL") or os.getenv("NEXT_PUBLIC_CONVEX_URL")
    if not convex_url:
      raise ValueError("CONVEX_URL not set")
    aois = _get_aois_from_backend(convex_url, q=aoi)
    aoi_doc = next((x for x in aois if x.get("id") == aoi), None) or (aois[0] if aois else None)
    if aoi_doc and aoi_doc.get("bbox"):
      bbox = aoi_doc["bbox"]
      geom = ee.Geometry.Rectangle(bbox)
      region = geom.getInfo().get("coordinates")
      asset_id = asset or os.getenv("ALPHAEARTH_EMBEDDINGS_ASSET")
      if asset_id:
        # Helper to choose bands for visualization (first 3 if available)
        def vis_params(img):
          try:
            img_bands = img.bandNames().getInfo() or []
          except Exception:
            img_bands = []
          if len(img_bands) >= 3:
            return {"bands": img_bands[:3], "min": 0, "max": 1}
          elif len(img_bands) == 1:
            return {"bands": [img_bands[0]], "min": 0, "max": 1, "palette": ["000000", "FFFFFF"]}
          else:
            return {"min": 0, "max": 1}
        # Build baseline and current composites (mean over year)
        start_base = f"{int(baselineYear)}-01-01"
        end_base = f"{int(baselineYear)}-12-31"
        start_cur = f"{int(year)}-01-01"
        end_cur = f"{int(year)}-12-31"
        col_base = ee.ImageCollection(asset_id).filterDate(start_base, end_base).filterBounds(geom)
        col_cur = ee.ImageCollection(asset_id).filterDate(start_cur, end_cur).filterBounds(geom)
        if col_base.size().getInfo() and col_cur.size().getInfo():
          img_base = col_base.mean()
          img_cur = col_cur.mean()
          # Cache thumbnails by a stable key
          key_before = f"thumb:before:{aoi}:{baselineYear}:{asset_id}:{bbox}"
          key_after = f"thumb:after:{aoi}:{year}:{asset_id}:{bbox}"
          beforeThumbUrl = cache.get(key_before)
          if not beforeThumbUrl:
            beforeThumbUrl = img_base.visualize(**vis_params(img_base)).getThumbURL({"region": region, "dimensions": 512, "format": "png"})
            cache.set(key_before, beforeThumbUrl)
          afterThumbUrl = cache.get(key_after)
          if not afterThumbUrl:
            afterThumbUrl = img_cur.visualize(**vis_params(img_cur)).getThumbURL({"region": region, "dimensions": 512, "format": "png"})
            cache.set(key_after, afterThumbUrl)
  except Exception:
    # Non-fatal: thumbnails remain None if any error occurs
    beforeThumbUrl = None
    afterThumbUrl = None

  # Apply anomaly scoring with domain weights
  from anomaly_scoring import calculate_anomaly_score
  from weights_loader import detect_domain_from_aoi
  
  # Auto-detect domain for anomaly scoring
  domain = detect_domain_from_aoi(aoi) or 'default'
  anomaly_result = calculate_anomaly_score(magnitude, aoi, domain)
  
  # Compose array response with requested shape
  return [
    {
      "aoiId": aoi,
      "magnitude": magnitude,
      "anomalyScore": anomaly_result['anomaly_score'],
      "anomalyLevel": anomaly_result['anomaly_level'],
      "baselineVector": baseline_vector,
      "metrics": {
        "cosine": sim,
        "year": year,
        "baselineAoi": baselineAoi,
        "baselineYear": int(baselineYear),
        "bandCount": len(bands),
        "domain": anomaly_result['domain'],
        "domainMultiplier": anomaly_result['domain_multiplier'],
      },
      "anomalyInterpretation": anomaly_result['interpretation'],
      "requiresAttention": anomaly_result['requires_attention'],
      "beforeThumbUrl": beforeThumbUrl,
      "afterThumbUrl": afterThumbUrl,
    }
  ]

@router.get("/fetch-embeddings")
def fetch_embeddings(aoiId: str, year: int = 2024, asset: Optional[str] = None, apply_weights: bool = True):
  """
  Convenience endpoint: compute/save embeddings (if needed) and return similarity + thumbnails
  for the given AOI and year. Optionally applies domain-specific weighted analysis.
  """
  # Validate AOI exists first for a clearer error
  convex_url = os.getenv("CONVEX_URL") or os.getenv("NEXT_PUBLIC_CONVEX_URL")
  if not convex_url:
    raise HTTPException(status_code=500, detail="CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) env var is not set")
  # Use cache for AOIs list
  cache_key = f"aois:{convex_url}:type=None:q={aoiId}"
  aois = cache.get(cache_key)
  if aois is None:
    aois = _get_aois_from_backend(convex_url, q=aoiId)
    cache.set(cache_key, aois)
  if not aois:
    raise HTTPException(status_code=404, detail=f"Unknown aoiId '{aoiId}'. Use /aois to list available AOIs.")
  # Normalize to an exact match if possible
  aoi_doc = next((x for x in aois if x.get("id") == aoiId), None) or aois[0]
  aoiId = aoi_doc.get("id") or aoiId

  # Ensure an asset is available (query param or env)
  effective_asset = asset or os.getenv("ALPHAEARTH_EMBEDDINGS_ASSET")
  if not effective_asset:
    raise HTTPException(status_code=400, detail="Missing AlphaEarth asset. Provide ?asset=... or set ALPHAEARTH_EMBEDDINGS_ASSET in env.")

  # Run fetch step (limits by q=aoiId)
  _ = fetch_alphaearth_embeddings(year=year, q=aoiId, asset=effective_asset)
  
  # Get base similarity results
  results = alphaearth_cosine_similarity(aoi=aoiId, year=year, asset=effective_asset)
  
  # Apply domain-specific weighted analysis if requested
  if apply_weights:
    try:
      from weights_loader import is_weights_loaded, auto_detect_domain
      from weighted_analysis import apply_domain_weights, get_change_detection
      
      if is_weights_loaded():
        # Load current year embedding
        current_embedding = _load_embedding_from_disk(aoiId, year)
        current_values = current_embedding.get("values", {})
        
        # Auto-detect domain based on AOI ID
        domain = auto_detect_domain(aoiId)
        
        if domain and current_values:
          # Apply domain weights
          weighted_result = apply_domain_weights(current_values, domain)
          
          # Get baseline for change detection if available
          change_info = None
          try:
            baseline_year = year - 1
            baseline_embedding = _load_embedding_from_disk(aoiId, baseline_year)
            baseline_values = baseline_embedding.get("values", {})
            if baseline_values:
              baseline_weighted = apply_domain_weights(baseline_values, domain)
              change_info = get_change_detection(
                weighted_result['weighted_magnitude'],
                baseline_weighted['weighted_magnitude'],
                domain
              )
          except:
            pass  # No baseline available
          
          # Add weighted analysis to results
          if results and len(results) > 0:
            results[0]['weightedAnalysis'] = {
              'domain': domain,
              'weightedMagnitude': weighted_result['weighted_magnitude'],
              'dominantDimensions': weighted_result['dominant_dimensions'][:5],  # Top 5
              'changeDetection': change_info
            }
    except Exception as e:
      # Non-fatal: continue without weighted analysis
      import logging
      logging.warning(f"Could not apply weighted analysis: {e}")
  
  return results

