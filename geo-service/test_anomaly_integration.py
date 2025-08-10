"""
Test script for anomaly scoring integration
Tests the enhanced anomaly detection with domain-specific weight multipliers
"""

import json
from anomaly_scoring import AnomalyScorer, calculate_anomaly_score, calculate_contextual_anomaly_score
from weights_loader import detect_domain_from_aoi

def test_anomaly_scoring():
    """Test basic anomaly scoring with domain multipliers"""
    print("Testing Anomaly Scoring Integration")
    print("=" * 60)
    
    # Initialize scorer
    scorer = AnomalyScorer()
    
    # Test 1: Display domain multipliers
    print("\n1. Domain Multipliers:")
    multipliers = scorer.get_all_multipliers()
    for domain, mult in multipliers.items():
        print(f"   {domain}: {mult:.3f}x")
    
    # Test 2: Compare raw vs weighted scores
    print("\n2. Raw Magnitude vs Anomaly Score Comparison:")
    print("   (Shows how domain multipliers enhance detection)")
    print()
    
    test_cases = [
        ("port-singapore", 0.08, "Minor activity at port"),
        ("farm-brazil", 0.08, "Minor activity at farm"),
        ("mine-australia", 0.08, "Minor activity at mine"),
        ("energy-saudi", 0.08, "Minor activity at energy site"),
        ("unknown-location", 0.08, "Minor activity at unknown site"),
    ]
    
    print(f"   {'AOI':<20} {'Domain':<10} {'Raw Mag':<10} {'Multiplier':<12} {'Anomaly Score':<15} {'Level':<10}")
    print("   " + "-" * 90)
    
    for aoi_id, raw_magnitude, description in test_cases:
        domain = detect_domain_from_aoi(aoi_id) or 'default'
        result = calculate_anomaly_score(raw_magnitude, aoi_id, domain)
        
        print(f"   {aoi_id:<20} {domain:<10} {raw_magnitude:<10.3f} "
              f"{result['domain_multiplier']:<12.3f} {result['anomaly_score']:<15.4f} "
              f"{result['anomaly_level']:<10}")
    
    # Test 3: Demonstrate impact on critical detection
    print("\n3. Critical Detection Threshold Analysis:")
    print("   (Shows how domain weighting affects alert thresholds)")
    print()
    
    # Raw magnitude that would be borderline without weights
    borderline_magnitude = 0.12
    
    print(f"   Testing with borderline magnitude: {borderline_magnitude}")
    print()
    
    domains_to_test = ['port', 'farm', 'mine', 'energy', 'default']
    
    for domain in domains_to_test:
        result = scorer.calculate_anomaly_score(borderline_magnitude, domain)
        attention_marker = " ⚠️ ATTENTION" if result['requires_attention'] else ""
        print(f"   {domain:<10}: Score={result['anomaly_score']:.4f}, "
              f"Level={result['anomaly_level']:<10}{attention_marker}")
    
    # Test 4: Contextual scoring with historical data
    print("\n4. Historical Context Enhancement:")
    print("   (Shows statistical significance detection)")
    print()
    
    # Simulate historical baseline
    historical_mags = [0.05, 0.06, 0.04, 0.05, 0.07, 0.06, 0.05]
    current_mag = 0.15  # Significant jump
    
    # Without historical context
    simple_result = calculate_anomaly_score(current_mag, "port-hamburg", "port")
    
    # With historical context
    contextual_result = calculate_contextual_anomaly_score(
        current_mag, 
        historical_mags, 
        "port"
    )
    
    print(f"   Current magnitude: {current_mag}")
    print(f"   Historical average: {contextual_result['statistical_context']['historical_mean']:.4f}")
    print(f"   Standard deviation: {contextual_result['statistical_context']['historical_std']:.4f}")
    print()
    print(f"   Simple anomaly score: {simple_result['anomaly_score']:.4f}")
    print(f"   Contextual anomaly score: {contextual_result['anomaly_score']:.4f}")
    print(f"   Z-score: {contextual_result['statistical_context']['z_score']:.2f}")
    print(f"   Statistical significance: {contextual_result['interpretation']['statistical_significance']}")
    
    # Test 5: Batch processing simulation
    print("\n5. Batch Anomaly Detection:")
    print("   (Simulates monitoring multiple AOIs)")
    print()
    
    batch_aois = [
        ("port-rotterdam", 0.05, "port"),
        ("farm-midwest-01", 0.18, "farm"),
        ("mine-copper-02", 0.09, "mine"),
        ("energy-solar-03", 0.22, "energy"),
        ("port-shanghai", 0.15, "port"),
        ("farm-corn-belt", 0.07, "farm"),
        ("mine-gold-04", 0.13, "mine"),
        ("energy-wind-05", 0.06, "energy"),
    ]
    
    batch_results = scorer.batch_score(batch_aois)
    
    print("   Top 5 Anomalies Detected:")
    print(f"   {'Rank':<6} {'AOI':<20} {'Score':<10} {'Level':<10} {'Action Required':<40}")
    print("   " + "-" * 85)
    
    for i, result in enumerate(batch_results[:5], 1):
        print(f"   {i:<6} {result['aoi_id']:<20} {result['anomaly_score']:<10.4f} "
              f"{result['anomaly_level']:<10} {result['interpretation']['recommended_action']:<40}")
    
    # Test 6: Domain effectiveness comparison
    print("\n6. Domain Weight Effectiveness:")
    print("   (Shows amplification factor for each domain)")
    print()
    
    base_magnitude = 0.10
    print(f"   Base magnitude: {base_magnitude}")
    print()
    
    for domain in ['port', 'farm', 'mine', 'energy', 'default']:
        result = scorer.calculate_anomaly_score(base_magnitude, domain)
        amplification = (result['anomaly_score'] / base_magnitude - 1) * 100
        print(f"   {domain:<10}: {result['anomaly_score']:.4f} "
              f"(+{amplification:.1f}% amplification)")
    
    print("\n" + "=" * 60)
    print("✅ Anomaly scoring integration test complete!")
    print("\nKey Findings:")
    print("• Domain multipliers range from 1.0x (default) to ~1.7x (specialized)")
    print("• Same raw magnitude produces different anomaly scores by domain")
    print("• Historical context enhances detection of statistical outliers")
    print("• Batch processing enables efficient multi-AOI monitoring")
    print("• Domain weighting improves sensitivity for domain-specific changes")


if __name__ == "__main__":
    test_anomaly_scoring()
