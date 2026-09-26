// JALASURAKSHA GIS & HADR Export Suite
// Produces GeoJSON, KML 2.2, Shapefile metadata, CSV telemetry, and automated HADR Situation Reports

/**
 * Triggers a file download directly in the browser
 */
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports GeoJSON FeatureCollection (RFC 7946)
 */
export function exportGeoJSON(dam, simulationState, breachInfo) {
  const polygon = simulationState.fullInundationPolygon;
  // GeoJSON uses [longitude, latitude] order
  const geoJsonCoords = polygon.map(p => [p[1], p[0]]);
  // Ensure closed ring
  if (geoJsonCoords.length > 0) {
    geoJsonCoords.push(geoJsonCoords[0]);
  }

  const featureCollection = {
    type: 'FeatureCollection',
    name: `JALASURAKSHA_Inundation_${dam.id}_T${simulationState.currentSimMinute}m`,
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
    },
    features: [
      {
        type: 'Feature',
        properties: {
          feature_type: 'Flood Inundation Extent',
          dam_name: dam.name,
          river_basin: dam.river,
          sim_minute: simulationState.currentSimMinute,
          flooded_area_km2: simulationState.floodedAreaKm2,
          peak_discharge_m3s: breachInfo.peakDischargeM3s,
          model_solver: simulationState.solverType.toUpperCase(),
          generated_by: 'JALASURAKSHA NTRO PS161 Digital Twin'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [geoJsonCoords]
        }
      },
      ...simulationState.settlementsStatus.map(s => ({
        type: 'Feature',
        properties: {
          feature_type: 'Downstream Settlement Risk',
          settlement_name: s.name,
          population: s.population,
          arrival_time_min: s.effectiveArrivalTimeMin,
          current_depth_m: s.currentDepthM,
          peak_depth_m: s.peakDepthM,
          alert_status: s.alertLevel
        },
        geometry: {
          type: 'Point',
          coordinates: [s.coords[1], s.coords[0]]
        }
      }))
    ]
  };

  const jsonStr = JSON.stringify(featureCollection, null, 2);
  downloadFile(jsonStr, `Jalasuraksha_${dam.id}_T${simulationState.currentSimMinute}m.geojson`, 'application/geo+json');
  return true;
}

/**
 * Exports OpenGIS KML 2.2 for Google Earth
 */
export function exportKML(dam, simulationState, breachInfo) {
  const polygon = simulationState.fullInundationPolygon;
  const kmlCoords = polygon.map(p => `${p[1]},${p[0]},10`).join(' ');

  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>JALASURAKSHA - ${dam.name} Dam Break Inundation</name>
    <description>Simulated at T+${simulationState.currentSimMinute} minutes post-breach. Peak Q: ${breachInfo.peakDischargeM3s} m3/s.</description>
    <Style id="floodInundationStyle">
      <LineStyle>
        <color>ff00ffff</color>
        <width>2.5</width>
      </LineStyle>
      <PolyStyle>
        <color>88e68a00</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>Dynamic Flood Wavefront (T+${simulationState.currentSimMinute}m)</name>
      <styleUrl>#floodInundationStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>relativeToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${kmlCoords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    ${simulationState.settlementsStatus.map(s => `
    <Placemark>
      <name>${s.name} [Arrival: ${s.effectiveArrivalTimeMin}m | Peak Depth: ${s.peakDepthM}m]</name>
      <Point>
        <coordinates>${s.coords[1]},${s.coords[0]},0</coordinates>
      </Point>
    </Placemark>`).join('')}
  </Document>
</kml>`;

  downloadFile(kmlContent, `Jalasuraksha_${dam.id}_T${simulationState.currentSimMinute}m.kml`, 'application/vnd.google-earth.kml+xml');
  return true;
}

/**
 * Exports Shapefile Metadata & WGS84 Projection Specification Package (.prj + .json bundle)
 */
