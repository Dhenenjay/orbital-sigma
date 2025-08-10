"""
Test script to verify weights integration in the geo-service
"""

import json
from weights_loader import load_weights, get_all_domains, auto_detect_domain, get_weights_by_domain
from weighted_analysis import apply_domain_weights, get_change_detection

def test_integration():
    # Load weights
    print("Loading weights...")
    weights_data = load_weights()
    print(f"✓ Loaded weights v{weights_data.get('version', 'unknown')}")
    
    # Get available domains
    domains = get_all_domains()
    print(f"✓ Available domains: {domains}")
    
    # Test auto-detection
    test_aois = {
        "port-123": "port",
        "harbor-001": "port",
        "farm-456": "farm",
        "agri-zone": "farm",
        "mine-789": "mine",
        "energy-001": "energy",
        "unknown-aoi": None
    }
    
    print("\nTesting AOI domain auto-detection:")
    for aoi_id, expected in test_aois.items():
        detected = auto_detect_domain(aoi_id)
        status = "✓" if detected == expected else "✗"
        print(f"  {status} {aoi_id}: {detected} (expected: {expected})")
    
    # Test weighted analysis with sample data
    print("\nTesting weighted analysis:")
    
    # Create sample embedding values (64 dimensions)
    sample_embedding = {}
    for i in range(64):
        band_name = f"A{i:02d}"
        sample_embedding[band_name] = 0.1 + (i * 0.01)  # Gradual increase
    
    # Apply weights for each domain
    for domain in domains:
        weights = get_weights_by_domain(domain)
        if weights:
            result = apply_domain_weights(sample_embedding, domain)
            print(f"\n  Domain: {domain}")
            print(f"    Weighted magnitude: {result['weighted_magnitude']:.4f}")
            print(f"    Top dimensions: {result['dominant_dimensions'][:3]}")
            
            # Test change detection
            baseline_magnitude = result['weighted_magnitude'] * 0.8  # 20% change
            change_info = get_change_detection(
                result['weighted_magnitude'],
                baseline_magnitude,
                domain
            )
            if change_info:
                print(f"    Change level: {change_info['change_level']}")
                print(f"    Change %: {change_info['change_percentage']:.1f}%")
                if change_info.get('alert'):
                    print(f"    Alert: {change_info['alert']}")

if __name__ == "__main__":
    test_integration()
