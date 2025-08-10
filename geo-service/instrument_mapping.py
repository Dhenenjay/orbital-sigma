"""
Instrument Mapping Module - Associates sensor/instrument data with anomaly observations
Provides context about the equipment, sensors, and data sources for each anomaly
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple, Set
from datetime import datetime, timedelta
from enum import Enum
import json
from pathlib import Path


class InstrumentType(Enum):
    """Types of instruments/sensors"""
    SATELLITE = "satellite"
    DRONE = "drone"
    GROUND_SENSOR = "ground_sensor"
    WEATHER_STATION = "weather_station"
    CAMERA = "camera"
    RADAR = "radar"
    LIDAR = "lidar"
    THERMAL = "thermal"
    MULTISPECTRAL = "multispectral"
    HYPERSPECTRAL = "hyperspectral"
    ACOUSTIC = "acoustic"
    SEISMIC = "seismic"
    UNKNOWN = "unknown"


class InstrumentStatus(Enum):
    """Operational status of instruments"""
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"
    CALIBRATING = "calibrating"
    ERROR = "error"


@dataclass
class Instrument:
    """Represents a single instrument or sensor"""
    instrument_id: str
    name: str
    type: InstrumentType
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    
    # Technical specifications
    resolution: Optional[Dict[str, Any]] = field(default_factory=dict)  # spatial, temporal, spectral
    bands: Optional[List[str]] = field(default_factory=list)  # spectral bands
    accuracy: Optional[float] = None  # accuracy rating 0-1
    precision: Optional[float] = None  # precision rating 0-1
    
    # Operational details
    status: InstrumentStatus = InstrumentStatus.OPERATIONAL
    location: Optional[Dict[str, float]] = field(default_factory=dict)  # lat, lon, alt
    coverage_area: Optional[Dict[str, Any]] = field(default_factory=dict)  # geographic coverage
    
    # Calibration and maintenance
    last_calibration: Optional[datetime] = None
    next_maintenance: Optional[datetime] = None
    operational_hours: float = 0.0
    
    # Data characteristics
    data_frequency: Optional[str] = None  # e.g., "hourly", "daily", "continuous"
    data_latency: Optional[float] = None  # latency in seconds
    data_quality_score: float = 1.0  # 0-1 quality score
    
    # Metadata
    installation_date: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def is_operational(self) -> bool:
        """Check if instrument is operational"""
        return self.status in [InstrumentStatus.OPERATIONAL, InstrumentStatus.DEGRADED]
    
    def needs_maintenance(self) -> bool:
        """Check if instrument needs maintenance"""
        if self.next_maintenance and datetime.utcnow() > self.next_maintenance:
            return True
        return self.status == InstrumentStatus.MAINTENANCE
    
    def get_quality_score(self) -> float:
        """Calculate overall quality score"""
        factors = []
        
        # Status factor
        status_scores = {
            InstrumentStatus.OPERATIONAL: 1.0,
            InstrumentStatus.DEGRADED: 0.7,
            InstrumentStatus.CALIBRATING: 0.8,
            InstrumentStatus.MAINTENANCE: 0.3,
            InstrumentStatus.OFFLINE: 0.0,
            InstrumentStatus.ERROR: 0.0
        }
        factors.append(status_scores.get(self.status, 0.5))
        
        # Data quality factor
        factors.append(self.data_quality_score)
        
        # Accuracy and precision factors
        if self.accuracy is not None:
            factors.append(self.accuracy)
        if self.precision is not None:
            factors.append(self.precision)
        
        # Calibration recency factor
        if self.last_calibration:
            days_since_calibration = (datetime.utcnow() - self.last_calibration).days
            calibration_factor = max(0.5, 1.0 - (days_since_calibration / 365))  # Degrades over a year
            factors.append(calibration_factor)
        
        return sum(factors) / len(factors) if factors else 0.5
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'instrument_id': self.instrument_id,
            'name': self.name,
            'type': self.type.value,
            'manufacturer': self.manufacturer,
            'model': self.model,
            'serial_number': self.serial_number,
            'resolution': self.resolution,
            'bands': self.bands,
            'accuracy': self.accuracy,
            'precision': self.precision,
            'status': self.status.value,
            'location': self.location,
            'coverage_area': self.coverage_area,
            'last_calibration': self.last_calibration.isoformat() if self.last_calibration else None,
            'next_maintenance': self.next_maintenance.isoformat() if self.next_maintenance else None,
            'operational_hours': self.operational_hours,
            'data_frequency': self.data_frequency,
            'data_latency': self.data_latency,
            'data_quality_score': self.data_quality_score,
            'installation_date': self.installation_date.isoformat() if self.installation_date else None,
            'quality_score': self.get_quality_score(),
            'metadata': self.metadata
        }


@dataclass
class InstrumentReading:
    """Represents a reading from an instrument"""
    instrument_id: str
    timestamp: datetime
    value: Any  # Can be scalar, vector, or complex data
    unit: Optional[str] = None
    quality_flag: Optional[str] = None  # Quality indicator for this reading
    confidence: float = 1.0  # Confidence in this specific reading
    processing_level: Optional[str] = None  # e.g., "raw", "L1", "L2", "processed"
    metadata: Dict[str, Any] = field(default_factory=dict)


class InstrumentRegistry:
    """Registry for managing instruments and their mappings"""
    
    def __init__(self, config_file: Optional[str] = None):
        """Initialize registry with optional configuration file"""
        self.instruments: Dict[str, Instrument] = {}
        self.aoi_mappings: Dict[str, Set[str]] = {}  # AOI ID -> Set of Instrument IDs
        self.domain_mappings: Dict[str, Set[str]] = {}  # Domain -> Set of Instrument IDs
        
        if config_file:
            self.load_config(config_file)
        else:
            self._initialize_default_instruments()
    
    def _initialize_default_instruments(self):
        """Initialize with default instrument configurations"""
        # Satellite instruments
        self.add_instrument(Instrument(
            instrument_id="SAT-SENTINEL2A",
            name="Sentinel-2A MSI",
            type=InstrumentType.SATELLITE,
            manufacturer="ESA",
            model="MultiSpectral Instrument",
            resolution={"spatial": 10, "temporal": 5, "unit": "meters/days"},
            bands=["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B9", "B10", "B11", "B12"],
            accuracy=0.95,
            precision=0.93,
            data_frequency="5 days",
            data_latency=3600,  # 1 hour
            data_quality_score=0.95
        ))
        
        self.add_instrument(Instrument(
            instrument_id="SAT-LANDSAT8",
            name="Landsat 8 OLI",
            type=InstrumentType.SATELLITE,
            manufacturer="NASA/USGS",
            model="Operational Land Imager",
            resolution={"spatial": 30, "temporal": 16, "unit": "meters/days"},
            bands=["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"],
            accuracy=0.92,
            precision=0.90,
            data_frequency="16 days",
            data_latency=7200,  # 2 hours
            data_quality_score=0.93
        ))
        
        # Drone instruments
        self.add_instrument(Instrument(
            instrument_id="DRONE-THERMAL-01",
            name="Thermal Imaging Drone",
            type=InstrumentType.DRONE,
            manufacturer="DJI",
            model="Matrice 300 RTK + H20T",
            resolution={"spatial": 0.5, "unit": "meters"},
            accuracy=0.88,
            precision=0.85,
            data_frequency="on-demand",
            data_latency=60,  # 1 minute
            data_quality_score=0.90
        ))
        
        # Ground sensors
        self.add_instrument(Instrument(
            instrument_id="GROUND-WEATHER-01",
            name="Weather Station Alpha",
            type=InstrumentType.WEATHER_STATION,
            manufacturer="Davis Instruments",
            model="Vantage Pro2",
            accuracy=0.95,
            precision=0.97,
            data_frequency="continuous",
            data_latency=1,  # 1 second
            data_quality_score=0.96,
            location={"lat": 34.0522, "lon": -118.2437, "alt": 71}
        ))
        
        # Camera systems
        self.add_instrument(Instrument(
            instrument_id="CAM-MULTISPECTRAL-01",
            name="Multispectral Camera System",
            type=InstrumentType.MULTISPECTRAL,
            manufacturer="MicaSense",
            model="RedEdge-MX",
            bands=["Blue", "Green", "Red", "RedEdge", "NIR"],
            resolution={"spatial": 8, "unit": "cm"},
            accuracy=0.90,
            precision=0.88,
            data_frequency="triggered",
            data_latency=10,
            data_quality_score=0.91
        ))
        
        # Initialize default mappings
        self._initialize_default_mappings()
    
    def _initialize_default_mappings(self):
        """Set up default AOI and domain mappings"""
        # Domain mappings
        self.domain_mappings["port"] = {"SAT-SENTINEL2A", "SAT-LANDSAT8", "CAM-MULTISPECTRAL-01"}
        self.domain_mappings["farm"] = {"SAT-SENTINEL2A", "DRONE-THERMAL-01", "GROUND-WEATHER-01"}
        self.domain_mappings["mine"] = {"SAT-LANDSAT8", "DRONE-THERMAL-01", "CAM-MULTISPECTRAL-01"}
        self.domain_mappings["energy"] = {"DRONE-THERMAL-01", "GROUND-WEATHER-01"}
        self.domain_mappings["default"] = {"SAT-SENTINEL2A"}
    
    def add_instrument(self, instrument: Instrument) -> None:
        """Add an instrument to the registry"""
        self.instruments[instrument.instrument_id] = instrument
    
    def remove_instrument(self, instrument_id: str) -> bool:
        """Remove an instrument from the registry"""
        if instrument_id in self.instruments:
            del self.instruments[instrument_id]
            # Clean up mappings
            for aoi_set in self.aoi_mappings.values():
                aoi_set.discard(instrument_id)
            for domain_set in self.domain_mappings.values():
                domain_set.discard(instrument_id)
            return True
        return False
    
    def get_instrument(self, instrument_id: str) -> Optional[Instrument]:
        """Get an instrument by ID"""
        return self.instruments.get(instrument_id)
    
    def map_aoi_to_instruments(self, aoi_id: str, instrument_ids: List[str]) -> None:
        """Map an AOI to specific instruments"""
        if aoi_id not in self.aoi_mappings:
            self.aoi_mappings[aoi_id] = set()
        self.aoi_mappings[aoi_id].update(instrument_ids)
    
    def get_instruments_for_aoi(self, aoi_id: str, domain: Optional[str] = None) -> List[Instrument]:
        """Get all instruments mapped to an AOI"""
        instrument_ids = set()
        
        # Get AOI-specific instruments
        if aoi_id in self.aoi_mappings:
            instrument_ids.update(self.aoi_mappings[aoi_id])
        
        # Add domain-specific instruments if domain provided
        if domain and domain in self.domain_mappings:
            instrument_ids.update(self.domain_mappings[domain])
        
        # If no specific mappings, use default
        if not instrument_ids and "default" in self.domain_mappings:
            instrument_ids = self.domain_mappings["default"]
        
        # Return instrument objects
        return [self.instruments[iid] for iid in instrument_ids if iid in self.instruments]
    
    def get_operational_instruments(self, instrument_ids: Optional[List[str]] = None) -> List[Instrument]:
        """Get only operational instruments"""
        if instrument_ids:
            instruments = [self.instruments[iid] for iid in instrument_ids if iid in self.instruments]
        else:
            instruments = list(self.instruments.values())
        
        return [inst for inst in instruments if inst.is_operational()]
    
    def get_best_instrument_for_domain(self, domain: str) -> Optional[Instrument]:
        """Get the highest quality instrument for a domain"""
        if domain not in self.domain_mappings:
            domain = "default"
        
        instrument_ids = self.domain_mappings.get(domain, set())
        if not instrument_ids:
            return None
        
        instruments = [self.instruments[iid] for iid in instrument_ids if iid in self.instruments]
        if not instruments:
            return None
        
        # Sort by quality score
        instruments.sort(key=lambda x: x.get_quality_score(), reverse=True)
        return instruments[0]
    
    def save_config(self, filepath: str) -> None:
        """Save registry configuration to file"""
        config = {
            'instruments': [inst.to_dict() for inst in self.instruments.values()],
            'aoi_mappings': {k: list(v) for k, v in self.aoi_mappings.items()},
            'domain_mappings': {k: list(v) for k, v in self.domain_mappings.items()}
        }
        
        with open(filepath, 'w') as f:
            json.dump(config, f, indent=2, default=str)
    
    def load_config(self, filepath: str) -> None:
        """Load registry configuration from file"""
        with open(filepath, 'r') as f:
            config = json.load(f)
        
        # Clear existing data
        self.instruments.clear()
        self.aoi_mappings.clear()
        self.domain_mappings.clear()
        
        # Load instruments
        for inst_data in config.get('instruments', []):
            # Parse dates
            for date_field in ['last_calibration', 'next_maintenance', 'installation_date']:
                if inst_data.get(date_field):
                    inst_data[date_field] = datetime.fromisoformat(inst_data[date_field])
            
            # Parse enum
            inst_data['type'] = InstrumentType(inst_data['type'])
            inst_data['status'] = InstrumentStatus(inst_data.get('status', 'operational'))
            
            # Remove computed fields
            inst_data.pop('quality_score', None)
            
            instrument = Instrument(**inst_data)
            self.add_instrument(instrument)
        
        # Load mappings
        self.aoi_mappings = {k: set(v) for k, v in config.get('aoi_mappings', {}).items()}
        self.domain_mappings = {k: set(v) for k, v in config.get('domain_mappings', {}).items()}


class InstrumentEnhancedObservation:
    """Enhanced observation with instrument mapping"""
    
    def __init__(self, observation: 'AOIObservation', registry: InstrumentRegistry):
        """
        Initialize with an AOI observation and instrument registry
        
        Args:
            observation: The base AOI observation
            registry: Instrument registry for mappings
        """
        self.observation = observation
        self.registry = registry
        self.instruments: List[Instrument] = []
        self.instrument_readings: Dict[str, InstrumentReading] = {}
        self.composite_quality_score: float = 0.0
        
        # Auto-map instruments
        self._map_instruments()
        self._calculate_composite_quality()
    
    def _map_instruments(self):
        """Map relevant instruments to this observation"""
        self.instruments = self.registry.get_instruments_for_aoi(
            self.observation.aoi_id,
            self.observation.domain
        )
    
    def _calculate_composite_quality(self):
        """Calculate composite quality score from all instruments"""
        if not self.instruments:
            self.composite_quality_score = 0.5
            return
        
        # Weight by instrument quality and operational status
        total_weight = 0.0
        weighted_sum = 0.0
        
        for instrument in self.instruments:
            quality = instrument.get_quality_score()
            weight = quality  # Use quality as weight
            
            weighted_sum += quality * weight
            total_weight += weight
        
        self.composite_quality_score = weighted_sum / total_weight if total_weight > 0 else 0.5
    
    def add_instrument_reading(self, reading: InstrumentReading):
        """Add a specific instrument reading"""
        self.instrument_readings[reading.instrument_id] = reading
    
    def get_primary_instrument(self) -> Optional[Instrument]:
        """Get the highest quality operational instrument"""
        operational = [inst for inst in self.instruments if inst.is_operational()]
        if not operational:
            return None
        
        return max(operational, key=lambda x: x.get_quality_score())
    
    def get_instrument_summary(self) -> Dict[str, Any]:
        """Get summary of all instruments"""
        return {
            'total_instruments': len(self.instruments),
            'operational_count': sum(1 for inst in self.instruments if inst.is_operational()),
            'primary_instrument': self.get_primary_instrument().name if self.get_primary_instrument() else None,
            'composite_quality': round(self.composite_quality_score, 3),
            'instruments': [
                {
                    'id': inst.instrument_id,
                    'name': inst.name,
                    'type': inst.type.value,
                    'status': inst.status.value,
                    'quality': round(inst.get_quality_score(), 3)
                }
                for inst in self.instruments
            ]
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with instrument data"""
        # Start with base observation data
        data = self.observation.to_dict(include_historical=False)
        
        # Add instrument information
        data['instruments'] = self.get_instrument_summary()
        
        # Add specific readings if available
        if self.instrument_readings:
            data['instrument_readings'] = [
                {
                    'instrument_id': reading.instrument_id,
                    'timestamp': reading.timestamp.isoformat(),
                    'value': reading.value,
                    'unit': reading.unit,
                    'quality_flag': reading.quality_flag,
                    'confidence': reading.confidence,
                    'processing_level': reading.processing_level
                }
                for reading in self.instrument_readings.values()
            ]
        
        # Add adjusted confidence based on instrument quality
        adjusted_confidence = self.observation.confidence_score * self.composite_quality_score
        data['adjusted_confidence'] = {
            'score': round(adjusted_confidence, 4),
            'instrument_quality_factor': round(self.composite_quality_score, 3),
            'original_confidence': self.observation.confidence_score,
            'combined_score': round(adjusted_confidence, 3)
        }
        
        return data
    
    def get_reliability_assessment(self) -> str:
        """Get enhanced reliability assessment including instrument quality"""
        base_reliability = self.observation.reliability
        
        if self.composite_quality_score >= 0.8:
            instrument_quality = "high quality instruments"
        elif self.composite_quality_score >= 0.6:
            instrument_quality = "moderate quality instruments"
        else:
            instrument_quality = "limited instrument quality"
        
        return f"{base_reliability} with {instrument_quality}"


