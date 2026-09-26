"""Simplified 2D Diffusive-Wave Hydrodynamic Simulation Engine.

Implements the Froehlich (2008) dam breach outflow hydrograph coupled with
a 2D raster-based diffusive-wave flood propagation solver over real-world DEMs.
"""

import os
import math
import uuid
from typing import List, Dict, Any, Optional, Tuple, Callable
import numpy as np
import rasterio
from rasterio.transform import rowcol

from backend.data_layer.dam_config import KNOWN_DAMS
from backend.hydro_engine.base import BaseHydroEngine, BreachParams, TimestepRaster

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
CACHE_DIR = os.path.join(DATA_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True)


def calculate_froehlich_breach_outflow(
    dam: Dict[str, Any],
    reservoir_level_pct: float = 95.0,
    breach_width_m: float = 100.0,
    breach_formation_min: float = 20.0,
    rainfall_scenario: str = "heavy",
) -> Tuple[float, float, float]:
    """Computes peak breach discharge Qp (m3/s) using the Froehlich (2008) empirical equation.
    
    Qp = 0.607 * Vw^0.295 * hw^1.24 * (Bb / 100)^0.65 + Qinflow
    
    Returns:
        (Qp_m3s, hw_m, Vw_m3)
    """
    total_volume_m3 = dam["storage_capacity_m3"]
    Vw = total_volume_m3 * (reservoir_level_pct / 100.0)
    hw = dam["dam_height_m"] * (reservoir_level_pct / 100.0) * 0.92

    # Froehlich (2008) formula
    qp_base = 0.607 * (Vw ** 0.295) * (hw ** 1.24)
    # Scale with breach width relative to 100m baseline
    width_factor = (breach_width_m / 100.0) ** 0.65
    qp_breach = qp_base * width_factor

    # Inflow surcharge
    q_inflow = dam["normal_discharge_m3s"]
    if rainfall_scenario == "heavy":
        q_inflow = dam["max_spillway_discharge_m3s"] * 0.65
    elif rainfall_scenario == "cloudburst":
        q_inflow = dam["max_spillway_discharge_m3s"] * 1.40

    Qp = qp_breach + q_inflow
    return float(Qp), float(hw), float(Vw)


def get_hydrograph_discharge(
    t_min: float,
    qp_m3s: float,
    formation_min: float,
    baseflow_m3s: float = 500.0,
) -> float:
    """Computes instantaneous breach outflow Q(t) at simulation time t (minutes)."""
    if t_min <= 0:
        return baseflow_m3s

    if t_min <= formation_min:
        # Sinusoidal rise limb
        frac = t_min / max(1.0, formation_min)
        return baseflow_m3s + (qp_m3s - baseflow_m3s) * math.sin(frac * (math.pi / 2.0))

    # Exponential reservoir drawdown recession limb
    recession_t = t_min - formation_min
    decay = 0.018  # recession constant
    receded = baseflow_m3s + (qp_m3s - baseflow_m3s) * math.exp(-decay * recession_t)
    return max(baseflow_m3s, receded)


