"""
Magnitude scaling utilities for normalizing weighted values to 0-1 range
Provides sigmoid and min-max scaling to maintain consistent magnitude interpretation
"""
import math
from typing import Dict, List, Optional, Tuple
from enum import Enum

class ScalingMethod(Enum):
    """Available scaling methods for magnitude normalization"""
    SIGMOID = "sigmoid"
    MIN_MAX = "min_max"
    TANH = "tanh"
    ARCTAN = "arctan"
    LOG_SCALE = "log_scale"
    NONE = "none"


class MagnitudeScaler:
    """Scales weighted magnitudes back to 0-1 range using various methods"""
    
    def __init__(self, method: ScalingMethod = ScalingMethod.SIGMOID):
        """
        Initialize scaler with specified method
        
        Args:
            method: Scaling method to use (sigmoid, min_max, tanh, arctan, log_scale)
        """
        self.method = method
        
        # Domain-specific scaling parameters
        self.domain_params = {
            'port': {
                'sigmoid_k': 8.0,  # Steepness factor
                'sigmoid_x0': 0.15,  # Midpoint
                'min_max_range': (0.0, 0.3),  # Expected range for min-max
                'tanh_scale': 3.0
            },
            'farm': {
                'sigmoid_k': 10.0,
                'sigmoid_x0': 0.12,
                'min_max_range': (0.0, 0.25),
                'tanh_scale': 4.0
            },
            'mine': {
                'sigmoid_k': 7.0,
                'sigmoid_x0': 0.18,
                'min_max_range': (0.0, 0.35),
                'tanh_scale': 2.8
            },
            'energy': {
                'sigmoid_k': 9.0,
                'sigmoid_x0': 0.14,
                'min_max_range': (0.0, 0.28),
                'tanh_scale': 3.5
            },
            'default': {
                'sigmoid_k': 10.0,
                'sigmoid_x0': 0.1,
                'min_max_range': (0.0, 0.2),
                'tanh_scale': 5.0
            }
        }
    
    def scale(
        self, 
        value: float, 
        domain: str = 'default',
        custom_params: Optional[Dict] = None
    ) -> float:
        """
        Scale a magnitude value to 0-1 range
        
        Args:
            value: Raw weighted magnitude
            domain: Domain type for domain-specific parameters
            custom_params: Optional custom scaling parameters
        
        Returns:
            Scaled value in 0-1 range
        """
        if self.method == ScalingMethod.NONE:
            return min(1.0, max(0.0, value))
        
        # Get domain-specific parameters
        params = self.domain_params.get(domain, self.domain_params['default'])
        if custom_params:
            params.update(custom_params)
        
        # Apply selected scaling method
        if self.method == ScalingMethod.SIGMOID:
            return self._sigmoid_scale(value, params)
        elif self.method == ScalingMethod.MIN_MAX:
            return self._min_max_scale(value, params)
        elif self.method == ScalingMethod.TANH:
            return self._tanh_scale(value, params)
        elif self.method == ScalingMethod.ARCTAN:
            return self._arctan_scale(value, params)
        elif self.method == ScalingMethod.LOG_SCALE:
            return self._log_scale(value, params)
        else:
            return min(1.0, max(0.0, value))
    
    def _sigmoid_scale(self, value: float, params: Dict) -> float:
        """
        Apply sigmoid (logistic) scaling
        S(x) = 1 / (1 + exp(-k*(x-x0)))
        
        Where:
        - k controls steepness
        - x0 is the midpoint (value that maps to 0.5)
        """
        k = params.get('sigmoid_k', 10.0)
        x0 = params.get('sigmoid_x0', 0.1)
        
        try:
            scaled = 1.0 / (1.0 + math.exp(-k * (value - x0)))
        except OverflowError:
            # Handle extreme values
            scaled = 1.0 if value > x0 else 0.0
        
        return max(0.0, min(1.0, scaled))
    
    def _min_max_scale(self, value: float, params: Dict) -> float:
        """
        Apply min-max normalization
        Scales value from expected range to 0-1
        """
        min_val, max_val = params.get('min_max_range', (0.0, 0.2))
        
        if max_val <= min_val:
            return 0.5  # Invalid range, return middle value
        
        scaled = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, scaled))
    
    def _tanh_scale(self, value: float, params: Dict) -> float:
        """
        Apply hyperbolic tangent scaling
        Maps to 0-1 using (tanh(scale*x) + 1) / 2
        """
        scale = params.get('tanh_scale', 5.0)
        
        scaled = (math.tanh(scale * value) + 1.0) / 2.0
        return max(0.0, min(1.0, scaled))
    
    def _arctan_scale(self, value: float, params: Dict) -> float:
        """
        Apply arctangent scaling
        Maps to 0-1 using arctan normalization
        """
        scale = params.get('arctan_scale', 10.0)
        
        # arctan ranges from -π/2 to π/2
        # Normalize to 0-1
        scaled = (math.atan(scale * value) / math.pi) + 0.5
        return max(0.0, min(1.0, scaled))
    
    def _log_scale(self, value: float, params: Dict) -> float:
        """
        Apply logarithmic scaling
        Good for values with exponential growth
        """
        offset = params.get('log_offset', 1.0)
        scale = params.get('log_scale', 1.0)
        
        if value <= 0:
            return 0.0
        
        # log(1 + scale*x) / log(1 + scale)
        scaled = math.log(1 + scale * value) / math.log(1 + scale)
        return max(0.0, min(1.0, scaled))
    
    def batch_scale(
        self,
        values: List[float],
        domain: str = 'default',
        adaptive: bool = False
    ) -> List[float]:
        """
        Scale multiple values, optionally using adaptive scaling
        
        Args:
            values: List of raw magnitudes
            domain: Domain type
            adaptive: If True, adjust parameters based on value distribution
        
        Returns:
            List of scaled values
        """
        if not values:
            return []
        
        if adaptive and self.method == ScalingMethod.MIN_MAX:
            # Adaptive min-max based on actual data distribution
            min_val = min(values)
            max_val = max(values)
            
            # Add some padding to avoid edge effects
            range_padding = (max_val - min_val) * 0.1
            custom_params = {
                'min_max_range': (
                    max(0, min_val - range_padding),
                    max_val + range_padding
                )
            }
            
            return [self.scale(v, domain, custom_params) for v in values]
        else:
            return [self.scale(v, domain) for v in values]
    
    def get_inverse(self, scaled_value: float, domain: str = 'default') -> float:
        """
        Get the approximate raw value from a scaled value (inverse transform)
        
        Args:
            scaled_value: Scaled value in 0-1 range
            domain: Domain type
        
        Returns:
            Approximate raw value
        """
        if self.method == ScalingMethod.NONE:
            return scaled_value
        
        params = self.domain_params.get(domain, self.domain_params['default'])
        
        if self.method == ScalingMethod.SIGMOID:
            k = params.get('sigmoid_k', 10.0)
            x0 = params.get('sigmoid_x0', 0.1)
            
            # Inverse sigmoid: x = x0 - ln((1/y - 1)) / k
            if scaled_value <= 0:
                return 0
            elif scaled_value >= 1:
                return x0 * 2  # Return reasonable upper bound
            
            try:
                raw = x0 - math.log(1.0/scaled_value - 1.0) / k
            except (ValueError, ZeroDivisionError):
                raw = x0
            
            return max(0, raw)
        
        elif self.method == ScalingMethod.MIN_MAX:
            min_val, max_val = params.get('min_max_range', (0.0, 0.2))
            return min_val + scaled_value * (max_val - min_val)
        
        else:
            # For other methods, return approximate value
            return scaled_value * params.get('min_max_range', (0.0, 0.2))[1]
    
    def get_scaling_info(self, domain: str = 'default') -> Dict:
        """
        Get information about scaling parameters for a domain
        
        Returns:
            Dictionary with scaling method and parameters
        """
        params = self.domain_params.get(domain, self.domain_params['default'])
        
        return {
            'method': self.method.value,
            'domain': domain,
            'parameters': params,
            'description': self._get_method_description()
        }
    
    def _get_method_description(self) -> str:
        """Get human-readable description of scaling method"""
        descriptions = {
            ScalingMethod.SIGMOID: "Sigmoid (S-curve) scaling for smooth transitions",
            ScalingMethod.MIN_MAX: "Linear scaling within expected range",
            ScalingMethod.TANH: "Hyperbolic tangent scaling for symmetric distribution",
            ScalingMethod.ARCTAN: "Arctangent scaling for gradual saturation",
            ScalingMethod.LOG_SCALE: "Logarithmic scaling for exponential values",
            ScalingMethod.NONE: "No scaling applied (clamp to 0-1)"
        }
        return descriptions.get(self.method, "Unknown scaling method")


