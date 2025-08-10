# 🛰️ AlphaEarth Embeddings Configuration Guide

## What are AlphaEarth Embeddings?

AlphaEarth is a foundation model for Earth observation that creates high-dimensional embeddings from satellite imagery. These embeddings capture complex patterns and features that are useful for detecting anomalies and changes in satellite data.

## Current Status

The Orbital Sigma platform is **designed to use AlphaEarth embeddings** but currently operates in **fallback mode** using Sentinel-2 spectral bands as features.

## How the Platform Uses Embeddings

### 1. **With AlphaEarth (When Available)**
```
Satellite Image → AlphaEarth Model → 128-512D Embeddings → Anomaly Detection
```

### 2. **Current Fallback (Sentinel-2)**
```
Satellite Image → Spectral Bands → 10-50D Features → Anomaly Detection
```

## Configuration Options

### Option 1: Use Sentinel-2 as Embeddings (Current)
```bash
# In your .env file (this is the current default)
ALPHAEARTH_EMBEDDINGS_ASSET=COPERNICUS/S2_SR_HARMONIZED
```

This uses Sentinel-2's spectral bands:
- B2 (Blue), B3 (Green), B4 (Red)
- B5-B7 (Red Edge)
- B8 (NIR), B11-B12 (SWIR)
- Creates ~10-13 dimensional embeddings

### Option 2: Use Alternative Foundation Models

If you have access to other foundation models:

```bash
# Clay Foundation Model (if available)
ALPHAEARTH_EMBEDDINGS_ASSET=projects/clay-foundation/assets/clay-v1-embeddings

# IBM/NASA Prithvi Model (if available)
ALPHAEARTH_EMBEDDINGS_ASSET=projects/ibm-nasa-hls/assets/prithvi-100m-embeddings

# Custom embeddings (if you create your own)
ALPHAEARTH_EMBEDDINGS_ASSET=projects/your-project/assets/custom-embeddings
```

### Option 3: Create Your Own Embeddings

You can create custom embeddings using:
1. **Pre-trained models** (ResNet, EfficientNet on satellite imagery)
2. **Self-supervised learning** (SimCLR, MAE on your AOIs)
3. **Domain-specific models** (trained on your specific use cases)

## How Embeddings Enable Anomaly Detection

```python
# The platform compares embeddings between time periods
current_embeddings = fetch_embeddings(aoi, year=2025)
baseline_embeddings = fetch_embeddings(aoi, year=2024)

# Calculate similarity/distance
similarity = cosine_similarity(current_embeddings, baseline_embeddings)
magnitude = (1 - similarity) / 2  # Convert to 0-1 scale

# Detect anomalies
if magnitude > threshold:
    anomaly_detected = True
```

## Current Platform Flow

1. **Frontend** requests anomaly detection
2. **Backend** calls `/alphaearth/fetch` to get embeddings
3. **Geo-service** tries to fetch AlphaEarth embeddings:
   - ✅ If available: Uses high-dimensional AlphaEarth features
   - 🔄 If not: Falls back to Sentinel-2 spectral features
4. **Anomaly scoring** applies domain-specific weights
5. **Results** returned with confidence scores

## Performance Comparison

| Feature | AlphaEarth Embeddings | Sentinel-2 Fallback |
|---------|----------------------|-------------------|
| Dimensions | 128-512 | 10-13 |
| Feature Quality | Pre-trained on global data | Raw spectral values |
| Anomaly Detection | More nuanced | Basic spectral changes |
| Computational Cost | Higher (pre-computed) | Lower |
| Availability | Requires special access | Publicly available |

## Testing Your Configuration

Run this command to test embedding availability:
```bash
cd scripts
python test-alphaearth-assets.py
```

This will:
1. Check for available AlphaEarth assets
2. Test Sentinel-2 fallback
3. Show sample embedding values
4. Recommend configuration

## Current Implementation Success

Even without AlphaEarth embeddings, the platform successfully:
- ✅ Detects anomalies using spectral features
- ✅ Calculates magnitude and confidence scores
- ✅ Applies domain-specific weighting
- ✅ Generates trading signals
- ✅ Provides visual evidence

## Future Enhancements

1. **Integrate Real AlphaEarth**: When Google releases public AlphaEarth embeddings
2. **Use Clay Model**: Open-source alternative foundation model
3. **Custom Training**: Train your own embeddings on historical AOI data
4. **Hybrid Approach**: Combine spectral + texture + temporal features

## Summary

The platform is **fully functional** with the current Sentinel-2 fallback approach. When AlphaEarth or other foundation model embeddings become available, you can simply update the `ALPHAEARTH_EMBEDDINGS_ASSET` environment variable to use them, which will provide:
- Higher dimensional representations
- Better anomaly detection accuracy
- More nuanced change detection

The architecture is ready for AlphaEarth - it's just waiting for the embeddings to be available!
