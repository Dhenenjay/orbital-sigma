"""
Weighted analysis module for domain-specific embedding comparison
Uses weights.json to apply domain-specific emphasis to Google Satellite Embeddings
"""
import json
import math
import os
from typing import Dict, List, Optional, Tuple
from pathlib import Path

class WeightedEmbeddingAnalyzer:
    """Applies domain-specific weights to satellite embeddings for enhanced change detection"""
    
    def __init__(self, weights_file: str = "weights.json"):
        """Initialize with weights configuration"""
        weights_path = Path(__file__).parent / weights_file
        with open(weights_path, 'r') as f:
            self.config = json.load(f)
        self.domains = self.config['domains']
        self.default_weights = self.config['default']['weights']
        
    def get_domain_weights(self, domain_type: str) -> Dict[str, float]:
        """Get weight vector for a specific domain"""
        if domain_type in self.domains:
            return self.domains[domain_type]['weights']
        return self.default_weights
    
    def apply_weights(self, embedding: List[float], domain_type: str) -> List[float]:
        """Apply domain-specific weights to an embedding vector"""
        weights = self.get_domain_weights(domain_type)
        
        # Ensure we have 64 dimensions
        if len(embedding) != 64:
            raise ValueError(f"Expected 64-dimensional embedding, got {len(embedding)}")
        
        # Apply weights to each dimension
        weighted = []
        for i, val in enumerate(embedding):
            band_name = f"A{i:02d}"
            weight = weights.get(band_name, 1.0)
            weighted.append(val * weight)
        
        return weighted
    
    def calculate_weighted_magnitude(
        self, 
        embedding_current: List[float], 
        embedding_baseline: List[float],
        domain_type: str
    ) -> Dict:
        """
        Calculate weighted magnitude and additional metrics for a specific domain
        
        Returns:
            Dict with magnitude, cosine similarity, interpretation, and confidence
        """
        # Apply domain-specific weights
        weighted_current = self.apply_weights(embedding_current, domain_type)
        weighted_baseline = self.apply_weights(embedding_baseline, domain_type)
        
        # Calculate cosine similarity with weighted vectors
        dot_product = sum(a * b for a, b in zip(weighted_current, weighted_baseline))
        norm_current = math.sqrt(sum(a * a for a in weighted_current))
        norm_baseline = math.sqrt(sum(b * b for b in weighted_baseline))
        
        if norm_current > 0 and norm_baseline > 0:
            cosine_sim = dot_product / (norm_current * norm_baseline)
            # Clamp to [-1, 1] to handle floating point errors
            cosine_sim = max(-1, min(1, cosine_sim))
        else:
            cosine_sim = 1.0  # Treat zero vectors as identical
        
        # Convert to magnitude (0-1 scale)
        magnitude = (1 - cosine_sim) / 2
        
        # Get domain-specific interpretation
        domain_config = self.domains.get(domain_type, self.config['default'])
        thresholds = domain_config['thresholds']
        
        # Determine change level
        if magnitude < thresholds['minor_change']:
            change_level = "negligible"
            confidence = "high"
        elif magnitude < thresholds['moderate_change']:
            change_level = "minor"
            confidence = "high"
        elif magnitude < thresholds['major_change']:
            change_level = "moderate"
            confidence = "medium"
        elif magnitude < thresholds['critical_change']:
            change_level = "major"
            confidence = "medium"
        else:
            change_level = "critical"
            confidence = "low"
        
        # Calculate component contributions (which dimensions changed most)
        dimension_changes = []
        weights = self.get_domain_weights(domain_type)
        
        for i in range(64):
            band_name = f"A{i:02d}"
            weight = weights.get(band_name, 1.0)
            
            val_current = embedding_current[i] if i < len(embedding_current) else 0
            val_baseline = embedding_baseline[i] if i < len(embedding_baseline) else 0
            
            # Calculate weighted change for this dimension
            change = abs(val_current - val_baseline) * weight
            dimension_changes.append({
                "dimension": band_name,
                "change": change,
                "weight": weight,
                "current": val_current,
                "baseline": val_baseline
            })
        
        # Sort by change magnitude
        dimension_changes.sort(key=lambda x: x['change'], reverse=True)
        
        # Get top contributing dimensions
        top_contributors = dimension_changes[:5]
        
        return {
            "magnitude": magnitude,
            "weighted_magnitude": magnitude,  # Already weighted
            "cosine_similarity": cosine_sim,
            "change_level": change_level,
            "confidence": confidence,
            "domain": domain_type,
            "domain_name": domain_config['name'],
            "interpretation": {
                "description": f"{change_level.capitalize()} change detected in {domain_config['name'].lower()}",
                "thresholds": thresholds,
                "emphasis": domain_config.get('emphasis', {}),
                "top_contributors": top_contributors
            },
            "alerts": self._generate_alerts(magnitude, domain_type, thresholds)
        }
    
    def _generate_alerts(self, magnitude: float, domain_type: str, thresholds: Dict) -> List[Dict]:
        """Generate domain-specific alerts based on magnitude"""
        alerts = []
        
        if magnitude >= thresholds['critical_change']:
            alerts.append({
                "level": "critical",
                "message": f"Critical change detected in {domain_type} area",
                "action": "Immediate investigation required"
            })
        elif magnitude >= thresholds['major_change']:
            alerts.append({
                "level": "warning",
                "message": f"Major change detected in {domain_type} area",
                "action": "Schedule detailed analysis within 24 hours"
            })
        elif magnitude >= thresholds['moderate_change']:
            alerts.append({
                "level": "info",
                "message": f"Moderate change detected in {domain_type} area",
                "action": "Monitor for continued changes"
            })
        
        # Domain-specific alerts
        if domain_type == "port" and magnitude >= 0.05:
            alerts.append({
                "level": "info",
                "message": "Potential vessel traffic or infrastructure change",
                "action": "Review shipping manifests and construction permits"
            })
        elif domain_type == "farm" and magnitude >= 0.08:
            alerts.append({
                "level": "info",
                "message": "Significant agricultural activity detected",
                "action": "Check for harvest, planting, or irrigation changes"
            })
        elif domain_type == "mine" and magnitude >= 0.10:
            alerts.append({
                "level": "warning",
                "message": "Substantial mining activity detected",
                "action": "Verify excavation permits and environmental compliance"
            })
        elif domain_type == "energy" and magnitude >= 0.07:
            alerts.append({
                "level": "info",
                "message": "Energy infrastructure change detected",
                "action": "Check for new installations or decommissioning"
            })
        
        return alerts
    
    def compare_domains(
        self,
        embedding_current: List[float],
        embedding_baseline: List[float]
    ) -> Dict:
        """Compare embeddings across all domains to find best fit"""
        results = {}
        
        for domain_type in ['port', 'farm', 'mine', 'energy', 'default']:
            analysis = self.calculate_weighted_magnitude(
                embedding_current,
                embedding_baseline,
                domain_type
            )
            results[domain_type] = analysis
        
        # Find domain with highest confidence
        best_domain = max(
            results.items(),
            key=lambda x: (
                x[1]['confidence'] == 'high',
                -abs(x[1]['magnitude'] - 0.1)  # Prefer moderate changes
            )
        )[0]
        
        return {
            "recommended_domain": best_domain,
            "domain_analyses": results,
            "summary": {
                "best_fit": results[best_domain],
                "all_magnitudes": {
                    domain: data['magnitude'] 
                    for domain, data in results.items()
                }
            }
        }


