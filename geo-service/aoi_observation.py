"""
AOI Observation Model - Unified data structure for AOI metrics
Combines AOI ID, magnitude, confidence, domain, and related metrics into a single object
"""
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from enum import Enum
import json
import uuid
from pathlib import Path

# Import existing modules
from confidence_metrics import ConfidenceCalculator, ConfidenceLevel
from anomaly_scoring import AnomalyScorer
from magnitude_scaling import MagnitudeScaler, ScalingMethod
from instrument_mapping import InstrumentRegistry, InstrumentEnhancedObservation, InstrumentReading, Instrument


class ObservationStatus(Enum):
    """Status of the observation processing"""
    PENDING = "pending"
    PROCESSED = "processed"
    ANOMALY_DETECTED = "anomaly_detected"
    ERROR = "error"
    INSUFFICIENT_DATA = "insufficient_data"


@dataclass
class AOIObservation:
    """
    Unified observation object for an Area of Interest (AOI)
    Combines all relevant metrics and metadata into a single structure
    """
    # Core identifiers
    aoi_id: str
    observation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    # Magnitude data
    raw_magnitude: float = 0.0
    weighted_magnitude: Optional[float] = None
    scaled_magnitude: Optional[float] = None
    
    # Domain information
    domain: str = "default"
    domain_multiplier: float = 1.0
    
    # Confidence metrics
    confidence_level: str = "unknown"
    confidence_score: float = 0.0
    confidence_stability: str = "unknown"
    observation_count: int = 0
    
    # Anomaly scoring
    anomaly_score: float = 0.0
    anomaly_level: str = "normal"
    requires_attention: bool = False
    
    # Combined assessment
    priority: str = "LOW"
    recommended_action: str = "Continue monitoring"
    reliability: str = "unknown"
    
    # Historical context
    historical_magnitudes: List[float] = field(default_factory=list)
    statistical_context: Dict[str, Any] = field(default_factory=dict)
    
    # Metadata
    status: ObservationStatus = ObservationStatus.PENDING
    processing_time_ms: Optional[float] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate and initialize derived fields"""
        if not self.aoi_id:
            raise ValueError("AOI ID is required")
        
        if not 0.0 <= self.raw_magnitude <= 1.0:
            raise ValueError(f"Raw magnitude must be between 0 and 1, got {self.raw_magnitude}")
        
        # Auto-detect domain from AOI ID if not specified
        if self.domain == "default" and self.aoi_id:
            self.domain = self._detect_domain()
    
    def _detect_domain(self) -> str:
        """Detect domain from AOI ID pattern"""
        aoi_lower = self.aoi_id.lower()
        if "port" in aoi_lower:
            return "port"
        elif "farm" in aoi_lower or "agri" in aoi_lower:
            return "farm"
        elif "mine" in aoi_lower or "mining" in aoi_lower:
            return "mine"
        elif "energy" in aoi_lower or "power" in aoi_lower:
            return "energy"
        return "default"
    
    def process(
        self,
        anomaly_scorer: Optional[AnomalyScorer] = None,
        use_scaling: bool = True,
        instrument_registry: Optional[InstrumentRegistry] = None
    ) -> 'AOIObservation':
        """
        Process the observation to calculate all metrics
        
        Args:
            anomaly_scorer: Optional pre-initialized anomaly scorer
            use_scaling: Whether to apply magnitude scaling
        
        Returns:
            Self with all metrics calculated
        """
        start_time = datetime.utcnow()
        
        try:
            # Initialize scorer if not provided
            if anomaly_scorer is None:
                anomaly_scorer = AnomalyScorer()
            
            # Calculate anomaly score with confidence
            if len(self.historical_magnitudes) >= 3:
                result = anomaly_scorer.calculate_with_confidence(
                    self.raw_magnitude,
                    self.historical_magnitudes,
                    domain=self.domain,
                    use_scaling=use_scaling
                )
                
                # Update magnitude fields
                self.weighted_magnitude = result.get('weighted_magnitude', self.raw_magnitude)
                self.scaled_magnitude = result.get('scaled_score', self.raw_magnitude)
                
                # Update confidence fields
                self.confidence_level = result['confidence']['level']
                self.confidence_score = result['confidence']['score']
                self.confidence_stability = result['confidence']['stability']
                self.observation_count = result['confidence']['observation_count']
                
                # Update anomaly fields
                self.anomaly_score = result['anomaly_score']
                self.anomaly_level = result['anomaly_level']
                self.requires_attention = result.get('requires_attention', False)
                
                # Update assessment fields
                self.priority = result['combined_assessment']['priority'].split(' - ')[0]
                self.recommended_action = result['combined_assessment']['recommended_action']
                self.reliability = result['reliability']
                
                # Update domain multiplier
                self.domain_multiplier = result.get('domain_multiplier', 1.0)
                
                # Add statistical context if available
                if 'confidence_metrics' in result:
                    self.statistical_context = result['confidence_metrics']
                
                self.status = ObservationStatus.ANOMALY_DETECTED if self.requires_attention else ObservationStatus.PROCESSED
            
            else:
                # Insufficient historical data - just calculate basic anomaly score
                result = anomaly_scorer.calculate_anomaly_score(
                    self.raw_magnitude,
                    domain=self.domain
                )
                
                self.anomaly_score = result['anomaly_score']
                self.anomaly_level = result['anomaly_level']
                self.requires_attention = result.get('requires_attention', False)
                self.domain_multiplier = result.get('domain_multiplier', 1.0)
                
                self.confidence_level = "insufficient_data"
                self.confidence_score = 0.0
                self.observation_count = len(self.historical_magnitudes)
                self.reliability = "Low reliability - insufficient data"
                
                self.status = ObservationStatus.INSUFFICIENT_DATA
            
            # Calculate processing time
            self.processing_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            
        except Exception as e:
            self.status = ObservationStatus.ERROR
            self.error_message = str(e)
            self.processing_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        return self
    
    def add_historical_observation(self, magnitude: float) -> 'AOIObservation':
        """Add a historical magnitude observation"""
        if not 0.0 <= magnitude <= 1.0:
            raise ValueError(f"Magnitude must be between 0 and 1, got {magnitude}")
        self.historical_magnitudes.append(magnitude)
        self.observation_count = len(self.historical_magnitudes)
        return self
    
    def to_dict(self, include_historical: bool = True) -> Dict[str, Any]:
        """
        Convert observation to dictionary
        
        Args:
            include_historical: Whether to include historical magnitudes
        
        Returns:
            Dictionary representation of the observation
        """
        data = {
            # Identifiers
            'aoi_id': self.aoi_id,
            'observation_id': self.observation_id,
            'timestamp': self.timestamp.isoformat(),
            
            # Magnitude
            'magnitude': {
                'raw': round(self.raw_magnitude, 4),
                'weighted': round(self.weighted_magnitude, 4) if self.weighted_magnitude else None,
                'scaled': round(self.scaled_magnitude, 4) if self.scaled_magnitude else None
            },
            
            # Domain
            'domain': {
                'type': self.domain,
                'multiplier': round(self.domain_multiplier, 3)
            },
            
            # Confidence
            'confidence': {
                'level': self.confidence_level,
                'score': round(self.confidence_score, 4),
                'stability': self.confidence_stability,
                'observation_count': self.observation_count
            },
            
            # Anomaly
            'anomaly': {
                'score': round(self.anomaly_score, 4),
                'level': self.anomaly_level,
                'requires_attention': self.requires_attention
            },
            
            # Assessment
            'assessment': {
                'priority': self.priority,
                'action': self.recommended_action,
                'reliability': self.reliability
            },
            
            # Status
            'status': self.status.value,
            'processing_time_ms': round(self.processing_time_ms, 2) if self.processing_time_ms else None
        }
        
        # Optionally include historical data
        if include_historical and self.historical_magnitudes:
            data['historical'] = {
                'magnitudes': [round(m, 4) for m in self.historical_magnitudes],
                'count': len(self.historical_magnitudes)
            }
            if self.statistical_context:
                data['historical']['statistics'] = self.statistical_context
        
        # Include error if present
        if self.error_message:
            data['error'] = self.error_message
        
        # Include metadata if present
        if self.metadata:
            data['metadata'] = self.metadata
        
        return data
    
    def to_json(self, include_historical: bool = True, indent: int = 2) -> str:
        """Convert observation to JSON string"""
        return json.dumps(self.to_dict(include_historical), indent=indent)
    
    def get_summary(self) -> str:
        """Get a human-readable summary of the observation"""
        summary = f"AOI: {self.aoi_id}\n"
        summary += f"Domain: {self.domain} (multiplier: {self.domain_multiplier:.2f}x)\n"
        summary += f"Magnitude: {self.raw_magnitude:.4f}"
        
        if self.scaled_magnitude:
            summary += f" → {self.scaled_magnitude:.4f} (scaled)\n"
        else:
            summary += "\n"
        
        summary += f"Anomaly: {self.anomaly_level} (score: {self.anomaly_score:.4f})\n"
        summary += f"Confidence: {self.confidence_level} (score: {self.confidence_score:.3f})\n"
        summary += f"Priority: {self.priority}\n"
        summary += f"Action: {self.recommended_action}\n"
        summary += f"Reliability: {self.reliability}"
        
        return summary
    
    def is_anomalous(self, threshold: str = "medium") -> bool:
        """
        Check if observation is anomalous based on threshold
        
        Args:
            threshold: Minimum anomaly level ("low", "medium", "high", "critical")
        
        Returns:
            True if anomaly level meets or exceeds threshold
        """
        levels = ["normal", "low", "medium", "high", "critical"]
        if threshold not in levels:
            raise ValueError(f"Invalid threshold: {threshold}")
        
        threshold_index = levels.index(threshold)
        current_index = levels.index(self.anomaly_level)
        
        return current_index >= threshold_index
    
    def is_reliable(self, min_confidence: float = 0.5) -> bool:
        """Check if observation meets reliability threshold"""
        return self.confidence_score >= min_confidence
    
    def __str__(self) -> str:
        """String representation"""
        return (f"AOIObservation(aoi={self.aoi_id}, "
                f"magnitude={self.raw_magnitude:.3f}, "
                f"anomaly={self.anomaly_level}, "
                f"confidence={self.confidence_level})")
    
    def __repr__(self) -> str:
        """Detailed representation"""
        return self.__str__()
    
    def enhance_with_instruments(
        self,
        registry: Optional[InstrumentRegistry] = None
    ) -> InstrumentEnhancedObservation:
        """
        Enhance this observation with instrument mapping
        
        Args:
            registry: Instrument registry (creates default if None)
        
        Returns:
            InstrumentEnhancedObservation with instrument data
        """
        if registry is None:
            registry = InstrumentRegistry()
        
        return InstrumentEnhancedObservation(self, registry)


class AOIObservationBatch:
    """Manage and process multiple AOI observations as a batch"""
    
    def __init__(self, observations: Optional[List[AOIObservation]] = None):
        """Initialize batch with optional list of observations"""
        self.observations = observations or []
        self.anomaly_scorer = AnomalyScorer()
        self.processing_stats = {}
    
    def add(self, observation: AOIObservation) -> 'AOIObservationBatch':
        """Add an observation to the batch"""
        self.observations.append(observation)
        return self
    
    def create_and_add(
        self,
        aoi_id: str,
        magnitude: float,
        domain: Optional[str] = None,
        historical: Optional[List[float]] = None
    ) -> AOIObservation:
        """Create and add a new observation"""
        obs = AOIObservation(
            aoi_id=aoi_id,
            raw_magnitude=magnitude,
            domain=domain or "default",
            historical_magnitudes=historical or []
        )
        self.observations.append(obs)
        return obs
    
    def process_all(self, use_scaling: bool = True) -> 'AOIObservationBatch':
        """Process all observations in the batch"""
        start_time = datetime.utcnow()
        processed = 0
        errors = 0
        
        for obs in self.observations:
            if obs.status == ObservationStatus.PENDING:
                obs.process(self.anomaly_scorer, use_scaling)
                if obs.status == ObservationStatus.ERROR:
                    errors += 1
                else:
                    processed += 1
        
        # Calculate processing statistics
        self.processing_stats = {
            'total': len(self.observations),
            'processed': processed,
            'errors': errors,
            'processing_time_ms': (datetime.utcnow() - start_time).total_seconds() * 1000
        }
        
        return self
    
    def get_anomalies(self, threshold: str = "medium") -> List[AOIObservation]:
        """Get all observations that are anomalous"""
        return [obs for obs in self.observations if obs.is_anomalous(threshold)]
    
    def get_reliable_anomalies(
        self,
        anomaly_threshold: str = "medium",
        confidence_threshold: float = 0.5
    ) -> List[AOIObservation]:
        """Get anomalies that meet reliability threshold"""
        return [
            obs for obs in self.observations
            if obs.is_anomalous(anomaly_threshold) and obs.is_reliable(confidence_threshold)
        ]
    
    def sort_by_priority(self) -> 'AOIObservationBatch':
        """Sort observations by priority (highest first)"""
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
        self.observations.sort(
            key=lambda x: (priority_order.get(x.priority, 5), -x.anomaly_score)
        )
        return self
    
    def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics for the batch"""
        if not self.observations:
            return {}
        
        anomaly_scores = [obs.anomaly_score for obs in self.observations]
        confidence_scores = [obs.confidence_score for obs in self.observations]
        
        # Count by anomaly level
        anomaly_counts = {}
        for obs in self.observations:
            anomaly_counts[obs.anomaly_level] = anomaly_counts.get(obs.anomaly_level, 0) + 1
        
        # Count by confidence level
        confidence_counts = {}
        for obs in self.observations:
            confidence_counts[obs.confidence_level] = confidence_counts.get(obs.confidence_level, 0) + 1
        
        # Count by domain
        domain_counts = {}
        for obs in self.observations:
            domain_counts[obs.domain] = domain_counts.get(obs.domain, 0) + 1
        
        return {
            'total_observations': len(self.observations),
            'anomaly_statistics': {
                'mean_score': sum(anomaly_scores) / len(anomaly_scores),
                'max_score': max(anomaly_scores),
                'min_score': min(anomaly_scores),
                'counts_by_level': anomaly_counts
            },
            'confidence_statistics': {
                'mean_score': sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0,
                'counts_by_level': confidence_counts
            },
            'domain_distribution': domain_counts,
            'requiring_attention': sum(1 for obs in self.observations if obs.requires_attention),
            'processing_stats': self.processing_stats
        }
    
    def to_dataframe(self):
        """Convert batch to pandas DataFrame (if pandas is available)"""
        try:
            import pandas as pd
            
            data = []
            for obs in self.observations:
                data.append({
                    'aoi_id': obs.aoi_id,
                    'timestamp': obs.timestamp,
                    'raw_magnitude': obs.raw_magnitude,
                    'scaled_magnitude': obs.scaled_magnitude,
                    'domain': obs.domain,
                    'anomaly_score': obs.anomaly_score,
                    'anomaly_level': obs.anomaly_level,
                    'confidence_score': obs.confidence_score,
                    'confidence_level': obs.confidence_level,
                    'priority': obs.priority,
                    'requires_attention': obs.requires_attention
                })
            
            return pd.DataFrame(data)
        
        except ImportError:
            raise ImportError("pandas is required for DataFrame conversion")
    
    def save_to_json(self, filepath: str, include_historical: bool = True):
        """Save batch to JSON file"""
        data = {
            'timestamp': datetime.utcnow().isoformat(),
            'statistics': self.get_summary_stats(),
            'observations': [obs.to_dict(include_historical) for obs in self.observations]
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    @classmethod
    def load_from_json(cls, filepath: str) -> 'AOIObservationBatch':
        """Load batch from JSON file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        batch = cls()
        
        for obs_data in data.get('observations', []):
            # Reconstruct observation
            obs = AOIObservation(
                aoi_id=obs_data['aoi_id'],
                raw_magnitude=obs_data['magnitude']['raw'],
                domain=obs_data['domain']['type']
            )
            
            # Restore fields
            if 'historical' in obs_data:
                obs.historical_magnitudes = obs_data['historical']['magnitudes']
            
            # Process to recalculate metrics
            obs.process()
            batch.add(obs)
        
        return batch


# Convenience functions

def create_observation(
    aoi_id: str,
    magnitude: float,
    domain: Optional[str] = None,
    historical: Optional[List[float]] = None,
    auto_process: bool = True
) -> AOIObservation:
    """
    Quick function to create and optionally process an observation
    
    Args:
        aoi_id: Area of Interest identifier
        magnitude: Current magnitude value
        domain: Domain type (auto-detected if not provided)
        historical: Historical magnitude values
        auto_process: Whether to automatically process the observation
    
    Returns:
        AOIObservation object
    """
    obs = AOIObservation(
        aoi_id=aoi_id,
        raw_magnitude=magnitude,
        domain=domain or "default",
        historical_magnitudes=historical or []
    )
    
    if auto_process:
        obs.process()
    
    return obs


def batch_create_observations(
    data: List[Tuple[str, float, Optional[str], Optional[List[float]]]],
    auto_process: bool = True
) -> AOIObservationBatch:
    """
    Create multiple observations from tuples
    
    Args:
        data: List of (aoi_id, magnitude, domain, historical) tuples
        auto_process: Whether to automatically process all observations
    
    Returns:
        AOIObservationBatch object
    """
    batch = AOIObservationBatch()
    
    for item in data:
        aoi_id = item[0]
        magnitude = item[1]
        domain = item[2] if len(item) > 2 else None
        historical = item[3] if len(item) > 3 else None
        
        batch.create_and_add(aoi_id, magnitude, domain, historical)
    
    if auto_process:
        batch.process_all()
    
    return batch


if __name__ == "__main__":
    # Test the unified observation model
    print("Testing AOI Observation Model")
    print("=" * 60)
    
    # Test single observation
    print("\n1. Single Observation Test:")
    obs = AOIObservation(
        aoi_id="port-singapore-001",
        raw_magnitude=0.25,
        domain="port"
    )
    
    # Add historical data
    historical = [0.10, 0.11, 0.10, 0.09, 0.11, 0.10, 0.12, 0.10]
    for mag in historical:
        obs.add_historical_observation(mag)
    
    # Process observation
    obs.process()
    
    print(f"\nObservation Summary:")
    print(obs.get_summary())
    
    # Test JSON serialization
    print("\n2. JSON Representation:")
    print(obs.to_json(include_historical=False))
    
    # Test batch processing
    print("\n3. Batch Processing Test:")
    batch = AOIObservationBatch()
    
    # Add multiple observations
    test_data = [
        ("port-la-001", 0.15, "port", [0.10, 0.11, 0.10, 0.09, 0.11]),
        ("farm-iowa-002", 0.25, "farm", [0.12, 0.13, 0.11, 0.12, 0.14]),
        ("mine-chile-003", 0.18, "mine", [0.08, 0.09, 0.08, 0.10, 0.09]),
        ("energy-texas-004", 0.30, "energy", [0.15, 0.16, 0.14, 0.15, 0.17]),
        ("city-center-005", 0.08, None, [])  # Insufficient data case
    ]
    
    for aoi_id, mag, domain, hist in test_data:
        batch.create_and_add(aoi_id, mag, domain, hist)
    
    # Process all
    batch.process_all()
    
    # Get summary statistics
    stats = batch.get_summary_stats()
    print(f"\nBatch Statistics:")
    print(f"  Total Observations: {stats['total_observations']}")
    print(f"  Requiring Attention: {stats['requiring_attention']}")
    print(f"  Anomaly Levels: {stats['anomaly_statistics']['counts_by_level']}")
    print(f"  Confidence Levels: {stats['confidence_statistics']['counts_by_level']}")
    print(f"  Domain Distribution: {stats['domain_distribution']}")
    
    # Get reliable anomalies
    print("\n4. Reliable Anomalies:")
    reliable_anomalies = batch.get_reliable_anomalies(
        anomaly_threshold="medium",
        confidence_threshold=0.3
    )
    
    for obs in reliable_anomalies:
        print(f"  - {obs.aoi_id}: {obs.anomaly_level} (confidence: {obs.confidence_score:.3f})")
    
    # Sort by priority
    batch.sort_by_priority()
    print("\n5. Observations by Priority:")
    for obs in batch.observations[:3]:  # Top 3
        print(f"  - {obs.priority}: {obs.aoi_id} ({obs.anomaly_level}, {obs.recommended_action})")
    
    # Test convenience function
    print("\n6. Convenience Function Test:")
    quick_obs = create_observation(
        aoi_id="port-rotterdam-006",
        magnitude=0.22,
        historical=[0.10, 0.11, 0.10, 0.09, 0.11, 0.10]
    )
    print(f"  Created: {quick_obs}")
    print(f"  Status: {quick_obs.status.value}")
    print(f"  Anomaly: {quick_obs.anomaly_level}")
    print(f"  Confidence: {quick_obs.confidence_level}")
    
    print("\n" + "=" * 60)
    print("✅ AOI Observation model ready for use!")
