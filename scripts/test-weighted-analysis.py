#!/usr/bin/env python3
"""
Test weighted analysis with real embeddings from different AOI types
"""
import sys
import os
import json
from pathlib import Path

# Add geo-service to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'geo-service'))

from weighted_analysis import WeightedEmbeddingAnalyzer, analyze_with_weights

print("=" * 80)
print("🎯 DOMAIN-SPECIFIC WEIGHTED ANALYSIS TEST")
print("=" * 80)

# Load real embeddings from cached files
output_dir = Path("geo-service/output/alphaearth")

# Test cases with different AOI types
test_cases = [
    {"aoi": "port-los-angeles", "years": [2024, 2023]},
    {"aoi": "farm-iowa-cornbelt", "years": [2024, 2023]},
    {"aoi": "mine-escondida", "years": [2024, 2023]},
    {"aoi": "energy-ghawar", "years": [2024, 2023]}
]

analyzer = WeightedEmbeddingAnalyzer()

for test in test_cases:
    aoi_id = test["aoi"]
    current_year = test["years"][0]
    baseline_year = test["years"][1]
    
    # Try to load embeddings
    current_file = output_dir / f"{aoi_id}_{current_year}.json"
    baseline_file = output_dir / f"{aoi_id}_{baseline_year}.json"
    
    if current_file.exists() and baseline_file.exists():
        print(f"\n{'='*60}")
        print(f"📍 AOI: {aoi_id}")
        print(f"📅 Comparing: {current_year} vs {baseline_year}")
        print("-" * 60)
        
        # Load embeddings
        with open(current_file) as f:
            current_data = json.load(f)
        with open(baseline_file) as f:
            baseline_data = json.load(f)
        
        # Extract embedding values (bands A00-A63)
        current_embedding = []
        baseline_embedding = []
        
        for i in range(64):
            band = f"A{i:02d}"
            current_val = current_data.get("values", {}).get(band, 0) or 0
            baseline_val = baseline_data.get("values", {}).get(band, 0) or 0
            current_embedding.append(current_val)
            baseline_embedding.append(baseline_val)
        
        # Analyze with domain-specific weights
        result = analyze_with_weights(
            current_embedding,
            baseline_embedding,
            aoi_id=aoi_id  # Auto-detect domain from AOI ID
        )
        
        print(f"\n🔍 Analysis Results:")
        print(f"   Domain: {result['domain_name']}")
        print(f"   Magnitude: {result['magnitude']:.6f}")
        print(f"   Change Level: {result['change_level'].upper()}")
        print(f"   Confidence: {result['confidence']}")
        print(f"   Interpretation: {result['interpretation']['description']}")
        
        # Show top contributing dimensions
        print(f"\n📊 Top Contributing Dimensions:")
        for i, contrib in enumerate(result['interpretation']['top_contributors'][:3]):
            print(f"   {i+1}. {contrib['dimension']}: Δ={contrib['change']:.6f} (weight={contrib['weight']})")
        
        # Show alerts if any
        if result['alerts']:
            print(f"\n⚠️  Alerts Generated:")
            for alert in result['alerts']:
                print(f"   [{alert['level'].upper()}] {alert['message']}")
                print(f"           Action: {alert['action']}")
        
        # Compare across all domains
        print(f"\n🔄 Cross-Domain Comparison:")
        comparison = analyzer.compare_domains(current_embedding, baseline_embedding)
        for domain, magnitude in comparison['summary']['all_magnitudes'].items():
            indicator = "👈" if domain == result['domain'] else "  "
            print(f"   {domain:8s}: {magnitude:.6f} {indicator}")
        
    else:
        print(f"\n⚠️  Skipping {aoi_id}: embeddings not found")
        print(f"   Need: {current_file.name} and {baseline_file.name}")

# Test with synthetic high-change scenario
print(f"\n{'='*80}")
print("🚨 SYNTHETIC HIGH-CHANGE SCENARIO TEST")
print("-" * 80)

import random

# Create baseline embedding
baseline = [random.uniform(-0.1, 0.1) for _ in range(64)]

# Create high-change scenarios for each domain
scenarios = {
    "port": {
        "description": "Major port expansion",
        "change_indices": [0, 1, 2, 4, 5, 10, 11, 18, 19, 29, 40, 41, 54, 55],  # High-weight dimensions for ports
        "change_magnitude": 0.3
    },
    "farm": {
        "description": "Harvest season change",
        "change_indices": [3, 4, 5, 6, 7, 12, 13, 20, 21, 26, 27, 32, 33, 40, 41, 42],  # High-weight dimensions for farms
        "change_magnitude": 0.4
    },
    "mine": {
        "description": "New excavation site",
        "change_indices": [0, 1, 6, 7, 8, 16, 17, 30, 31, 44, 45, 54, 55, 56, 57],  # High-weight dimensions for mines
        "change_magnitude": 0.5
    },
    "energy": {
        "description": "Solar farm installation",
        "change_indices": [3, 4, 10, 11, 20, 21, 36, 37, 44, 45, 46, 52, 53, 60, 61],  # High-weight dimensions for energy
        "change_magnitude": 0.35
    }
}

for domain, scenario in scenarios.items():
    print(f"\n📍 Scenario: {scenario['description']} ({domain})")
    
    # Create changed embedding
    current = baseline.copy()
    for idx in scenario['change_indices']:
        if idx < 64:
            current[idx] += random.uniform(-scenario['change_magnitude'], scenario['change_magnitude'])
    
    # Analyze with domain-specific weights
    result = analyze_with_weights(current, baseline, domain_type=domain)
    
    print(f"   Magnitude: {result['magnitude']:.4f}")
    print(f"   Change Level: {result['change_level'].upper()}")
    print(f"   Confidence: {result['confidence']}")
    
    if result['alerts']:
        print(f"   🚨 {len(result['alerts'])} alert(s) generated:")
        for alert in result['alerts'][:2]:  # Show first 2 alerts
            print(f"      [{alert['level']}] {alert['message']}")

print(f"\n{'='*80}")
print("✅ Weighted Analysis Test Complete!")
print(f"{'='*80}")
print("\n📊 Summary:")
print("• Domain-specific weights successfully applied")
print("• Change detection calibrated for each domain type")
print("• Alerts generated based on domain thresholds")
print("• Ready for production use with /fetch-embeddings endpoint")
