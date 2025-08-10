"""
Anomaly scoring module with domain-specific weight multipliers
Enhances raw magnitude scores by applying domain-specific weight factors
"""
import math
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import json
from magnitude_scaling import MagnitudeScaler, ScalingMethod
from confidence_metrics import ConfidenceCalculator, ConfidenceLevel

class AnomalyScorer:
    """Calculate anomaly scores with domain-specific weight multipliers"""
    
    def __init__(self, weights_file: str = "weights.json", scaling_method: str = "sigmoid"):
        """Initialize with weights configuration"""
        weights_path = Path(__file__).parent / weights_file
        with open(weights_path, 'r') as f:
            self.config = json.load(f)
        self.domains = self.config['domains']
        
        # Extract domain weight multipliers
        self.domain_multipliers = self._calculate_domain_multipliers()
        
        # Initialize magnitude scaler
        self.scaling_method = ScalingMethod(scaling_method) if scaling_method in [m.value for m in ScalingMethod] else ScalingMethod.SIGMOID
        self.scaler = MagnitudeScaler(self.scaling_method)
        
        # Initialize confidence calculator
        self.confidence_calculator = ConfidenceCalculator()
    
    def _calculate_domain_multipliers(self) -> Dict[str, float]:
        """
        Calculate domain-specific multipliers based on the number and magnitude
        of non-default weights in each domain configuration
        """
        multipliers = {}
        
        for domain_name, domain_config in self.domains.items():
            weights = domain_config['weights']
            
            # Count non-default weights (not 1.0)
            non_default_count = sum(1 for w in weights.values() if w != 1.0)
            
            # Calculate average weight magnitude for non-default weights
            non_default_weights = [w for w in weights.values() if w != 1.0]
            if non_default_weights:
                avg_weight = sum(abs(w) for w in non_default_weights) / len(non_default_weights)
            else:
                avg_weight = 1.0
            
            # Domain multiplier based on specialization level
            # More specialized domains (more non-default weights) get higher multipliers
            specialization_factor = non_default_count / 64  # Normalize by total dimensions
            
            # Combine factors: base 1.0 + specialization bonus
            multiplier = 1.0 + (specialization_factor * avg_weight * 0.5)
            
            multipliers[domain_name] = multiplier
        
        # Default domain has neutral multiplier
        multipliers['default'] = 1.0
        
        return multipliers
    
    def calculate_anomaly_score(
        self,
        raw_magnitude: float,
        domain: Optional[str] = None,
        confidence_level: Optional[str] = None
    ) -> Dict:
        """
        Calculate anomaly score by multiplying raw magnitude with domain weight
        
        Args:
            raw_magnitude: Base magnitude from cosine similarity (0-1 scale)
            domain: Domain type ('port', 'farm', 'mine', 'energy', 'default')
            confidence_level: Optional confidence level to adjust scoring
        
        Returns:
            Dict containing anomaly_score, raw_magnitude, domain_multiplier, and interpretation
        """
        # Use default domain if not specified
        if domain is None or domain not in self.domain_multipliers:
            domain = 'default'
        
        # Get domain multiplier
        domain_multiplier = self.domain_multipliers[domain]
        
        # Calculate weighted anomaly score
        anomaly_score = raw_magnitude * domain_multiplier
        
        # Apply confidence adjustment if provided
        confidence_factor = 1.0
        if confidence_level:
            confidence_map = {
                'high': 1.0,
                'medium': 0.9,
                'low': 0.75
            }
            confidence_factor = confidence_map.get(confidence_level, 1.0)
        
        anomaly_score *= confidence_factor
        
        # Normalize to 0-1 scale with soft capping
        anomaly_score = min(1.0, anomaly_score)
        
        # Determine anomaly level
        anomaly_level = self._determine_anomaly_level(anomaly_score, domain)
        
        # Generate interpretation
        interpretation = self._generate_interpretation(
            anomaly_score, 
            anomaly_level, 
            domain,
            domain_multiplier
        )
        
        return {
            'anomaly_score': round(anomaly_score, 4),
            'raw_magnitude': round(raw_magnitude, 4),
            'domain': domain,
            'domain_multiplier': round(domain_multiplier, 3),
            'confidence_factor': confidence_factor,
            'anomaly_level': anomaly_level,
            'interpretation': interpretation,
            'requires_attention': anomaly_level in ['high', 'critical']
        }
    
    def calculate_scaled_anomaly_score(
        self,
        raw_magnitude: float,
        domain: Optional[str] = None,
        confidence_level: Optional[str] = None,
        historical_data: Optional[List[float]] = None
    ) -> Dict:
        """
        Calculate anomaly score with magnitude scaling applied
        
        This method applies domain-specific weighting first, then uses
        magnitude scaling to normalize the score to a consistent 0-1 range.
        
        Args:
            raw_magnitude: Base magnitude from cosine similarity (0-1 scale)
            domain: Domain type ('port', 'farm', 'mine', 'energy', 'default')
            confidence_level: Optional confidence level to adjust scoring
            historical_data: Optional historical magnitudes for adaptive scaling
        
        Returns:
            Dict containing scaled anomaly score and metadata
        """
        # Use default domain if not specified
        if domain is None or domain not in self.domain_multipliers:
            domain = 'default'
        
        # Get domain multiplier
        domain_multiplier = self.domain_multipliers[domain]
        
        # Calculate weighted magnitude
        weighted_magnitude = raw_magnitude * domain_multiplier
        
        # Apply magnitude scaling based on domain characteristics
        if domain in ['port', 'mine']:
            # Use sigmoid for domains with critical thresholds
            self.scaler.method = ScalingMethod.SIGMOID
            scaled_score = self.scaler.scale(weighted_magnitude, domain)
        elif domain in ['farm', 'energy']:
            # Use min-max for domains with linear relationships
            self.scaler.method = ScalingMethod.MIN_MAX
            if historical_data:
                # Use historical data for adaptive scaling
                weighted_historical = [m * domain_multiplier for m in historical_data]
                scaled_scores = self.scaler.batch_scale(
                    weighted_historical + [weighted_magnitude],
                    domain,
                    adaptive=True
                )
                scaled_score = scaled_scores[-1]  # Get the last value (current)
            else:
                # Use standard min-max scaling
                scaled_score = self.scaler.scale(weighted_magnitude, domain)
        else:
            # Default domain uses tanh for smooth transitions
            self.scaler.method = ScalingMethod.TANH
            scaled_score = self.scaler.scale(weighted_magnitude, domain)
        
        # Apply confidence adjustment if provided
        confidence_factor = 1.0
        if confidence_level:
            confidence_map = {
                'high': 1.0,
                'medium': 0.9,
                'low': 0.75
            }
            confidence_factor = confidence_map.get(confidence_level, 1.0)
        
        final_score = scaled_score * confidence_factor
        
        # Determine anomaly level using scaled score
        anomaly_level = self._determine_anomaly_level(final_score, domain)
        
        # Generate interpretation
        interpretation = self._generate_interpretation(
            final_score,
            anomaly_level,
            domain,
            domain_multiplier
        )
        
        return {
            'anomaly_score': round(final_score, 4),
            'scaled_score': round(scaled_score, 4),
            'raw_magnitude': round(raw_magnitude, 4),
            'weighted_magnitude': round(weighted_magnitude, 4),
            'domain': domain,
            'domain_multiplier': round(domain_multiplier, 3),
            'scaling_method': self.scaler.method.value if domain not in ['port', 'mine', 'farm', 'energy'] else 
                             ('sigmoid' if domain in ['port', 'mine'] else 'min_max'),
            'confidence_factor': confidence_factor,
            'anomaly_level': anomaly_level,
            'interpretation': interpretation,
            'requires_attention': anomaly_level in ['high', 'critical']
        }
    
    def _determine_anomaly_level(self, score: float, domain: str) -> str:
        """Determine anomaly level based on score and domain thresholds"""
        # Get domain-specific thresholds
        if domain in self.domains:
            thresholds = self.domains[domain].get('thresholds', {})
        else:
            thresholds = self.config['default'].get('thresholds', {})
        
        # Map score to anomaly level
        if score < thresholds.get('minor_change', 0.02):
            return 'normal'
        elif score < thresholds.get('moderate_change', 0.05):
            return 'low'
        elif score < thresholds.get('major_change', 0.10):
            return 'medium'
        elif score < thresholds.get('critical_change', 0.15):
            return 'high'
        else:
            return 'critical'
    
    def _generate_interpretation(
        self, 
        score: float, 
        level: str,
        domain: str,
        multiplier: float
    ) -> Dict:
        """Generate human-readable interpretation of anomaly score"""
        domain_config = self.domains.get(domain, self.config['default'])
        domain_name = domain_config['name']
        
        # Level descriptions
        level_descriptions = {
            'normal': f"Normal activity patterns in {domain_name}",
            'low': f"Minor deviations detected in {domain_name}",
            'medium': f"Moderate anomalies detected in {domain_name}",
            'high': f"Significant anomalies detected in {domain_name}",
            'critical': f"Critical anomalies requiring immediate attention in {domain_name}"
        }
        
        # Action recommendations
        action_map = {
            'normal': "Continue routine monitoring",
            'low': "Note for trend analysis",
            'medium': "Schedule detailed review within 48 hours",
            'high': "Initiate investigation within 24 hours",
            'critical': "Immediate investigation required"
        }
        
        return {
            'description': level_descriptions.get(level, "Unknown anomaly level"),
            'recommended_action': action_map.get(level, "Review anomaly"),
            'domain_impact': f"Domain multiplier of {multiplier:.2f}x applied for {domain_name}",
            'score_percentile': self._calculate_percentile(score)
        }
    
    def _calculate_percentile(self, score: float) -> str:
        """Estimate percentile ranking of anomaly score"""
        # Simplified percentile calculation based on typical distribution
        if score < 0.02:
            return "Below 50th percentile (typical)"
        elif score < 0.05:
            return "50-75th percentile (slightly elevated)"
        elif score < 0.10:
            return "75-90th percentile (elevated)"
        elif score < 0.15:
            return "90-95th percentile (high)"
        elif score < 0.20:
            return "95-99th percentile (very high)"
        else:
            return "Above 99th percentile (extreme)"
    
    def batch_score(
        self,
        magnitudes: List[Tuple[str, float, Optional[str]]]
    ) -> List[Dict]:
        """
        Calculate anomaly scores for multiple AOIs
        
        Args:
            magnitudes: List of tuples (aoi_id, raw_magnitude, domain)
        
        Returns:
            List of anomaly score results
        """
        results = []
        
        for aoi_id, raw_magnitude, domain in magnitudes:
            score_result = self.calculate_anomaly_score(raw_magnitude, domain)
            score_result['aoi_id'] = aoi_id
            results.append(score_result)
        
        # Sort by anomaly score (highest first)
        results.sort(key=lambda x: x['anomaly_score'], reverse=True)
        
        return results
    
    def get_domain_multiplier(self, domain: str) -> float:
        """Get the weight multiplier for a specific domain"""
        return self.domain_multipliers.get(domain, 1.0)
    
    def get_all_multipliers(self) -> Dict[str, float]:
        """Get all domain multipliers"""
        return self.domain_multipliers.copy()
    
    def calculate_with_confidence(
        self,
        raw_magnitude: float,
        historical_observations: List[float],
        domain: Optional[str] = None,
        use_scaling: bool = True
    ) -> Dict:
        """
        Calculate anomaly score with confidence based on historical stability
        
        Args:
            raw_magnitude: Current magnitude observation
            historical_observations: List of previous magnitude observations
            domain: Domain type for specialized processing
            use_scaling: Whether to apply magnitude scaling
        
        Returns:
            Dictionary with anomaly score, confidence metrics, and combined assessment
        """
        # Use default domain if not specified
        if domain is None or domain not in self.domain_multipliers:
            domain = 'default'
        
        # Calculate confidence based on historical stability
        confidence_result = self.confidence_calculator.calculate_confidence(
            historical_observations,
            current_value=raw_magnitude,
            domain=domain
        )
        
        # Map confidence level to scoring confidence parameter
        confidence_map = {
            'very_high': 'high',
            'high': 'high',
            'medium': 'medium',
            'low': 'low',
            'very_low': 'low',
            'insufficient_data': 'low'
        }
        confidence_param = confidence_map.get(confidence_result['confidence_level'], 'medium')
        
        # Calculate anomaly score with appropriate method
        if use_scaling:
            anomaly_result = self.calculate_scaled_anomaly_score(
                raw_magnitude,
                domain=domain,
                confidence_level=confidence_param,
                historical_data=historical_observations
            )
        else:
            anomaly_result = self.calculate_anomaly_score(
                raw_magnitude,
                domain=domain,
                confidence_level=confidence_param
            )
        
        # Combine results
        combined_result = {
            **anomaly_result,
            'confidence': {
                'level': confidence_result['confidence_level'],
                'score': confidence_result['confidence_score'],
                'stability': confidence_result.get('stability_assessment', 'Unknown'),
                'observation_count': confidence_result['observation_count']
            },
            'confidence_metrics': confidence_result.get('metrics', {}),
            'combined_assessment': self._generate_combined_assessment(
                anomaly_result['anomaly_level'],
                confidence_result['confidence_level'],
                confidence_result['confidence_score']
            )
        }
        
        # Add reliability indicator
        combined_result['reliability'] = self._assess_reliability(
            confidence_result['confidence_score'],
            anomaly_result['anomaly_level']
        )
        
        return combined_result
    
    def _generate_combined_assessment(self, anomaly_level: str, confidence_level: str, confidence_score: float) -> Dict:
        """
        Generate combined assessment based on anomaly level and confidence
        """
        # Priority matrix for combined assessment
        if anomaly_level in ['critical', 'high']:
            if confidence_level in ['very_high', 'high']:
                priority = 'CRITICAL - High confidence anomaly detected'
                action = 'Immediate investigation required'
            elif confidence_level == 'medium':
                priority = 'HIGH - Anomaly detected with moderate confidence'
                action = 'Investigation recommended within 24 hours'
            else:
                priority = 'MEDIUM - Anomaly detected but low confidence'
                action = 'Monitor closely and gather more data'
        elif anomaly_level == 'medium':
            if confidence_level in ['very_high', 'high']:
                priority = 'MEDIUM - Confirmed moderate anomaly'
                action = 'Schedule review within 48 hours'
            else:
                priority = 'LOW - Uncertain moderate anomaly'
                action = 'Continue monitoring'
        else:  # normal or low
            if confidence_level in ['very_high', 'high']:
                priority = 'LOW - Normal behavior confirmed'
                action = 'Routine monitoring'
            else:
                priority = 'INFO - Normal behavior but uncertain'
                action = 'Gather more observations'
        
        return {
            'priority': priority,
            'recommended_action': action,
            'confidence_weight': round(confidence_score, 3),
            'requires_human_review': anomaly_level in ['critical', 'high'] or confidence_level in ['very_low', 'insufficient_data']
        }
    
    def _assess_reliability(self, confidence_score: float, anomaly_level: str) -> str:
        """
        Assess overall reliability of the anomaly detection
        """
        if confidence_score >= 0.7:
            return 'High reliability'
        elif confidence_score >= 0.5:
            if anomaly_level in ['critical', 'high']:
                return 'Moderate reliability - verify anomaly'
            else:
                return 'Moderate reliability'
        else:
            return 'Low reliability - insufficient data'