# Convenience functions

def scale_magnitude(
    value: float,
    domain: str = 'default',
    method: str = 'sigmoid'
) -> float:
    """
    Quick function to scale a magnitude value
    
    Args:
        value: Raw magnitude
        domain: Domain type
        method: Scaling method name
    
    Returns:
        Scaled value in 0-1 range
    """
    scaler_method = ScalingMethod(method) if method in [m.value for m in ScalingMethod] else ScalingMethod.SIGMOID
    scaler = MagnitudeScaler(scaler_method)
    return scaler.scale(value, domain)


def scale_magnitude_batch(
    values: List[float],
    domain: str = 'default',
    method: str = 'sigmoid',
    adaptive: bool = False
) -> List[float]:
    """
    Scale multiple magnitude values
    
    Args:
        values: List of raw magnitudes
        domain: Domain type
        method: Scaling method name
        adaptive: Use adaptive scaling based on distribution
    
    Returns:
        List of scaled values
    """
    scaler_method = ScalingMethod(method) if method in [m.value for m in ScalingMethod] else ScalingMethod.SIGMOID
    scaler = MagnitudeScaler(scaler_method)
    return scaler.batch_scale(values, domain, adaptive)


def compare_scaling_methods(
    value: float,
    domain: str = 'default'
) -> Dict[str, float]:
    """
    Compare different scaling methods for a value
    
    Args:
        value: Raw magnitude
        domain: Domain type
    
    Returns:
        Dictionary of scaled values by method
    """
    results = {}
    for method in ScalingMethod:
        if method != ScalingMethod.NONE:
            scaler = MagnitudeScaler(method)
            results[method.value] = scaler.scale(value, domain)
    
    return results


