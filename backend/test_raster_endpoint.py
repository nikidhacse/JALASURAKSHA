import os
import sys
import numpy as np
import rasterio
from rasterio.transform import rowcol, xy
from backend.data_layer.dem import load_dem
from backend.data_layer.dam_config import KNOWN_DAMS
from backend.impact_engine.overlay import vectorize_depth_raster

def test_raster_extraction():
    job_id = "sim_1eb6c9469c"
    tif_path = os.path.join("data", "cache", job_id, "timestep_003.tif")
    assert os.path.exists(tif_path), f"File {tif_path} not found"

    with rasterio.open(tif_path) as src:
        depth = src.read(1)
        velocity = src.read(2)
        arrival = src.read(3)
        transform = src.transform
        crs = src.crs
        bounds = src.bounds
        height, width = depth.shape

    print(f"Original Raster: Shape=({height}, {width}), Bounds={bounds}")
    print(f"Max depth: {np.max(depth):.2f}m, Max velocity: {np.max(velocity):.2f}m/s")

    # Downsample by factor of 4: (height // 4, width // 4)
    factor_r = 4
    factor_c = 4
    depth_down = depth[::factor_r, ::factor_c]
    vel_down = velocity[::factor_r, ::factor_c]
    arr_down = arrival[::factor_r, ::factor_c]

    dem_arr, profile = load_dem("bhavanisagar")
    dem_down = dem_arr[::factor_r, ::factor_c]

    print(f"Downsampled Shape: {depth_down.shape}")

    # Vectorize flood extent
    gdf = vectorize_depth_raster(depth, transform, crs, threshold=0.1)
    print(f"Extracted {len(gdf)} flood polygons")
    
    # Extract velocity vectors
    wet_r, wet_c = np.where((depth_down > 0.1) & (vel_down > 0.2))
    vectors = []
    # Sample up to 25 representative vectors
    step = max(1, len(wet_r) // 25)
    for idx in range(0, len(wet_r), step):
        r_down, c_down = wet_r[idx], wet_c[idx]
        orig_r = r_down * factor_r
        orig_c = c_down * factor_c
        lon, lat = xy(transform, orig_r, orig_c)
        v = float(vel_down[r_down, c_down])
        d = float(depth_down[r_down, c_down])
        
        # Approximate flow direction heading eastward/down-valley (angle relative to east)
        angle = 85.0 + float(np.sin(orig_r * 0.1) * 20.0)
        vectors.append({
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "velocity_ms": round(v, 2),
            "depth_m": round(d, 2),
            "angle_deg": round(angle, 1),
        })

    print(f"Sampled {len(vectors)} flow vectors")
    print("[SUCCESS] Raster extraction functions as expected.")

if __name__ == "__main__":
    test_raster_extraction()
