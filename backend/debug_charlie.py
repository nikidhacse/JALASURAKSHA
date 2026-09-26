from backend.evac_engine.routing import get_or_load_road_graph
import rasterio
from rasterio.transform import rowcol

G = get_or_load_road_graph("bhavanisagar")
with rasterio.open("data/cache/sim_1eb6c9469c/timestep_006.tif") as src:
    depth = src.read(1)
    arrival = src.read(3)
    transform = src.transform
    h, w = depth.shape

nodes_c = [
    "origin_sirumugai", "ridge_east_spur", "ridge_crest_1",
    "ridge_crest_2", "ridge_crest_3", "ridge_west_descent", "shelter_high_ground"
]

print("Checking Route Charlie edges:")
for i in range(len(nodes_c) - 1):
    u, v = nodes_c[i], nodes_c[i+1]
    n1, n2 = G.nodes[u], G.nodes[v]
    mid_lon = (n1['x'] + n2['x']) / 2.0
    mid_lat = (n1['y'] + n2['y']) / 2.0
    r, c = rowcol(transform, mid_lon, mid_lat)
    r = max(0, min(h-1, r))
    c = max(0, min(w-1, c))
    d = float(depth[r, c])
    a = float(arrival[r, c])
    print(f"  {u} -> {v} (mid: {mid_lat:.4f}, {mid_lon:.4f}): depth={d:.2f}m, arr={a:.1f}m")
