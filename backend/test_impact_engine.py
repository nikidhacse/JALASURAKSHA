import sys
sys.stdout.reconfigure(line_buffering=True)
from backend.impact_engine.overlay import compute_simulation_impact

print("Testing impact engine on sim_1eb6c9469c (120m breach)...", flush=True)
impact1 = compute_simulation_impact("sim_1eb6c9469c")
print(f"120m Breach Impact: Buildings={impact1['flooded_buildings_count']}, Roads={impact1['submerged_roads_count']}, Bridges={impact1['affected_bridges_count']}", flush=True)
print(f"Risk zones count: {len(impact1['risk_zones'])}", flush=True)
for rz in impact1['risk_zones']:
    print(f"  [{rz['hazard_level']}] {rz['name']} ({rz['type']}) - Arrival: {rz['arrival_time_min']}m, Depth: {rz['max_depth_m']}m", flush=True)

print("\nTesting impact engine on sim_0455f88bb1 (380m breach)...", flush=True)
impact2 = compute_simulation_impact("sim_0455f88bb1")
print(f"380m Breach Impact: Buildings={impact2['flooded_buildings_count']}, Roads={impact2['submerged_roads_count']}, Bridges={impact2['affected_bridges_count']}", flush=True)
print(f"Risk zones count: {len(impact2['risk_zones'])}", flush=True)
for rz in impact2['risk_zones']:
    print(f"  [{rz['hazard_level']}] {rz['name']} ({rz['type']}) - Arrival: {rz['arrival_time_min']}m, Depth: {rz['max_depth_m']}m", flush=True)

# Verification assertions
assert impact2['flooded_buildings_count'] > impact1['flooded_buildings_count'], "Severe breach should flood more buildings!"
print(f"\n[SUCCESS] Buildings flooded increased from {impact1['flooded_buildings_count']} to {impact2['flooded_buildings_count']} with breach width expansion!", flush=True)
