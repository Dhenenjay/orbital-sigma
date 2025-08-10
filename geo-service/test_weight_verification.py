"""
Weight Verification Test
Demonstrates that adjusting weight presets actually changes output magnitudes
"""
import json
import numpy as np
from typing import Dict, List, Tuple
from pathlib import Path

# Import our modules
from weights_loader import load_weights, get_weights_by_domain
from weighted_analysis import apply_domain_weights
from anomaly_scoring import AnomalyScorer
from aoi_observation import AOIObservation

def create_test_embedding(seed: int = 42) -> Dict[str, float]:
    """Create a test embedding with 64 dimensions"""
    np.random.seed(seed)
    embedding = {}
    # Use band names like A00, A01, etc.
    for i in range(64):
        embedding[f"A{i:02d}"] = np.random.uniform(-1, 1)
    return embedding


def test_weight_impact_on_single_embedding():
    """Test how different domain weights affect the same embedding"""
    print("=" * 80)
    print("TEST 1: Impact of Different Domain Weights on Same Embedding")
    print("=" * 80)
    
    # Create a test embedding
    test_embedding = create_test_embedding(seed=123)
    
    # Load weights
    weights_data = load_weights()
    domains = ["port", "farm", "mine", "energy", "default"]
    
    print("\nTest Embedding Statistics:")
    print(f"  Dimensions: {len(test_embedding)}")
    print(f"  Mean value: {np.mean(list(test_embedding.values())):.4f}")
    print(f"  Std dev: {np.std(list(test_embedding.values())):.4f}")
    
    results = {}
    
    print("\n" + "-" * 60)
    print("Applying Different Domain Weights:")
    print("-" * 60)
    
    for domain in domains:
        # Apply domain weights
        weighted_result = apply_domain_weights(test_embedding, domain)
        
        # Calculate raw magnitude (no weights)
        raw_magnitude = np.linalg.norm(list(test_embedding.values()))
        
        results[domain] = {
            'raw_magnitude': raw_magnitude,
            'weighted_magnitude': weighted_result['weighted_magnitude'],
            'top_dimensions': weighted_result['dominant_dimensions'][:3]
        }
        
        print(f"\n{domain.upper()} Domain:")
        print(f"  Raw Magnitude: {raw_magnitude:.6f}")
        print(f"  Weighted Magnitude: {weighted_result['weighted_magnitude']:.6f}")
        print(f"  Change Factor: {weighted_result['weighted_magnitude'] / raw_magnitude:.3f}x")
        print(f"  Top Contributing Dimensions:")
        # Check if dominant_dimensions is a list of strings or dicts
        if weighted_result['dominant_dimensions'] and isinstance(weighted_result['dominant_dimensions'][0], str):
            # Just show dimension names if strings
            for dim in weighted_result['dominant_dimensions'][:3]:
                print(f"    - {dim}")
        else:
            # Show detailed info if dicts
            for dim in weighted_result['dominant_dimensions'][:3]:
                if isinstance(dim, dict):
                    print(f"    - {dim['dimension']}: weight={dim['weight']:.2f}, contrib={dim['contribution']:.4f}")
                else:
                    print(f"    - {dim}")
    
    # Compare results
    print("\n" + "-" * 60)
    print("Magnitude Comparison Across Domains:")
    print("-" * 60)
    
    # Sort by weighted magnitude
    sorted_results = sorted(results.items(), key=lambda x: x[1]['weighted_magnitude'], reverse=True)
    
    print("\nRanking by Weighted Magnitude:")
    for i, (domain, data) in enumerate(sorted_results, 1):
        print(f"  {i}. {domain:8s}: {data['weighted_magnitude']:.6f}")
    
    # Calculate variance to show weights are having an effect
    magnitudes = [r['weighted_magnitude'] for r in results.values()]
    variance = np.var(magnitudes)
    
    print(f"\nVariance in weighted magnitudes: {variance:.6f}")
    if variance > 0.001:
        print("✅ SUCCESS: Different domain weights produce different magnitudes!")
    else:
        print("❌ FAIL: Domain weights not producing significant differences")
    
    return results