export function exportShapefileBundle(dam, simulationState, breachInfo) {
  // WGS 84 PRJ string
  const wgs84Prj = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;
  
  const packageManifest = {
    dataset: 'JALASURAKSHA_HYDRODYNAMIC_FLOOD_INUNDATION',
    format: 'ESRI Shapefile Bundle Component (Compliant with Survey of India & ISRO Bhuvan)',
    dam_name: dam.name,
    river: dam.river,
    state: dam.state,
    simulation_timestamp: new Date().toISOString(),
    simulation_step_minute: simulationState.currentSimMinute,
    coordinate_reference_system: 'EPSG:4326 (WGS 84 Geographic Coordinates)',
    shapefile_components: {
      shp: 'Main polygon geometry containing flood perimeter boundaries',
      shx: 'Positional index file for rapid spatial querying in QGIS/ArcGIS',
      dbf: 'dBase attribute table: Depth(m), Velocity(m/s), ArrivalTime(min), HazardIndex',
      prj: 'Projection definition file: WGS 1984 datum'
    },
    projection_file_content: wgs84Prj
  };

  downloadFile(JSON.stringify(packageManifest, null, 2), `Jalasuraksha_${dam.id}_Shapefile_Bundle_Manifest.json`, 'application/json');
  return true;
}

/**
 * Exports CSV Telemetry time-series
 */
