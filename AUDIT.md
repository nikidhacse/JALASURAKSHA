# JALASURAKSHA (SIH26161 / PS161) — Codebase & Data Authenticity Audit Report

**Date of Audit:** September 25, 2026  
**Audited Repository:** `c:\Users\cpoun\OneDrive\Desktop\SIH`  
**Target Organization / PS:** National Technical Research Organisation (NTRO) / Smart India Hackathon  
**Audit Objective:** Identify every hardcoded number, mocked dataset, synthetic scaling equation, scripted text, and non-dynamic element across all screens and services to determine the hackathon judging vulnerability profile.

---

## Executive Summary of Findings

| Screen / Component | Total Mock/Hardcoded Items | High Risk Items | Medium Risk Items | Low Risk Items |
| :--- | :---: | :---: | :---: | :---: |
| **Header & Global Navigation** | 3 | 0 | 1 | 2 |
| **Screen 01: Region Select** | 6 | 0 | 3 | 3 |
| **Screen 02: Breach Scenario** | 5 | 1 | 2 | 2 |
| **Screen 03: Flood Digital Twin** | 6 | 2 | 2 | 2 |
| **Screen 04: Impact & Evacuation** | 6 | 2 | 2 | 2 |
| **Screen 05: Validation & Report** | 7 | 2 | 3 | 2 |
| **Total Across Repository** | **33** | **7** | **13** | **13** |

---

## Screen 01: 🌍 Region & Basin Selector

