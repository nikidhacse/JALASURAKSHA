import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function LeafletFloodMap({
  dam,
  rasterData = null,
  simulationState,
  breachInfo,
  activeLayer = 'satellite' // 'satellite' | 'dark' | 'topo'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const floodLayerGroupRef = useRef(null);
  const baseTileLayerRef = useRef(null);

  // Basemap Tile URLs
  const tileUrls = {
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: dam.centerCoords,
        zoom: dam.zoom || 11,
        zoomControl: true,
        attributionControl: false
      });

      // Add default tile layer
      const tileLayer = L.tileLayer(tileUrls[activeLayer] || tileUrls.satellite, {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(map);
      baseTileLayerRef.current = tileLayer;

      // Group for dynamic flood layers
      const floodGroup = L.layerGroup().addTo(map);
      floodLayerGroupRef.current = floodGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [dam.id]);

  // Update base tile when activeLayer changes
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTileLayerRef.current) return;
    baseTileLayerRef.current.setUrl(tileUrls[activeLayer] || tileUrls.satellite);
  }, [activeLayer]);

  // 2. Render dynamic flood wavefront, inundation polygon, and infrastructure markers
  useEffect(() => {
    if (!mapInstanceRef.current || !floodLayerGroupRef.current) return;
    const group = floodLayerGroupRef.current;
    group.clearLayers();

    // A. River Centerline
    if (dam.riverCenterline && dam.riverCenterline.length > 1) {
      L.polyline(dam.riverCenterline, {
        color: '#38bdf8',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 8'
      }).addTo(group);
    }

    // B. Dam Location Icon Marker
    const damIcon = L.divIcon({
      className: 'dam-marker',
      html: `
        <div style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 0 12px rgba(239,68,68,0.7); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span>🛑 ${dam.name}</span>
        </div>
      `,
      iconSize: [120, 24],
      iconAnchor: [60, 12]
    });
    L.marker(dam.centerCoords, { icon: damIcon })
      .bindPopup(`
        <div style="padding: 4px;">
          <h4 style="font-weight: bold; color: #38bdf8; margin-bottom: 4px;">${dam.name}</h4>
          <p style="font-size: 12px; margin: 0;">Peak Breach Outflow: <b>${breachInfo.peakDischargeM3s.toLocaleString()} m³/s</b></p>
          <p style="font-size: 12px; margin: 0;">Failure Mode: <b>${breachInfo.breachType || 'Piping / Overtopping'}</b></p>
        </div>
      `)
      .addTo(group);

    // C. Dynamic Flood Inundation Polygon from Real Simulation Raster
    if (rasterData?.inundation_polygons && rasterData.inundation_polygons.length > 0) {
      rasterData.inundation_polygons.forEach((polyRing) => {
        if (polyRing.length > 2) {
          // Convert [lon, lat] -> [lat, lon]
          const latlngs = polyRing.map((c) => [c[1], c[0]]);
          L.polygon(latlngs, {
            color: '#06b6d4',
            weight: 2,
            fillColor: '#0284c7',
            fillOpacity: 0.62,
          })
          .bindPopup(`
            <div style="font-family: monospace; font-size: 11px;">
              <b style="color:#38bdf8;">Real Flood Inundation Extent</b><br/>
              Simulation Timestep: T+${rasterData.timestep_min} min<br/>
              Max Flood Depth: <b>${rasterData.max_depth_m} m</b><br/>
              Inundated Area: <b>${rasterData.flooded_area_km2} km²</b>
            </div>
          `)
          .addTo(group);
        }
      });
    } else if (simulationState.fullInundationPolygon && simulationState.fullInundationPolygon.length > 2) {
      L.polygon(simulationState.fullInundationPolygon, {
        color: '#06b6d4',
        weight: 2,
        fillColor: '#0284c7',
        fillOpacity: 0.55
      }).addTo(group);
    }

    // D. Real Velocity Vector Indicators from Simulation Raster
    if (rasterData?.velocity_vectors && rasterData.velocity_vectors.length > 0) {
      rasterData.velocity_vectors.forEach((vec) => {
        const arrowColor = vec.velocity_ms > 3.0 ? '#ef4444' : vec.velocity_ms > 1.5 ? '#f59e0b' : '#38bdf8';
        const arrowIcon = L.divIcon({
          className: 'flow-arrow',
          html: `
            <div style="transform: rotate(${vec.angle_deg}deg); color: ${arrowColor}; font-size: 15px; font-weight: bold; text-shadow: 0 0 5px #000;">
              ➔
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker([vec.lat, vec.lon], { icon: arrowIcon })
          .bindPopup(`
            <div style="padding: 4px; font-family: monospace; font-size: 11px;">
              <b>Hydrodynamic Flow Vector</b><br/>
              Velocity: <b style="color: ${arrowColor}">${vec.velocity_ms} m/s</b><br/>
              Depth: <b>${vec.depth_m} m</b>
            </div>
          `)
          .addTo(group);
      });
    } else if (simulationState.velocityVectors) {
      simulationState.velocityVectors.slice(0, 8).forEach(vec => {
        const arrowIcon = L.divIcon({
          className: 'flow-arrow',
          html: `
            <div style="transform: rotate(${vec.angleDeg}deg); color: #38bdf8; font-size: 14px; font-weight: bold; text-shadow: 0 0 4px #000;">
              ➔
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker(vec.coords, { icon: arrowIcon }).addTo(group);
      });
    }

    // E. Downstream Settlements Markers (Driven by Real Timestep Raster)
    const settlementsList = rasterData?.settlements || simulationState.settlementsStatus;
    settlementsList.forEach(set => {
      const isReached = set.is_reached ?? set.isReached;
      const depthM = set.current_depth_m ?? set.currentDepthM ?? 0.0;
      const minutesLeft = set.minutes_left ?? set.minutesUntilFlood ?? 99;

      const markerColor = isReached ? '#ef4444' : minutesLeft <= 30 ? '#f59e0b' : '#10b981';
      const labelText = isReached 
        ? `${set.name.split(' ')[0]} (${depthM.toFixed(1)}m)` 
        : minutesLeft < 90 ? `${set.name.split(' ')[0]} (${minutesLeft}m)` : set.name.split(' ')[0];
      
      const icon = L.divIcon({
        className: 'settlement-marker',
        html: `
          <div style="background: ${markerColor}; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span>${isReached ? '🌊' : '⏱️'}</span>
            <span>${labelText}</span>
          </div>
        `,
        iconSize: [110, 24],
        iconAnchor: [55, 12]
      });

      const coords = set.lat && set.lon ? [set.lat, set.lon] : set.coords;
      if (coords) {
        L.marker(coords, { icon })
          .bindPopup(`
            <div style="padding: 6px; font-family: sans-serif;">
              <div style="font-weight: bold; font-size: 13px; color: #38bdf8;">${set.name}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">Distance from Dam: ${set.dist_km ?? set.distanceKm} km</div>
              <div style="font-size: 12px; margin-bottom: 2px;">Wave Arrival Time: <b>${set.arrival_time_min ?? set.effectiveArrivalTimeMin ?? 'Uninundated'} min</b></div>
              <div style="font-size: 12px; margin-bottom: 2px;">Current Depth: <b style="color: ${isReached ? '#ef4444' : '#10b981'};">${depthM.toFixed(2)} m</b></div>
              <div style="margin-top: 6px; font-size: 11px; padding: 3px 6px; border-radius: 4px; background: ${isReached ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}; color: ${isReached ? '#f87171' : '#34d399'}; border: 1px solid ${isReached ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}; text-align: center; font-weight: bold;">
                ${isReached ? 'INUNDATED' : minutesLeft <= 30 ? 'IMMEDIATE EVACUATION' : 'ADVISORY'}
              </div>
            </div>
          `)
          .addTo(group);
      }
    });

    // F. Infrastructure: Bridges & Shelters
    dam.infrastructure.bridges.forEach(br => {
      const currentTime = rasterData?.timestep_min ?? simulationState.currentSimMinute;
      const isCut = currentTime >= br.inundationTimeMin;
      const brIcon = L.divIcon({
        className: 'infra-marker',
        html: `
          <div style="background: ${isCut ? '#7f1d1d' : '#1e293b'}; color: ${isCut ? '#fca5a5' : '#38bdf8'}; padding: 2px 6px; border-radius: 4px; font-size: 10px; border: 1px solid ${isCut ? '#ef4444' : '#38bdf8'}; font-weight: 600;">
            🌉 ${br.name.split(' ')[0]} ${isCut ? '[CLOSED]' : ''}
          </div>
        `,
        iconSize: [90, 20],
        iconAnchor: [45, 10]
      });
      L.marker(br.coords, { icon: brIcon }).addTo(group);
    });

    dam.infrastructure.schoolsShelters.forEach(sh => {
      const shIcon = L.divIcon({
        className: 'shelter-marker',
        html: `
          <div style="background: #064e3b; color: #6ee7b7; padding: 2px 6px; border-radius: 4px; font-size: 10px; border: 1px solid #10b981; font-weight: 600;">
            🏕️ ${sh.name.split(' ')[0]} [SAFE]
          </div>
        `,
        iconSize: [90, 20],
        iconAnchor: [45, 10]
      });
      L.marker(sh.coords, { icon: shIcon }).addTo(group);
    });

  }, [dam, rasterData, simulationState, breachInfo]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl border border-slate-800 bg-[#090e18]">
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />
      {/* Raster Status Badge */}
      {rasterData && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[10px] font-mono text-cyan-400 space-y-0.5 shadow-lg">
          <div>⚡ FASTAPI REAL RASTER // TIMESTEP: T+{rasterData.timestep_min}m</div>
          <div className="text-slate-400">
            Flooded: <b className="text-white">{rasterData.flooded_area_km2} km²</b> | Peak Depth: <b className="text-red-400">{rasterData.max_depth_m}m</b>
          </div>
        </div>
      )}
    </div>
  );
}
