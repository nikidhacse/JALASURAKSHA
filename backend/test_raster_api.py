import sys
import json
import urllib.request
sys.stdout.reconfigure(line_buffering=True)

try:
    url = "http://127.0.0.1:8000/simulate/sim_1eb6c9469c/raster/2"
    print(f"Requesting {url}...")
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as response:
        assert response.status == 200
        data = json.loads(response.read().decode("utf-8"))
        print("HTTP Status: 200 OK")
        print(f"Timestep: {data['timestep_min']} min, Max Depth: {data['max_depth_m']}m, Flooded Area: {data['flooded_area_km2']} km2")
        print(f"Grid shape: {data['grid_shape']}, Vectors count: {len(data['velocity_vectors'])}, Polygons count: {len(data['inundation_polygons'])}")
        print(f"Settlements: {[s['name'] + ' (reached=' + str(s['is_reached']) + ', depth=' + str(s['current_depth_m']) + 'm)' for s in data['settlements']]}")
        print("[SUCCESS] Real timestep raster endpoint works!")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