# Convenience function for quick scoring
def calculate_anomaly_score(
    raw_magnitude: float,
    aoi_id: str = None,
    domain: str = None
) -> Dict:
    """
    Quick anomaly scoring with domain auto-detection
    
    Args:
        raw_magnitude: Base magnitude from similarity calculation
        aoi_id: Optional AOI identifier for domain auto-detection
        domain: Explicit domain override
    
    Returns:
        Anomaly score results with interpretation
    """
    # Auto-detect domain if AOI provided but domain not specified
    if aoi_id and not domain:
        from weights_loader import detect_domain_from_aoi
        domain = detect_domain_from_aoi(aoi_id) or 'default'
    
    scorer = AnomalyScorer()
    return scorer.calculate_anomaly_score(raw_magnitude, domain)


# Enhanced scoring with historical context
def calculate_contextual_anomaly_score(
    current_magnitude: float,
    historical_magnitudes: List[float],
    domain: str = None
) -> Dict:
    """
    Calculate anomaly score with historical context
    
    Args:
        current_magnitude: Current observation magnitude
        historical_magnitudes: List of historical magnitude values
        domain: Domain type for weight multiplier
    
    Returns:
        Enhanced anomaly score with statistical context
    """
    scorer = AnomalyScorer()
    
    # Calculate basic anomaly score
    base_score = scorer.calculate_anomaly_score(current_magnitude, domain)
    
    if historical_magnitudes:
        # Calculate statistical measures
        mean_historical = sum(historical_magnitudes) / len(historical_magnitudes)
        
        # Standard deviation
        variance = sum((x - mean_historical) ** 2 for x in historical_magnitudes) / len(historical_magnitudes)
        std_dev = math.sqrt(variance)
        
        # Z-score for current magnitude
        if std_dev > 0:
            z_score = (current_magnitude - mean_historical) / std_dev
        else:
            z_score = 0
        
        # Deviation from historical norm
        deviation_factor = abs(current_magnitude - mean_historical) / (mean_historical + 0.001)
        
        # Adjust anomaly score based on historical context
        if abs(z_score) > 2:  # More than 2 standard deviations
            context_multiplier = 1.0 + (abs(z_score) - 2) * 0.1
            base_score['anomaly_score'] = min(1.0, base_score['anomaly_score'] * context_multiplier)
        
        # Add statistical context to result
        base_score['statistical_context'] = {
            'historical_mean': round(mean_historical, 4),
            'historical_std': round(std_dev, 4),
            'z_score': round(z_score, 2),
            'deviation_percentage': round(deviation_factor * 100, 1),
            'sample_size': len(historical_magnitudes)
        }
        
        # Update interpretation based on statistical significance
        if abs(z_score) > 3:
            base_score['interpretation']['statistical_significance'] = "Highly significant (>3σ)"
        elif abs(z_score) > 2:
            base_score['interpretation']['statistical_significance'] = "Significant (>2σ)"
        elif abs(z_score) > 1:
            base_score['interpretation']['statistical_significance'] = "Notable (>1σ)"
        else:
            base_score['interpretation']['statistical_significance'] = "Within normal range"
    
    return base_score


