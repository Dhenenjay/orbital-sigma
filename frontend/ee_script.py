
import ee
import sys
import json

def analyze_sentinel_data(aoi, start_date, end_date):
    """
    Analyzes Sentinel-2 data for a given area of interest (AOI) and date range.
    """
    try:
        ee.Initialize()
        collection = ee.ImageCollection('COPERNICUS/S2') \
            .filterBounds(aoi) \
            .filterDate(start_date, end_date) \
            .sort('CLOUDY_PIXEL_PERCENTAGE')
        
        image = collection.first()
        
        # Perform some basic analysis (e.g., calculate NDVI)
        nir = image.select('B8')
        red = image.select('B4')
        ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
        
        # Get the mean NDVI value for the AOI
        mean_ndvi = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=10
        ).get('NDVI')
        
        return mean_ndvi.getInfo()
    except Exception as e:
        return {'error': str(e)}

if __name__ == '__main__':
    # The first argument is the script name, so we slice from the second argument.
    args = sys.argv[1:]
    aoi = json.loads(args[0])
    start_date = args[1]
    end_date = args[2]

    # Define the AOI as an ee.Geometry object
    ee_aoi = ee.Geometry.Polygon(aoi['coordinates'])

    result = analyze_sentinel_data(ee_aoi, start_date, end_date)
    print(json.dumps(result))