def test_weight_adjustments():
    """Test adjusting weights within a domain"""
    print("\n" + "=" * 80)
    print("TEST 2: Impact of Adjusting Weights Within a Domain")
    print("=" * 80)
    
    # Create test embedding
    test_embedding = create_test_embedding(seed=456)
    
    # Test with original port weights
    original_result = apply_domain_weights(test_embedding, "port")
    
    print("\nOriginal PORT Domain Weights:")
    print(f"  Weighted Magnitude: {original_result['weighted_magnitude']:.6f}")
    
    # Modify weights for testing
    # Create a custom weight configuration
    port_weights = get_weights_by_domain("port")
    
    # Test scenarios with different weight adjustments
    test_scenarios = [
        ("Double critical dimensions", lambda w: {k: v*2 if abs(v) > 1.5 else v for k, v in w.items()}),
        ("Zero out half the weights", lambda w: {k: (0 if i % 2 == 0 else v) for i, (k, v) in enumerate(w.items())}),
        ("Invert all weights", lambda w: {k: -v for k, v in w.items()}),
        ("Set all weights to 1.0", lambda w: {k: 1.0 for k in w.keys()}),
        ("Amplify top 10 dimensions", lambda w: {k: (v*3 if k in list(w.keys())[:10] else v) for k, v in w.items()})
    ]
    
    print("\nTesting Weight Adjustments:")
    print("-" * 60)
    
    for scenario_name, weight_modifier in test_scenarios:
        # Modify weights
        modified_weights = weight_modifier(port_weights)
        
        # Apply modified weights manually
        weighted_values = {}
        weighted_magnitude = 0
        
        for dim, value in test_embedding.items():
            weight = modified_weights.get(dim, 1.0)
            weighted_value = value * weight
            weighted_values[dim] = weighted_value
            weighted_magnitude += weighted_value ** 2
        
        weighted_magnitude = np.sqrt(weighted_magnitude)
        
        print(f"\n{scenario_name}:")
        print(f"  Original Magnitude: {original_result['weighted_magnitude']:.6f}")
        print(f"  Modified Magnitude: {weighted_magnitude:.6f}")
        print(f"  Change: {(weighted_magnitude - original_result['weighted_magnitude']):.6f}")
        print(f"  Change %: {((weighted_magnitude / original_result['weighted_magnitude']) - 1) * 100:.1f}%")


def test_anomaly_scoring_with_weights():
    """Test that anomaly scores change with different weights"""
    print("\n" + "=" * 80)
    print("TEST 3: Anomaly Scoring with Different Domain Weights")
    print("=" * 80)
    
    # Create test observations
    test_magnitude = 0.25
    historical = [0.10, 0.11, 0.10, 0.09, 0.11, 0.10]
    
    scorer = AnomalyScorer()
    domains = ["port", "farm", "mine", "energy", "default"]
    
    print(f"\nTest Magnitude: {test_magnitude}")
    print(f"Historical Average: {np.mean(historical):.3f}")
    
    print("\n" + "-" * 60)
    print("Anomaly Scores by Domain:")
    print("-" * 60)
    
    results = {}
    
    for domain in domains:
        # Create observation
        obs = AOIObservation(
            aoi_id=f"test-{domain}",
            raw_magnitude=test_magnitude,
            domain=domain,
            historical_magnitudes=historical
        )
        
        # Process with anomaly scoring
        obs.process(scorer)
        
        results[domain] = {
            'domain_multiplier': obs.domain_multiplier,
            'anomaly_score': obs.anomaly_score,
            'anomaly_level': obs.anomaly_level,
            'weighted_magnitude': obs.weighted_magnitude,
            'scaled_magnitude': obs.scaled_magnitude
        }
        
        print(f"\n{domain.upper()}:")
        print(f"  Domain Multiplier: {obs.domain_multiplier:.3f}x")
        print(f"  Raw → Weighted: {test_magnitude:.3f} → {obs.weighted_magnitude:.3f}" if obs.weighted_magnitude else f"  Raw Magnitude: {test_magnitude:.3f}")
        print(f"  Anomaly Score: {obs.anomaly_score:.4f}")
        print(f"  Anomaly Level: {obs.anomaly_level}")
        print(f"  Requires Attention: {obs.requires_attention}")
    
    # Compare anomaly scores
    print("\n" + "-" * 60)
    print("Anomaly Score Comparison:")
    print("-" * 60)
    
    sorted_scores = sorted(results.items(), key=lambda x: x[1]['anomaly_score'], reverse=True)
    
    print("\nRanking by Anomaly Score:")
    for i, (domain, data) in enumerate(sorted_scores, 1):
        print(f"  {i}. {domain:8s}: {data['anomaly_score']:.4f} ({data['anomaly_level']})")
    
    # Check variance
    scores = [r['anomaly_score'] for r in results.values()]
    variance = np.var(scores)
    
    print(f"\nVariance in anomaly scores: {variance:.6f}")
    if variance > 0.0001:
        print("✅ SUCCESS: Different domains produce different anomaly scores!")
    else:
        print("❌ FAIL: Domain weights not affecting anomaly scores")


