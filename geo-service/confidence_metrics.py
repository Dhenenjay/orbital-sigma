"""
Confidence metrics module for computing confidence based on magnitude stability
Analyzes consistency and variance across recent observations to determine reliability
"""
import math
import statistics
from typing import Dict, List, Optional, Tuple
from enum import Enum
from collections import deque
import numpy as np

class ConfidenceLevel(Enum):
    """Confidence level categories"""
    VERY_HIGH = "very_high"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    VERY_LOW = "very_low"
    INSUFFICIENT_DATA = "insufficient_data"


class StabilityMetrics:
    """Calculate stability metrics for magnitude observations"""
    
    @staticmethod
    def coefficient_of_variation(values: List[float]) -> float:
        """
        Calculate coefficient of variation (CV)
        Lower CV indicates higher stability
        
        Returns:
            CV value (std_dev / mean), lower is more stable
        """
        if not values or len(values) < 2:
            return float('inf')
        
        mean_val = statistics.mean(values)
        if abs(mean_val) < 1e-10:  # Avoid division by zero
            return float('inf')
        
        std_dev = statistics.stdev(values)
        return std_dev / abs(mean_val)
    
    @staticmethod
    def mean_absolute_deviation(values: List[float]) -> float:
        """
        Calculate Mean Absolute Deviation (MAD)
        More robust to outliers than standard deviation
        
        Returns:
            MAD value, lower indicates more stability
        """
        if not values:
            return float('inf')
        
        mean_val = statistics.mean(values)
        mad = sum(abs(v - mean_val) for v in values) / len(values)
        return mad
    
    @staticmethod
    def trend_stability(values: List[float]) -> float:
        """
        Measure trend stability using linear regression residuals
        
        Returns:
            R-squared value (0-1), higher indicates more stable trend
        """
        if len(values) < 3:
            return 0.0
        
        n = len(values)
        x = list(range(n))
        
        # Calculate linear regression
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if abs(denominator) < 1e-10:
            return 0.0
        
        slope = numerator / denominator
        intercept = y_mean - slope * x_mean
        
        # Calculate R-squared
        predicted = [slope * x[i] + intercept for i in range(n)]
        ss_res = sum((values[i] - predicted[i]) ** 2 for i in range(n))
        ss_tot = sum((values[i] - y_mean) ** 2 for i in range(n))
        
        if abs(ss_tot) < 1e-10:
            return 1.0  # Perfect fit (all values are the same)
        
        r_squared = 1 - (ss_res / ss_tot)
        return max(0.0, min(1.0, r_squared))
    
    @staticmethod
    def volatility_score(values: List[float], window_size: int = 3) -> float:
        """
        Calculate volatility using rolling window differences
        
        Returns:
            Volatility score (0-1), lower is more stable
        """
        if len(values) < window_size:
            return 1.0
        
        # Calculate rolling differences
        differences = []
        for i in range(len(values) - window_size + 1):
            window = values[i:i + window_size]
            window_range = max(window) - min(window)
            window_mean = sum(window) / len(window)
            
            if abs(window_mean) > 1e-10:
                normalized_range = window_range / abs(window_mean)
                differences.append(normalized_range)
        
        if not differences:
            return 1.0
        
        # Average normalized range across windows
        avg_volatility = sum(differences) / len(differences)
        
        # Normalize to 0-1 scale (using sigmoid-like function)
        return 1.0 / (1.0 + math.exp(-5 * (avg_volatility - 0.3)))
    
    @staticmethod
    def outlier_ratio(values: List[float], z_threshold: float = 2.0) -> float:
        """
        Calculate ratio of outliers in the data
        
        Returns:
            Ratio of outliers (0-1), lower is more stable
        """
        if len(values) < 3:
            return 0.0
        
        mean_val = statistics.mean(values)
        std_dev = statistics.stdev(values)
        
        if std_dev < 1e-10:
            return 0.0  # No variation, no outliers
        
        outliers = sum(1 for v in values if abs(v - mean_val) > z_threshold * std_dev)
        return outliers / len(values)