class SimplifiedDiffusiveWaveEngine(BaseHydroEngine):
    """2D raster diffusive-wave flood propagation engine using DEM, Manning's equation,
    and mass-conservative finite-volume routing."""

    def __init__(self, mannings_n: float = 0.035, wet_threshold_m: float = 0.05):
        self.default_mannings_n = mannings_n
        self.wet_threshold = wet_threshold_m

    def run(
        self,
        dem: np.ndarray,
        dem_profile: Dict[str, Any],
        breach_params: BreachParams,
        scenario_id: Optional[str] = None,
        progress_callback: Optional[Callable[[int], None]] = None,
    ) -> List[TimestepRaster]:
        """Executes the diffusive-wave hydrodynamic simulation."""
        if scenario_id is None:
            scenario_id = str(uuid.uuid4())[:8]

        scenario_cache_dir = os.path.join(CACHE_DIR, scenario_id)
        os.makedirs(scenario_cache_dir, exist_ok=True)

        dam_config = KNOWN_DAMS.get(breach_params.dam_id, KNOWN_DAMS["bhavanisagar"])
        mannings_n = dam_config.get("mannings_n", self.default_mannings_n)

        # 1. Compute Froehlich (2008) Peak Breach Outflow
        Qp, hw, Vw = calculate_froehlich_breach_outflow(
            dam=dam_config,
            reservoir_level_pct=breach_params.reservoir_level,
            breach_width_m=breach_params.breach_width,
            breach_formation_min=breach_params.breach_formation_time,
            rainfall_scenario=breach_params.rainfall_scenario,
        )

        # 2. Coordinate & Grid Geometry
        transform = dem_profile["transform"]
        height, width = dem.shape

        # Cell size in meters
        lat_ref = dam_config["lat"]
        deg_to_m_lat = 111_000.0
        deg_to_m_lon = 111_000.0 * math.cos(math.radians(lat_ref))
        dx = abs(transform[0]) * deg_to_m_lon
        dy = abs(transform[4]) * deg_to_m_lat
        cell_area = dx * dy  # m²

        # Dam breach injection row, col
        dam_r, dam_c = rowcol(transform, dam_config["lon"], dam_config["lat"])
        dam_r = max(1, min(height - 2, dam_r))
        dam_c = max(1, min(width - 2, dam_c))

        inj_cells = [
            (dam_r, dam_c),
            (dam_r + 1, dam_c),
            (dam_r, dam_c + 1),
            (dam_r + 1, dam_c + 1),
        ]
        num_inj_cells = len(inj_cells)

        # 3. State Rasters
        depth = np.zeros((height, width), dtype=np.float32)
        velocity = np.zeros((height, width), dtype=np.float32)
        arrival_time = np.full((height, width), -1.0, dtype=np.float32)

        # 4. Simulation Time Loop
        duration_min = breach_params.duration_hours * 60.0
        output_step_min = breach_params.timestep_minutes
        dt_sec = breach_params.dt_seconds
        dt_min = dt_sec / 60.0

        current_time_min = 0.0
        next_output_min = output_step_min
        timestep_results: List[TimestepRaster] = []

        neighbors = [
            (-1, 0, dy),
            (1, 0, dy),
            (0, -1, dx),
            (0, 1, dx),
        ]

        step_idx = 0
        last_progress_pct = 40

        while current_time_min < duration_min:
            # A. Breach Inflow
            current_q = get_hydrograph_discharge(
                t_min=current_time_min,
                qp_m3s=Qp,
                formation_min=breach_params.breach_formation_time,
                baseflow_m3s=dam_config["normal_discharge_m3s"],
            )

            volume_inj = (current_q * dt_sec) / num_inj_cells
            depth_inj = volume_inj / cell_area
            for r, c in inj_cells:
                depth[r, c] += depth_inj

            # B. Wet Cells & Arrival Time
            wet_mask = depth > self.wet_threshold
            newly_wet = wet_mask & (arrival_time < 0)
            arrival_time[newly_wet] = current_time_min

            eta = dem + depth

            # Diffusive wave flux distribution
            flux_net = np.zeros_like(depth)
            vel_mag = np.zeros_like(depth)

            wet_r, wet_c = np.where(wet_mask)

            if len(wet_r) > 0:
                for dr, dc, dist in neighbors:
                    nr = wet_r + dr
                    nc = wet_c + dc

                    valid_n = (nr >= 0) & (nr < height) & (nc >= 0) & (nc < width)
                    if not np.any(valid_n):
                        continue

                    wr = wet_r[valid_n]
                    wc = wet_c[valid_n]
                    valid_nr = nr[valid_n]
                    valid_nc = nc[valid_n]

                    slope = (eta[wr, wc] - eta[valid_nr, valid_nc]) / dist
                    downslope = slope > 0.0001

                    if not np.any(downslope):
                        continue

                    wr_d = wr[downslope]
                    wc_d = wc[downslope]
                    nr_d = valid_nr[downslope]
                    nc_d = valid_nc[downslope]
                    s_d = slope[downslope]

                    h_source = depth[wr_d, wc_d]

                    v = (1.0 / mannings_n) * (h_source ** (2.0 / 3.0)) * np.sqrt(s_d)
                    v = np.clip(v, 0.0, 14.0)

                    vel_mag[wr_d, wc_d] = np.maximum(vel_mag[wr_d, wc_d], v)

                    flow_width = dx if dr != 0 else dy
                    q_out = v * h_source * flow_width
                    vol_flux = q_out * dt_sec

                    max_avail_vol = h_source * cell_area * 0.22
                    vol_flux = np.minimum(vol_flux, max_avail_vol)

                    d_depth = vol_flux / cell_area

                    np.add.at(flux_net, (wr_d, wc_d), -d_depth)
                    np.add.at(flux_net, (nr_d, nc_d), d_depth)

            depth = np.maximum(0.0, depth + flux_net)
            velocity = vel_mag

            current_time_min += dt_min

            # Progress reporting
            if progress_callback:
                pct = int(40 + (current_time_min / duration_min) * 50)
                if pct > last_progress_pct:
                    last_progress_pct = pct
                    progress_callback(pct)

            # C. Output Snapshot
            if current_time_min >= next_output_min or current_time_min >= duration_min:
                step_idx += 1
                flooded_cells = int(np.sum(depth > self.wet_threshold))
                flooded_area_km2 = float((flooded_cells * cell_area) / 1e6)
                max_d = float(np.max(depth))
                mean_d = float(np.mean(depth[depth > self.wet_threshold])) if flooded_cells > 0 else 0.0

                tif_path = os.path.join(scenario_cache_dir, f"timestep_{step_idx:03d}.tif")
                out_profile = dem_profile.copy()
                out_profile.update(
                    dtype="float32",
                    count=3,
                    nodata=-9999.0,
                    compress="deflate",
                )

                with rasterio.open(tif_path, "w", **out_profile) as dst:
                    dst.write(depth.astype(np.float32), 1)
                    dst.set_band_description(1, "Water Depth (m)")
                    dst.write(velocity.astype(np.float32), 2)
                    dst.set_band_description(2, "Flow Velocity (m/s)")
                    dst.write(arrival_time.astype(np.float32), 3)
                    dst.set_band_description(3, "Arrival Time (min)")

                timestep_results.append(
                    TimestepRaster(
                        timestep_min=round(current_time_min, 1),
                        depth=depth.copy(),
                        velocity=velocity.copy(),
                        arrival_time=arrival_time.copy(),
                        max_depth=round(max_d, 2),
                        mean_depth=round(mean_d, 2),
                        flooded_cells=flooded_cells,
                        flooded_area_km2=round(flooded_area_km2, 2),
                        cache_path=tif_path,
                    )
                )

                next_output_min += output_step_min

        return timestep_results
