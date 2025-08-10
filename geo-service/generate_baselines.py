"""
AlphaEarth Baseline Embedding Generator

This script generates and saves high-quality baseline embeddings for all AOIs
in the catalog. It simulates the output of a sophisticated model that creates
a unique fingerprint for each location based on historical satellite data.

This represents the 'up to 2024' baseline data.
"""

import json
import os
import numpy as np
from datetime import datetime

# Mock catalog of AOIs (would be loaded from a database in production)
AOI_CATALOG = {
    "port-los-angeles": {"name": "Port of Los Angeles", "type": "port"},
    "port-shanghai-yangshan": {"name": "Port of Shanghai (Yangshan)", "type": "port"},
    "port-rotterdam": {"name": "Port of Rotterdam", "type": "port"},
    "farm-iowa-cornbelt": {"name": "Iowa Corn Belt", "type": "farm"},
    "farm-central-valley": {"name": "California Central Valley", "type": "farm"},
    "farm-punjab-wheat": {"name": "Punjab Wheat Belt", "type": "farm"},
    "mine-escondida": {"name": "Escondida Copper Mine (Chile)", "type": "mine"},
    "mine-pilbara-iron": {"name": "Pilbara Iron Ore", "type": "mine"},
    "mine-grasberg": {"name": "Grasberg Mine", "type": "mine"},
    "energy-ghawar": {"name": "Ghawar Oil Field", "type": "energy"},
    "energy-permian-midland": {"name": "Permian Basin (Midland)", "type": "energy"},
    "energy-three-gorges": {"name": "Three Gorges Dam", "type": "energy"},
    # Added from global generator
    "port-santos": { "name": "Port of Santos", "type": "port" },
    "port-valparaiso": { "name": "Port of Valparaíso", "type": "port" },
    "port-san-antonio": { "name": "Port of San Antonio", "type": "port" },
    "mine-chuquicamata": { "name": "Chuquicamata", "type": "mine" },
    "mine-el-teniente": { "name": "El Teniente", "type": "mine" }
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output", "alphaearth")
YEAR = 2024

def generate_baseline_embedding(aoi_id: str, aoi_info: dict) -> dict:
    """
    Generates a unique, deterministic baseline embedding for an AOI.
    Uses the AOI ID and type to create a consistent hash, ensuring the
    same AOI always gets the same baseline.
    """
    # Create a deterministic seed from the AOI ID
    seed = int.from_bytes(aoi_id.encode(), 'little') % (2**32 - 1)
    np.random.seed(seed)
    
    # Base values for different AOI types
    base_values = {
        "port": {"NDVI_mean": 0.1, "NDWI_mean": 0.3, "B4_mean": 0.08, "B8_mean": 0.12},
        "farm": {"NDVI_mean": 0.7, "NDWI_mean": 0.1, "B4_mean": 0.05, "B8_mean": 0.45},
        "mine": {"NDVI_mean": 0.15, "NDWI_mean": -0.2, "B4_mean": 0.25, "B8_mean": 0.30},
        "energy": {"NDVI_mean": 0.2, "NDWI_mean": 0.0, "B4_mean": 0.15, "B8_mean": 0.20},
    }
    
    aoi_type = aoi_info.get("type", "port")
    base = base_values.get(aoi_type, base_values["port"])
    
    # Generate consistent random noise around the base values
    embedding = {
        "NDVI_mean": np.random.normal(base["NDVI_mean"], 0.05),
        "NDVI_stdDev": np.random.uniform(0.02, 0.08),
        "NDWI_mean": np.random.normal(base["NDWI_mean"], 0.05),
        "NDWI_stdDev": np.random.uniform(0.03, 0.1),
        "B4_mean": np.random.normal(base["B4_mean"], 0.02),
        "B8_mean": np.random.normal(base["B8_mean"], 0.03),
    }
    
    return {
        "aoi_id": aoi_id,
        "year": YEAR,
        "model": "AlphaEarth_v1_baseline",
        "generated_at": datetime.now().isoformat(),
        "bands": list(embedding.keys()),
        "values": embedding
    }

def main():
    """Main function to generate and save all baseline embeddings"""
    print(f"Generating AlphaEarth {YEAR} baseline embeddings...")
    
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created output directory: {OUTPUT_DIR}")
    
    count = 0
    for aoi_id, aoi_info in AOI_CATALOG.items():
        embedding_data = generate_baseline_embedding(aoi_id, aoi_info)
        
        file_path = os.path.join(OUTPUT_DIR, f"{aoi_id}_{YEAR}.json")
        
        with open(file_path, 'w') as f:
            json.dump(embedding_data, f, indent=4)
        
        count += 1
        print(f"  - Saved baseline for {aoi_id}")
    
    print(f"\nSuccessfully generated and saved {count} AlphaEarth baseline embeddings in:")
    print(OUTPUT_DIR)

if __name__ == "__main__":
    main()

