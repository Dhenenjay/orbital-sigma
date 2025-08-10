#!/usr/bin/env python3
"""
Check for AlphaEarth or custom embedding assets in your project
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'geo-service'))

from dotenv import load_dotenv
load_dotenv()

print("=" * 60)
print("🔍 CHECKING FOR ALPHAEARTH ASSETS")
print("=" * 60)

# Initialize GEE
from gee_auth import init_ee_from_service_account
info = init_ee_from_service_account()
print(f"\n✅ GEE initialized with: {info['service_account_email']}")

import ee

# Extract project ID from service account
project_id = info['service_account_email'].split('@')[1].split('.')[0]
print(f"📍 Your GCP Project: {project_id}")

print("\n🔍 Checking for AlphaEarth assets...")
print("\nAlphaEarth is a foundation model that generates embeddings from")
print("satellite imagery. The embeddings are typically 768-dimensional")
print("vectors that capture semantic information about the Earth's surface.")

# Check various AlphaEarth asset patterns
alphaearth_patterns = [
    f"projects/{project_id}/assets/alphaearth",
    f"projects/{project_id}/assets/alphaearth-embeddings",
    f"projects/{project_id}/assets/alphaearth-foundations",
    f"projects/{project_id}/assets/embeddings",
    
    # Check for shared AlphaEarth assets
    "projects/alphaearth/assets/embeddings",
    "projects/google-ai-earth/assets/alphaearth",
    "projects/earthengine-community/assets/projects/alphaearth",
    
    # Clay Foundation Model (alternative)
    "projects/clay-foundation/assets/clay-v001-embeddings",
    
    # Prithvi Foundation Model (NASA/IBM)
    "projects/ibm-nasa/assets/prithvi-100m",
]

found_assets = []

for asset_pattern in alphaearth_patterns:
    try:
        # Try as ImageCollection
        col = ee.ImageCollection(asset_pattern)
        size = col.size().getInfo()
        if size > 0:
            first = ee.Image(col.first())
            bands = first.bandNames().getInfo()
            print(f"\n✅ Found: {asset_pattern}")
            print(f"   Type: ImageCollection")
            print(f"   Images: {size}")
            print(f"   Embedding dimensions: {len(bands)}")
            found_assets.append(asset_pattern)
    except:
        try:
            # Try as single Image
            img = ee.Image(asset_pattern)
            bands = img.bandNames().getInfo()
            print(f"\n✅ Found: {asset_pattern}")
            print(f"   Type: Image")
            print(f"   Embedding dimensions: {len(bands)}")
            found_assets.append(asset_pattern)
        except:
            pass

if found_assets:
    print(f"\n🎉 Found {len(found_assets)} AlphaEarth asset(s)!")
    print(f"\n📝 Update your .env file:")
    print(f"   ALPHAEARTH_EMBEDDINGS_ASSET={found_assets[0]}")
else:
    print("\n⚠️  No AlphaEarth assets found in your project.")
    print("\n📌 SOLUTION: Using Sentinel-2 as embedding source")
    print("\nSentinel-2 provides excellent spectral features that can serve")
    print("as embeddings for change detection:")
    print("• 13 spectral bands (visible, NIR, SWIR)")
    print("• 10-60m spatial resolution")
    print("• 5-day revisit time")
    print("• Global coverage")
    
    print("\n✅ Your current configuration uses:")
    print("   ALPHAEARTH_EMBEDDINGS_ASSET=COPERNICUS/S2_SR_HARMONIZED")
    print("\nThis works perfectly for generating:")
    print("• Magnitude values (change detection)")
    print("• Before/after thumbnails")
    print("• Spectral embeddings")

print("\n" + "=" * 60)
print("📊 EMBEDDING APPROACH")
print("=" * 60)
print("""
Your system is configured to work with either:

1. **AlphaEarth Embeddings** (if available)
   - Pre-computed 768-dim embeddings
   - Semantic understanding of Earth features
   - Optimized for change detection

2. **Sentinel-2 Spectral Embeddings** (current)
   - 13 spectral bands as features
   - Direct physical measurements
   - Excellent for detecting:
     • Port activity changes
     • Agricultural cycles
     • Mining operations
     • Infrastructure development

Both approaches will generate the required:
✅ Magnitude (0-1 change score)
✅ Before/after thumbnails
✅ Baseline vectors for comparison
""")
