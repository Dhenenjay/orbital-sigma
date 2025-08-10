"""
Time window routes for domain-specific temporal configuration
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from time_window_manager import TimeWindowManager
from weights_loader import detect_domain_from_aoi

router = APIRouter(prefix="/time-windows", tags=["time-windows"])


class TimeWindowRequest(BaseModel):
    """Request model for time window queries"""
    domain: str
    year: int
    latitude: Optional[float] = None


@router.get("/info/{domain}")
def get_domain_time_info(
    domain: str,
    year: int = 2024,
    latitude: Optional[float] = None
) -> Dict[str, Any]:
    """
    Get time window configuration for a specific domain
    
    Args:
        domain: Domain type (port, farm, mine, energy, etc.)
        year: Target year for observations
        latitude: Optional latitude for regional adjustments
    
    Returns:
        Time window configuration including observation periods and methods
    """
    manager = TimeWindowManager()
    
    # Validate domain
    if domain not in manager.domains and domain != 'default':
        available = list(manager.domains.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unknown domain '{domain}'. Available: {available}"
        )
    
    # Get time windows
    windows = manager.get_time_windows(domain, year, latitude)
    priority_window = manager.get_priority_window(domain, year, latitude)
    
    # Get domain configuration
    domain_config = manager.domains.get(domain, manager.domains['default'])
    
    # Calculate total observation days
    total_days = 0
    for start, end in windows:
        from datetime import datetime
        start_date = datetime.strptime(start, "%Y-%m-%d")
        end_date = datetime.strptime(end, "%Y-%m-%d")
        total_days += (end_date - start_date).days + 1
    
    return {
        "domain": domain,
        "domain_name": domain_config['name'],
        "year": year,
        "latitude": latitude,
        "time_windows": windows,
        "priority_window": priority_window,
        "window_type": domain_config['window_type'],
        "observation_months": domain_config['months'],
        "priority_months": domain_config.get('priority_months', []),
        "total_observation_days": total_days,
        "aggregation_method": manager.get_aggregation_method(domain),
        "cloud_threshold": manager.get_cloud_threshold(domain),
        "update_frequency": manager.get_update_frequency(domain),
        "description": domain_config['description'],
        "notes": domain_config.get('notes', '')
    }


@router.get("/compare")
def compare_domain_windows(
    year: int = 2024,
    latitude: Optional[float] = None
) -> Dict[str, Any]:
    """
    Compare time windows across all domains
    
    Returns comparison of observation periods for all domain types
    """
    manager = TimeWindowManager()
    
    comparisons = {}
    for domain in manager.domains.keys():
        windows = manager.get_time_windows(domain, year, latitude)
        priority = manager.get_priority_window(domain, year, latitude)
        
        # Calculate coverage
        total_days = 0
        for start, end in windows:
            from datetime import datetime
            start_date = datetime.strptime(start, "%Y-%m-%d")
            end_date = datetime.strptime(end, "%Y-%m-%d")
            total_days += (end_date - start_date).days + 1
        
        comparisons[domain] = {
            "name": manager.domains[domain]['name'],
            "windows": windows,
            "priority_window": priority,
            "observation_days": total_days,
            "coverage_percentage": round((total_days / 365) * 100, 1),
            "aggregation": manager.get_aggregation_method(domain),
            "cloud_threshold": manager.get_cloud_threshold(domain)
        }
    
    # Sort by coverage percentage
    sorted_domains = sorted(
        comparisons.items(),
        key=lambda x: x[1]['observation_days'],
        reverse=True
    )
    
    return {
        "year": year,
        "latitude": latitude,
        "domains": dict(sorted_domains),
        "summary": {
            "full_year_domains": [d for d, info in comparisons.items() if info['observation_days'] >= 365],
            "seasonal_domains": [d for d, info in comparisons.items() if 90 <= info['observation_days'] < 365],
            "quarterly_domains": [d for d, info in comparisons.items() if info['observation_days'] < 90]
        }
    }


@router.get("/aoi/{aoi_id}")
def get_aoi_time_windows(
    aoi_id: str,
    year: int = 2024,
    latitude: Optional[float] = None
) -> Dict[str, Any]:
    """
    Get time windows for a specific AOI based on auto-detected domain
    
    Args:
        aoi_id: AOI identifier
        year: Target year
        latitude: Optional latitude override
    
    Returns:
        Time window configuration for the AOI's domain
    """
    # Auto-detect domain
    domain = detect_domain_from_aoi(aoi_id) or 'default'
    
    # Get time window info
    result = get_domain_time_info(domain, year, latitude)
    result['aoi_id'] = aoi_id
    result['detected_domain'] = domain
    
    return result


@router.get("/optimize")
def optimize_collection_schedule(
    domains: List[str],
    start_year: int = 2024,
    end_year: int = 2024,
    latitude: Optional[float] = None
) -> Dict[str, Any]:
    """
    Optimize data collection schedule for multiple domains
    
    Finds optimal collection dates that maximize coverage across domains
    """
    manager = TimeWindowManager()
    
    # Validate domains
    for domain in domains:
        if domain not in manager.domains:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown domain '{domain}'"
            )
    
    # Collect all time windows
    all_windows = {}
    for year in range(start_year, end_year + 1):
        year_windows = {}
        for domain in domains:
            windows = manager.get_time_windows(domain, year, latitude)
            priority = manager.get_priority_window(domain, year, latitude)
            year_windows[domain] = {
                'windows': windows,
                'priority': priority
            }
        all_windows[year] = year_windows
    
    # Find overlapping periods (simplified)
    optimal_periods = []
    for year, domain_windows in all_windows.items():
        # Find common months across domains
        common_months = set(range(1, 13))
        for domain in domains:
            domain_config = manager.domains[domain]
            domain_months = set(domain_config['months'])
            common_months = common_months.intersection(domain_months)
        
        if common_months:
            # Convert to date ranges
            for month in sorted(common_months):
                start, end = manager._month_to_dates(year, month)
                optimal_periods.append({
                    'year': year,
                    'month': month,
                    'start': start,
                    'end': end,
                    'domains_covered': domains
                })
    
    return {
        'domains': domains,
        'start_year': start_year,
        'end_year': end_year,
        'latitude': latitude,
        'optimal_collection_periods': optimal_periods,
        'recommendations': {
            'best_months': list(common_months) if 'common_months' in locals() else [],
            'collection_frequency': 'monthly' if len(optimal_periods) > 6 else 'quarterly'
        }
    }


@router.get("/calendar/{year}")
def get_observation_calendar(
    year: int = 2024,
    domain: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get observation calendar for the year
    
    Returns monthly breakdown of observation windows
    """
    manager = TimeWindowManager()
    
    if domain and domain not in manager.domains:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown domain '{domain}'"
        )
    
    calendar = {}
    domains_to_check = [domain] if domain else list(manager.domains.keys())
    
    for month in range(1, 13):
        month_name = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ][month - 1]
        
        observing_domains = []
        priority_domains = []
        
        for d in domains_to_check:
            domain_config = manager.domains[d]
            if month in domain_config['months']:
                observing_domains.append(d)
            if month in domain_config.get('priority_months', []):
                priority_domains.append(d)
        
        calendar[month_name] = {
            'month_number': month,
            'observing_domains': observing_domains,
            'priority_domains': priority_domains,
            'total_domains': len(observing_domains)
        }
    
    return {
        'year': year,
        'domain_filter': domain,
        'calendar': calendar,
        'summary': {
            'busiest_months': [
                m for m, d in calendar.items() 
                if d['total_domains'] == max(c['total_domains'] for c in calendar.values())
            ],
            'quietest_months': [
                m for m, d in calendar.items() 
                if d['total_domains'] == min(c['total_domains'] for c in calendar.values())
            ]
        }
    }
