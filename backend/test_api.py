"""API Integration Test for FastAPI Simulation Endpoints."""

import os
import sys
import time

if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_fastapi_endpoints():
    print("=" * 80)
    print("[TEST] FASTAPI SIMULATION ENGINE INTEGRATION TEST")
    print("=" * 80)

    # 1. Test Root
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    print("  --> Root Endpoint OK:", data["system"])

    # 2. Test POST /simulate
    payload = {
        "dam_id": "bhavanisagar",
        "reservoir_level": 95.0,
        "breach_width": 100.0,
        "breach_formation_time": 20.0,
        "rainfall_scenario": "heavy",
        "duration_hours": 0.5,       # 30 min test
        "timestep_minutes": 10.0,
    }
    post_res = client.post("/simulate", json=payload)
    assert post_res.status_code == 202, f"Expected 202, got {post_res.status_code}"
    post_data = post_res.json()
    job_id = post_data["job_id"]
    print(f"  --> POST /simulate OK: Enqueued job_id={job_id}")

    # 3. Poll GET /simulate/{job_id}
    print("  --> Polling simulation status until completion...")
    for _ in range(30):
        get_res = client.get(f"/simulate/{job_id}")
        assert get_res.status_code == 200
        job_data = get_res.json()
        status = job_data["status"]
        progress = job_data["progress_pct"]
        print(f"      Job {job_id}: status={status}, progress={progress}%")
        if status in ("completed", "failed"):
            break
        time.sleep(1.0)

    assert job_data["status"] == "completed", f"Job failed: {job_data.get('error_message')}"
    print(f"  --> Simulation Completed! Peak Outflow: {job_data['peak_discharge_m3s']} m3/s")
    print(f"  --> Generated {len(job_data['timesteps'])} timestep rasters:")
    for ts in job_data["timesteps"]:
        print(f"      Step {ts['timestep_min']} min | Area: {ts['flooded_area_km2']} km2 | Max Depth: {ts['max_depth_m']} m | URL: {ts['geotiff_download_url']}")

    # 4. Test GET /simulate/{job_id}/geotiff/1
    tif_res = client.get(f"/simulate/{job_id}/geotiff/1")
    assert tif_res.status_code == 200
    assert len(tif_res.content) > 1000, "GeoTIFF content must be non-empty"
    print(f"  --> GET GeoTIFF Download OK: Received {len(tif_res.content)} bytes of image/tiff")

    print("\n" + "=" * 80)
    print("[SUCCESS] ALL FASTAPI API ENDPOINTS VERIFIED & FUNCTIONAL!")
    print("=" * 80)
    return True


if __name__ == "__main__":
    test_fastapi_endpoints()