# Convenience functions

def enhance_observation_with_instruments(
    observation: 'AOIObservation',
    registry: Optional[InstrumentRegistry] = None
) -> InstrumentEnhancedObservation:
    """
    Enhance an observation with instrument mapping
    
    Args:
        observation: Base AOI observation
        registry: Instrument registry (creates default if None)
    
    Returns:
        Enhanced observation with instrument data
    """
    if registry is None:
        registry = InstrumentRegistry()
    
    return InstrumentEnhancedObservation(observation, registry)


def create_instrument_from_config(config: Dict[str, Any]) -> Instrument:
    """Create an instrument from configuration dictionary"""
    # Parse enum types
    if 'type' in config:
        config['type'] = InstrumentType(config['type'])
    if 'status' in config:
        config['status'] = InstrumentStatus(config['status'])
    
    # Parse datetime fields
    for date_field in ['last_calibration', 'next_maintenance', 'installation_date']:
        if config.get(date_field):
            if isinstance(config[date_field], str):
                config[date_field] = datetime.fromisoformat(config[date_field])
    
    return Instrument(**config)


if __name__ == "__main__":
    # Test the instrument mapping system
    print("Testing Instrument Mapping System")
    print("=" * 60)
    
    # Create registry
    registry = InstrumentRegistry()
    
    # Display available instruments
    print("\n1. Available Instruments:")
    for inst_id, inst in registry.instruments.items():
        print(f"  - {inst.name} ({inst.type.value}): Quality={inst.get_quality_score():.2f}")
    
    # Test instrument mapping for different domains
    print("\n2. Domain Instrument Mappings:")
    for domain in ["port", "farm", "mine", "energy"]:
        best = registry.get_best_instrument_for_domain(domain)
        if best:
            print(f"  {domain}: Best instrument = {best.name}")
    
    # Create a sample observation and enhance it
    print("\n3. Enhanced Observation Test:")
    
    # Import AOI observation (mock for testing)
    from aoi_observation import AOIObservation
    
    # Create test observation
    obs = AOIObservation(
        aoi_id="port-rotterdam-001",
        raw_magnitude=0.25,
        domain="port"
    )
    obs.historical_magnitudes = [0.10, 0.11, 0.10, 0.09, 0.11]
    obs.process()
    
    # Enhance with instruments
    enhanced = InstrumentEnhancedObservation(obs, registry)
    
    print(f"\n  AOI: {obs.aoi_id}")
    print(f"  Domain: {obs.domain}")
    print(f"  Mapped Instruments: {len(enhanced.instruments)}")
    
    # Show instrument summary
    summary = enhanced.get_instrument_summary()
    print(f"\n  Instrument Summary:")
    print(f"    Total: {summary['total_instruments']}")
    print(f"    Operational: {summary['operational_count']}")
    print(f"    Primary: {summary['primary_instrument']}")
    print(f"    Composite Quality: {summary['composite_quality']}")
    
    # Add sample readings
    print("\n4. Adding Instrument Readings:")
    from datetime import datetime
    
    reading1 = InstrumentReading(
        instrument_id="SAT-SENTINEL2A",
        timestamp=datetime.utcnow(),
        value={"ndvi": 0.72, "ndwi": 0.45},
        unit="index",
        confidence=0.92,
        processing_level="L2A"
    )
    enhanced.add_instrument_reading(reading1)
    
    reading2 = InstrumentReading(
        instrument_id="SAT-LANDSAT8",
        timestamp=datetime.utcnow(),
        value={"surface_temp": 23.5},
        unit="celsius",
        confidence=0.88,
        processing_level="L2"
    )
    enhanced.add_instrument_reading(reading2)
    
    print(f"  Added {len(enhanced.instrument_readings)} readings")
    
    # Display enhanced data
    print("\n5. Enhanced Observation Data:")
    enhanced_data = enhanced.to_dict()
    
    import json
    print(json.dumps({
        'aoi_id': enhanced_data['aoi_id'],
        'anomaly': enhanced_data['anomaly'],
        'confidence': enhanced_data['confidence'],
        'instruments': enhanced_data['instruments'],
        'adjusted_confidence': enhanced_data['adjusted_confidence']
    }, indent=2))
    
    # Test reliability assessment
    print(f"\n6. Reliability Assessment:")
    print(f"  {enhanced.get_reliability_assessment()}")
    
    # Save configuration
    print("\n7. Saving Configuration:")
    registry.save_config("instrument_config.json")
    print("  Configuration saved to instrument_config.json")
    
    print("\n" + "=" * 60)
    print("✅ Instrument mapping system ready for use!")
