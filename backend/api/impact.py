"""Impact & Consequence Assessment API for JALASURAKSHA.

GET /impact/{job_id}?timestep=N -> returns counts and list of affected
buildings, roads, bridges, hospitals, schools with arrival times.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.impact_engine.overlay import compute_simulation_impact

router = APIRouter(prefix="/impact", tags=["Infrastructure Impact Assessment"])


class RiskZoneItem(BaseModel):
    id: str
    name: str
    type: str  # "hospital" | "bridge" | "school" | "road"
    category: str
    lat: float
    lon: float
    arrival_time_min: float
    max_depth_m: float
    hazard_level: str  # "Extreme" | "High" | "Moderate"


class ImpactResponse(BaseModel):
    job_id: str
    timestep_idx: int
    flooded_buildings_count: int
    submerged_roads_count: int
    submerged_roads_km: float
    affected_bridges_count: int
    affected_hospitals_count: int
    affected_schools_count: int
    total_impacted_assets: int
    risk_zones: List[RiskZoneItem]


@router.get("/{job_id}", response_model=ImpactResponse)
def get_simulation_impact(
    job_id: str,
    timestep: Optional[int] = Query(None, description="Timestep index (1-based, default latest)"),
):
    """Calculates live geospatial overlay between the simulation flood extent
    and downstream OpenStreetMap infrastructure assets.
    """
    try:
        impact_data = compute_simulation_impact(
            job_id=job_id,
            timestep_idx=timestep,
            depth_threshold=0.1,
        )
        return impact_data
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Impact assessment calculation failed: {str(exc)}",
        )
