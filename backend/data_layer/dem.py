"""DEM Data Layer for JALASURAKSHA.
Loads, downloads, and clips Digital Elevation Model (DEM) GeoTIFFs for target dam basins.

Primary Source:
AWS Terrain Tiles Open Data (SRTM 30m / Mapzen Elevation):
Source URL pattern: https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png
Elevation formula: elevation_m = (R * 256.0 + G + B / 256.0) - 32768.0
CRS: EPSG:4326 (WGS 84 geographic coordinates)
"""

import os
import math
import urllib.request
from typing import Tuple, Dict, Any, Optional
import numpy as np
from PIL import Image
import rasterio
from rasterio.transform import from_bounds
from rasterio.crs import CRS

from backend.data_layer.dam_config import KNOWN_DAMS

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
DEM_DIR = os.path.join(DATA_DIR, "dem")
CACHE_DIR = os.path.join(DATA_DIR, "cache")

os.makedirs(DEM_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)


def deg_to_tile(lat: float, lon: float, zoom: int) -> Tuple[int, int]:
    """Converts WGS84 lat/lon to Web Mercator tile x, y."""
    n = 2.0 ** zoom
    xtile = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return xtile, ytile


def tile_to_bounds(xtile: int, ytile: int, zoom: int) -> Tuple[float, float, float, float]:
    """Returns (west, south, east, north) bounding box for a given tile."""
    n = 2.0 ** zoom
    west = xtile / n * 360.0 - 180.0
    east = (xtile + 1) / n * 360.0 - 180.0

    def y_to_lat(y):
        lat_rad = math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n)))
        return math.degrees(lat_rad)

    north = y_to_lat(ytile)
    south = y_to_lat(ytile + 1)
    return west, south, east, north


def download_tile_elevation(xtile: int, ytile: int, zoom: int) -> np.ndarray:
    """Downloads an AWS Terrarium SRTM tile and decodes elevation in meters."""
    url = f"https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{zoom}/{xtile}/{ytile}.png"
    tmp_path = os.path.join(DEM_DIR, f"temp_{zoom}_{xtile}_{ytile}.png")
    
    headers = {"User-Agent": "Jalasuraksha-HydroEngine/2.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp, open(tmp_path, "wb") as f:
        f.write(resp.read())

    with Image.open(tmp_path) as img:
        arr = np.array(img.convert("RGB"), dtype=np.float32)

    if os.path.exists(tmp_path):
        os.remove(tmp_path)

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    # Terrarium decoding: (R * 256 + G + B / 256) - 32768
    elev_m = (r * 256.0 + g + b / 256.0) - 32768.0
    return elev_m


def fetch_and_write_dam_dem(dam_id: str) -> str:
    """Fetches real SRTM 30m/90m tiles for the dam and saves as a georeferenced GeoTIFF."""
    if dam_id not in KNOWN_DAMS:
        raise ValueError(f"Unknown dam_id: {dam_id}")

    dam = KNOWN_DAMS[dam_id]
    target_tif = os.path.join(DATA_DIR, dam["dem_file"])
    os.makedirs(os.path.dirname(target_tif), exist_ok=True)

    lat = dam["lat"]
    lon = dam["lon"]
    zoom = 11

    # Get tiles around the dam and downstream
    # For Bhavanisagar (11.47, 77.11): x=1462, y=958.
    # Downstream flows eastward toward 77.30 (x=1463, y=958)
    x0, y0 = deg_to_tile(lat, lon, zoom)
    
    # Download 2x1 grid to capture downstream reach
    tiles = []
    for dy in [0]:
        row_tiles = []
        for dx in [0, 1]:
            x = x0 + dx
            y = y0 + dy
            tile_elev = download_tile_elevation(x, y, zoom)
            row_tiles.append(tile_elev)
        tiles.append(np.hstack(row_tiles))
    
    dem_mosaic = np.vstack(tiles)  # Shape (256, 512)

    # Compute bounding box
    w0, s0, _, n0 = tile_to_bounds(x0, y0, zoom)
    _, _, e1, _ = tile_to_bounds(x0 + 1, y0, zoom)

    west, south, east, north = w0, s0, e1, n0

    height, width = dem_mosaic.shape
    transform = from_bounds(west, south, east, north, width, height)

    profile = {
        "driver": "GTiff",
        "dtype": "float32",
        "nodata": -9999.0,
        "width": width,
        "height": height,
        "count": 1,
        "crs": CRS.from_epsg(4326),
        "transform": transform,
        "compress": "deflate",
    }

    with rasterio.open(target_tif, "w", **profile) as dst:
        dst.write(dem_mosaic.astype(np.float32), 1)

    return target_tif


def load_dem(dam_id: str = "bhavanisagar") -> Tuple[np.ndarray, Dict[str, Any]]:
    """Loads DEM elevation array and rasterio profile for the given dam.
    
    If the file does not exist locally, it will automatically download
    and cache the real SRTM 30m GeoTIFF.
    """
    if dam_id not in KNOWN_DAMS:
        raise ValueError(f"Unknown dam_id: {dam_id}")

    dam = KNOWN_DAMS[dam_id]
    tif_path = os.path.join(DATA_DIR, dam["dem_file"])

    if not os.path.exists(tif_path):
        fetch_and_write_dam_dem(dam_id)

    with rasterio.open(tif_path) as src:
        dem_array = src.read(1)
        profile = src.profile.copy()

    return dem_array, profile