if __name__ == "__main__":
    # Test the magnitude scaler
    print("Testing Magnitude Scaling")
    print("=" * 60)
    
    # Test different scaling methods
    test_values = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5]
    
    print("\n1. Sigmoid Scaling (Port Domain):")
    scaler = MagnitudeScaler(ScalingMethod.SIGMOID)
    for val in test_values:
        scaled = scaler.scale(val, 'port')
        print(f"  {val:.2f} -> {scaled:.4f}")
    
    print("\n2. Min-Max Scaling (Farm Domain):")
    scaler = MagnitudeScaler(ScalingMethod.MIN_MAX)
    for val in test_values:
        scaled = scaler.scale(val, 'farm')
        print(f"  {val:.2f} -> {scaled:.4f}")
    
    print("\n3. Comparison of Methods (value=0.15):")
    comparison = compare_scaling_methods(0.15, 'mine')
    for method, scaled in comparison.items():
        print(f"  {method}: {scaled:.4f}")
    
    print("\n4. Adaptive Batch Scaling:")
    batch_values = [0.08, 0.12, 0.18, 0.22, 0.35]
    scaler = MagnitudeScaler(ScalingMethod.MIN_MAX)
    
    print("  Fixed scaling:", [f"{v:.3f}" for v in scaler.batch_scale(batch_values, 'energy', adaptive=False)])
    print("  Adaptive scaling:", [f"{v:.3f}" for v in scaler.batch_scale(batch_values, 'energy', adaptive=True)])
    
    print("\n5. Inverse Transform Test:")
    scaler = MagnitudeScaler(ScalingMethod.SIGMOID)
    original = 0.15
    scaled = scaler.scale(original, 'port')
    recovered = scaler.get_inverse(scaled, 'port')
    print(f"  Original: {original:.4f}")
    print(f"  Scaled: {scaled:.4f}")
    print(f"  Recovered: {recovered:.4f}")
    
    print("\n" + "=" * 60)
    print("✅ Magnitude scaling ready for use!")