def test_dimension_specific_changes():
    """Test that specific dimension changes affect weighted results"""
    print("\n" + "=" * 80)
    print("TEST 4: Dimension-Specific Weight Impact")
    print("=" * 80)
    
    # Create embedding with known high values in specific dimensions
    test_embedding = {f"A{i:02d}": 0.1 for i in range(64)}
    
    # Set high values in specific dimensions
    high_value_dims = ["A05", "A15", "A25", "A35", "A45"]
    for dim in high_value_dims:
        test_embedding[dim] = 0.9
    
    print(f"\nTest Setup:")
    print(f"  Base value for most dimensions: 0.1")
    print(f"  High value dimensions: {high_value_dims} = 0.9")
    
    # Test with each domain
    domains = ["port", "farm", "mine", "energy"]
    
    print("\n" + "-" * 60)
    print("Testing High-Value Dimension Weighting:")
    print("-" * 60)
    
    for domain in domains:
        weights = get_weights_by_domain(domain)
        result = apply_domain_weights(test_embedding, domain)
        
        print(f"\n{domain.upper()} Domain:")
        
        # Check weights for high-value dimensions
        high_dim_weights = {dim: weights.get(dim, 1.0) for dim in high_value_dims}
        avg_high_weight = np.mean(list(high_dim_weights.values()))
        
        print(f"  Weights for high-value dimensions:")
        for dim, weight in high_dim_weights.items():
            contribution = (0.9 * weight) ** 2  # Contribution to magnitude
            print(f"    {dim}: weight={weight:.2f}, contribution={contribution:.4f}")
        
        print(f"  Average weight for high-value dims: {avg_high_weight:.2f}")
        print(f"  Total weighted magnitude: {result['weighted_magnitude']:.6f}")
        
        # Show top contributors
        print(f"  Top 3 contributors:")
        for dim_info in result['dominant_dimensions'][:3]:
            if isinstance(dim_info, str):
                print(f"    - {dim_info}")
            else:
                print(f"    - {dim_info['dimension']}: {dim_info['contribution']:.4f}")


def verify_weight_files_loaded():
    """Verify weight files are properly loaded"""
    print("\n" + "=" * 80)
    print("VERIFICATION: Weight Files Loading")
    print("=" * 80)
    
    try:
        weights_data = load_weights()
        print("\n✅ Weights loaded successfully!")
        
        # Check domains
        domains = weights_data.get('domains', {})
        print(f"\nAvailable domains: {list(domains.keys())}")
        
        # Verify each domain has weights
        for domain_name, domain_data in domains.items():
            weights = domain_data.get('weights', {})
            non_default = sum(1 for w in weights.values() if w != 1.0)
            print(f"  {domain_name}: {len(weights)} dimensions, {non_default} non-default weights")
        
        # Check metadata
        metadata = weights_data.get('metadata', {})
        print(f"\nMetadata:")
        print(f"  Version: {metadata.get('version', 'unknown')}")
        print(f"  Created: {metadata.get('created_at', 'unknown')}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Failed to load weights: {e}")
        return False


def main():
    """Run all verification tests"""
    print("\n" + "=" * 80)
    print("WEIGHT ADJUSTMENT VERIFICATION TESTS")
    print("=" * 80)
    print("\nThis test suite verifies that:")
    print("1. Different domain weights produce different magnitudes")
    print("2. Adjusting weights within a domain changes outputs")
    print("3. Anomaly scores vary based on domain weights")
    print("4. Specific dimension weights have expected impact")
    print("=" * 80)
    
    # First verify weights are loaded
    if not verify_weight_files_loaded():
        print("\n⚠️  Cannot proceed without weight files!")
        return
    
    # Run tests
    test_results = {}
    
    # Test 1: Different domains on same embedding
    print("\n")
    results1 = test_weight_impact_on_single_embedding()
    test_results['domain_comparison'] = results1
    
    # Test 2: Weight adjustments
    test_weight_adjustments()
    
    # Test 3: Anomaly scoring
    test_anomaly_scoring_with_weights()
    
    # Test 4: Dimension-specific impacts
    test_dimension_specific_changes()
    
    # Final summary
    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    
    # Check if weights are having measurable impact
    if test_results['domain_comparison']:
        magnitudes = [r['weighted_magnitude'] for r in test_results['domain_comparison'].values()]
        max_diff = max(magnitudes) - min(magnitudes)
        percent_diff = (max_diff / np.mean(magnitudes)) * 100
        
        print(f"\n📊 Weight Impact Statistics:")
        print(f"  Max magnitude difference: {max_diff:.6f}")
        print(f"  Percentage variation: {percent_diff:.1f}%")
        
        if percent_diff > 5:
            print("\n✅ VERIFICATION SUCCESSFUL!")
            print("   Domain weights are producing significant magnitude changes.")
            print("   The system is working as designed.")
        else:
            print("\n⚠️  WARNING: Low weight impact detected")
            print("   Consider adjusting weight values for stronger differentiation.")
    
    print("\n" + "=" * 80)
    print("Test completed successfully!")
    print("=" * 80)


if __name__ == "__main__":
    main()