if __name__ == "__main__":
    # Test the anomaly scorer
    print("Testing Anomaly Scoring Module")
    print("=" * 60)
    
    scorer = AnomalyScorer()
    
    # Display domain multipliers
    print("\n1. Domain Multipliers:")
    multipliers = scorer.get_all_multipliers()
    for domain, multiplier in multipliers.items():
        print(f"   {domain}: {multiplier:.3f}x")
    
    # Test scoring for different domains
    print("\n2. Test Anomaly Scoring:")
    test_cases = [
        ("port-los-angeles", 0.15, "port"),
        ("farm-iowa", 0.12, "farm"),
        ("mine-chile", 0.18, "mine"),
        ("energy-texas", 0.10, "energy"),
        ("city-center", 0.08, None),  # Auto-detect
    ]
    
    for aoi_id, magnitude, domain in test_cases:
        result = calculate_anomaly_score(magnitude, aoi_id, domain)
        print(f"\n   AOI: {aoi_id}")
        print(f"   Raw Magnitude: {magnitude}")
        print(f"   Domain: {result['domain']}")
        print(f"   Anomaly Score: {result['anomaly_score']}")
        print(f"   Level: {result['anomaly_level']}")
        print(f"   Action: {result['interpretation']['recommended_action']}")
    
    # Test batch scoring
    print("\n3. Batch Scoring Test:")
    batch_data = [
        ("port-1", 0.05, "port"),
        ("farm-2", 0.12, "farm"),
        ("mine-3", 0.08, "mine"),
        ("energy-4", 0.15, "energy"),
    ]
    
    batch_results = scorer.batch_score(batch_data)
    print("\n   Top Anomalies (sorted by score):")
    for result in batch_results[:3]:
        print(f"   - {result['aoi_id']}: {result['anomaly_score']} ({result['anomaly_level']})")
    
    # Test contextual scoring
    print("\n4. Contextual Scoring Test:")
    historical = [0.05, 0.06, 0.04, 0.05, 0.07, 0.05]
    current = 0.15
    
    contextual_result = calculate_contextual_anomaly_score(current, historical, "port")
    print(f"   Current: {current}")
    print(f"   Historical Mean: {contextual_result['statistical_context']['historical_mean']}")
    print(f"   Z-Score: {contextual_result['statistical_context']['z_score']}")
    print(f"   Statistical Significance: {contextual_result['interpretation']['statistical_significance']}")
    
    # Test scaled anomaly scoring
    print("\n5. Scaled Anomaly Scoring Test:")
    test_domains = [
        ("port", 0.25, None),  # High magnitude, port domain
        ("farm", 0.25, [0.1, 0.12, 0.11, 0.13, 0.09]),  # With historical data
        ("mine", 0.15, None),  # Medium magnitude, mine domain
        ("energy", 0.35, None),  # Very high magnitude
        ("default", 0.20, None),  # Default domain
    ]
    
    for domain, magnitude, hist_data in test_domains:
        scaled_result = scorer.calculate_scaled_anomaly_score(
            magnitude, domain, confidence_level="high", historical_data=hist_data
        )
        print(f"\n   Domain: {domain}")
        print(f"   Raw Magnitude: {magnitude}")
        print(f"   Weighted Magnitude: {scaled_result['weighted_magnitude']}")
        print(f"   Scaled Score: {scaled_result['scaled_score']}")
        print(f"   Final Score: {scaled_result['anomaly_score']}")
        print(f"   Scaling Method: {scaled_result['scaling_method']}")
        print(f"   Level: {scaled_result['anomaly_level']}")
    
    # Test confidence-based scoring
    print("\n6. Confidence-Based Anomaly Scoring:")
    
    # Stable history with anomaly
    print("\n   a) Stable history with current anomaly:")
    stable_history = [0.10, 0.11, 0.10, 0.09, 0.11, 0.10, 0.10]
    current_anomaly = 0.25
    
    result = scorer.calculate_with_confidence(
        current_anomaly,
        stable_history,
        domain='port',
        use_scaling=True
    )
    
    print(f"      Historical: {stable_history}")
    print(f"      Current: {current_anomaly}")
    print(f"      Anomaly Score: {result['anomaly_score']}")
    print(f"      Anomaly Level: {result['anomaly_level']}")
    print(f"      Confidence: {result['confidence']['level']} ({result['confidence']['score']:.3f})")
    print(f"      Stability: {result['confidence']['stability']}")
    print(f"      Priority: {result['combined_assessment']['priority']}")
    print(f"      Action: {result['combined_assessment']['recommended_action']}")
    print(f"      Reliability: {result['reliability']}")
    
    # Unstable history with anomaly
    print("\n   b) Unstable history with anomaly:")
    unstable_history = [0.05, 0.15, 0.08, 0.20, 0.06, 0.18, 0.09]
    current_value = 0.25
    
    result = scorer.calculate_with_confidence(
        current_value,
        unstable_history,
        domain='farm',
        use_scaling=True
    )
    
    print(f"      Historical: {unstable_history}")
    print(f"      Current: {current_value}")
    print(f"      Anomaly Score: {result['anomaly_score']}")
    print(f"      Anomaly Level: {result['anomaly_level']}")
    print(f"      Confidence: {result['confidence']['level']} ({result['confidence']['score']:.3f})")
    print(f"      Stability: {result['confidence']['stability']}")
    print(f"      Priority: {result['combined_assessment']['priority']}")
    print(f"      Action: {result['combined_assessment']['recommended_action']}")
    print(f"      Reliability: {result['reliability']}")
    
    # Insufficient data
    print("\n   c) Insufficient historical data:")
    insufficient_history = [0.10, 0.12]
    
    result = scorer.calculate_with_confidence(
        0.15,
        insufficient_history,
        domain='mine',
        use_scaling=False
    )
    
    print(f"      Historical: {insufficient_history}")
    print(f"      Current: 0.15")
    print(f"      Confidence: {result['confidence']['level']}")
    print(f"      Priority: {result['combined_assessment']['priority']}")
    print(f"      Reliability: {result['reliability']}")
    
    print("\n" + "=" * 60)
    print("✅ Anomaly scoring module with confidence metrics ready for use!")