class ConfidenceCalculator:
    """Calculate confidence levels based on magnitude stability"""
    
    def __init__(self, min_observations: int = 3, max_observations: int = 30):
        """
        Initialize confidence calculator
        
        Args:
            min_observations: Minimum observations needed for confidence calculation
            max_observations: Maximum observations to consider (for efficiency)
        """
        self.min_observations = min_observations
        self.max_observations = max_observations
        self.metrics = StabilityMetrics()
        
        # Weight factors for different stability metrics
        self.metric_weights = {
            'cv': 0.25,           # Coefficient of variation
            'mad': 0.20,          # Mean absolute deviation
            'trend': 0.20,        # Trend stability
            'volatility': 0.20,   # Volatility score
            'outliers': 0.15      # Outlier ratio
        }
    
    def calculate_confidence(
        self,
        observations: List[float],
        current_value: Optional[float] = None,
        domain: Optional[str] = None
    ) -> Dict:
        """
        Calculate confidence based on magnitude stability
        
        Args:
            observations: List of recent magnitude observations
            current_value: Current magnitude value to assess
            domain: Optional domain for domain-specific thresholds
        
        Returns:
            Dictionary with confidence metrics and level
        """
        # Limit observations to max window
        if len(observations) > self.max_observations:
            observations = observations[-self.max_observations:]
        
        # Check minimum observations
        if len(observations) < self.min_observations:
            return {
                'confidence_level': ConfidenceLevel.INSUFFICIENT_DATA.value,
                'confidence_score': 0.0,
                'observation_count': len(observations),
                'metrics': {},
                'interpretation': f"Insufficient data (need at least {self.min_observations} observations)"
            }
        
        # Calculate stability metrics
        metrics = self._calculate_metrics(observations)
        
        # Calculate composite confidence score
        confidence_score = self._compute_confidence_score(metrics, domain)
        
        # Adjust for current value deviation if provided
        if current_value is not None:
            deviation_factor = self._assess_current_deviation(observations, current_value)
            confidence_score *= deviation_factor
        
        # Determine confidence level
        confidence_level = self._determine_confidence_level(confidence_score)
        
        # Generate interpretation
        interpretation = self._generate_interpretation(
            confidence_level,
            metrics,
            len(observations),
            current_value,
            observations
        )
        
        return {
            'confidence_level': confidence_level.value,
            'confidence_score': round(confidence_score, 4),
            'observation_count': len(observations),
            'metrics': {k: round(v, 4) for k, v in metrics.items()},
            'interpretation': interpretation,
            'stability_assessment': self._assess_stability(metrics)
        }
    
    def _calculate_metrics(self, observations: List[float]) -> Dict[str, float]:
        """Calculate all stability metrics"""
        return {
            'coefficient_variation': self.metrics.coefficient_of_variation(observations),
            'mean_absolute_deviation': self.metrics.mean_absolute_deviation(observations),
            'trend_stability': self.metrics.trend_stability(observations),
            'volatility_score': self.metrics.volatility_score(observations),
            'outlier_ratio': self.metrics.outlier_ratio(observations),
            'mean': statistics.mean(observations),
            'std_dev': statistics.stdev(observations) if len(observations) > 1 else 0.0,
            'min': min(observations),
            'max': max(observations),
            'range': max(observations) - min(observations)
        }
    
    def _compute_confidence_score(self, metrics: Dict[str, float], domain: Optional[str]) -> float:
        """
        Compute composite confidence score from metrics
        
        Returns:
            Confidence score (0-1), higher is more confident
        """
        # Domain-specific thresholds
        domain_thresholds = self._get_domain_thresholds(domain)
        
        # Score each metric (inverse for metrics where lower is better)
        scores = {}
        
        # Coefficient of variation (lower is better)
        cv = metrics['coefficient_variation']
        if cv == float('inf'):
            scores['cv'] = 0.0
        else:
            scores['cv'] = 1.0 / (1.0 + cv * domain_thresholds['cv_factor'])
        
        # Mean absolute deviation (lower is better)
        mad = metrics['mean_absolute_deviation']
        mean_val = metrics['mean']
        if mean_val > 0:
            normalized_mad = mad / mean_val
            scores['mad'] = 1.0 / (1.0 + normalized_mad * domain_thresholds['mad_factor'])
        else:
            scores['mad'] = 0.5
        
        # Trend stability (higher is better)
        scores['trend'] = metrics['trend_stability']
        
        # Volatility (lower is better)
        scores['volatility'] = 1.0 - metrics['volatility_score']
        
        # Outlier ratio (lower is better)
        scores['outliers'] = 1.0 - metrics['outlier_ratio']
        
        # Calculate weighted average
        total_weight = sum(self.metric_weights.values())
        confidence_score = sum(
            scores.get(key, 0.5) * weight 
            for key, weight in self.metric_weights.items()
        ) / total_weight
        
        return max(0.0, min(1.0, confidence_score))
    
    def _get_domain_thresholds(self, domain: Optional[str]) -> Dict[str, float]:
        """Get domain-specific threshold factors"""
        domain_configs = {
            'port': {
                'cv_factor': 5.0,    # More tolerant of variation
                'mad_factor': 8.0,
                'deviation_threshold': 0.15
            },
            'farm': {
                'cv_factor': 3.0,    # Moderate tolerance
                'mad_factor': 5.0,
                'deviation_threshold': 0.20
            },
            'mine': {
                'cv_factor': 4.0,
                'mad_factor': 6.0,
                'deviation_threshold': 0.18
            },
            'energy': {
                'cv_factor': 3.5,
                'mad_factor': 5.5,
                'deviation_threshold': 0.17
            },
            'default': {
                'cv_factor': 4.0,
                'mad_factor': 6.0,
                'deviation_threshold': 0.15
            }
        }
        
        return domain_configs.get(domain, domain_configs['default'])
    
    def _assess_current_deviation(self, observations: List[float], current_value: float) -> float:
        """
        Assess how much current value deviates from historical pattern
        
        Returns:
            Deviation factor (0-1), lower means less confidence
        """
        if not observations:
            return 1.0
        
        mean_val = statistics.mean(observations)
        std_dev = statistics.stdev(observations) if len(observations) > 1 else 0.0
        
        if std_dev < 1e-10:
            # No variation in history
            deviation = abs(current_value - mean_val)
            if deviation < 1e-10:
                return 1.0  # Perfect match
            else:
                return 0.5  # Any deviation is significant
        
        # Calculate z-score
        z_score = abs(current_value - mean_val) / std_dev
        
        # Convert z-score to confidence factor using sigmoid
        # z-score of 0 -> factor of 1.0
        # z-score of 2 -> factor of ~0.5
        # z-score of 3+ -> factor approaching 0
        factor = 1.0 / (1.0 + math.exp(1.5 * (z_score - 1.5)))
        
        return factor
    
    def _determine_confidence_level(self, score: float) -> ConfidenceLevel:
        """Determine confidence level from score"""
        if score >= 0.85:
            return ConfidenceLevel.VERY_HIGH
        elif score >= 0.70:
            return ConfidenceLevel.HIGH
        elif score >= 0.50:
            return ConfidenceLevel.MEDIUM
        elif score >= 0.30:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    
    def _assess_stability(self, metrics: Dict[str, float]) -> str:
        """Provide stability assessment based on metrics"""
        cv = metrics.get('coefficient_variation', float('inf'))
        volatility = metrics.get('volatility_score', 1.0)
        outliers = metrics.get('outlier_ratio', 0.0)
        
        if cv < 0.1 and volatility < 0.2 and outliers < 0.1:
            return "Highly stable"
        elif cv < 0.2 and volatility < 0.4 and outliers < 0.2:
            return "Stable"
        elif cv < 0.3 and volatility < 0.6:
            return "Moderately stable"
        elif cv < 0.5:
            return "Somewhat unstable"
        else:
            return "Highly unstable"
    
    def _generate_interpretation(
        self,
        level: ConfidenceLevel,
        metrics: Dict[str, float],
        obs_count: int,
        current_value: Optional[float],
        observations: List[float]
    ) -> str:
        """Generate human-readable interpretation"""
        interpretations = {
            ConfidenceLevel.VERY_HIGH: "Very high confidence - consistent and stable observations",
            ConfidenceLevel.HIGH: "High confidence - generally stable with minor variations",
            ConfidenceLevel.MEDIUM: "Medium confidence - moderate variability in observations",
            ConfidenceLevel.LOW: "Low confidence - significant variability detected",
            ConfidenceLevel.VERY_LOW: "Very low confidence - highly unstable or erratic patterns",
            ConfidenceLevel.INSUFFICIENT_DATA: f"Insufficient data for confidence assessment"
        }
        
        base_interpretation = interpretations[level]
        
        # Add specific insights
        insights = []
        
        cv = metrics.get('coefficient_variation', float('inf'))
        if cv != float('inf'):
            if cv < 0.1:
                insights.append("very low variation")
            elif cv > 0.5:
                insights.append("high variation")
        
        outliers = metrics.get('outlier_ratio', 0.0)
        if outliers > 0.2:
            insights.append(f"{int(outliers * 100)}% outliers detected")
        
        if current_value is not None and observations:
            mean_val = statistics.mean(observations)
            deviation_pct = abs(current_value - mean_val) / mean_val * 100 if mean_val != 0 else 0
            if deviation_pct > 20:
                insights.append(f"current value deviates {deviation_pct:.1f}% from mean")
        
        if insights:
            base_interpretation += f" ({', '.join(insights)})"
        
        return base_interpretation