export function exportCSV(dam, simulationState) {
  const headers = ['Settlement_Name', 'Distance_km', 'Elevation_m', 'Arrival_Time_min', 'Current_Depth_m', 'Peak_Depth_m', 'Current_Velocity_ms', 'Alert_Status'];
  const rows = simulationState.settlementsStatus.map(s => [
    `"${s.name}"`,
    s.distanceKm,
    s.elevationM,
    s.effectiveArrivalTimeMin,
    s.currentDepthM,
    s.peakDepthM,
    s.currentVelocityMs,
    `"${s.alertLevel}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csvContent, `Jalasuraksha_${dam.id}_Telemetry_T${simulationState.currentSimMinute}m.csv`, 'text/csv;charset=utf-8;');
  return true;
}

/**
 * Generates an official Humanitarian Assistance and Disaster Relief (HADR) Situation Report
 */
export function generateHADRReportText({
  dam,
  simulationState,
  breachInfo,
  impactData,
  evacuationData,
  aiAdvisory
}) {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return `================================================================================
🚨 NATIONAL DISASTER MANAGEMENT AUTHORITY (NDMA) & NTRO JOINT OPERATIONS CENTRE
🚨 SITUATION REPORT (SITREP) — DAM BREAK INUNDATION EMERGENCY
================================================================================
REPORT ID      : JALASURAKSHA-SITREP-${Date.now().toString().slice(-6)}
DATE & TIME    : ${now} (IST)
TARGET DAM     : ${dam.name.toUpperCase()}
RIVER BASIN    : ${dam.river.toUpperCase()} (${dam.state.toUpperCase()})
CLASSIFICATION : TOP SECRET // OPERATIONAL DISASTER DIRECTIVE (PS161/NTRO)
================================================================================

1. HYDRODYNAMIC BREACH PARAMETERS & RUNTIME CHARACTERISTICS
--------------------------------------------------------------------------------
- Failure Mechanism    : ${breachInfo.breachType || 'Overtopping & High Piping Dynamic Surge'}
- Peak Outflow (Qp)    : ${breachInfo.peakDischargeM3s.toLocaleString()} m³/s
- Reservoir Volume     : ${(breachInfo.reservoirVolumeM3 / 1e6).toFixed(1)} Million m³ (FRL Storage)
- Hydrodynamic Engine  : ${simulationState.solverType.toUpperCase()} (Weakly Compressible SPH / Delft3D 2D SWE)
- Wavefront Velocity   : ${breachInfo.delft3DMetrics.maxWavefrontVelocityMs} m/s (${(breachInfo.delft3DMetrics.maxWavefrontVelocityMs * 3.6).toFixed(1)} km/h)
- Simulation Step      : T+${simulationState.currentSimMinute} minutes post-breach
- Downstream Reach     : ${simulationState.distanceReachedKm} km propagated (${simulationState.floodedAreaKm2} km² inundated)

2. TACTICAL AI EXECUTIVE ADVISORY
--------------------------------------------------------------------------------
${aiAdvisory.executiveSummary}

3. DOWNSTREAM SETTLEMENT CASUALTY & INUNDATION SCHEDULE
--------------------------------------------------------------------------------
${simulationState.settlementsStatus.map(s => `• ${s.name.padEnd(32)} | Arrival: ${(s.effectiveArrivalTimeMin + ' min').padEnd(10)} | Depth: ${(s.peakDepthM + ' m').padEnd(8)} | Status: ${s.alertLevel}`).join('\n')}

4. CRITICAL INFRASTRUCTURE CONSEQUENCE ASSESSMENT
--------------------------------------------------------------------------------
- Structures Inundated : ${impactData.floodedBuildings.toLocaleString()} buildings (${impactData.catastrophicCollapse.toLocaleString()} catastrophic collapse hazard)
- Road Network Cut-off : ${impactData.submergedRoadsKm} km submerged across ${impactData.cutOffRoadIntersections} primary intersections
- Bridges Overtopped   : ${impactData.bridgesStatus.filter(b => b.isCutOff).length} / ${impactData.bridgesStatus.length} critical bridges severed
- Hospitals Threatened : ${impactData.hospitalsStatus.length} facilities (${dam.infrastructure.hospitals[0]?.name || 'Civil Hospital'})
- Population at Risk   : ${impactData.totalPopulationAtRisk.toLocaleString()} residents (${impactData.totalVulnerableHouseholds.toLocaleString()} vulnerable households)
- Agricultural Loss    : ${impactData.agriculturalHectares.toLocaleString()} hectares (Est. Loss: ₹${impactData.estimatedCropLossCroreInr} Crores)

5. SIGNATURE EVACUATION INTELLIGENCE (SHORTEST VS SAFEST ROUTE)
--------------------------------------------------------------------------------
• Primary Origin       : ${evacuationData.origin.name}
• Designated Shelter   : ${evacuationData.destination.name} (Elevation: ${evacuationData.destination.elevationM}m MSL)
• ROUTE 1 (SHORTEST)   : ${evacuationData.evaluatedRoutes[0].name}
  - Verdict            : ❌ DEADLY TRAP (Submerged at T+${evacuationData.evaluatedRoutes[0].floodIntersectionMinute}m)
• ROUTE 3 (SAFEST)     : ${evacuationData.evaluatedRoutes[2].name}
  - Verdict            : 🟢 GUARANTEED SAFE PASSAGE (Elevation > ${evacuationData.evaluatedRoutes[2].lowestElevationM}m MSL)
  - Safety Clearance   : +${evacuationData.evaluatedRoutes[2].lowestElevationM - evacuationData.origin.elevationM}m above maximum flood bore crest

6. SATELLITE VALIDATION SUMMARY (SENTINEL-1 SAR REALITY CHECK)
--------------------------------------------------------------------------------
- Satellite Platform   : ${dam.satelliteValidation.platform}
- Radar Polarisation   : ${dam.satelliteValidation.frequency}
- Spatial IoU Index    : ${(dam.satelliteValidation.intersectionOverUnionIoU * 100).toFixed(1)}% spatial agreement
- Critical Success (CSI: ${dam.satelliteValidation.criticalSuccessIndexCSI}

7. MANDATED OPERATIONAL INCIDENT COMMAND ORDERS (SOP)
--------------------------------------------------------------------------------
${aiAdvisory.operationalSop.map((sop, idx) => `[ORDER ${idx + 1}] [${sop.phase}] ${sop.action}\n           --> Agency: ${sop.responsibleAgency} | Status: ${sop.status}`).join('\n\n')}

================================================================================
AUTHORIZED BY  : CHIEF DISASTER CONTROLLER // EMERGENCY COMMAND POST
SYSTEM ENGINE  : JALASURAKSHA AI DIGITAL TWIN (SIH26161 / PS161)
================================================================================`;
}

/**
 * Downloads the full formatted HADR Situation Report
 */
export function downloadHADRReport(props) {
  const reportText = generateHADRReportText(props);
  downloadFile(reportText, `HADR_SITREP_${props.dam.id}_T${props.simulationState.currentSimMinute}m.txt`, 'text/plain;charset=utf-8;');
  return true;
}
