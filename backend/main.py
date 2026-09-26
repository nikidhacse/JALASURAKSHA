"""JALASURAKSHA FastAPI Application Entrypoint.

Hydrodynamic Dam Break Inundation Simulation Engine (PS161 / SIH26161 - NTRO).
"""

import sys
import os

# Configure UTF-8 on Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.simulate import router as simulate_router
from backend.api.impact import router as impact_router
from backend.api.evacuate import router as evacuate_router
from backend.data_layer.dam_config import KNOWN_DAMS

app = FastAPI(
    title="JALASURAKSHA Hydrodynamic Engine API",
    version="2.0.0",
    description=(
        "Computational backend for dam-break inundation modeling, 2D diffusive-wave "
        "shallow water simulation, Froehlich (2008) peak breach hydrographs, and "
        "georeferenced GeoTIFF raster generation. Built for NTRO PS161 / SIH2026."
    ),
)

# Enable CORS for Vite frontend on localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(simulate_router)
app.include_router(impact_router)
app.include_router(evacuate_router)


@app.get("/", tags=["Health & Info"])
def root():
    return {
        "system": "JALASURAKSHA AI Digital Twin Hydrodynamic Engine",
        "organization": "National Technical Research Organisation (NTRO) // SIH26161",
        "version": "2.0.0",
        "status": "OPERATIONAL",
        "available_basins": list(KNOWN_DAMS.keys()),
        "endpoints": {
            "post_simulate": "POST /simulate",
            "get_job_status": "GET /simulate/{job_id}",
            "get_geotiff": "GET /simulate/{job_id}/geotiff/{step_idx}",
            "docs": "/docs",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