class ConfidenceTracker:
    """Track and maintain confidence history for multiple entities"""
    
    def __init__(self, window_size: int = 30):
        """
        Initialize confidence tracker
        
        Args:
            window_size: Size of observation window to maintain
        """
        self.window_size = window_size
        self.observations = {}  # Dict of entity_id -> deque of observations
        self.calculator = ConfidenceCalculator()
    
    def add_observation(self, entity_id: str, magnitude: float, domain: Optional[str] = None):
        """Add a new observation for an entity"""
        if entity_id not in self.observations:
            self.observations[entity_id] = {
                'values': deque(maxlen=self.window_size),
                'domain': domain
            }
        
        self.observations[entity_id]['values'].append(magnitude)
        if domain:
            self.observations[entity_id]['domain'] = domain
    
    def get_confidence(self, entity_id: str, current_value: Optional[float] = None) -> Dict:
        """Get confidence metrics for an entity"""
        if entity_id not in self.observations:
            return {
                'confidence_level': ConfidenceLevel.INSUFFICIENT_DATA.value,
                'confidence_score': 0.0,
                'observation_count': 0,
                'metrics': {},
                'interpretation': "No observations available for this entity"
            }
        
        obs_data = self.observations[entity_id]
        observations_list = list(obs_data['values'])
        domain = obs_data.get('domain')
        
        return self.calculator.calculate_confidence(
            observations_list,
            current_value,
            domain
        )
    
    def batch_update(self, updates: List[Tuple[str, float, Optional[str]]]):
        """Batch update observations for multiple entities"""
        for entity_id, magnitude, domain in updates:
            self.add_observation(entity_id, magnitude, domain)
    
    def get_all_confidences(self) -> Dict[str, Dict]:
        """Get confidence metrics for all tracked entities"""
        results = {}
        for entity_id in self.observations:
            results[entity_id] = self.get_confidence(entity_id)
        return results
    
    def clear_entity(self, entity_id: str):
        """Clear observations for a specific entity"""
        if entity_id in self.observations:
            del self.observations[entity_id]
    
    def clear_all(self):
        """Clear all observations"""
        self.observations.clear()


