# Domain-Specific Weights Integration Summary

## Overview
Successfully integrated domain-specific weighted analysis into the orbital-sigma geo-service. The system now applies specialized weights to Google Satellite Embeddings (64-dimensional vectors) based on the domain context (ports, agriculture, mining, energy) to provide more accurate and meaningful change detection.

## Key Components Added

### 1. **weights.json** Configuration File
- Located in `geo-service/weights.json`
- Defines domain-specific weightings for 64 embedding dimensions (A00-A63)
- Includes thresholds for change detection levels (minor, moderate, major, critical)
- Version: 1.0.0

### 2. **weights_loader.py** Module
- Singleton pattern for efficient weight loading and caching
- Auto-loads weights on application startup
- Provides domain auto-detection from AOI identifiers
- Functions:
  - `load_weights()`: Load weights configuration on startup
  - `auto_detect_domain()`: Detect domain from AOI ID
  - `get_weights_by_domain()`: Get weights for specific domain
  - `get_metadata()`: Get weights metadata

### 3. **weighted_analysis.py** Module  
- `WeightedEmbeddingAnalyzer` class for applying domain weights
- Functions:
  - `apply_domain_weights()`: Apply weights to embedding values
  - `get_change_detection()`: Analyze change levels and generate alerts
  - `analyze_with_weights()`: Complete weighted analysis workflow

### 4. **Main Application Integration**
- Updated `main.py` to load weights on startup
- Added `/weights/info` endpoint for weights information
- Modified `/fetch-embeddings` endpoint to include weighted analysis

## Domain-Specific Features

### Port Domain
- Emphasizes maritime infrastructure and vessel activity
- Keywords: port, harbor, terminal, dock, wharf, pier
- Critical bands: A45-A50 (infrastructure detection)

### Farm Domain  
- Focuses on agricultural changes and crop health
- Keywords: farm, agri, crop, field, ranch, plantation
- Critical bands: A20-A30 (vegetation indices)

### Mine Domain
- Highlights extraction activities and land disturbance
- Keywords: mine, mining, quarry, pit, extraction
- Critical bands: A35-A45 (soil/mineral changes)

### Energy Domain
- Monitors energy infrastructure and industrial activity
- Keywords: energy, power, solar, wind, oil, gas, refinery
- Critical bands: A50-A60 (industrial signatures)

## API Enhancements

### Enhanced `/fetch-embeddings` Endpoint
```
GET /fetch-embeddings?aoiId=port-123&year=2024&apply_weights=true
```

Response now includes:
```json
{
  "aoiId": "port-123",
  "magnitude": 0.15,
  "weightedAnalysis": {
    "domain": "port",
    "weightedMagnitude": 0.23,
    "dominantDimensions": ["A45", "A46", "A47", "A48", "A49"],
    "changeDetection": {
      "change_level": "moderate",
      "change_percentage": 15.5,
      "alert": "Moderate change detected in Port Infrastructure"
    }
  }
}
```

### New `/weights/info` Endpoint
```
GET /weights/info
```

Returns information about loaded weights configuration:
```json
{
  "loaded": true,
  "version": "1.0.0",
  "available_domains": ["port", "farm", "mine", "energy"],
  "domains": {
    "port": {
      "num_dimensions": 64,
      "non_zero_weights": 45,
      "sample_weights": {...}
    }
  }
}
```

## Testing
- Created `test_weights_integration.py` for comprehensive testing
- Validated domain auto-detection for various AOI patterns
- Confirmed weighted magnitude calculations
- Tested change detection and alert generation

## Performance Optimizations
- Singleton pattern ensures weights loaded once at startup
- In-memory caching for fast access
- No runtime file I/O after initial load
- Minimal overhead on embedding processing

## Usage Example

```python
from weights_loader import load_weights, auto_detect_domain
from weighted_analysis import apply_domain_weights

# Load weights on startup
weights = load_weights()

# Auto-detect domain from AOI
domain = auto_detect_domain("port-los-angeles")  # Returns "port"

# Apply domain weights to embeddings
weighted_result = apply_domain_weights(embedding_values, domain)
print(f"Weighted magnitude: {weighted_result['weighted_magnitude']}")
print(f"Top dimensions: {weighted_result['dominant_dimensions'][:5]}")
```

## Benefits
1. **Domain-Specific Accuracy**: Tailored analysis for different infrastructure types
2. **Meaningful Change Detection**: Context-aware thresholds and alerts
3. **Automated Domain Detection**: Smart AOI pattern recognition
4. **Performance**: Efficient caching and minimal overhead
5. **Extensibility**: Easy to add new domains or adjust weights

## Next Steps
- Monitor real-world performance with actual satellite embeddings
- Fine-tune weights based on validation results
- Add more specialized domains (e.g., urban, forest, water)
- Implement time-series trend analysis with weighted magnitudes
- Create visualization dashboards for weighted analysis results
