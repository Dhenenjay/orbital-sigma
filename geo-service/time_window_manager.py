"""
Time Window Manager for domain-specific temporal filtering in GEE
Optimizes satellite data collection based on domain characteristics
"""
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import ee

class TimeWindowManager:
    """Manages domain-specific time windows for optimal Earth observation"""
    
    def __init__(self, config_file: str = "time_windows.json"):
        """Initialize with time window configuration"""
        config_path = Path(__file__).parent / config_file
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        self.domains = self.config['domains']
        self.cloud_limits = self.config['cloud_filtering']['max_cloud_cover']
        self.compositing = self.config['temporal_compositing']
    
    def get_time_windows(
        self, 
        domain: str, 
        year: int,
        latitude: Optional[float] = None
    ) -> List[Tuple[str, str]]:
        """
        Get optimized time windows for a domain and year
        
        Args:
            domain: Domain type (port, farm, mine, energy, etc.)
            year: Target year for observations
            latitude: Optional latitude for hemisphere-specific adjustments
        
        Returns:
            List of (start_date, end_date) tuples for optimal observation windows
        """
        if domain not in self.domains:
            domain = 'default'
        
        domain_config = self.domains[domain]
        months = domain_config['months']
        
        # Check for regional adjustments (e.g., for farms)
        if 'regional_adjustments' in domain_config and latitude is not None:
            months = self._adjust_for_region(domain_config, latitude)
        
        # Convert months to date ranges
        windows = []
        for month in months:
            start_date, end_date = self._month_to_dates(year, month)
            windows.append((start_date, end_date))
        
        # Merge consecutive months into continuous windows
        windows = self._merge_consecutive_windows(windows)
        
        return windows
    
    def _adjust_for_region(
        self, 
        domain_config: Dict, 
        latitude: float
    ) -> List[int]:
        """Adjust months based on hemisphere/region"""
        adjustments = domain_config.get('regional_adjustments', {})
        
        # Determine region based on latitude
        if -23.5 <= latitude <= 23.5:
            region = 'tropical'
        elif latitude > 0:
            region = 'northern_hemisphere'
        else:
            region = 'southern_hemisphere'
        
        if region in adjustments:
            return adjustments[region]['months']
        
        return domain_config['months']
    
    def _month_to_dates(self, year: int, month: int) -> Tuple[str, str]:
        """Convert month number to start and end dates"""
        # Handle year wraparound for southern hemisphere
        actual_year = year
        if month <= 3:  # Jan, Feb, Mar might be from next year
            # Check if we're dealing with a southern hemisphere crop year
            # This is a simplification - in practice would need more context
            pass
        
        # Get last day of month
        if month in [1, 3, 5, 7, 8, 10, 12]:
            last_day = 31
        elif month in [4, 6, 9, 11]:
            last_day = 30
        else:  # February
            if actual_year % 4 == 0 and (actual_year % 100 != 0 or actual_year % 400 == 0):
                last_day = 29
            else:
                last_day = 28
        
        start_date = f"{actual_year}-{month:02d}-01"
        end_date = f"{actual_year}-{month:02d}-{last_day}"
        
        return start_date, end_date
    
    def _merge_consecutive_windows(
        self, 
        windows: List[Tuple[str, str]]
    ) -> List[Tuple[str, str]]:
        """Merge consecutive time windows into continuous periods"""
        if not windows:
            return windows
        
        # Sort windows by start date
        windows.sort(key=lambda x: x[0])
        
        merged = []
        current_start, current_end = windows[0]
        
        for start, end in windows[1:]:
            # Check if windows are consecutive
            current_end_date = datetime.strptime(current_end, "%Y-%m-%d")
            start_date = datetime.strptime(start, "%Y-%m-%d")
            
            if (start_date - current_end_date).days <= 1:
                # Merge windows
                current_end = end
            else:
                # Save current window and start new one
                merged.append((current_start, current_end))
                current_start, current_end = start, end
        
        merged.append((current_start, current_end))
        return merged
    
    def get_priority_window(
        self,
        domain: str,
        year: int,
        latitude: Optional[float] = None
    ) -> Tuple[str, str]:
        """
        Get the priority observation window for a domain
        
        Returns the most important time period for observations
        """
        if domain not in self.domains:
            domain = 'default'
        
        domain_config = self.domains[domain]
        priority_months = domain_config.get('priority_months', [6])
        
        # Adjust for region if needed
        if 'regional_adjustments' in domain_config and latitude is not None:
            adjustments = domain_config['regional_adjustments']
            
            if -23.5 <= latitude <= 23.5:
                region = 'tropical'
            elif latitude > 0:
                region = 'northern_hemisphere'
            else:
                region = 'southern_hemisphere'
            
            if region in adjustments:
                priority_months = adjustments[region].get('peak', priority_months)
        
        # Convert to date range
        if priority_months:
            start_month = min(priority_months)
            end_month = max(priority_months)
            
            start_date = f"{year}-{start_month:02d}-01"
            _, end_date = self._month_to_dates(year, end_month)
            
            return start_date, end_date
        
        # Fallback to mid-year
        return f"{year}-06-01", f"{year}-08-31"
    
    def get_cloud_threshold(self, domain: str) -> int:
        """Get maximum acceptable cloud cover for a domain"""
        return self.cloud_limits.get(domain, 30)
    
    def get_aggregation_method(self, domain: str) -> str:
        """Get recommended aggregation method for a domain"""
        method = self.compositing['recommended_by_domain'].get(domain, 'median')
        return method
    
    def get_gee_reducer(self, domain: str):
        """Get the appropriate Earth Engine reducer for the domain"""
        method = self.get_aggregation_method(domain)
        
        reducer_map = {
            'mean': ee.Reducer.mean(),
            'median': ee.Reducer.median(),
            'max': ee.Reducer.max(),
            'min': ee.Reducer.min(),
            'greenest': ee.Reducer.max(),  # For NDVI
            'clearest': ee.Reducer.min()   # For cloud score
        }
        
        return reducer_map.get(method, ee.Reducer.median())
    
    def apply_temporal_filter(
        self,
        collection: ee.ImageCollection,
        domain: str,
        year: int,
        latitude: Optional[float] = None
    ) -> ee.ImageCollection:
        """
        Apply domain-specific temporal filtering to an Earth Engine collection
        
        Args:
            collection: Earth Engine ImageCollection
            domain: Domain type
            year: Target year
            latitude: Optional latitude for regional adjustments
        
        Returns:
            Temporally filtered ImageCollection
        """
        windows = self.get_time_windows(domain, year, latitude)
        
        if not windows:
            # Fallback to full year
            return collection.filterDate(f"{year}-01-01", f"{year}-12-31")
        
        # Apply filters for each window
        filtered_collections = []
        for start_date, end_date in windows:
            filtered = collection.filterDate(start_date, end_date)
            filtered_collections.append(filtered)
        
        # Merge all filtered collections
        if len(filtered_collections) == 1:
            return filtered_collections[0]
        else:
            # Combine multiple collections
            merged = filtered_collections[0]
            for col in filtered_collections[1:]:
                merged = merged.merge(col)
            return merged
    
    def create_composite(
        self,
        collection: ee.ImageCollection,
        domain: str,
        cloud_band: Optional[str] = None
    ) -> ee.Image:
        """
        Create a temporal composite using domain-specific method
        
        Args:
            collection: Temporally filtered ImageCollection
            domain: Domain type
            cloud_band: Optional cloud band name for cloud filtering
        
        Returns:
            Composite image
        """
        method = self.get_aggregation_method(domain)
        
        # Apply cloud filtering if specified
        if cloud_band:
            cloud_threshold = self.get_cloud_threshold(domain)
            collection = collection.filter(
                ee.Filter.lt(cloud_band, cloud_threshold)
            )
        
        # Create composite based on method
        if method == 'greenest':
            # For vegetation, use max NDVI composite
            def add_ndvi(image):
                ndvi = image.normalizedDifference(['B5', 'B4']).rename('ndvi')
                return image.addBands(ndvi)
            
            with_ndvi = collection.map(add_ndvi)
            return with_ndvi.qualityMosaic('ndvi')
        
        elif method == 'clearest':
            # Use quality mosaic if cloud band available
            if cloud_band:
                return collection.qualityMosaic(cloud_band)
            else:
                return collection.median()
        
        else:
            # Use standard reducers
            reducer = self.get_gee_reducer(domain)
            return collection.reduce(reducer)
    
    def get_update_frequency(self, domain: str) -> str:
        """Get recommended update frequency for a domain"""
        return self.config['update_frequency'].get(domain, 'monthly')
    
    def suggest_collection_dates(
        self,
        domain: str,
        start_year: int,
        end_year: int,
        latitude: Optional[float] = None
    ) -> List[Dict]:
        """
        Suggest optimal collection dates for historical analysis
        
        Returns list of date ranges with metadata
        """
        suggestions = []
        
        for year in range(start_year, end_year + 1):
            windows = self.get_time_windows(domain, year, latitude)
            priority = self.get_priority_window(domain, year, latitude)
            
            suggestions.append({
                'year': year,
                'windows': windows,
                'priority_window': priority,
                'domain': domain,
                'aggregation': self.get_aggregation_method(domain),
                'cloud_threshold': self.get_cloud_threshold(domain),
                'update_frequency': self.get_update_frequency(domain)
            })
        
        return suggestions