# Utility function for direct use
def analyze_with_weights(
    embedding_current: List[float],
    embedding_baseline: List[float],
    domain_type: str = None,
    aoi_id: str = None
) -> Dict:
    """
    Convenience function to analyze embeddings with domain weights
    
    Args:
        embedding_current: Current year embedding (64 dimensions)
        embedding_baseline: Baseline year embedding (64 dimensions)
        domain_type: One of 'port', 'farm', 'mine', 'energy', or None for auto-detect
        aoi_id: AOI identifier for auto-detection (e.g., 'port-los-angeles')
    
    Returns:
        Analysis results with weighted magnitude and interpretation
    """
    analyzer = WeightedEmbeddingAnalyzer()
    
    # Auto-detect domain from AOI ID if not specified
    if domain_type is None and aoi_id:
        if 'port' in aoi_id.lower():
            domain_type = 'port'
        elif 'farm' in aoi_id.lower():
            domain_type = 'farm'
        elif 'mine' in aoi_id.lower():
            domain_type = 'mine'
        elif 'energy' in aoi_id.lower():
            domain_type = 'energy'
        else:
            domain_type = 'default'
    
    if domain_type:
        return analyzer.calculate_weighted_magnitude(
            embedding_current,
            embedding_baseline,
            domain_type
        )
    else:
        # Compare across all domains
        return analyzer.compare_domains(
            embedding_current,
            embedding_baseline
        )


