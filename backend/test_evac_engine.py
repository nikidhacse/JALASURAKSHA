import sys
sys.stdout.reconfigure(line_buffering=True)
from backend.evac_engine.routing import compute_evacuation_routes

# Sirumugai Town origin: (11.4420, 77.1650)
print("Evaluating evacuation routes for sim_1eb6c9469c (120m breach)...", flush=True)
res1 = compute_evacuation_routes(
    job_id="sim_1eb6c9469c",
    start_lat=11.4420,
    start_lon=77.1650,
    current_time_min=15.0,
)

alpha1 = res1["routes"]["route_alpha"]["properties"]
charlie1 = res1["routes"]["route_charlie"]["properties"]
print(f"Alpha: {alpha1['name']} - Dist: {alpha1['distance_km']}km, Margin: {alpha1['safety_margin_display']}, Verdict: {alpha1['verdict']}, DEAD_TRAP={alpha1['is_dead_trap']}", flush=True)
print(f"Charlie: {charlie1['name']} - Dist: {charlie1['distance_km']}km, Margin: {charlie1['safety_margin_display']}, Verdict: {charlie1['verdict']}", flush=True)

print("\nEvaluating evacuation routes for sim_0455f88bb1 (380m breach)...", flush=True)
res2 = compute_evacuation_routes(
    job_id="sim_0455f88bb1",
    start_lat=11.4420,
    start_lon=77.1650,
    current_time_min=15.0,
)

alpha2 = res2["routes"]["route_alpha"]["properties"]
charlie2 = res2["routes"]["route_charlie"]["properties"]
print(f"Alpha: {alpha2['name']} - Dist: {alpha2['distance_km']}km, Margin: {alpha2['safety_margin_display']}, Verdict: {alpha2['verdict']}, DEAD_TRAP={alpha2['is_dead_trap']}", flush=True)
print(f"Charlie: {charlie2['name']} - Dist: {charlie2['distance_km']}km, Margin: {charlie2['safety_margin_display']}, Verdict: {charlie2['verdict']}", flush=True)

# Geometries check
coords_a = res2["routes"]["route_alpha"]["geometry"]["coordinates"]
coords_c = res2["routes"]["route_charlie"]["geometry"]["coordinates"]
print(f"\nRoute Alpha Waypoints Count: {len(coords_a)}, First={coords_a[0]}, Last={coords_a[-1]}", flush=True)
print(f"Route Charlie Waypoints Count: {len(coords_c)}, First={coords_c[0]}, Last={coords_c[-1]}", flush=True)
assert coords_a != coords_c, "Route Alpha and Route Charlie must follow different geometries!"
print("[SUCCESS] Routing engine accurately differentiates Route Alpha vs Route Charlie!")
