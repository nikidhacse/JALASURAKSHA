import React, { useState, useMemo, useEffect } from 'react';
import { calculateEvacuationOptions } from '../services/evacuationEngine';
import { interpretHydrodynamicRisk, playVoiceAlert } from '../services/aiInterpreter';
import { fetchSimulationImpact } from '../api/impact';
import { fetchEvacuationRoutes } from '../api/evacuate';
import { runSimulationAndPoll } from '../api/simulate';
import EvacuationMap from './EvacuationMap';
import { 
  ShieldAlert, 
  Building, 
  Milestone, 
  Cross, 
  School, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Navigation, 
  Volume2, 
  ArrowRight, 
  Radio, 
  TrendingUp, 
  FileText, 
  MapPin, 
  Clock, 
  Sparkles,
  Loader2,
  RefreshCw,
  Server,
  Layers
} from 'lucide-react';

export default function Screen04ImpactEvacuation({
  selectedDam,
  simulationState,
  breachInfo,
  impactData,
  backendSimResult = null,
  onProceedToValidation
}) {
  const [selectedOriginId, setSelectedOriginId] = useState(selectedDam.settlements[0]?.id || 'set-1');
  const [selectedShelterId, setSelectedShelterId] = useState(selectedDam.infrastructure.schoolsShelters[0]?.id || 'shelter-1');
  const [activeLangTab, setActiveLangTab] = useState('english'); // 'english' | 'hindi' | 'regional'
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Active Simulation Job ID
  const [activeJobId, setActiveJobId] = useState(backendSimResult?.job_id || null);

  // Real Backend Impact Assessment State
  const [liveImpact, setLiveImpact] = useState(null);
  const [isImpactLoading, setIsImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState(null);

  // Real Backend Evacuation Routing State
  const [liveEvac, setLiveEvac] = useState(null);
  const [isEvacLoading, setIsEvacLoading] = useState(false);
  const [evacError, setEvacError] = useState(null);

  const selectedSettlement = useMemo(() => {
    return selectedDam.settlements.find(s => s.id === selectedOriginId) || selectedDam.settlements[0];
  }, [selectedDam, selectedOriginId]);

  const selectedShelter = useMemo(() => {
    return selectedDam.infrastructure.schoolsShelters.find(sh => sh.id === selectedShelterId) || selectedDam.infrastructure.schoolsShelters[0];
  }, [selectedDam, selectedShelterId]);

  const ensureJobId = async () => {
    if (activeJobId) return activeJobId;
    if (backendSimResult?.job_id) {
      setActiveJobId(backendSimResult.job_id);
      return backendSimResult.job_id;
    }
    // Automatically dispatch simulation job if none in active session
    const simRes = await runSimulationAndPoll({
      dam_id: selectedDam.id,
      reservoir_level: 95,
      breach_width: 100,
      breach_formation_time: 20,
      rainfall_scenario: 'heavy',
      duration_hours: 1.0,
      timestep_minutes: 10.0,
    });
    setActiveJobId(simRes.job_id);
    return simRes.job_id;
  };

  const loadImpactData = async () => {
    setIsImpactLoading(true);
    setImpactError(null);
    try {
      const jobId = await ensureJobId();
      const data = await fetchSimulationImpact(jobId);
      setLiveImpact(data);
    } catch (err) {
      console.error('Impact Engine API error:', err);
      setImpactError(err.message);
    } finally {
      setIsImpactLoading(false);
    }
  };

  const loadEvacuationData = async () => {
    setIsEvacLoading(true);
    setEvacError(null);
    try {
      const jobId = await ensureJobId();
      const startLat = selectedSettlement.coords[0];
      const startLon = selectedSettlement.coords[1];
      const destLat = selectedShelter.coords[0];
      const destLon = selectedShelter.coords[1];

      const evacRes = await fetchEvacuationRoutes(
        jobId,
        startLat,
        startLon,
        destLat,
        destLon,
        simulationState.currentSimMinute || 15.0
      );
      setLiveEvac(evacRes);
    } catch (err) {
      console.error('Evacuation Engine API error:', err);
      setEvacError(err.message);
    } finally {
      setIsEvacLoading(false);
    }
  };

  useEffect(() => {
    if (backendSimResult?.job_id) {
      setActiveJobId(backendSimResult.job_id);
    }
  }, [backendSimResult?.job_id]);

  useEffect(() => {
    loadImpactData();
  }, [activeJobId, selectedDam.id]);

  useEffect(() => {
    loadEvacuationData();
  }, [activeJobId, selectedDam.id, selectedOriginId, selectedShelterId, simulationState.currentSimMinute]);

  // Compute evacuation options
  const evacuationData = useMemo(() => {
    return calculateEvacuationOptions({
      dam: selectedDam,
      originSettlementId: selectedOriginId,
      destinationShelterId: selectedShelterId,
      currentSimMinute: simulationState.currentSimMinute
    });
  }, [selectedDam, selectedOriginId, selectedShelterId, simulationState.currentSimMinute]);

  // Compute AI Risk Interpretation
  const aiAdvisory = useMemo(() => {
    return interpretHydrodynamicRisk({
      dam: selectedDam,
      simulationState,
      breachInfo,
      impactData
    });
  }, [selectedDam, simulationState, breachInfo, impactData]);

  const handleAudioBroadcast = () => {
    const textToSpeak = activeLangTab === 'hindi' 
      ? aiAdvisory.bulletins.hindi.body 
      : activeLangTab === 'regional' 
      ? aiAdvisory.bulletins.regional.body 
      : aiAdvisory.bulletins.english.body;
    
    setAudioPlaying(true);
    playVoiceAlert(textToSpeak);
    setTimeout(() => setAudioPlaying(false), 8000);
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-slate-900/90 via-[#181124] to-slate-900/90 border border-purple-900/40 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge badge-purple">MODULE 04 // DECISION INTELLIGENCE</span>
            <span className="badge badge-red">{aiAdvisory.threatLevel}</span>
            {liveImpact && (
              <span className="badge badge-emerald flex items-center gap-1 font-mono text-[10px]">
                <Server className="w-3 h-3" /> FASTAPI IMPACT ENGINE // JOB: {liveImpact.job_id}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
            Infrastructure Impact & Dynamic Evacuation Engine
          </h1>
          <p className="text-sm text-slate-400 max-w-3xl">
            "Don't just simulate where the water goes. Simulate what happens next." Intersecting hydrodynamic flood wave celerity with OpenStreetMap infrastructure and calculating Safest Route vs Shortest Route.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadImpactData}
            disabled={isImpactLoading}
            className="btn btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 border-slate-700 hover:border-cyan-400 cursor-pointer text-slate-300"
            title="Re-run spatial join on current flood extent"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isImpactLoading ? 'animate-spin' : ''}`} />
            <span>{isImpactLoading ? 'Evaluating...' : 'Refresh Impact'}</span>
          </button>

          <button
            onClick={onProceedToValidation}
            className="btn btn-primary text-sm font-semibold px-5 py-2.5 shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
          >
            <span>Satellite Validation & Reports</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Impact Summary Cards - Wired to Real Backend Spatial Join */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Buildings Flooded</span>
            <Building className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-mono font-bold text-white flex items-center gap-1.5">
            {isImpactLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              (liveImpact?.flooded_buildings_count ?? impactData.floodedBuildings).toLocaleString()
            )}
          </div>
          <div className="text-[10px] text-red-400 font-mono">
            {liveImpact 
              ? `${Math.round(liveImpact.flooded_buildings_count * 0.18)} collapse hazard` 
              : `${impactData.catastrophicCollapse} collapse hazard`}
          </div>
        </div>

        <div className="glass-panel p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Submerged Roads</span>
            <Milestone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-mono font-bold text-amber-400 flex items-center gap-1.5">
            {isImpactLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              `${liveImpact?.submerged_roads_km ?? impactData.submergedRoadsKm} km`
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {liveImpact ? `${liveImpact.submerged_roads_count} severed road links` : `${impactData.cutOffRoadIntersections} cut-off junctions`}
          </div>
        </div>

        <div className="glass-panel p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Bridges Severed</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-mono font-bold text-red-400 flex items-center gap-1.5">
            {isImpactLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-400" />
            ) : (
              `${liveImpact?.affected_bridges_count ?? impactData.bridgesStatus.filter(b => b.isCutOff).length} / ${selectedDam.infrastructure.bridges.length}`
            )}
          </div>
          <div className="text-[10px] text-red-400 font-mono">
            {liveImpact?.affected_bridges_count > 0 ? "Causeway overtopped" : "Operational"}
          </div>
        </div>

        <div className="glass-panel p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Hospitals At-Risk</span>
            <Cross className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-bold text-white flex items-center gap-1.5">
            {isImpactLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              (liveImpact?.affected_hospitals_count ?? impactData.hospitalsStatus.length)
            )}
          </div>
          <div className="text-[10px] text-amber-400 font-mono">
            ICU evacuation priority
          </div>
        </div>

        <div className="glass-panel p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Schools & Shelters</span>
            <School className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-mono font-bold text-cyan-300 flex items-center gap-1.5">
            {isImpactLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              (liveImpact?.affected_schools_count ?? impactData.sheltersStatus.length)
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Designated safe shelters
          </div>
        </div>

        <div className="glass-panel p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Cropland Loss</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400 flex items-center gap-1.5">
            {isImpactLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              `${Math.round((liveImpact?.flooded_buildings_count ? liveImpact.flooded_buildings_count * 2.8 : impactData.agriculturalHectares)).toLocaleString()} ha`
            )}
          </div>
          <div className="text-[10px] text-emerald-300 font-mono">
            ₹{impactData.estimatedCropLossCroreInr} Cr estimated
          </div>
        </div>
      </div>

      {/* Real OpenStreetMap Spatial Join Risk-Zone Table */}
      <div className="glass-panel p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="font-display font-bold text-white text-base">
              Critical Infrastructure Risk Zones & Inundation Sequence
            </h3>
            {liveImpact && (
              <span className="badge badge-emerald text-[10px] font-mono">
                ⚡ OSM SPATIAL JOIN ({liveImpact.risk_zones?.length || 0} ASSETS AT RISK)
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Sorted by Inundation Wave Arrival Time (Ascending)
          </span>
        </div>

        {isImpactLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs font-mono">Executing geopandas.sjoin against OSM infrastructure layers...</span>
          </div>
        ) : liveImpact?.risk_zones && liveImpact.risk_zones.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                  <th className="py-2.5 px-3">ASSET / VILLAGE NAME</th>
                  <th className="py-2.5 px-3">TYPE</th>
                  <th className="py-2.5 px-3">COORDINATES</th>
                  <th className="py-2.5 px-3">WAVE ARRIVAL TIME</th>
                  <th className="py-2.5 px-3">PREDICTED DEPTH</th>
                  <th className="py-2.5 px-3">HAZARD SEVERITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {liveImpact.risk_zones.map((rz) => (
                  <tr key={rz.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        rz.hazard_level === 'Extreme' ? 'bg-red-500 animate-pulse' :
                        rz.hazard_level === 'High' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <span>{rz.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 capitalize">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px]">
                        {rz.type === 'hospital' ? '🏥 Hospital' :
                         rz.type === 'bridge' ? '🌉 Bridge' :
                         rz.type === 'school' ? '🏫 School / Shelter' : '🛣️ Highway'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {rz.lat}° N, {rz.lon}° E
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">
                      T+{rz.arrival_time_min} min
                    </td>
                    <td className="py-2.5 px-3 font-bold text-cyan-400">
                      {rz.max_depth_m.toFixed(1)} m
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        rz.hazard_level === 'Extreme' ? 'bg-red-950 text-red-400 border border-red-800' :
                        rz.hazard_level === 'High' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {rz.hazard_level.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">
            No critical facilities intersected by the flood extent polygon at this timestep.
          </div>
        )}
      </div>

      {/* Main Grid: Dynamic Evacuation Route (Left 7) vs AI Risk Interpreter (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Signature Dynamic Evacuation Engine (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="glass-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display font-bold text-white text-base">
                  🚗 Dynamic Evacuation Routing: Safest vs Shortest
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {liveEvac && (
                  <span className="badge badge-emerald text-[10px] font-mono">
                    ⚡ FASTAPI EVAC ENGINE
                  </span>
                )}
                <span className="badge badge-cyan text-[10px]">TIME-AWARE ROUTING</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Standard GPS navigation recommends the shortest highway path. However, our hydrodynamic digital twin predicts when roads will become submerged. If transit time overlaps with the flood wave arrival, the route becomes a death trap!
            </p>

            {/* Origin & Destination Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" /> ORIGIN VULNERABLE SETTLEMENT
                </label>
                <select
                  value={selectedOriginId}
                  onChange={(e) => setSelectedOriginId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-xs font-medium focus:border-cyan-400 outline-none"
                >
                  {selectedDam.settlements.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Wave Arrival: {s.criticalArrivalTimeMin}m)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-emerald-400" /> DESTINATION HIGH GROUND SHELTER
                </label>
                <select
                  value={selectedShelterId}
                  onChange={(e) => setSelectedShelterId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-xs font-medium focus:border-cyan-400 outline-none"
                >
                  {selectedDam.infrastructure.schoolsShelters.map(sh => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name} (+{sh.elevationM}m MSL)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Real GIS Leaflet Map with GeoJSON Route Alpha vs Route Charlie */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  REAL-TIME GEOSPATIAL CORRIDORS (LEAFLET GIS)
                </span>
                {isEvacLoading ? (
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Sampling flood rasters...
                  </span>
                ) : liveEvac ? (
                  <span className="text-emerald-400 font-mono">
                    ✓ OSMNX GRAPH & RASTER SAMPLING ACTIVE
                  </span>
                ) : null}
              </div>
              <EvacuationMap
                dam={selectedDam}
                routeAlpha={liveEvac?.routes?.route_alpha}
                routeCharlie={liveEvac?.routes?.route_charlie}
                origin={selectedSettlement}
                destination={selectedShelter}
              />
            </div>

            {/* Evacuation Routes Comparative Cards */}
            <div className="space-y-3">
              {liveEvac?.routes ? (
                [liveEvac.routes.route_alpha, liveEvac.routes.route_charlie].map(feat => {
                  const rt = feat.properties;
                  const isSafest = rt.verdict === 'GUARANTEED SAFE' || rt.verdict_badge === 'emerald';
                  const isDeadly = rt.is_dead_trap || rt.verdict === 'DEAD TRAP' || rt.verdict_badge === 'red';

                  return (
                    <div
                      key={rt.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSafest 
                          ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/50' 
                          : isDeadly 
                          ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-950/50' 
                          : 'bg-amber-950/20 border-amber-500/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-white">{rt.name}</span>
                            <span className={`badge ${
                              isSafest ? 'badge-emerald' : isDeadly ? 'badge-red' : 'badge-amber'
                            } text-[10px]`}>
                              {rt.strategy}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            Distance: {rt.distance_km} km • Drive Time: {rt.transit_time_min} min • Lowest Elevation: {rt.lowest_elevation_m}m MSL
                          </div>
                        </div>

                        <div className="text-right sm:text-right">
                          <div className={`font-mono font-bold text-sm ${
                            isSafest ? 'text-emerald-400' : isDeadly ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {rt.verdict}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Safety Buffer: {rt.safety_margin_display}
                          </div>
                        </div>
                      </div>

                      <p className={`mt-2.5 text-xs leading-relaxed p-2.5 rounded-lg border font-medium ${
                        isSafest 
                          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' 
                          : isDeadly 
                          ? 'bg-red-950/40 border-red-800 text-red-200' 
                          : 'bg-amber-950/40 border-amber-800 text-amber-200'
                      }`}>
                        {rt.description}
                      </p>

                      {/* Step by step turn-by-turn */}
                      {rt.steps && rt.steps.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                            Operational Corridor Waypoints:
                          </span>
                          <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
                            {rt.steps.map((st, i) => (
                              <li key={i}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                evacuationData.evaluatedRoutes.map(rt => {
                  const isSafest = rt.verdictBadge === 'emerald';
                  const isDeadly = rt.verdictBadge === 'red';

                  return (
                    <div
                      key={rt.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSafest 
                          ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/50' 
                          : isDeadly 
                          ? 'bg-red-950/20 border-red-500/50' 
                          : 'bg-amber-950/20 border-amber-500/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-white">{rt.name}</span>
                            <span className={`badge ${
                              isSafest ? 'badge-emerald' : isDeadly ? 'badge-red' : 'badge-amber'
                            } text-[10px]`}>
                              {rt.strategy}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            Distance: {rt.distanceKm} km • Drive Time: {rt.transitTimeMin} min • Lowest Elevation: {rt.lowestElevationM}m MSL
                          </div>
                        </div>

                        <div className="text-right sm:text-right">
                          <div className={`font-mono font-bold text-sm ${
                            isSafest ? 'text-emerald-400' : isDeadly ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {rt.verdict}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Safety Buffer: {rt.safetyMarginMin}
                          </div>
                        </div>
                      </div>

                      <p className={`mt-2.5 text-xs leading-relaxed p-2.5 rounded-lg border font-medium ${
                        isSafest 
                          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' 
                          : isDeadly 
                          ? 'bg-red-950/40 border-red-800 text-red-200' 
                          : 'bg-amber-950/40 border-amber-800 text-amber-200'
                      }`}>
                        {rt.description}
                      </p>

                      {/* Step by step turn-by-turn */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                          Operational Corridor Waypoints:
                        </span>
                        <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
                          {rt.steps.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Risk Interpreter & Emergency Broadcast Bulletins (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* AI Risk Interpreter Card */}
          <div className="glass-panel p-5 space-y-4 border-cyan-900/40">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display font-bold text-white text-base">
                  🤖 AI Risk Interpreter
                </h3>
              </div>
              <span className="badge badge-cyan text-[10px]">DECISION SUPPORT</span>
            </div>

            <div className="bg-slate-950/90 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-cyan-400 block">
                EXECUTIVE DISASTER COMMANDER ADVISORY
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {aiAdvisory.executiveSummary}
              </p>
            </div>

            {/* Multi-language Emergency Broadcast Bulletins */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">PUBLIC EMERGENCY BULLETINS</span>
                {/* Language Tabs */}
                <div className="flex items-center bg-slate-950 rounded p-1 border border-slate-800 text-xs">
                  <button
                    onClick={() => setActiveLangTab('english')}
                    className={`px-2 py-0.5 rounded capitalize ${activeLangTab === 'english' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setActiveLangTab('hindi')}
                    className={`px-2 py-0.5 rounded capitalize ${activeLangTab === 'hindi' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400'}`}
                  >
                    Hindi
                  </button>
                  <button
                    onClick={() => setActiveLangTab('regional')}
                    className={`px-2 py-0.5 rounded capitalize ${activeLangTab === 'regional' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400'}`}
                  >
                    {aiAdvisory.bulletins.regional.language}
                  </button>
                </div>
              </div>

              {/* Broadcast Content Box */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-red-900/60 space-y-2 relative">
                <div className="text-xs font-bold text-red-400">
                  {activeLangTab === 'hindi' 
                    ? aiAdvisory.bulletins.hindi.headline 
                    : activeLangTab === 'regional' 
                    ? aiAdvisory.bulletins.regional.headline 
                    : aiAdvisory.bulletins.english.headline}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeLangTab === 'hindi' 
                    ? aiAdvisory.bulletins.hindi.body 
                    : activeLangTab === 'regional' 
                    ? aiAdvisory.bulletins.regional.body 
                    : aiAdvisory.bulletins.english.body}
                </p>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={handleAudioBroadcast}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      audioPlaying 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>{audioPlaying ? 'Broadcasting...' : 'Play Audio Siren Alert'}</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-500">Auto-sent to Cell Broadcast</span>
                </div>
              </div>
            </div>

            {/* Tactical Operational Incident Command SOP Checklist */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-mono text-slate-400 block">
                TACTICAL INCIDENT COMMAND SOP CHECKLIST
              </span>
              <div className="space-y-2">
                {aiAdvisory.operationalSop.map(sop => (
                  <div key={sop.id} className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{sop.phase}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {sop.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      {sop.action}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Lead Agency: {sop.responsibleAgency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
