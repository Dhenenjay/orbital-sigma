"""
Mock GEE authentication for testing without real credentials
"""
import ee

class MockGEE:
    """Mock Earth Engine for testing"""
    
    @staticmethod
    def Number(val):
        class MockNumber:
            def getInfo(self):
                return val
        return MockNumber()
    
    @staticmethod
    def Geometry():
        class MockGeometry:
            @staticmethod
            def Rectangle(bbox):
                class Rect:
                    def getInfo(self):
                        return {"coordinates": [[
                            [bbox[0], bbox[1]],
                            [bbox[2], bbox[1]],
                            [bbox[2], bbox[3]],
                            [bbox[0], bbox[3]],
                            [bbox[0], bbox[1]]
                        ]]}
                return Rect()
        return MockGeometry
    
    @staticmethod
    def ImageCollection(asset_id):
        class MockCollection:
            def filterDate(self, start, end):
                return self
            
            def filterBounds(self, geom):
                return self
            
            def size(self):
                class Size:
                    def getInfo(self):
                        # Return mock data
                        return 10  # Mock: 10 images in collection
                return Size()
            
            def mean(self):
                return MockImage()
            
            def first(self):
                return MockImage()
        
        return MockCollection()
    
    @staticmethod
    def Image(img):
        return MockImage()
    
    @staticmethod
    def Reducer():
        class MockReducer:
            @staticmethod
            def mean():
                return "mean_reducer"
        return MockReducer

class MockImage:
    def bandNames(self):
        class BandNames:
            def getInfo(self):
                # Return mock band names
                return ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"]
        return BandNames()
    
    def reduceRegion(self, reducer=None, geometry=None, scale=None, maxPixels=None):
        class Stats:
            def getInfo(self):
                # Return mock statistics
                return {
                    "B1": 0.123,
                    "B2": 0.234,
                    "B3": 0.345,
                    "B4": 0.456,
                    "B5": 0.567,
                    "B6": 0.678,
                    "B7": 0.789,
                    "B8": 0.890
                }
        return Stats()
    
    def visualize(self, **params):
        return self
    
    def getThumbURL(self, params):
        # Return mock thumbnail URLs
        region = params.get("region", [])
        if "before" in str(region):
            return "https://via.placeholder.com/512x512/0000FF/FFFFFF?text=Before+Thumbnail"
        else:
            return "https://via.placeholder.com/512x512/00FF00/FFFFFF?text=After+Thumbnail"

def init_ee_mock():
    """Initialize mock Earth Engine for testing"""
    # Replace ee module methods with mocks
    global ee
    ee.Number = MockGEE.Number
    ee.Geometry = MockGEE.Geometry()
    ee.ImageCollection = MockGEE.ImageCollection
    ee.Image = MockGEE.Image
    ee.Reducer = MockGEE.Reducer()
    
    print("[MOCK] Earth Engine initialized with mock data")
    return {
        "initialized": True,
        "service_account_email": "mock@test.iam.gserviceaccount.com",
        "error": None
    }
