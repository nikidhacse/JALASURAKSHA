import sys
sys.stdout.reconfigure(line_buffering=True)
import rasterio
print(f"rasterio: {rasterio.__version__}", flush=True)
import shapely
print(f"shapely: {shapely.__version__}", flush=True)
import geopandas as gpd
print(f"geopandas: {gpd.__version__}", flush=True)
import osmnx as ox
print(f"osmnx: {ox.__version__}", flush=True)
print("ALL_IMPORTS_SUCCESSFUL", flush=True)