### 1. Fixed Hydrological Baseline Records
- **File & Line:** [`src/data/damsData.js:12-21`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/data/damsData.js#L12-L21) (and lines 240–250, 326–335, 395–405 for other dams)
- **Data / Content:**
  - `crestLength: 8797`, `damHeight: 40.0`, `fullReservoirLevel: 32.0`, `storageCapacityMm3: 928`, `catchmentAreaKm2: 4200`, `normalDischargeM3s: 580`, `maxSpillwayDischargeM3s: 3400`, `riverSlope: 0.0014`, `manningsN: 0.035`, `builtYear: 1955`.
- **Rendered As:** Live hydrological profile facts in [`Screen01RegionSelect.jsx:144-175`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen01RegionSelect.jsx#L144-L175).
- **Labeling:** Presented as live hydrological dataset parameters.
- **Risk Rating:** **Low**. These reflect real-world Central Water Commission (CWC) public records for Bhavanisagar, Idukki, etc., and switch dynamically when another dam card is clicked.

### 2. DEM Longitudinal Profile Data Points
- **File & Line:** [`src/data/damsData.js:28-35`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/data/damsData.js#L28-L35)
- **Data / Content:**
  - Static 6-point array: `[{ km: 0, elevation: 280, riverBed: 240 }, ... { km: 50, elevation: 198, riverBed: 185 }]`.
- **Rendered As:** "Downstream DEM Longitudinal Elevation Profile (CartoDEM 30m)" SVG graph in [`Screen01RegionSelect.jsx:189-251`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen01RegionSelect.jsx#L189-L251).
- **Labeling:** Presented as extracted 30m CartoDEM raster data.
- **Risk Rating:** **Medium**. If a judge asks whether this is sampled live from a 30m DEM GeoTIFF raster along arbitrary river coordinates, it will be discovered that it is an interpolated SVG spline across 6 manually scripted points.

### 3. CWC Hydrodynamic Calibration Disclaimer
- **File & Line:** [`src/components/Screen01RegionSelect.jsx:181`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen01RegionSelect.jsx#L181)
- **Data / Content:**
  - String: `"Hydrodynamic Calibration Ready: River geometry is calibrated with historical Central Water Commission (CWC) gauge discharge rating curves."`
- **Rendered As:** Live telemetry status badge.
- **Labeling:** Unlabeled text assertion.
- **Risk Rating:** **Medium**. Scripted claim—there is no live CWC API integration or actual Manning roughness rating-curve calibration table connected to the riverbed.

### 4. Downstream Settlement Demographics & Baseline Arrival
- **File & Line:** [`src/data/damsData.js:56-107`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/data/damsData.js#L56-L107)
- **Data / Content:**
  - `population: 24800`, `distanceKm: 6.2`, `elevationM: 238`, `criticalArrivalTimeMin: 18`, `peakDepthM: 4.8`, `peakVelocityMs: 5.2`, `vulnerableHouseholds: 2150`.
- **Rendered As:** Baseline vulnerability summary cards in [`Screen01RegionSelect.jsx:254-275`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen01RegionSelect.jsx#L254-L275).
- **Labeling:** Presented as census and hydrodynamic baseline statistics.
- **Risk Rating:** **Low**. Realistic census approximations; changes per dam.

---

## Screen 02: 💥 Breach Scenario & "What-If" Simulator

### 1. Empirical Breach Outflow Scaling Coefficients
- **File & Line:** [`src/services/hydroEngine.js:22-37`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/hydroEngine.js#L22-L37)
- **Data / Content:**
  - `hw = dam.damHeight * (reservoirPercent / 100) * (breachType === 'overtopping' ? 1.05 : 0.88)`
  - `froehlichQp = 0.607 * Math.pow(currentVolumeM3, 0.295) * Math.pow(hw, 1.24) * Math.pow(widthRatio, 0.65)`
  - Rainfall surcharge multipliers: `dam.maxSpillwayDischargeM3s * 0.65` (heavy) and `* 1.45` (cloudburst).
- **Rendered As:** Live calculated peak discharge ($Q_p$) in [`Screen02BreachScenario.jsx:254-280`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen02BreachScenario.jsx#L254-L280).
- **Labeling:** Rendered as live physics calculations.
- **Risk Rating:** **Low**. The calculations respond in real-time to all slider inputs (reservoir %, breach width, formation time, rainfall).

### 2. Delft3D vs SPH Hardcoded Runtime & Particle Benchmarks
- **File & Line:** [`src/services/hydroEngine.js:44-62`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/hydroEngine.js#L44-L62)
- **Data / Content:**
  - `computeRuntimeSec: 4.8` (Delft3D) and `computeRuntimeSec: 32.4` (SPH)
  - `gridResolution: '10m curvilinear staggered Arakawa-C grid'`
  - `particleCount: '1.25 Million Particles (WCSPH Wendland C4 kernel)'`
  - SPH peak velocity multiplier: `delft3DMetrics.maxWavefrontVelocityMs * 1.22`
  - SPH peak discharge multiplier: `totalPeakDischarge * 1.04`
  - Dam toe hydraulic jump: `hw * 0.42` vs `hw * 0.58`
- **Rendered As:** Real-time solver benchmark execution cards in [`Screen02BreachScenario.jsx:208-245`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen02BreachScenario.jsx#L208-L245).
- **Labeling:** Rendered as if Delft3D and SPH backend solvers actually ran and took 4.8s vs 32.4s.
- **Risk Rating:** **HIGH**. The runtime numbers (`4.8s` and `32.4s`) and particle count (`1.25 Million Particles`) never change regardless of basin size, mesh resolution, or browser hardware. SPH is simulated via scalar multipliers ($1.04\times, 1.22\times$) rather than an actual compiled C++/CUDA SPH Navier-Stokes solver.

### 3. Fixed Benchmark Presets (Scenario A, B, C)
- **File & Line:** [`src/services/hydroEngine.js:233-267`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/hydroEngine.js#L233-L267)
- **Data / Content:**
  - Scenario A: `100m, 85%, 45 min, normal, overtopping`
  - Scenario B: `220m, 95%, 25 min, heavy, piping`
  - Scenario C: `350m, 102%, 12 min, cloudburst, overtopping`
- **Rendered As:** Preset buttons in [`Screen02BreachScenario.jsx:75-125`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen02BreachScenario.jsx#L75-L125).
- **Labeling:** Labeled as presets.
- **Risk Rating:** **Low**. Clear UI preset behavior.

### 4. What-If Comparison Matrix Static Simulation Benchmark Time
- **File & Line:** [`src/services/hydroEngine.js:282`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/hydroEngine.js#L282)
- **Data / Content:**
  - Hardcoded evaluation minute: `currentSimMinute: 120`.
- **Rendered As:** The multi-scenario comparison table in [`Screen02BreachScenario.jsx:290-360`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen02BreachScenario.jsx#L290-L360).
- **Labeling:** Labeled as T+120m benchmark.
- **Risk Rating:** **Medium**. If a judge changes custom sliders on the left, the matrix table for Scenarios A, B, and C does *not* dynamically include the custom scenario; it only compares fixed Presets A, B, and C.

---

## Screen 03: 🌊 Flood Digital Twin (3D + 2D)

### 1. Synthetic Inundation Polygon Generation
- **File & Line:** [`src/services/hydroEngine.js:184-194`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/hydroEngine.js#L184-L194)
- **Data / Content:**
  - Corridor width formula: `localWidthKm = (0.35 + reachFraction * 1.8) * (breachInfo.peakDischargeM3s / 12000)`
  - Coordinate offset: `degOffset = (localWidthKm / 111.0) * 0.5`
- **Rendered As:** The active Leaflet flood boundary polygon in [`LeafletFloodMap.jsx:92-100`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/LeafletFloodMap.jsx#L92-L100).
- **Labeling:** Rendered as a hydrodynamic inundation boundary.
- **Risk Rating:** **HIGH**. The flood shape is an extruded buffer polygon flanking the river centerline points rather than a cell-by-cell 2D hydraulic grid solution over the actual digital elevation terrain. A GIS judge inspecting the GeoJSON vertex coordinates will see parallel offset lines along the centerline.

### 2. Three.js Procedural Synthetic Terrain
- **File & Line:** [`src/components/ThreeTerrainTwin.jsx:45-80`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/ThreeTerrainTwin.jsx#L45-L80)
- **Data / Content:**
  - Procedural trigonometric elevation:
    `valleyCenter = Math.sin(z * 0.015) * 45`
    `baseSlope = (150 - z) * 0.12`
    `ridgeHeight = Math.pow(Math.min(distFromValley / 70, 1), 2) * 90`
    `noise = (Math.sin(x * 0.05) + Math.cos(z * 0.05)) * 8`
  - Hardcoded dam box: `BoxGeometry(160, 45, 25)`
  - Particle count: `600`
- **Rendered As:** 3D WebGL Digital Twin labeled as `"3D WEBGL TERRAIN TWIN (DEM 30M)"` in [`ThreeTerrainTwin.jsx:195-205`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/ThreeTerrainTwin.jsx#L195-L205).
- **Labeling:** Labeled as "DEM 30M", but generated by a synthetic mathematical function.
- **Risk Rating:** **HIGH**. The 3D terrain does not load real GeoTIFF DEM heightmaps; it displays the same sinusoidal mountain valley regardless of whether Bhavanisagar, Idukki, or Hirakud is selected.

### 3. Flooded Area & Water Volume Approximations
- **File & Line:** [`src/services/hydroEngine.js:210-211`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/hydroEngine.js#L210-L211)
- **Data / Content:**
  - `floodedAreaKm2 = Number(((distanceReachedKm * 1.25) * Math.min(1.0, currentSimMinute / 120)).toFixed(1))`
  - `waterVolumeReleasedMm3 = Number(((currentDamDischarge * (currentSimMinute * 60)) / 1e6).toFixed(1))`
- **Rendered As:** Live telemetry readouts in [`Screen03FloodTwin.jsx:200-215`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen03FloodTwin.jsx#L200-L215).
- **Labeling:** Rendered as live hydrodynamic telemetry.
- **Risk Rating:** **Medium**. These are geometric approximations rather than raster cell integration.

### 4. Dynamic Water Depth Wave Rise Formula
- **File & Line:** [`src/services/hydroEngine.js:150-153`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/hydroEngine.js#L150-L153)
- **Data / Content:**
  - `riseFraction = Math.min(1.0, minutesSinceArrival / 35)`
  - `currentDepthM = Number((set.peakDepthM * Math.sin((riseFraction * Math.PI) / 2)).toFixed(2))`
- **Rendered As:** Settlement water depth in the 60-Minute Flood Arrival Clock.
- **Labeling:** Rendered as live depth measurements.
- **Risk Rating:** **Low**. Responsive to simulation timeline progression.

---

## Screen 04: 🚨 Impact & Evacuation

### 1. Infrastructure Damage Scalar Multipliers
- **File & Line:** [`src/services/impactEngine.js:12-23`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/impactEngine.js#L12-L23)
- **Data / Content:**
  - `floodedBuildings = Math.round(totalBuildingsInBasin * reachFraction * 0.58)`
  - `catastrophicCollapse = Math.round(floodedBuildings * 0.18)`
  - `severeWallDamage = Math.round(floodedBuildings * 0.34)`
  - `partialInundation = Math.round(floodedBuildings * 0.48)`
  - `submergedRoadsKm = Number((totalRoadsKm * reachFraction * 0.45).toFixed(1))`
  - `cutOffRoadIntersections = Math.round(submergedRoadsKm * 0.8)`
- **Rendered As:** "Impact Summary" cards in [`Screen04ImpactEvacuation.jsx:65-100`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen04ImpactEvacuation.jsx#L65-L100).
- **Labeling:** Implied to be a live OpenStreetMap GIS spatial intersection.
- **Risk Rating:** **HIGH**. The counts are computed via static fractions (`0.58`, `0.18`, `0.34`, `0.45`, `0.8`) of a baseline constant (`dam.infrastructure.totalBuildingsEstimated`), not an actual spatial intersection between the flood polygon and building footprint vectors.

### 2. Crop Loss Formula
- **File & Line:** [`src/services/impactEngine.js:72-73`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/impactEngine.js#L72-L73)
- **Data / Content:**
  - `agriculturalHectares = Math.round(floodedAreaKm2 * 68)`
  - `estimatedCropLossCroreInr = Number((agriculturalHectares * 0.018).toFixed(2))`
- **Rendered As:** Agricultural Loss KPI card in [`Screen04ImpactEvacuation.jsx:125-138`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen04ImpactEvacuation.jsx#L125-L138).
- **Labeling:** Rendered as economic damage modeling.
- **Risk Rating:** **Medium**. Uses fixed constants (68 ha/km² and ₹1.8 Lakh/ha) across all basins.

### 3. Hardcoded Evacuation Route Specifications
- **File & Line:** [`src/services/evacuationEngine.js:20-108`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/evacuationEngine.js#L20-L108)
- **Data / Content:**
  - Route Alpha: `distanceKm: 4.6`, `lowestElevationM: 221.0`, `crossDrainageKm: 2.1`, `floodIntersectionMinute = Math.round(floodArrivalTimeMin * 0.75)`
  - Route Bravo: `distanceKm: 6.1`, `lowestElevationM: 236.0`, `crossDrainageKm: 3.8`, `floodIntersectionMinute = Math.round(floodArrivalTimeMin * 1.3)`
  - Route Charlie: `distanceKm: 7.4`, `lowestElevationM: 256.0`, `floodIntersectionMinute: 9999`
  - Fixed route polylines: coordinate offsets `[+0.008, -0.012]`, `[+0.015, -0.022]`.
  - Static elevation profile: `[{ km: 0 }, { km: 1.5, elevation: 228 }, { km: 2.1, elevation: 221 }, ...]`
  - Hardcoded turn-by-turn text steps (e.g. `'Depart origin north-west onto State Highway Valley link.'`).
- **Rendered As:** "Dynamic Evacuation Routing" cards and instructions in [`Screen04ImpactEvacuation.jsx:170-250`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen04ImpactEvacuation.jsx#L170-L250).
- **Labeling:** Rendered as live pathfinding across road networks.
- **Risk Rating:** **HIGH**. If a judge selects a different origin settlement (e.g., switching from Sirumugai to Gobichettipalayam), the route distances (4.6 km, 6.1 km, 7.4 km), the road names, and the lowest elevations (221m, 236m, 256m) remain identical. The routes do not call an actual Dijkstra/A* pathfinder over OSM road networks.

### 4. Scripted AI Broadcast Bulletins & Incident SOP
- **File & Line:** [`src/services/aiInterpreter.js:28-89`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/aiInterpreter.js#L28-L89)
- **Data / Content:**
  - Static Tamil string: `"🚨 அவசர வெள்ள அபாய எச்சரிக்கை..."`
  - Static Malayalam string: `"🚨 അടിയന്തിര പ്രളയ മുന്നറിയിപ്പ്..."`
  - Static Hindi string: `"🚨 आपातकालीन बाढ़ चेतावनी..."`
  - 5 hardcoded SOP action items: `sop-1` through `sop-5` with static agencies (`District Emergency Operations Centre`, `State Electricity Board Grid Dispatch`, `Traffic & Highway Patrol Force`, `Health Services / 108 Ambulance Fleet`, `NDRF 04 Battalion / SDRF`).
- **Rendered As:** "🤖 AI Risk Interpreter" output in [`Screen04ImpactEvacuation.jsx:265-350`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen04ImpactEvacuation.jsx#L265-L350).
- **Labeling:** Presented as AI-generated text.
- **Risk Rating:** **Medium**. Deterministic template strings rather than live LLM API inference.

---

## Screen 05: 🛰️ Validation & Report

### 1. Synthetic Sentinel-1 SAR Dual-Pol Comparison
- **File & Line:** [`src/data/damsData.js:219-231`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/data/damsData.js#L219-L231) and [`src/services/satelliteValidation.js:5-17`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/satelliteValidation.js#L5-L17)
- **Data / Content:**
  - `observedWaterAreaKm2: 32.4`
  - `intersectionOverUnionIoU: 0.886`
  - `criticalSuccessIndexCSI: 0.842`
  - `geeAssetId: 'COPERNICUS/S1_GRD/S1C_IW_GRDH_1SDV_20260924T182240'`
  - Math in engine:
    `intersectionArea = Math.min(simArea, obsArea) * (satRef.intersectionOverUnionIoU || 0.88)`
    `unionArea = Math.max(simArea, obsArea) * 1.08`
    `iou = Number((intersectionArea / unionArea).toFixed(3))`
- **Rendered As:** Interactive Split-Curtain satellite comparison in [`Screen05ValidationReport.jsx:90-191`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen05ValidationReport.jsx#L90-L191).
- **Labeling:** Presented as live Google Earth Engine (GEE) Sentinel-1 SAR radar imagery.
- **Risk Rating:** **HIGH**. The split-curtain slider wipes between two CSS filtered versions of the same Unsplash background photograph (one with green tint, one with `hue-rotate-180` cyan tint). There is no active GEE Python API call or actual SAR raster tile layer.

### 2. Monte Carlo Uncertainty Table Hardcoded Values
- **File & Line:** [`src/services/satelliteValidation.js:19-41`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/satelliteValidation.js#L19-L41)
- **Data / Content:**
  - Fixed sensitivity strings:
    - Manning's $n$: `'± 8.4 minutes'`
    - DEM Accuracy: `'± 12.0% lateral boundary shift'`
    - Breach Width Growth Rate: `'± 18.5% peak discharge Qp'`
- **Rendered As:** "Scientific Uncertainty & Confidence Bands" in [`Screen05ValidationReport.jsx:215-255`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen05ValidationReport.jsx#L215-L255).
- **Labeling:** Labeled as "MONTE CARLO ROBUST".
- **Risk Rating:** **Medium**. Labeled as Monte Carlo analysis, but the resulting impact percentages and time shifts are hardcoded strings.

### 3. Static Discrepancy Factors
- **File & Line:** [`src/services/satelliteValidation.js:44-60`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/satelliteValidation.js#L44-L60)
- **Data / Content:**
  - 3 static explanations: "Vegetation Canopy Backscatter", "Specular Reflection from Smooth Tarmac", "SPH vs Delft3D Numerical Dispersion".
- **Rendered As:** Discrepancy analysis list in [`Screen05ValidationReport.jsx:195-210`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen05ValidationReport.jsx#L195-L210).
- **Labeling:** Static domain explanations.
- **Risk Rating:** **Low**. Scientifically accurate defense notes.

### 4. Shapefile Export Manifest (Non-Binary)
- **File & Line:** [`src/services/gisExport.js:114-142`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/gisExport.js#L114-L142)
- **Data / Content:**
  - Downloads `Jalasuraksha_<dam>_Shapefile_Bundle_Manifest.json` containing WGS84 PRJ string and JSON metadata.
- **Rendered As:** "Download Shapefile Bundle Manifest" button in [`Screen05ValidationReport.jsx:298-312`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen05ValidationReport.jsx#L298-L312).
- **Labeling:** Labeled as "ESRI Shapefile Bundle Component".
- **Risk Rating:** **Medium to High**. If a judge imports the downloaded file into QGIS or ArcGIS expecting a binary `.shp`/`.dbf`/`.shx` zip, GIS software will fail to parse it because it is a JSON descriptor file. *(Note: GeoJSON, KML 2.2, CSV, and SITREP downloads are 100% valid and fully functional).*

---

## Global / Cross-Cutting Features

### 1. Air Raid Siren Audio Synthesizer
- **File & Line:** [`src/components/Header.jsx:48-78`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Header.jsx#L48-L78)
- **Data / Content:**
  - Carrier frequency: `440 Hz`, LFO frequency: `0.35 Hz`, LFO gain: `250 Hz`.
- **Rendered As:** "TEST SIREN" button in Header.
- **Labeling:** Real synthesized audio.
- **Risk Rating:** **Low**. Functional Web Audio API synthesizer.

### 2. Live IST Clock
- **File & Line:** [`src/components/Header.jsx:28-36`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Header.jsx#L28-L36)
- **Data / Content:**
  - `toLocaleTimeString('en-IN') + ' IST'`
- **Rendered As:** Real-time clock in header.
- **Labeling:** Real live clock.
- **Risk Rating:** **Low**.

---

## Top 7 High-Risk Vulnerabilities to Address for Judging

1. **Procedural 3D Terrain Labeled as CartoDEM 30m** ([`ThreeTerrainTwin.jsx:45-80`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/ThreeTerrainTwin.jsx#L45-L80)):
   - *Issue*: 3D mountains are generated via mathematical sine/cosine curves rather than actual DEM elevation heightmaps.
   - *Judge Test*: A judge switching from Bhavanisagar (flat plains downstream) to Idukki (steep Western Ghats gorge) will see the identical 3D terrain shape.
2. **Fixed SPH & Delft3D Runtime Benchmark Numbers** ([`hydroEngine.js:50,60`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/hydroEngine.js#L50)):
   - *Issue*: `4.8s` and `32.4s` runtimes, and `1.25 Million Particles` are hardcoded numbers.
   - *Judge Test*: A judge asking to run SPH on a coarser grid or different reach will see the runtime remains exactly `32.4s`.
3. **Synthetic Inundation Corridor Extrusion** ([`hydroEngine.js:184-194`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/hydroEngine.js#L184-L194)):
   - *Issue*: The flood boundary polygon is generated by buffering coordinates perpendicular to the river centerline, rather than solving 2D Shallow Water Equations on a grid.
   - *Judge Test*: Inspecting GeoJSON polygon vertices reveals parallel corridor offsets.
4. **Hardcoded Evacuation Route Metrics Across Different Towns** ([`evacuationEngine.js:20-85`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/evacuationEngine.js#L20-L85)):
   - *Issue*: If the user changes the origin settlement dropdown from Sirumugai to Gobichettipalayam, all 3 routes still report distances of 4.6 km, 6.1 km, and 7.4 km with identical names and lowest elevations.
   - *Judge Test*: Selecting any settlement displays the exact same route distances and turns.
5. **Infrastructure Damage Fractional Multipliers** ([`impactEngine.js:12-23`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/impactEngine.js#L12-L23)):
   - *Issue*: Claimed to be an OpenStreetMap vector overlay, but computed using static scaling coefficients ($0.58, 0.18, 0.34, 0.45$).
   - *Judge Test*: Asking how building footprints are queried will reveal there is no Overpass API or spatial intersection code.
6. **Split-Curtain Satellite Images are CSS Filtered Unsplash Stock Photos** ([`Screen05ValidationReport.jsx:113-135`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/components/Screen05ValidationReport.jsx#L113-L135)):
   - *Issue*: Both the simulated flood and Sentinel-1 SAR radar image are generated by applying CSS filters (`hue-rotate-180`, `contrast-125`) over an Unsplash image.
   - *Judge Test*: Inspecting the element in DevTools reveals an Unsplash URL.
7. **Shapefile Export is a JSON Descriptor Rather than a Binary .shp/.dbf/.shx Zip** ([`gisExport.js:114-142`](file:///c:/Users/cpoun/OneDrive/Desktop/SIH/src/services/gisExport.js#L114-L142)):
   - *Issue*: Clicking "Download Shapefile Bundle" downloads a `.json` manifest rather than an ESRI Shapefile archive.
   - *Judge Test*: Loading the file into QGIS fails immediately.
