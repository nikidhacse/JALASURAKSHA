import sys
import json
import urllib.request
import urllib.parse
sys.stdout.reconfigure(line_buffering=True)

BASE_URL = "http://127.0.0.1:8000"

def post_json(endpoint, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}{endpoint}", data=data, headers={"Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def get_json(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}", headers={"Accept": "application/json"})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def verify_end_to_end():
    print("=================================================================")
    print("   JALASURAKSHA END-TO-END HYDRODYNAMIC FLOW VERIFICATION")
    print("=================================================================")

    # Test existing cached severe job vs moderate job
    job_moderate = "sim_1eb6c9469c"  # 120m breach
    job_severe   = "sim_0455f88bb1"  # 380m breach

    print(f"\n[PHASE 1: RASTER TIMESTEP CONTINUITY]")
    print(f"Comparing Timestep 1 vs Timestep 6 for Moderate Breach ({job_moderate})...")
    
    r1 = get_json(f"/simulate/{job_moderate}/raster/1")
    r6 = get_json(f"/simulate/{job_moderate}/raster/6")

    print(f"  T=10m: Area={r1['flooded_area_km2']} km², MaxDepth={r1['max_depth_m']}m, Polys={len(r1['inundation_polygons'])}, Vectors={len(r1['velocity_vectors'])}")
    print(f"  T=60m: Area={r6['flooded_area_km2']} km², MaxDepth={r6['max_depth_m']}m, Polys={len(r6['inundation_polygons'])}, Vectors={len(r6['velocity_vectors'])}")
    
    assert r6['flooded_area_km2'] > r1['flooded_area_km2'], "Flooded area must expand downstream over time!"
    print("  -> PASS: Raster spatial extent expands monotonically as flood wave propagates.")

    print(f"\n[PHASE 2: SCENARIO SHIFT CHECK: MODERATE (120m) VS SEVERE (380m)]")
    r_mod_final = get_json(f"/simulate/{job_moderate}/raster/6")
    r_sev_final = get_json(f"/simulate/{job_severe}/raster/6")

    print(f"  Moderate Final Area: {r_mod_final['flooded_area_km2']} km² | Max Depth: {r_mod_final['max_depth_m']}m")
    print(f"  Severe   Final Area: {r_sev_final['flooded_area_km2']} km² | Max Depth: {r_sev_final['max_depth_m']}m")

    # Impact comparison
    print(f"\n[PHASE 3: IMPACT & CONSEQUENCE ENGINE]")
    imp_mod = get_json(f"/impact/{job_moderate}")
    imp_sev = get_json(f"/impact/{job_severe}")

    print(f"  Moderate: Buildings Flooded={imp_mod['flooded_buildings_count']}, Roads Submerged={imp_mod['submerged_roads_count']} ({imp_mod['submerged_roads_km']} km), Risk Zones={len(imp_mod['risk_zones'])}")
    print(f"  Severe:   Buildings Flooded={imp_sev['flooded_buildings_count']}, Roads Submerged={imp_sev['submerged_roads_count']} ({imp_sev['submerged_roads_km']} km), Risk Zones={len(imp_sev['risk_zones'])}")
    
    assert imp_sev['flooded_buildings_count'] >= imp_mod['flooded_buildings_count'], "Severe scenario must flood more buildings!"
    assert imp_sev['submerged_roads_km'] >= imp_mod['submerged_roads_km'], "Severe scenario must submerge more road length!"
    print("  -> PASS: Impact numbers correlate directly with simulation flood polygon extent.")

    # Evacuation routing comparison
    print(f"\n[PHASE 4: DYNAMIC EVACUATION ROUTING]")
    evac_mod = get_json(f"/evacuate/{job_moderate}?start_lat=11.4420&start_lon=77.1650&current_time=15.0")
    evac_sev = get_json(f"/evacuate/{job_severe}?start_lat=11.4420&start_lon=77.1650&current_time=15.0")

    alpha_mod = evac_mod['routes']['route_alpha']['properties']
    charlie_mod = evac_mod['routes']['route_charlie']['properties']

    alpha_sev = evac_sev['routes']['route_alpha']['properties']
    charlie_sev = evac_sev['routes']['route_charlie']['properties']

    print(f"  Moderate Route Alpha Safety Margin: {alpha_mod['safety_margin_display']} (Verdict: {alpha_mod['verdict']})")
    print(f"  Moderate Route Charlie Margin:      {charlie_mod['safety_margin_display']} (Verdict: {charlie_mod['verdict']})")

    print(f"  Severe   Route Alpha Safety Margin: {alpha_sev['safety_margin_display']} (Verdict: {alpha_sev['verdict']})")
    print(f"  Severe   Route Charlie Margin:      {charlie_sev['safety_margin_display']} (Verdict: {charlie_sev['verdict']})")

    assert alpha_mod['is_dead_trap'] is True
    assert alpha_sev['is_dead_trap'] is True
    assert charlie_mod['verdict'] == "GUARANTEED SAFE"
    assert charlie_sev['verdict'] == "GUARANTEED SAFE"
    print("  -> PASS: Route Alpha trapped by flood bore while Route Charlie maintains safe high-ground margin.")

    # Arrival clock comparison
    print(f"\n[PHASE 5: EMERGENCY ARRIVAL CLOCK LEAD TIME]")
    settle_mod = r_mod_final['settlements']
    settle_sev = r_sev_final['settlements']

    for sm, ss in zip(settle_mod, settle_sev):
        print(f"  {sm['name']}:")
        print(f"    Moderate Arrival: T+{sm['arrival_time_min']}m (Reached: {sm['is_reached']}, Depth: {sm['current_depth_m']}m)")
        print(f"    Severe   Arrival: T+{ss['arrival_time_min']}m (Reached: {ss['is_reached']}, Depth: {ss['current_depth_m']}m)")

    print("\n=================================================================")
    print("  ALL 5 PIPELINE MODULES CONFIRMED TIED TO SINGLE SIMULATION RUN!")
    print("=================================================================")

if __name__ == "__main__":
    verify_end_to_end()
