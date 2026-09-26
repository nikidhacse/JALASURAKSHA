"""Abstract base class for Hydrodynamic Engines in JALASURAKSHA."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Callable
import numpy as np


@dataclass
class BreachParams:
    dam_id: str
    reservoir_level: float = 95.0        # % of FRL
    breach_width: float = 100.0          # meters
    breach_formation_time: float = 20.0  # minutes
    rainfall_scenario: str = "heavy"     # "normal" | "heavy" | "cloudburst"
    duration_hours: float = 2.0          # simulation duration in hours
    timestep_minutes: float = 10.0       # output raster timestep
    dt_seconds: float = 12.0             # internal numerical integration timestep


@dataclass
class TimestepRaster:
    timestep_min: float
    depth: np.ndarray          # 2D array of water depth (meters)
    velocity: np.ndarray       # 2D array of flow velocity (m/s)
    arrival_time: np.ndarray   # 2D array of flood wave arrival time (minutes, -1 for dry)
    max_depth: float
    mean_depth: float
    flooded_cells: int
    flooded_area_km2: float
    cache_path: Optional[str] = None


class BaseHydroEngine(ABC):
    """Abstract base class defining the hydrodynamic simulation interface."""

    @abstractmethod
    def run(
        self,
        dem: np.ndarray,
        dem_profile: Dict[str, Any],
        breach_params: BreachParams,
        scenario_id: Optional[str] = None,
        progress_callback: Optional[Callable[[int], None]] = None,
    ) -> List[TimestepRaster]:
        """Runs the hydrodynamic simulation across the DEM raster for the given scenario.

        Args:
            dem: 2D numpy array of elevation values (meters).
            dem_profile: rasterio profile dictionary containing CRS, transform, etc.
            breach_params: parameter set for dam breach and simulation duration.
            scenario_id: optional cache identifier.
            progress_callback: optional callback reporting progress percentage (0-100).

        Returns:
            List of TimestepRaster objects containing depth, velocity, and arrival_time arrays.
        """
        pass
