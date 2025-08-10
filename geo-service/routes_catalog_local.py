from fastapi import APIRouter, HTTPException
import os
import json
from typing import Optional

router = APIRouter()

# Local fallback for AOIs when Convex is not accessible
@router.get("/aois")
def get_aois(type: Optional[str] = None, q: Optional[str] = None):
    """
    Get AOIs from local data file as fallback
    """
    try:
        # Try to load from local data file
        data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'aois.json')
        
        if not os.path.exists(data_path):
            raise HTTPException(status_code=404, detail="AOIs data file not found")
        
        with open(data_path, 'r') as f:
            aois = json.load(f)
        
        # Filter by type if specified
        if type:
            aois = [a for a in aois if a.get('type') == type]
        
        # Filter by query if specified
        if q:
            q_lower = q.lower()
            aois = [a for a in aois if 
                   q_lower in a.get('id', '').lower() or 
                   q_lower in a.get('name', '').lower() or 
                   q_lower in a.get('description', '').lower()]
        
        return aois
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch AOIs: {e}")
