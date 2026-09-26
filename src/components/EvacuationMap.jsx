import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function EvacuationMap({
  dam,
  routeAlpha,
  routeCharlie,
  origin,
  destination
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const center = origin?.coords || dam.centerCoords || [11.45, 77.16];
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
      }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update polylines and markers whenever routes change
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;
    const group = layersGroupRef.current;
    group.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Origin Marker
    if (origin?.coords) {
      bounds.extend(origin.coords);
      const originIcon = L.divIcon({
        className: 'evac-origin-icon',
        html: `<div style="background:#ef4444;color:white;padding:3px 7px;border-radius:6px;font-weight:bold;font-size:10px;border:2px solid white;box-shadow:0 0 10px rgba(239,68,68,0.8);white-space:nowrap;">📍 ${origin.name}</div>`,
        iconAnchor: [30, 10],
      });
      L.marker(origin.coords, { icon: originIcon }).addTo(group);
    }

    // 2. Destination Marker
    if (destination?.coords) {
      bounds.extend(destination.coords);
      const destIcon = L.divIcon({
        className: 'evac-dest-icon',
        html: `<div style="background:#10b981;color:white;padding:3px 7px;border-radius:6px;font-weight:bold;font-size:10px;border:2px solid white;box-shadow:0 0 10px rgba(16,185,129,0.8);white-space:nowrap;">🏫 ${destination.name}</div>`,
        iconAnchor: [30, 10],
      });
      L.marker(destination.coords, { icon: destIcon }).addTo(group);
    }

    // 3. Route Alpha (GeoJSON coordinates: [lon, lat])
    if (routeAlpha?.geometry?.coordinates) {
      const latlngsAlpha = routeAlpha.geometry.coordinates.map(c => [c[1], c[0]]);
      latlngsAlpha.forEach(ll => bounds.extend(ll));

      const isDeadTrap = routeAlpha.properties?.is_dead_trap;
      L.polyline(latlngsAlpha, {
        color: '#ef4444',
        weight: 5,
        opacity: 0.9,
        dashArray: isDeadTrap ? '8, 8' : undefined,
      })
      .bindPopup(`
        <div style="padding:4px;font-family:monospace;font-size:11px;">
          <b style="color:#ef4444;">Route Alpha: Shortest Valley Highway</b><br/>
          Verdict: <b>${routeAlpha.properties?.verdict}</b><br/>
          Safety Margin: <b>${routeAlpha.properties?.safety_margin_display}</b><br/>
          Distance: ${routeAlpha.properties?.distance_km} km
        </div>
      `)
      .addTo(group);
    }

    // 4. Route Charlie (GeoJSON coordinates: [lon, lat])
    if (routeCharlie?.geometry?.coordinates) {
      const latlngsCharlie = routeCharlie.geometry.coordinates.map(c => [c[1], c[0]]);
      latlngsCharlie.forEach(ll => bounds.extend(ll));

      L.polyline(latlngsCharlie, {
        color: '#10b981',
        weight: 6,
        opacity: 0.95,
      })
      .bindPopup(`
        <div style="padding:4px;font-family:monospace;font-size:11px;">
          <b style="color:#10b981;">Route Charlie: High-Elevation Ridge Crest</b><br/>
          Verdict: <b>${routeCharlie.properties?.verdict}</b><br/>
          Safety Margin: <b>${routeCharlie.properties?.safety_margin_display}</b><br/>
          Distance: ${routeCharlie.properties?.distance_km} km
        </div>
      `)
      .addTo(group);
    }

    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35] });
    }
  }, [routeAlpha, routeCharlie, origin, destination]);

  return (
    <div className="w-full h-[290px] rounded-xl overflow-hidden border border-slate-700/80 relative shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Map Route Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 text-[10px] font-mono space-y-1 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 border-b-2 border-dashed border-red-500 inline-block" />
          <span className="text-red-400 font-bold">Route Alpha: Shortest / {routeAlpha?.properties?.verdict || 'DEAD TRAP'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-emerald-500 rounded inline-block" />
          <span className="text-emerald-400 font-bold">Route Charlie: Safest / {routeCharlie?.properties?.verdict || 'GUARANTEED SAFE'}</span>
        </div>
      </div>
    </div>
  );
}
