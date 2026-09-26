import sys
sys.stdout.reconfigure(line_buffering=True)
import osmnx as ox

# Test a small area around Sirumugai / Bhavanisagar (e.g. 0.05 deg)
bbox = (77.10, 11.45, 77.20, 11.50) # (left, bottom, right, top)
print("Testing ox.features_from_bbox for hospitals & bridges...", flush=True)

try:
    gdf = ox.features_from_bbox(
        bbox=bbox,
        tags={"amenity": ["hospital", "clinic", "school"], "bridge": "yes"}
    )
    print(f"Successfully retrieved {len(gdf)} features from OSM!", flush=True)
    print(gdf[["geometry"]].head(), flush=True)
except Exception as e:
    print(f"OSM fetch exception: {e}", flush=True)