# Convenience functions for compatibility
def apply_domain_weights(embedding_values: Dict[str, float], domain: str) -> Dict:
    """Apply domain-specific weights to embedding values"""
    # Convert dict to list format expected by analyzer
    embedding_list = []
    for i in range(64):
        band_name = f"A{i:02d}"
        embedding_list.append(embedding_values.get(band_name, 0.0))
    
    analyzer = WeightedEmbeddingAnalyzer()
    weighted = analyzer.apply_weights(embedding_list, domain)
    
    # Calculate weighted magnitude
    weighted_magnitude = math.sqrt(sum(w * w for w in weighted))
    
    # Find dominant dimensions
    dimension_contributions = []
    weights = analyzer.get_domain_weights(domain)
    for i in range(64):
        band_name = f"A{i:02d}"
        contribution = abs(embedding_list[i] * weights.get(band_name, 1.0))
        dimension_contributions.append((band_name, contribution))
    
    dimension_contributions.sort(key=lambda x: x[1], reverse=True)
    dominant_dimensions = [d[0] for d in dimension_contributions[:10]]
    
    return {
        'weighted_magnitude': weighted_magnitude,
        'weighted_vector': weighted,
        'dominant_dimensions': dominant_dimensions,
        'domain': domain
    }

def get_change_detection(current_magnitude: float, baseline_magnitude: float, domain: str) -> Dict:
    """Get change detection information based on magnitude comparison"""
    analyzer = WeightedEmbeddingAnalyzer()
    domain_config = analyzer.domains.get(domain, analyzer.config['default'])
    thresholds = domain_config['thresholds']
    
    # Calculate change
    if baseline_magnitude > 0:
        change_percentage = ((current_magnitude - baseline_magnitude) / baseline_magnitude) * 100
    else:
        change_percentage = 100.0 if current_magnitude > 0 else 0.0
    
    magnitude_diff = abs(current_magnitude - baseline_magnitude)
    
    # Determine change level
    if magnitude_diff < thresholds['minor_change']:
        change_level = "negligible"
    elif magnitude_diff < thresholds['moderate_change']:
        change_level = "minor"
    elif magnitude_diff < thresholds['major_change']:
        change_level = "moderate"
    elif magnitude_diff < thresholds['critical_change']:
        change_level = "major"
    else:
        change_level = "critical"
    
    # Generate alert if needed
    alert = None
    if change_level in ['major', 'critical']:
        alert = f"{change_level.capitalize()} change detected in {domain_config['name']}"
    
    return {
        'change_level': change_level,
        'change_percentage': change_percentage,
        'magnitude_difference': magnitude_diff,
        'alert': alert,
        'domain': domain
    }


if __name__ == "__main__":
    # Test with sample embeddings
    import random
    
    # Create sample embeddings with slight differences
    baseline = [random.gauss(0, 0.1) for _ in range(64)]
    current = [val + random.gauss(0, 0.02) for val in baseline]
    
    # Test domain-specific analysis
    print("Testing Weighted Analysis Module")
    print("=" * 60)
    
    for domain in ['port', 'farm', 'mine', 'energy']:
        result = analyze_with_weights(current, baseline, domain_type=domain)
        print(f"\n{domain.upper()} Analysis:")
        print(f"  Magnitude: {result['magnitude']:.4f}")
        print(f"  Change Level: {result['change_level']}")
        print(f"  Confidence: {result['confidence']}")
        if result['alerts']:
            print(f"  Alerts: {len(result['alerts'])} generated")
    
    print("\n" + "=" * 60)
    print("✅ Weighted analysis module ready for use!")
