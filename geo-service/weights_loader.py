"""
Weights loader utility for caching domain-specific weights at startup
Provides singleton pattern for efficient weight access across the application
"""
import json
import os
from pathlib import Path
from typing import Dict, Optional, Any
import logging

# Configure logging
logger = logging.getLogger(__name__)

class WeightsManager:
    """Singleton manager for domain-specific weights"""
    
    _instance = None
    _weights_data = None
    _loaded = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WeightsManager, cls).__new__(cls)
        return cls._instance
    
    def load_weights(self, weights_file: str = None) -> Dict[str, Any]:
        """
        Load weights from JSON file into memory
        
        Args:
            weights_file: Path to weights.json file (optional)
                         Defaults to geo-service/weights.json
        
        Returns:
            Dictionary containing all weight configurations
        
        Raises:
            FileNotFoundError: If weights file doesn't exist
            json.JSONDecodeError: If weights file is invalid JSON
        """
        if self._loaded and self._weights_data:
            logger.info("Weights already loaded, returning cached data")
            return self._weights_data
        
        # Determine weights file path
        if weights_file is None:
            # Default to weights.json in the same directory
            weights_path = Path(__file__).parent / "weights.json"
        else:
            weights_path = Path(weights_file)
        
        # Check if file exists
        if not weights_path.exists():
            raise FileNotFoundError(f"Weights file not found: {weights_path}")
        
        try:
            # Load and parse JSON
            with open(weights_path, 'r', encoding='utf-8') as f:
                self._weights_data = json.load(f)
            
            # Validate structure
            self._validate_weights()
            
            # Mark as loaded
            self._loaded = True
            
            logger.info(f"Successfully loaded weights from {weights_path}")
            logger.info(f"Available domains: {list(self._weights_data.get('domains', {}).keys())}")
            
            return self._weights_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in weights file: {e}")
            raise
        except Exception as e:
            logger.error(f"Error loading weights: {e}")
            raise
    
    def _validate_weights(self):
        """Validate the structure of loaded weights"""
        required_keys = ['domains', 'default', 'version', 'embedding_dimensions']
        
        for key in required_keys:
            if key not in self._weights_data:
                raise ValueError(f"Missing required key in weights.json: {key}")
        
        # Validate embedding dimensions
        expected_dims = self._weights_data.get('embedding_dimensions', 64)
        
        # Check each domain has correct number of weights
        for domain_name, domain_config in self._weights_data['domains'].items():
            if 'weights' not in domain_config:
                raise ValueError(f"Domain '{domain_name}' missing 'weights' configuration")
            
            weights = domain_config['weights']
            if len(weights) != expected_dims:
                raise ValueError(
                    f"Domain '{domain_name}' has {len(weights)} weights, "
                    f"expected {expected_dims}"
                )
        
        # Validate default weights
        default_weights = self._weights_data['default'].get('weights', {})
        if len(default_weights) != expected_dims:
            raise ValueError(
                f"Default weights has {len(default_weights)} weights, "
                f"expected {expected_dims}"
            )
        
        logger.info("Weights validation successful")
    
    def get_domain_weights(self, domain: str) -> Dict[str, float]:
        """
        Get weights for a specific domain
        
        Args:
            domain: Domain name ('port', 'farm', 'mine', 'energy', etc.)
        
        Returns:
            Dictionary of band weights for the domain
        """
        if not self._loaded:
            self.load_weights()
        
        if domain in self._weights_data['domains']:
            return self._weights_data['domains'][domain]['weights']
        else:
            logger.warning(f"Domain '{domain}' not found, using default weights")
            return self._weights_data['default']['weights']
    
    def get_domain_config(self, domain: str) -> Dict[str, Any]:
        """
        Get complete configuration for a domain
        
        Args:
            domain: Domain name
        
        Returns:
            Complete domain configuration including weights, thresholds, etc.
        """
        if not self._loaded:
            self.load_weights()
        
        if domain in self._weights_data['domains']:
            return self._weights_data['domains'][domain]
        else:
            return self._weights_data['default']
    
    def get_all_domains(self) -> list:
        """Get list of all available domains"""
        if not self._loaded:
            self.load_weights()
        
        return list(self._weights_data['domains'].keys())
    
    def get_thresholds(self, domain: str) -> Dict[str, float]:
        """Get change thresholds for a specific domain"""
        config = self.get_domain_config(domain)
        return config.get('thresholds', {})
    
    def get_metadata(self) -> Dict[str, Any]:
        """Get metadata about the weights configuration"""
        if not self._loaded:
            self.load_weights()
        
        return self._weights_data.get('metadata', {})
    
    def reload_weights(self, weights_file: str = None):
        """Force reload weights from file"""
        self._loaded = False
        self._weights_data = None
        return self.load_weights(weights_file)
    
    def is_loaded(self) -> bool:
        """Check if weights are loaded"""
        return self._loaded


# Global singleton instance
_weights_manager = WeightsManager()


