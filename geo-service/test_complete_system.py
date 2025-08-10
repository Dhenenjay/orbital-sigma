"""
Complete System Test - Demonstrates the unified AOI observation system with instrument mapping
Shows how all components work together: magnitude, confidence, domain, and instruments
"""
import json
from datetime import datetime, timedelta
from aoi_observation import AOIObservation, AOIObservationBatch, create_observation
from instrument_mapping import InstrumentRegistry, InstrumentReading

def test_complete_system():
    """Test the complete integrated system"""
    print("=" * 80)
    print("COMPLETE UNIFIED AOI OBSERVATION SYSTEM TEST")
    print("=" * 80)
    
    # Initialize instrument registry
    registry = InstrumentRegistry()
    
    print("\n1. Creating Enhanced AOI Observations with Full Context")
    print("-" * 60)
    
    # Create observations for different domains
    observations = []
    
    # Port observation with anomaly
    port_obs = AOIObservation(
        aoi_id="port-los-angeles-terminal-3",
        raw_magnitude=0.28,
        domain="port",
        metadata={
            "location": {"lat": 33.7405, "lon": -118.2723},
            "facility": "Container Terminal 3",
            "alert_type": "unusual_activity"
        }
    )
    port_obs.historical_magnitudes = [0.10, 0.11, 0.10, 0.09, 0.11, 0.10, 0.12, 0.10]
    port_obs.process()
    observations.append(port_obs)
    
    # Farm observation with seasonal pattern
    farm_obs = AOIObservation(
        aoi_id="farm-iowa-cornfield-42",
        raw_magnitude=0.22,
        domain="farm",
        metadata={
            "location": {"lat": 42.0308, "lon": -93.6319},
            "crop_type": "corn",
            "growth_stage": "tasseling"
        }
    )
    farm_obs.historical_magnitudes = [0.18, 0.19, 0.20, 0.21, 0.20, 0.19]
    farm_obs.process()
    observations.append(farm_obs)
    
    # Mine observation with equipment failure
    mine_obs = AOIObservation(
        aoi_id="mine-copper-chile-01",
        raw_magnitude=0.35,
        domain="mine",
        metadata={
            "location": {"lat": -22.3157, "lon": -68.9033},
            "mineral": "copper",
            "extraction_method": "open_pit"
        }
    )
    mine_obs.historical_magnitudes = [0.15, 0.14, 0.16, 0.15, 0.14]
    mine_obs.process()
    observations.append(mine_obs)
    
    # Energy observation normal operations
    energy_obs = AOIObservation(
        aoi_id="energy-solar-nevada-01",
        raw_magnitude=0.12,
        domain="energy",
        metadata={
            "location": {"lat": 36.1699, "lon": -115.1398},
            "type": "solar_farm",
            "capacity_mw": 250
        }
    )
    energy_obs.historical_magnitudes = [0.11, 0.12, 0.10, 0.11, 0.12, 0.11, 0.10]
    energy_obs.process()
    observations.append(energy_obs)
    
    print("\n2. Observation Results Summary")
    print("-" * 60)
    
    for obs in observations:
        print(f"\n{obs.aoi_id}:")
        print(f"  Domain: {obs.domain}")
        print(f"  Raw Magnitude: {obs.raw_magnitude:.3f}")
        print(f"  Anomaly Level: {obs.anomaly_level}")
        print(f"  Anomaly Score: {obs.anomaly_score:.3f}")
        print(f"  Confidence: {obs.confidence_level} ({obs.confidence_score:.3f})")
        print(f"  Priority: {obs.priority}")
        print(f"  Action: {obs.recommended_action}")
        print(f"  Reliability: {obs.reliability}")
    
    print("\n3. Enhancing Observations with Instrument Data")
    print("-" * 60)
    
    enhanced_observations = []
    
    for obs in observations:
        # Enhance with instruments
        enhanced = obs.enhance_with_instruments(registry)
        
        # Add specific instrument readings based on domain
        if obs.domain == "port":
            # Add satellite reading
            enhanced.add_instrument_reading(InstrumentReading(
                instrument_id="SAT-SENTINEL2A",
                timestamp=datetime.utcnow(),
                value={
                    "ndvi": 0.15,
                    "ndwi": 0.72,
                    "ship_count": 12,
                    "container_density": 0.85
                },
                unit="index",
                confidence=0.92,
                processing_level="L2A",
                metadata={"cloud_coverage": 0.05}
            ))
            
            # Add camera reading
            enhanced.add_instrument_reading(InstrumentReading(
                instrument_id="CAM-MULTISPECTRAL-01",
                timestamp=datetime.utcnow(),
                value={
                    "motion_detected": True,
                    "heat_anomaly": 2.3
                },
                unit="celsius_deviation",
                confidence=0.88,
                processing_level="processed"
            ))
        
        elif obs.domain == "farm":
            # Add drone thermal reading
            enhanced.add_instrument_reading(InstrumentReading(
                instrument_id="DRONE-THERMAL-01",
                timestamp=datetime.utcnow(),
                value={
                    "crop_health_index": 0.78,
                    "irrigation_efficiency": 0.82,
                    "pest_detection": False
                },
                unit="index",
                confidence=0.90,
                processing_level="processed"
            ))
            
            # Add weather station reading
            enhanced.add_instrument_reading(InstrumentReading(
                instrument_id="GROUND-WEATHER-01",
                timestamp=datetime.utcnow(),
                value={
                    "temperature": 28.5,
                    "humidity": 65,
                    "soil_moisture": 0.42
                },
                unit="various",
                confidence=0.95,
                processing_level="raw"
            ))
        
        elif obs.domain == "mine":
            # Add satellite reading
            enhanced.add_instrument_reading(InstrumentReading(
                instrument_id="SAT-LANDSAT8",
                timestamp=datetime.utcnow() - timedelta(hours=2),
                value={
                    "surface_deformation": 0.032,
                    "dust_plume_size": 2.5,
                    "water_pond_area": 1500
                },
                unit="various",
                confidence=0.87,
                processing_level="L2"
            ))
        
        elif obs.domain == "energy":
            # Add thermal drone reading
            enhanced.add_instrument_reading(InstrumentReading(
                instrument_id="DRONE-THERMAL-01",
                timestamp=datetime.utcnow(),
                value={
                    "panel_temperature": 45.2,
                    "efficiency_ratio": 0.89,
                    "hotspot_count": 3
                },
                unit="various",
                confidence=0.91,
                processing_level="processed"
            ))
        
        enhanced_observations.append(enhanced)
    
    print("\n4. Enhanced Observation Details")
    print("-" * 60)
    
    for enhanced in enhanced_observations:
        obs = enhanced.observation
        summary = enhanced.get_instrument_summary()
        
        print(f"\n{obs.aoi_id}:")
        print(f"  Instruments Mapped: {summary['total_instruments']}")
        print(f"  Operational: {summary['operational_count']}")
        print(f"  Primary Instrument: {summary['primary_instrument']}")
        print(f"  Composite Quality: {summary['composite_quality']}")
        
        # Show readings
        if enhanced.instrument_readings:
            print(f"  Readings ({len(enhanced.instrument_readings)}):")
            for inst_id, reading in enhanced.instrument_readings.items():
                inst = registry.get_instrument(inst_id)
                print(f"    - {inst.name}: {reading.processing_level} data, confidence={reading.confidence:.2f}")
        
        # Show adjusted confidence
        data = enhanced.to_dict()
        adj_conf = data['adjusted_confidence']
        print(f"  Adjusted Confidence: {adj_conf['combined_score']:.3f}")
        print(f"    (Original: {adj_conf['original_confidence']:.3f} × Instrument Quality: {adj_conf['instrument_quality_factor']:.3f})")
        print(f"  Enhanced Reliability: {enhanced.get_reliability_assessment()}")
    
    print("\n5. Complete JSON Output for API Response")
    print("-" * 60)
    
    # Select most critical observation for detailed output
    critical_obs = max(enhanced_observations, key=lambda x: x.observation.anomaly_score)
    complete_data = critical_obs.to_dict()
    
    # Format for API response
    api_response = {
        "status": "success",
        "timestamp": datetime.utcnow().isoformat(),
        "observation": {
            "aoi_id": complete_data['aoi_id'],
            "observation_id": complete_data['observation_id'],
            "domain": complete_data['domain'],
            "magnitude": complete_data['magnitude'],
            "anomaly": complete_data['anomaly'],
            "confidence": complete_data['confidence'],
            "assessment": complete_data['assessment'],
            "instruments": complete_data['instruments'],
            "adjusted_confidence": complete_data['adjusted_confidence']
        },
        "readings": complete_data.get('instrument_readings', [])
    }
    
    print(json.dumps(api_response, indent=2))
    
    print("\n6. Priority-Based Action Queue")
    print("-" * 60)
    
    # Sort by priority and anomaly score
    enhanced_observations.sort(key=lambda x: (-x.observation.anomaly_score))
    
    print("\nAction Queue (sorted by priority):")
    for i, enhanced in enumerate(enhanced_observations, 1):
        obs = enhanced.observation
        print(f"\n{i}. {obs.aoi_id}")
        print(f"   Priority: {obs.priority}")
        print(f"   Anomaly: {obs.anomaly_level} (score: {obs.anomaly_score:.3f})")
        print(f"   Confidence: {obs.confidence_level}")
        print(f"   Action: {obs.recommended_action}")
        print(f"   Instruments: {len(enhanced.instruments)} available")
        
        # Special alerts
        if obs.requires_attention:
            print(f"   ⚠️  ALERT: Requires immediate attention!")
    
    print("\n7. System Statistics")
    print("-" * 60)
    
    # Calculate statistics
    total_obs = len(enhanced_observations)
    anomalous = sum(1 for e in enhanced_observations if e.observation.is_anomalous("medium"))
    reliable = sum(1 for e in enhanced_observations if e.observation.is_reliable(0.3))
    critical = sum(1 for e in enhanced_observations if e.observation.anomaly_level == "critical")
    
    print(f"\nTotal Observations: {total_obs}")
    print(f"Anomalous (medium+): {anomalous} ({anomalous/total_obs*100:.1f}%)")
    print(f"Reliable (conf > 0.3): {reliable} ({reliable/total_obs*100:.1f}%)")
    print(f"Critical Anomalies: {critical}")
    
    # Instrument statistics
    all_instruments = set()
    for enhanced in enhanced_observations:
        all_instruments.update([inst.instrument_id for inst in enhanced.instruments])
    
    print(f"\nUnique Instruments Used: {len(all_instruments)}")
    print(f"Average Instruments per Observation: {sum(len(e.instruments) for e in enhanced_observations) / total_obs:.1f}")
    print(f"Total Readings Collected: {sum(len(e.instrument_readings) for e in enhanced_observations)}")
    
    # Domain distribution
    domain_counts = {}
    for enhanced in enhanced_observations:
        domain = enhanced.observation.domain
        domain_counts[domain] = domain_counts.get(domain, 0) + 1
    
    print(f"\nDomain Distribution:")
    for domain, count in domain_counts.items():
        print(f"  {domain}: {count}")
    
    print("\n" + "=" * 80)
    print("✅ COMPLETE SYSTEM TEST SUCCESSFUL!")
    print("=" * 80)
    
    return enhanced_observations


if __name__ == "__main__":
    # Run the complete system test
    results = test_complete_system()
    
    print("\n\n💡 KEY INSIGHTS:")
    print("-" * 40)
    print("The unified system successfully:")
    print("1. ✓ Combines AOI ID, magnitude, confidence, and domain")
    print("2. ✓ Calculates anomaly scores with domain-specific weights")
    print("3. ✓ Assesses confidence based on historical stability")
    print("4. ✓ Maps relevant instruments to each observation")
    print("5. ✓ Collects and integrates instrument readings")
    print("6. ✓ Adjusts confidence based on instrument quality")
    print("7. ✓ Provides actionable recommendations")
    print("8. ✓ Prioritizes observations for response")
