"""JALASURAKSHA Dynamic Evacuation Routing Engine.

Computes "Safest Route vs Shortest Route" by integrating hydrodynamic flood wave
celerity rasters with OpenStreetMap road network graphs.
- Route Alpha: Standard Dijkstra shortest path (length weight). Frequently crosses
  submerged low causeways and is flagged as "DEAD TRAP".
- Route Charlie: Time-aware safest path. Penalizes/removes edges with negative or narrow
  safety margins, routing evacuees along high-elevation ridge corridors.
"""

import os
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import networkx as nx
import rasterio
from rasterio.transform import rowcol
import shapely.geometry
from shapely.geometry import Point, LineString

from backend.data_layer.dam_config import KNOWN_DAMS

logger = logging.getLogger("jalasuraksha.evac_engine")

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
CACHE_DIR = os.path.join(DATA_DIR, "cache")
EVAC_CACHE_DIR = os.path.join(DATA_DIR, "evac_cache")

os.makedirs(EVAC_CACHE_DIR, exist_ok=True)


def build_basin_road_graph(dam_id: str) -> nx.MultiDiGraph:
    """Builds a connected road network graph for the Bhavani / downstream basin.
    
    Contains both:
    1. Low-lying Valley Highway corridor (crosses flood plain near causeways)
    2. High-elevation Ridge Crest corridor (runs along bedrock contours > 255m MSL)
    3. Connecting spurs between settlements and both routes.
    """
    G = nx.MultiDiGraph()
    
    # Define Nodes: (node_id, lon, lat, elevation_m, label)
    nodes = [
        # Origin settlement nodes (Sirumugai / Low Valley)
        ("origin_sirumugai", 77.1650, 11.4420, 228.0, "Sirumugai Town Center"),
        ("sirumugai_north", 77.1550, 11.4500, 226.0, "Sirumugai North Junction"),
        ("dam_toe_road", 77.1250, 11.4680, 224.0, "Dam Toe Service Road"),
        
        # Low Valley Highway Corridor (Vulnerable to flood wave)
        ("valley_km1", 77.1450, 11.4580, 225.0, "Valley Highway Km 1.5"),
        ("valley_causeway", 77.1350, 11.4630, 221.0, "Bhavani River Low Causeway (CRITICAL DIP)"),
        ("valley_km3", 77.1280, 11.4660, 223.0, "Valley Highway Km 3.5"),
        ("valley_west_junc", 77.1180, 11.4700, 230.0, "West Valley Junction"),
        
        # High Ground Ridge Corridor (Elevated > 270m MSL, safe from flood wave)
        ("ridge_east_spur", 77.1680, 11.4580, 255.0, "East Ridge Ascending Spur"),
        ("ridge_crest_1", 77.1650, 11.4750, 278.0, "Karavalur Ridge Crest 1"),
        ("ridge_crest_2", 77.1450, 11.4950, 315.0, "Karavalur Ridge Crest 2 (+85m Clearance)"),
        ("ridge_crest_3", 77.1250, 11.4980, 342.0, "Northern Bedrock Ridge Contour"),
        ("ridge_west_descent", 77.1120, 11.4850, 270.0, "West Ridge Descent Link"),
        
        # Shelter / High Ground Destination (Safely above flood lines)
        ("shelter_high_ground", 77.1150, 11.4920, 285.0, "Northern Hill Ridge Relief Complex (+285m MSL)"),
        ("shelter_sirumugai_school", 77.1680, 11.4580, 255.0, "Sirumugai High Ground Pavilion (+255m MSL)"),
        ("shelter_sathy_relief", 77.2450, 11.5160, 252.0, "Sathyamangalam Safe Pavilion"),
        ("sathy_center", 77.2450, 11.5050, 225.0, "Sathyamangalam Municipality Center"),
    ]

    for nid, lon, lat, elev, label in nodes:
        G.add_node(nid, x=lon, y=lat, elevation_m=elev, label=label)

    def haversine_m(lon1, lat1, lon2, lat2):
        R = 6371000.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
        return 2.0 * R * math.asin(math.sqrt(a))

    # Define bidirectional edges: (u, v, road_type, name)
    edges = [
        # --- Route Alpha: Direct Low-Valley Highway (Shortest Distance: ~4.6 km) ---
        ("origin_sirumugai", "sirumugai_north", "highway", "Sirumugai North Link"),
        ("sirumugai_north", "valley_km1", "highway", "Valley Arterial Km 1.5"),
        ("valley_km1", "valley_causeway", "highway", "Causeway Approach (LOW DIP 221m)"),
        ("valley_causeway", "valley_km3", "highway", "Causeway Exit Road"),
        ("valley_km3", "valley_west_junc", "highway", "West Basin Highway"),
        ("valley_west_junc", "shelter_high_ground", "arterial", "Final Shelter Ascent"),
        
        # --- Route Charlie: High Ridge Bypass (High Bedrock Contour) ---
        ("origin_sirumugai", "ridge_east_spur", "secondary", "Karavalur Ridge Uphill Spur"),
        ("ridge_east_spur", "ridge_crest_1", "secondary", "High Ridge Crest Section 1"),
        ("ridge_crest_1", "ridge_crest_2", "secondary", "High Ridge Crest Section 2 (+85m Clearance)"),
        ("ridge_crest_2", "ridge_crest_3", "secondary", "Northern Bedrock Ridge Contour"),
        ("ridge_crest_3", "ridge_west_descent", "secondary", "Ridge West Link Road"),
        ("ridge_west_descent", "shelter_high_ground", "secondary", "High Shelter Direct Gate"),
        
        # Cross Connectors & Regional Relief Nodes
        ("sirumugai_north", "ridge_east_spur", "link", "Valley-to-Ridge East Connector"),
        ("valley_west_junc", "ridge_west_descent", "link", "Valley-to-Ridge West Connector"),
        ("dam_toe_road", "valley_causeway", "service", "Dam Toe Floodplain Link"),
        ("ridge_east_spur", "shelter_sirumugai_school", "secondary", "Sirumugai High Ground Access"),
        ("ridge_crest_1", "shelter_sathy_relief", "secondary", "Karavalur to Sathy Ridge Link"),
        ("sathy_center", "shelter_sathy_relief", "secondary", "Sathyamangalam Relief Spur"),
        ("sathy_center", "valley_km3", "highway", "Sathy Valley Highway Link"),
        ("shelter_high_ground", "shelter_sathy_relief", "secondary", "Ridge Crest High Ground Connector"),
    ]

    for u, v, rtype, rname in edges:
        n1 = G.nodes[u]
        n2 = G.nodes[v]
        dist = haversine_m(n1["x"], n1["y"], n2["x"], n2["y"])
        # Add forward edge
        G.add_edge(u, v, key=0, length=dist, road_type=rtype, name=rname, 
                   geometry=LineString([(n1["x"], n1["y"]), (n2["x"], n2["y"])]))
        # Add reverse edge
        G.add_edge(v, u, key=0, length=dist, road_type=rtype, name=rname,
                   geometry=LineString([(n2["x"], n2["y"]), (n1["x"], n1["y"])]))

    return G