def load_weights(weights_file: str = None, force_reload: bool = False) -> Dict[str, Any]:
    """
    Load domain-specific weights from JSON file
    
    This is the main utility function to be called at startup.
    Uses singleton pattern to ensure weights are loaded only once.
    
    Args:
        weights_file: Optional path to weights.json file
        force_reload: Force reload even if weights are already cached
    
    Returns:
        Dictionary containing all weight configurations
    
    Example:
        >>> weights = load_weights()
        >>> port_weights = weights['domains']['port']['weights']
    """
    global _weights_manager
    
    if force_reload:
        logger.info("Force reloading weights")
        return _weights_manager.reload_weights(weights_file)
    
    return _weights_manager.load_weights(weights_file)


def get_domain_weights(domain: str) -> Dict[str, float]:
    """
    Get weights for a specific domain
    
    Args:
        domain: Domain name ('port', 'farm', 'mine', 'energy')
    
    Returns:
        Dictionary mapping band names (A00-A63) to weight values
    """
    global _weights_manager
    return _weights_manager.get_domain_weights(domain)


def get_domain_config(domain: str) -> Dict[str, Any]:
    """
    Get complete configuration for a domain
    
    Args:
        domain: Domain name
    
    Returns:
        Complete domain configuration including:
        - name: Human-readable domain name
        - description: Domain description
        - weights: Band weights
        - thresholds: Change detection thresholds
        - emphasis: What the domain emphasizes
    """
    global _weights_manager
    return _weights_manager.get_domain_config(domain)


def get_all_domains() -> list:
    """
    Get list of all available domains
    
    Returns:
        List of domain names ['port', 'farm', 'mine', 'energy']
    """
    global _weights_manager
    return _weights_manager.get_all_domains()


def detect_domain_from_aoi(aoi_id: str) -> Optional[str]:
    """
    Auto-detect domain type from AOI identifier
    
    Args:
        aoi_id: AOI identifier (e.g., 'port-los-angeles', 'farm-iowa')
    
    Returns:
        Detected domain type or None if not detected
    """
    if not aoi_id:
        return None
        
    aoi_lower = aoi_id.lower()
    
    # Port/Maritime keywords
    if any(kw in aoi_lower for kw in ['port', 'harbor', 'terminal', 'dock', 'wharf', 'pier']):
        return 'port'
    # Farm/Agriculture keywords
    elif any(kw in aoi_lower for kw in ['farm', 'agri', 'crop', 'field', 'ranch', 'plantation']):
        return 'farm'
    # Mining keywords
    elif any(kw in aoi_lower for kw in ['mine', 'mining', 'quarry', 'pit', 'extraction']):
        return 'mine'
    # Energy keywords
    elif any(kw in aoi_lower for kw in ['energy', 'power', 'solar', 'wind', 'oil', 'gas', 'refinery']):
        return 'energy'
    else:
        logger.info(f"Could not detect domain for AOI '{aoi_id}'")
        return None


def get_weights_for_aoi(aoi_id: str) -> Dict[str, float]:
    """
    Get appropriate weights for an AOI by auto-detecting its domain
    
    Args:
        aoi_id: AOI identifier
    
    Returns:
        Dictionary of band weights appropriate for the AOI's domain
    """
    domain = detect_domain_from_aoi(aoi_id) or 'default'
    return get_domain_weights(domain)


def is_weights_loaded() -> bool:
    """Check if weights have been loaded into memory"""
    global _weights_manager
    return _weights_manager.is_loaded()


# Convenience aliases for backward compatibility
auto_detect_domain = detect_domain_from_aoi
get_weights_by_domain = get_domain_weights
get_metadata = lambda: _weights_manager.get_metadata()
is_weights_loaded = is_weights_loaded

# Optional: Pre-load weights when module is imported
# Uncomment the following line to auto-load at import time
# load_weights()


if __name__ == "__main__":
    # Test the weights loader
    import logging
    logging.basicConfig(level=logging.INFO)
    
    print("Testing Weights Loader Utility")
    print("=" * 60)
    
    # Load weights
    print("\n1. Loading weights...")
    weights = load_weights()
    print(f"   ✅ Loaded version: {weights.get('version')}")
    print(f"   ✅ Embedding dimensions: {weights.get('embedding_dimensions')}")
    
    # Get available domains
    print("\n2. Available domains:")
    domains = get_all_domains()
    for domain in domains:
        config = get_domain_config(domain)
        print(f"   • {domain}: {config['name']}")
    
    # Test domain detection
    print("\n3. AOI domain detection:")
    test_aois = [
        "port-los-angeles",
        "farm-iowa-cornbelt",
        "mine-escondida",
        "energy-ghawar",
        "unknown-location"
    ]
    
    for aoi in test_aois:
        detected = detect_domain_from_aoi(aoi)
        print(f"   {aoi} → {detected}")
    
    # Test weight retrieval
    print("\n4. Sample weights for 'port' domain:")
    port_weights = get_domain_weights('port')
    sample_bands = ['A00', 'A01', 'A02', 'A10', 'A20']
    for band in sample_bands:
        print(f"   {band}: {port_weights.get(band, 1.0)}")
    
    # Test caching
    print("\n5. Testing cache:")
    print("   First load (already cached)...")
    weights2 = load_weights()
    print(f"   ✅ Weights loaded from cache: {weights2 is weights}")
    
    print("\n6. Testing force reload:")
    weights3 = load_weights(force_reload=True)
    print(f"   ✅ Weights reloaded: {weights3 is not weights}")
    
    print("\n" + "=" * 60)
    print("✅ Weights loader utility is working correctly!")