# Convenience functions for integration

def get_optimal_time_window(
    domain: str,
    year: int,
    latitude: Optional[float] = None,
    priority_only: bool = False
) -> List[Tuple[str, str]]:
    """
    Get optimal time windows for a domain
    
    Args:
        domain: Domain type
        year: Target year
        latitude: Optional latitude for regional adjustments
        priority_only: Return only priority window
    
    Returns:
        List of (start_date, end_date) tuples
    """
    manager = TimeWindowManager()
    
    if priority_only:
        window = manager.get_priority_window(domain, year, latitude)
        return [window]
    else:
        return manager.get_time_windows(domain, year, latitude)


def filter_collection_by_domain(
    collection: ee.ImageCollection,
    domain: str,
    year: int,
    latitude: Optional[float] = None
) -> ee.ImageCollection:
    """
    Apply domain-specific temporal filtering to a collection
    
    Args:
        collection: Earth Engine ImageCollection
        domain: Domain type
        year: Target year
        latitude: Optional latitude
    
    Returns:
        Filtered ImageCollection
    """
    manager = TimeWindowManager()
    return manager.apply_temporal_filter(collection, domain, year, latitude)


def create_domain_composite(
    collection: ee.ImageCollection,
    domain: str,
    cloud_band: Optional[str] = None
) -> ee.Image:
    """
    Create a temporal composite using domain-specific method
    
    Args:
        collection: ImageCollection
        domain: Domain type
        cloud_band: Optional cloud band for filtering
    
    Returns:
        Composite image
    """
    manager = TimeWindowManager()
    return manager.create_composite(collection, domain, cloud_band)


if __name__ == "__main__":
    # Test the time window manager
    print("Testing Time Window Manager")
    print("=" * 60)
    
    manager = TimeWindowManager()
    
    # Test different domains
    test_cases = [
        ("port", 2024, None),
        ("farm", 2024, 45.0),  # Northern hemisphere
        ("farm", 2024, -35.0),  # Southern hemisphere
        ("mine", 2024, None),
        ("energy", 2024, None),
    ]
    
    for domain, year, lat in test_cases:
        print(f"\nDomain: {domain}, Year: {year}, Latitude: {lat}")
        
        # Get time windows
        windows = manager.get_time_windows(domain, year, lat)
        print(f"  Time windows: {windows}")
        
        # Get priority window
        priority = manager.get_priority_window(domain, year, lat)
        print(f"  Priority window: {priority}")
        
        # Get other settings
        print(f"  Cloud threshold: {manager.get_cloud_threshold(domain)}%")
        print(f"  Aggregation: {manager.get_aggregation_method(domain)}")
        print(f"  Update frequency: {manager.get_update_frequency(domain)}")
    
    print("\n" + "=" * 60)
    print("✅ Time window manager ready for use!")
