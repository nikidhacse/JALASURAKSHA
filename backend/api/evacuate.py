"""Dynamic Evacuation Routing API for JALASURAKSHA.

GET /evacuate/{job_id}?start_lat=&start_lon= -> returns Route Alpha (Shortest)
and Route Charlie (Safest) with GeoJSON LineString geometries, distances,
estimated travel times, and calculated safety margins.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.evac_engine.routing import compute_evacuation_routes

router = APIRouter(prefix="/evacuate", tags=["Dynamic Evacuation Routing"])


@router.get("/{job_id}")
def get_evacuation_routes(
    job_id: str,
    start_lat: float = Query(..., description="Origin latitude coordinate"),
    start_lon: float = Query(..., description="Origin longitude coordinate"),
    dest_lat: Optional[float] = Query(None, description="Optional destination shelter latitude"),
    dest_lon: Optional[float] = Query(None, description="Optional destination shelter longitude"),
    current_time: float = Query(15.0, description="Current simulation minute from breach"),
    speed_kmh: float = Query(35.0, description="Average evacuation vehicle speed in km/h"),
):
    """Calculates time-aware Safest Route vs Shortest Route by cross-referencing
    road network travel speeds against hydrodynamic flood wave arrival rasters.
    """
    try:
        evac_data = compute_evacuation_routes(
            job_id=job_id,
            start_lat=start_lat,
            start_lon=start_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            current_time_min=current_time,
            mobilize_time_min=5.0,
            vehicle_speed_kmh=speed_kmh,
        )
        return evac_data
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Evacuation routing computation failed: {str(exc)}",
        )