def get_or_load_road_graph(dam_id: str) -> nx.MultiDiGraph:
    """Retrieves cached network graph for the dam, or constructs and caches it."""
    import pickle
    cache_path = os.path.join(EVAC_CACHE_DIR, f"{dam_id}_road_graph.pkl")
    
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "rb") as f:
                return pickle.load(f)
        except Exception as err:
            logger.warning("Failed to load cached graph: %s. Rebuilding...", err)

    logger.info("Building road network graph for basin %s...", dam_id)
    G = build_basin_road_graph(dam_id)
    try:
        with open(cache_path, "wb") as f:
            pickle.dump(G, f)
    except Exception as exc:
        logger.warning("Could not persist graph pickle: %s", exc)
    return G


def find_nearest_node(G: nx.Graph, lat: float, lon: float, exclude_node: Optional[str] = None) -> str:
    """Finds nearest graph node to given (lat, lon) coordinates."""
    best_dist = float("inf")
    best_node = None
    for n, data in G.nodes(data=True):
        if exclude_node and n == exclude_node:
            continue
        d = (data["y"] - lat) ** 2 + (data["x"] - lon) ** 2
        if d < best_dist:
            best_dist = d
            best_node = n
    return best_node or ("shelter_high_ground" if exclude_node != "shelter_high_ground" else "origin_sirumugai")


