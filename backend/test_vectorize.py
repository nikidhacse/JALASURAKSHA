import rasterio
from rasterio.features import shapes
import shapely.geometry
import geopandas as gpd
import numpy as np

tif_path = "data/cache/sim_1eb6c9469c/timestep_006.tif"

with rasterio.open(tif_path) as src:
    depth = src.read(1)
    arrival = src.read(3)
    transform = src.transform
    crs = src.crs

mask = (depth > 0.1).astype(np.uint8)
print("Flooded cells count (>0.1m):", int(np.sum(mask)))

shape_gen = shapes(mask, mask=(mask == 1), transform=transform)
polygons = []
for geom, val in shape_gen:
    if val == 1:
        poly = shapely.geometry.shape(geom)
        if poly.is_valid and not poly.is_empty:
            polygons.append(poly)

print(f"Vectorized {len(polygons)} flood polygon features!")
if polygons:
    flood_gdf = gpd.GeoDataFrame(geometry=polygons, crs=crs)
    print("Total flood polygon bounds:", flood_gdf.total_bounds)
    print("Total flood area (deg2 approx):", flood_gdf.area.sum())
