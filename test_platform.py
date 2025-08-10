"""
Test Script for Orbital Sigma Platform
Tests the integrated satellite anomaly detection and trading signal application
"""

import requests
import json
import time
from datetime import datetime

def test_health_checks():
    """Test all services are running"""
    print("=" * 60)
    print("🚀 ORBITAL SIGMA PLATFORM TEST")
    print("=" * 60)
    
    services = {
        "Frontend": "http://localhost:3000",
        "Geo-Service": "http://localhost:8080/health",
        "Live Feed": "http://localhost:8080/live/health"
    }
    
    print("\n1️⃣ SERVICE HEALTH CHECKS:")
    for name, url in services.items():
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                print(f"   ✅ {name:12} - Online")
            else:
                print(f"   ⚠️  {name:12} - Status {resp.status_code}")
        except:
            print(f"   ❌ {name:12} - Offline")

def test_live_feed():
    """Test live satellite feed with NRT anomaly detection"""
    print("\n2️⃣ LIVE SATELLITE FEED TEST:")
    
    payload = {
        "aoi_ids": ["port_singapore", "mine_chile_copper", "farm_brazil_soy"],
        "year": 2025,
        "baseline_year": 2024,
        "timeframe": "14d"
    }
    
    try:
        resp = requests.post("http://localhost:8080/live/fetch", json=payload)
        data = resp.json()
        
        if data.get("success"):
            metadata = data.get("metadata", {})
            anomalies = data.get("anomalies", [])
            
            print(f"   📡 AOIs Scanned:     {metadata.get('total_aois', 0)}")
            print(f"   🔍 Anomalies Found:  {metadata.get('anomalies_detected', 0)}")
            print(f"   📊 Detection Rate:   {metadata.get('detection_rate', 0)*100:.1f}%")
            print(f"   🛰️  GEE Status:       {metadata.get('gee_status', 'unknown')}")
            
            if anomalies:
                print("\n   🚨 ANOMALIES DETECTED:")
                for a in anomalies:
                    print(f"      • {a['aoi_name']}: {a['anomaly_level']} (confidence: {a['confidence']:.2f})")
        else:
            print("   ❌ Live feed request failed")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_anomaly_detection():
    """Test real-time anomaly detection for specific AOI"""
    print("\n3️⃣ ANOMALY DETECTION TEST:")
    
    payload = {
        "aoi_id": "port_singapore",
        "compare_with_baseline": True,
        "detection_mode": "realtime"
    }
    
    try:
        resp = requests.post("http://localhost:8080/live/anomaly/detect", json=payload)
        data = resp.json()
        
        if data.get("success"):
            print(f"   📍 AOI:              {data['aoi_id']}")
            print(f"   🎯 Anomaly:          {data['is_anomaly']}")
            print(f"   📈 Magnitude:        {data['magnitude']:.4f}")
            print(f"   🔮 Confidence:       {data['confidence']:.2%}")
            print(f"   🚦 Level:            {data['anomaly_level']}")
            print(f"   📅 Time Window:      {data['time_window']['current']['start']} to {data['time_window']['current']['end']}")
            print(f"   🛰️  Data Source:      {data['data_source']}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_intelligence_api():
    """Test intelligence signal generation"""
    print("\n4️⃣ INTELLIGENCE API TEST:")
    
    payload = {
        "query": "Show me unusual activity in Singapore port that could affect shipping rates",
        "includeEvidence": True
    }
    
    try:
        resp = requests.post("http://localhost:3000/api/intelligence/generate-signals", json=payload)
        if resp.status_code == 200:
            data = resp.json()
            
            print(f"   📝 Query:            {payload['query'][:50]}...")
            print(f"   💡 Signals Found:    {len(data.get('signals', []))}")
            
            if data.get('signals'):
                signal = data['signals'][0]
                print(f"\n   📊 SIGNAL DETAILS:")
                print(f"      • Type:         {signal.get('type', 'N/A')}")
                print(f"      • Confidence:   {signal.get('confidence', 0):.0%}")
                print(f"      • Direction:    {signal.get('direction', 'N/A')}")
        else:
            print(f"   ⚠️  API returned status {resp.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_platform_integration():
    """Test full platform integration"""
    print("\n5️⃣ PLATFORM INTEGRATION TEST:")
    
    # Test data flow from geo-service through backend to frontend
    steps = [
        ("Geo-Service AOIs", "http://localhost:8080/aois"),
        ("Frontend API", "http://localhost:3000/api/aois"),
        ("Satellite Evidence", "http://localhost:3000/api/intelligence/satellite-evidence"),
    ]
    
    for name, url in steps:
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                print(f"   ✅ {name:20} - Working")
            else:
                print(f"   ⚠️  {name:20} - Status {resp.status_code}")
        except:
            print(f"   ❌ {name:20} - Failed")

def main():
    """Run all platform tests"""
    
    # Run tests
    test_health_checks()
    test_live_feed()
    test_anomaly_detection()
    test_intelligence_api()
    test_platform_integration()
    
    print("\n" + "=" * 60)
    print("✨ PLATFORM TEST COMPLETE")
    print("=" * 60)
    
    print("\n📌 KEY FEATURES AVAILABLE:")
    print("   • Real-time satellite anomaly detection")
    print("   • Natural language query interface")
    print("   • Interactive world map with hot zones")
    print("   • Trading signal generation with evidence")
    print("   • Near real-time (NRT) Earth observation")
    print("   • Multi-domain analysis (ports, farms, mines, energy)")
    
    print("\n🌐 ACCESS THE APPLICATION:")
    print("   • Frontend:    http://localhost:3000/intelligence")
    print("   • Dashboard:   http://localhost:3000/dashboard")
    print("   • Geo-Service: http://localhost:8080")
    
    print("\n💡 TIP: The platform is now using simulated satellite data")
    print("   in mock mode. To use real Earth Engine data, configure")
    print("   GEE_SERVICE_ACCOUNT_JSON with proper credentials.")

if __name__ == "__main__":
    main()