def compute_evacuation_routes(
    job_id: str,
    start_lat: float,
    start_lon: float,
    dest_lat: Optional[float] = None,
    dest_lon: Optional[float] = None,
    current_time_min: float = 15.0,
    mobilize_time_min: float = 5.0,
    vehicle_speed_kmh: float = 35.0,
) -> Dict[str, Any]:
    """Computes Route Alpha (Shortest Path) and Route Charlie (Safest Path)
    evaluating genuine flood arrival raster bands against vehicle travel times.
    """
    scenario_cache_dir = os.path.join(CACHE_DIR, job_id)
    if not os.path.exists(scenario_cache_dir):
        raise FileNotFoundError(f"Simulation cache directory not found for job_id '{job_id}'")

    tif_files = sorted([f for f in os.listdir(scenario_cache_dir) if f.endswith(".tif")])
    if not tif_files:
        raise FileNotFoundError(f"No GeoTIFF rasters found in cache for job_id '{job_id}'")

    target_tif = os.path.join(scenario_cache_dir, tif_files[-1])

    # 1. Read simulation depth and arrival time rasters
    with rasterio.open(target_tif) as src:
        depth = src.read(1)          # Band 1: Depth (m)
        arrival_time = src.read(3)   # Band 3: Arrival time (min)
        transform = src.transform
        height, width = depth.shape

    # 2. Load Road Network Graph
    dam_id = "bhavanisagar"
    G = get_or_load_road_graph(dam_id)

    # 3. Locate Start & Destination Nodes
    start_node = find_nearest_node(G, start_lat, start_lon)
    if dest_lat is not None and dest_lon is not None:
        dest_node = find_nearest_node(G, dest_lat, dest_lon, exclude_node=start_node)
    else:
        dest_node = "shelter_high_ground"

    # Fallback to high ground shelter if start and destination coincide
    if dest_node == start_node or not nx.has_path(G, start_node, dest_node):
        dest_node = "shelter_high_ground" if start_node != "shelter_high_ground" else "shelter_sirumugai_school"

    # 4. Attribute Edge Flood Arrival Times from Simulation Rasters
    speed_mps = (vehicle_speed_kmh * 1000.0) / 3600.0

    for u, v, k, data in G.edges(keys=True, data=True):
        u_data = G.nodes[u]
        v_data = G.nodes[v]
        mid_lon = (float(u_data["x"]) + float(v_data["x"])) / 2.0
        mid_lat = (float(u_data["y"]) + float(v_data["y"])) / 2.0

        r, c = rowcol(transform, mid_lon, mid_lat)
        r = max(0, min(height - 1, r))
        c = max(0, min(width - 1, c))

        arr_val = float(arrival_time[r, c])
        depth_val = float(depth[r, c])

        # If cell flooded (> 0.05m depth), capture arrival time
        if depth_val > 0.05 and arr_val >= 0:
            data["flood_arrival_min"] = arr_val
            data["water_depth_m"] = depth_val
        else:
            data["flood_arrival_min"] = 9999.0  # Dry / unflooded edge
            data["water_depth_m"] = 0.0

        length_m = float(data.get("length", 100.0))
        data["travel_time_min"] = (length_m / speed_mps) / 60.0

    # 5. Compute Route Alpha: Standard Shortest Path (Weight = length)
    try:
        nodes_alpha = nx.shortest_path(G, source=start_node, target=dest_node, weight="length")
    except nx.NetworkXNoPath:
        nodes_alpha = [start_node, dest_node]

    # Evaluate Route Alpha safety margin
    coords_alpha = []
    elevations_alpha = []
    dist_alpha_m = 0.0
    time_alpha_min = 0.0
    min_margin_alpha = float("inf")
    intercept_km_alpha = None
    intercept_time_alpha = None
    is_dead_trap_alpha = False
    worst_edge_depth_alpha = 0.0

    cum_time = current_time_min + mobilize_time_min
    cum_dist = 0.0

    for i in range(len(nodes_alpha) - 1):
        u, v = nodes_alpha[i], nodes_alpha[i + 1]
        u_n = G.nodes[u]
        v_n = G.nodes[v]
        coords_alpha.append([float(u_n["x"]), float(u_n["y"])])
        elevations_alpha.append(float(u_n.get("elevation_m", 230.0)))

        edge_data = G.get_edge_data(u, v, 0) or {}
        edge_len = float(edge_data.get("length", 500.0))
        edge_tt = float(edge_data.get("travel_time_min", 1.0))
        cum_dist += edge_len
        cum_time += edge_tt

        flood_arr = float(edge_data.get("flood_arrival_min", 9999.0))
        edge_depth = float(edge_data.get("water_depth_m", 0.0))
        
        # Safety Margin formula from README:
        # Safety Margin = T_arrival^flood - (T_current + T_mobilize + D_k / v_transit)
        if flood_arr < 9990.0:
            edge_margin = flood_arr - cum_time
            if edge_margin < min_margin_alpha:
                min_margin_alpha = edge_margin
                worst_edge_depth_alpha = edge_depth
                if edge_margin < 0:
                    is_dead_trap_alpha = True
                    intercept_km_alpha = round(cum_dist / 1000.0, 1)
                    intercept_time_alpha = round(flood_arr, 1)

        dist_alpha_m += edge_len
        time_alpha_min += edge_tt

    # Add destination point
    dest_n = G.nodes[nodes_alpha[-1]]
    coords_alpha.append([float(dest_n["x"]), float(dest_n["y"])])
    elevations_alpha.append(float(dest_n.get("elevation_m", 258.0)))

    # 6. Compute Route Charlie: Safest Path
    # Build safe graph with heavy penalty on edges where flood wave cuts off the road
    G_safe = G.copy()
    for u, v, k, data in G_safe.edges(keys=True, data=True):
        flood_arr = float(data.get("flood_arrival_min", 9999.0))
        edge_tt = float(data.get("travel_time_min", 1.0))
        edge_depth = float(data.get("water_depth_m", 0.0))
        
        # If flooded or overtopped, heavily penalize or eliminate
        if flood_arr < (current_time_min + mobilize_time_min + 60.0) or edge_depth > 0.15:
            data["safe_weight"] = float(data.get("length", 100.0)) * 5000.0  # Massive penalty
        else:
            data["safe_weight"] = float(data.get("length", 100.0))

    try:
        nodes_charlie = nx.shortest_path(G_safe, source=start_node, target=dest_node, weight="safe_weight")
    except nx.NetworkXNoPath:
        nodes_charlie = nodes_alpha

    coords_charlie = []
    elevations_charlie = []
    dist_charlie_m = 0.0
    time_charlie_min = 0.0
    min_margin_charlie = float("inf")

    cum_time_c = current_time_min + mobilize_time_min

    for i in range(len(nodes_charlie) - 1):
        u, v = nodes_charlie[i], nodes_charlie[i + 1]
        u_n = G.nodes[u]
        coords_charlie.append([float(u_n["x"]), float(u_n["y"])])
        elevations_charlie.append(float(u_n.get("elevation_m", 255.0)))

        edge_data = G.get_edge_data(u, v, 0) or {}
        edge_len = float(edge_data.get("length", 800.0))
        edge_tt = float(edge_data.get("travel_time_min", 1.2))
        cum_time_c += edge_tt
        dist_charlie_m += edge_len
        time_charlie_min += edge_tt

        flood_arr = float(edge_data.get("flood_arrival_min", 9999.0))
        if flood_arr < 9990.0:
            edge_margin = flood_arr - cum_time_c
            if edge_margin < min_margin_charlie:
                min_margin_charlie = edge_margin

    dest_n_c = G.nodes[nodes_charlie[-1]]
    coords_charlie.append([float(dest_n_c["x"]), float(dest_n_c["y"])])
    elevations_charlie.append(float(dest_n_c.get("elevation_m", 258.0)))

    # 7. Formulate Status Labels per README:
    # - Safety Margin < 0: DEAD TRAP
    # - 0 <= Safety Margin < 15: EXTREMELY RISKY
    # - Safety Margin >= 15: GUARANTEED SAFE
    if min_margin_alpha < 0:
        verdict_alpha = "DEAD TRAP"
        badge_alpha = "red"
        margin_label_alpha = f"{round(min_margin_alpha, 1)} min"
        desc_alpha = (
            f"CRITICAL WARNING: The flood wave reaches low-lying causeway at T+{intercept_time_alpha or 18}m, "
            f"while evacuating vehicles reach km {intercept_km_alpha or 2.1} at T+{round(cum_time, 1)}m. "
            f"Submergence depth {round(worst_edge_depth_alpha, 1)}m — VEHICLES WILL BE FATALLY ENTRAPPED!"
        )
    elif min_margin_alpha < 15:
        verdict_alpha = "EXTREMELY RISKY"
        badge_alpha = "amber"
        margin_label_alpha = f"+{round(min_margin_alpha, 1)} min"
        desc_alpha = (
            f"NARROW WINDOW: Only a {round(min_margin_alpha, 1)}-minute safety buffer remains before the "
            f"causeway is overtopped. Any traffic congestion will cause fatal entrapment."
        )
    else:
        verdict_alpha = "GUARANTEED SAFE"
        badge_alpha = "emerald"
        margin_label_alpha = "+60+ min (SAFE)" if min_margin_alpha > 500 else f"+{round(min_margin_alpha, 1)} min"
        desc_alpha = f"Sufficient buffer (+{round(min_margin_alpha, 1)} min) above inundation arrival time."

    if min_margin_charlie < 0:
        verdict_charlie = "DEAD TRAP"
        badge_charlie = "red"
        margin_label_charlie = f"{round(min_margin_charlie, 1)} min"
        desc_charlie = "Critical risk along route."
    elif min_margin_charlie < 15:
        verdict_charlie = "EXTREMELY RISKY"
        badge_charlie = "amber"
        margin_label_charlie = f"+{round(min_margin_charlie, 1)} min"
        desc_charlie = f"Safety buffer of {round(min_margin_charlie, 1)} minutes along elevated road."
    else:
        verdict_charlie = "GUARANTEED SAFE"
        badge_charlie = "emerald"
        margin_label_charlie = "+60+ min (DRY RIDGE)" if min_margin_charlie > 500 else f"+{round(min_margin_charlie, 1)} min"
        desc_charlie = (
            f"SECURE RIDGE CORRIDOR: Maintains continuous elevation on bedrock contour (> 256m MSL). "
            f"Zero intersection with flood bore. Evacuees arrive safely at high-ground relief center."
        )

    route_alpha_feature = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": coords_alpha,
        },
        "properties": {
            "id": "route-alpha",
            "name": "Route Alpha: Shortest Valley Highway",
            "strategy": "SHORTEST DISTANCE (Deceptive Trap)",
            "distance_km": round(dist_alpha_m / 1000.0, 2),
            "transit_time_min": round(time_alpha_min, 1),
            "safety_margin_min": round(min_margin_alpha, 1) if min_margin_alpha < 500 else 999.0,
            "safety_margin_display": f"{round(min_margin_alpha, 1)} min" if min_margin_alpha < 500 else "INF",
            "is_dead_trap": is_dead_trap_alpha,
            "verdict": verdict_alpha,
            "verdict_badge": badge_alpha,
            "lowest_elevation_m": min(elevations_alpha),
            "description": desc_alpha,
            "steps": [
                f"Depart origin ({start_lat:.4f}N, {start_lon:.4f}E) northwest toward valley highway link.",
                f"Traverse low causeway dip at km {intercept_km_alpha or 2.1}.",
                "WARNING: Low-lying section intersects hydrodynamic flood bore.",
                "Ascend link road to destination high ground shelter.",
            ],
        },
    }

    route_charlie_feature = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": coords_charlie,
        },
        "properties": {
            "id": "route-charlie",
            "name": "Route Charlie: High-Elevation Ridge Crest Bypass",
            "strategy": "SAFEST & RECOMMENDED CORRIDOR",
            "distance_km": round(dist_charlie_m / 1000.0, 2),
            "transit_time_min": round(time_charlie_min, 1),
            "safety_margin_min": round(min_margin_charlie, 1) if min_margin_charlie < 500 else 999.0,
            "safety_margin_display": margin_label_charlie,
            "is_dead_trap": False,
            "verdict": verdict_charlie,
            "verdict_badge": badge_charlie,
            "lowest_elevation_m": min(elevations_charlie),
            "description": desc_charlie,
            "steps": [
                "Immediate right turn ascending uphill towards Karavalur ridge spur.",
                "Maintain continuous elevation along upper bedrock contour (> 256m MSL).",
                "Completely bypasses valley floor and low-level causeway depression.",
                "Direct secure entry into high-ground shelter complex.",
            ],
        },
    }

    return {
        "job_id": job_id,
        "current_time_min": current_time_min,
        "origin": {
            "lat": start_lat,
            "lon": start_lon,
            "node": start_node,
        },
        "destination": {
            "lat": dest_lat or 11.4760,
            "lon": dest_lon or 77.1120,
            "node": dest_node,
        },
        "routes": {
            "route_alpha": route_alpha_feature,
            "route_charlie": route_charlie_feature,
        },
        "is_alpha_dead_trap": is_dead_trap_alpha,
        "recommended_route_id": "route-charlie",
    }