# Convenience functions

def calculate_confidence(
    observations: List[float],
    current_value: Optional[float] = None,
    domain: Optional[str] = None
) -> Dict:
    """
    Quick function to calculate confidence from observations
    
    Args:
        observations: List of magnitude observations
        current_value: Current magnitude to assess
        domain: Optional domain type
    
    Returns:
        Confidence metrics dictionary
    """
    calculator = ConfidenceCalculator()
    return calculator.calculate_confidence(observations, current_value, domain)


def assess_stability(observations: List[float]) -> str:
    """
    Quick assessment of observation stability
    
    Args:
        observations: List of magnitude observations
    
    Returns:
        Stability assessment string
    """
    if len(observations) < 2:
        return "Insufficient data"
    
    metrics = StabilityMetrics()
    cv = metrics.coefficient_of_variation(observations)
    volatility = metrics.volatility_score(observations)
    
    if cv < 0.1 and volatility < 0.2:
        return "Highly stable"
    elif cv < 0.2 and volatility < 0.4:
        return "Stable"
    elif cv < 0.3 and volatility < 0.6:
        return "Moderately stable"
    elif cv < 0.5:
        return "Somewhat unstable"
    else:
        return "Highly unstable"


if __name__ == "__main__":
    # Test the confidence metrics module
    print("Testing Confidence Metrics Module")
    print("=" * 60)
    
    # Test with different stability patterns
    print("\n1. Stable observations (low variation):")
    stable_obs = [0.10, 0.11, 0.10, 0.09, 0.11, 0.10, 0.10, 0.11, 0.09, 0.10]
    result = calculate_confidence(stable_obs, current_value=0.10, domain='port')
    print(f"   Observations: {stable_obs}")
    print(f"   Confidence Level: {result['confidence_level']}")
    print(f"   Confidence Score: {result['confidence_score']}")
    print(f"   Stability: {result['stability_assessment']}")
    print(f"   Interpretation: {result['interpretation']}")
    
    print("\n2. Unstable observations (high variation):")
    unstable_obs = [0.05, 0.15, 0.08, 0.20, 0.06, 0.18, 0.09, 0.22, 0.07, 0.19]
    result = calculate_confidence(unstable_obs, current_value=0.25, domain='farm')
    print(f"   Observations: {unstable_obs}")
    print(f"   Confidence Level: {result['confidence_level']}")
    print(f"   Confidence Score: {result['confidence_score']}")
    print(f"   Stability: {result['stability_assessment']}")
    print(f"   Interpretation: {result['interpretation']}")
    
    print("\n3. Trending observations:")
    trending_obs = [0.10, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19]
    result = calculate_confidence(trending_obs, current_value=0.20, domain='energy')
    print(f"   Observations: {trending_obs}")
    print(f"   Confidence Level: {result['confidence_level']}")
    print(f"   Confidence Score: {result['confidence_score']}")
    print(f"   Stability: {result['stability_assessment']}")
    print(f"   Metrics: {result['metrics']}")
    
    print("\n4. Observations with outliers:")
    outlier_obs = [0.10, 0.11, 0.10, 0.35, 0.11, 0.10, 0.09, 0.10, 0.38, 0.11]
    result = calculate_confidence(outlier_obs, current_value=0.11, domain='mine')
    print(f"   Observations: {outlier_obs}")
    print(f"   Confidence Level: {result['confidence_level']}")
    print(f"   Confidence Score: {result['confidence_score']}")
    print(f"   Outlier Ratio: {result['metrics']['outlier_ratio']}")
    print(f"   Interpretation: {result['interpretation']}")
    
    print("\n5. Testing ConfidenceTracker:")
    tracker = ConfidenceTracker(window_size=10)
    
    # Add observations for multiple entities
    for i in range(12):
        tracker.add_observation('port-1', 0.10 + np.random.normal(0, 0.01), 'port')
        tracker.add_observation('farm-2', 0.15 + np.random.normal(0, 0.05), 'farm')
    
    print("\n   Entity: port-1")
    port_conf = tracker.get_confidence('port-1', current_value=0.12)
    print(f"   Confidence: {port_conf['confidence_level']} ({port_conf['confidence_score']:.3f})")
    print(f"   Observations: {port_conf['observation_count']}")
    
    print("\n   Entity: farm-2")
    farm_conf = tracker.get_confidence('farm-2', current_value=0.18)
    print(f"   Confidence: {farm_conf['confidence_level']} ({farm_conf['confidence_score']:.3f})")
    print(f"   Observations: {farm_conf['observation_count']}")
    
    print("\n6. Insufficient data test:")
    result = calculate_confidence([0.10, 0.11])  # Only 2 observations
    print(f"   Result: {result['confidence_level']}")
    print(f"   Interpretation: {result['interpretation']}")
    
    print("\n" + "=" * 60)
    print("✅ Confidence metrics module ready for use!")
