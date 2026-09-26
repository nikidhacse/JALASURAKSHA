import React, { useState, useEffect, useMemo } from 'react';
import ThreeTerrainTwin from './ThreeTerrainTwin';
import LeafletFloodMap from './LeafletFloodMap';
import { fetchTimestepRaster, runSimulationAndPoll } from '../api/simulate';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft,
  ChevronRight,
  Layers, 
  Activity, 
  Clock, 
  ShieldAlert, 
  Loader2,
  RefreshCw,
  Server,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Screen03FloodTwin({
  selectedDam,
  simulationState,
  breachInfo,
  backendSimResult = null,
  simMinute,
  setSimMinute,
  onProceedToImpact
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 1x, 2x, 5x, 10x
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'
  const [mapBaseLayer, setMapBaseLayer] = useState('satellite'); // 'satellite' | 'dark' | 'topo'

  // Real Simulation Job & Timestep State
  const [liveJob, setLiveJob] = useState(backendSimResult || null);
  const [stepIndex, setStepIndex] = useState(0); // 0-based timestep index
  const [currentRaster, setCurrentRaster] = useState(null);
  const [isRasterLoading, setIsRasterLoading] = useState(false);
  const [isSimLoading, setIsSimLoading] = useState(false);

  // Sync when backendSimResult updates from Screen 02
  useEffect(() => {
    if (backendSimResult) {
      setLiveJob(backendSimResult);
      setStepIndex(0);
    }
  }, [backendSimResult]);

  // Ensure simulation job exists if navigating directly to Screen 03
  useEffect(() => {
    if (!liveJob && !isSimLoading) {
      setIsSimLoading(true);
      runSimulationAndPoll({
        dam_id: selectedDam.id,
        reservoir_level: 95,
        breach_width: 100,
        breach_formation_time: 20,
        rainfall_scenario: 'heavy',
        duration_hours: 1.0,
        timestep_minutes: 10.0,
      })
      .then(res => {
        setLiveJob(res);
        setStepIndex(0);
      })
      .catch(console.error)
      .finally(() => {
        setIsSimLoading(false);
      });
    }
  }, [selectedDam.id]);

  const timesteps = useMemo(() => {
    if (liveJob?.timesteps && liveJob.timesteps.length > 0) {
      return liveJob.timesteps;
    }
    // Baseline default 10m intervals up to 60m
    return [
      { timestep_min: 10, max_depth_m: 4.8, flooded_area_km2: 2.1 },
      { timestep_min: 20, max_depth_m: 6.2, flooded_area_km2: 4.8 },
      { timestep_min: 30, max_depth_m: 7.5, flooded_area_km2: 8.2 },
      { timestep_min: 40, max_depth_m: 8.1, flooded_area_km2: 12.0 },
      { timestep_min: 50, max_depth_m: 7.9, flooded_area_km2: 15.4 },
      { timestep_min: 60, max_depth_m: 7.2, flooded_area_km2: 17.8 },
    ];
  }, [liveJob]);

  const currentStep = timesteps[stepIndex] || timesteps[0];
  const currentStepMin = currentStep.timestep_min;

  // Sync simulation timeline clock with parent state
  useEffect(() => {
    if (setSimMinute && currentStepMin !== undefined) {
      setSimMinute(currentStepMin);
    }
  }, [currentStepMin, setSimMinute]);

  // Fetch real raster arrays for current timestep
  useEffect(() => {
    const jobId = liveJob?.job_id;
    if (!jobId) return;

    setIsRasterLoading(true);
    fetchTimestepRaster(jobId, stepIndex + 1)
      .then(data => {
        setCurrentRaster(data);
      })
      .catch(err => {
        console.warn('Timestep raster load note:', err.message);
      })
      .finally(() => {
        setIsRasterLoading(false);
      });
  }, [liveJob?.job_id, stepIndex]);

  // Scrubber playback timer: steps through actual returned simulation timesteps
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setStepIndex(prev => {
          if (prev >= timesteps.length - 1) {
            setIsPlaying(false);
            return 0; // Loop or stop at end
          }
          return prev + 1;
        });
      }, 1800 / playSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, timesteps.length]);

  const formatTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `T+${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Settlements data reading directly from real arrival time raster
  const settlementsDisplay = useMemo(() => {
    if (currentRaster?.settlements && currentRaster.settlements.length > 0) {
      return currentRaster.settlements;
    }
    if (liveJob?.settlements && liveJob.settlements.length > 0) {
      return liveJob.settlements.map(s => {
        const arr = s.arrival_time_min ?? 18;
        const reached = currentStepMin >= arr;
        return {
          name: s.name,
          dist_km: s.dist_km,
          arrival_time_min: arr,
          current_depth_m: reached ? (s.max_depth_m || 2.5) : 0.0,
          is_reached: reached,
          minutes_left: reached ? 0 : Math.max(0, Math.round(arr - currentStepMin)),
        };
      });
    }
    // Fallback based on selectedDam
    return selectedDam.settlements.map(s => {
      const arr = s.criticalArrivalTimeMin;
      const reached = currentStepMin >= arr;
      return {
        name: s.name,
        dist_km: s.distanceKm,
        arrival_time_min: arr,
        current_depth_m: reached ? s.peakDepthM : 0.0,
        is_reached: reached,
        minutes_left: reached ? 0 : Math.max(0, arr - currentStepMin),
      };
    });
  }, [currentRaster?.settlements, liveJob?.settlements, currentStepMin, selectedDam]);

  return (
    <div className="max-w-[1720px] mx-auto px-4 py-6 space-y-6">
      {/* Top Banner & Telemetry Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900/90 via-[#0a1426] to-slate-900/90 border border-cyan-900/40 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge badge-cyan">MODULE 03 // 4D HYDRODYNAMIC PROPAGATION</span>
            <span className="badge badge-emerald">SOLVER: 2D DIFFUSIVE-WAVE SWE</span>
            {liveJob && (
              <span className="badge badge-emerald font-mono text-[10px] flex items-center gap-1">
                <Server className="w-3 h-3" /> FASTAPI JOB: {liveJob.job_id} ({timesteps.length} TIMESTEPS)
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <span>Flood Wave Digital Twin</span>
            <span className="font-mono text-cyan-400 font-bold bg-slate-950 px-2.5 py-0.5 rounded border border-cyan-900 text-sm">
              {formatTime(currentStepMin)} ({currentStepMin} min)
            </span>
            {isRasterLoading && (
              <span className="text-xs text-cyan-400 font-mono flex items-center gap-1 font-normal">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sampling raster...
              </span>
            )}
          </h1>
        </div>

        {/* View Switcher & Proceed CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === '3d'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌊 3D WebGL Twin
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === '2d'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🗺️ 2D GIS Map
            </button>
          </div>

          <button
            onClick={onProceedToImpact}
            className="btn btn-primary text-xs font-semibold px-4 py-2"
          >
            Assess Consequence & Evacuation →
          </button>
        </div>
      </div>

      {/* Main Viewport & Playback Controller */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main 3D / 2D Canvas Container (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="h-[520px] w-full relative">
            {viewMode === '3d' ? (
              <ThreeTerrainTwin
                dam={selectedDam}
                rasterData={currentRaster}
                simulationState={simulationState}
                breachInfo={breachInfo}
              />
            ) : (
              <div className="h-full w-full relative">
                <LeafletFloodMap
                  dam={selectedDam}
                  rasterData={currentRaster}
                  simulationState={simulationState}
                  breachInfo={breachInfo}
                  activeLayer={mapBaseLayer}
                />
                {/* 2D Basemap Layer Controls */}
                <div className="absolute top-3 right-3 z-[1000] bg-slate-950/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 flex items-center gap-1 text-[11px]">
                  {['satellite', 'dark', 'topo'].map(layer => (
                    <button
                      key={layer}
                      onClick={() => setMapBaseLayer(layer)}
                      className={`px-2 py-1 rounded capitalize font-mono ${
                        mapBaseLayer === layer
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {layer}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Real Timestep Scrubber & Playback Controls Bar */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Play / Pause */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 rounded-lg font-bold transition-all ${
                    isPlaying 
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                      : 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 hover:bg-cyan-500'
                  }`}
                  title={isPlaying ? 'Pause simulation' : 'Play simulation timesteps'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                {/* Step Back / Step Forward */}
                <button
                  onClick={() => setStepIndex(prev => Math.max(0, prev - 1))}
                  disabled={stepIndex === 0}
                  className="px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setStepIndex(prev => Math.min(timesteps.length - 1, prev + 1))}
                  disabled={stepIndex === timesteps.length - 1}
                  className="px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40 flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Reset to initial step */}
                <button
                  onClick={() => { setIsPlaying(false); setStepIndex(0); }}
                  title="Reset to Step 0"
                  className="p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Speed Multiplier */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800 text-[11px] font-mono">
                  {[1, 2, 4].map(s => (
                    <button
                      key={s}
                      onClick={() => setPlaySpeed(s)}
                      className={`px-1.5 py-0.5 rounded ${playSpeed === s ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Time display */}
              <div className="font-mono text-xs flex items-center gap-3">
                <span className="text-slate-400">Timestep {stepIndex + 1}/{timesteps.length}:</span>
                <span className="text-xl font-bold text-cyan-400">{formatTime(currentStepMin)}</span>
                <span className="text-slate-500">({currentStepMin} min from breach)</span>
              </div>
            </div>

            {/* Discrete Timestep Scrubber Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={timesteps.length - 1}
                step="1"
                value={stepIndex}
                onChange={(e) => setStepIndex(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                {timesteps.map((ts, idx) => (
                  <button
                    key={idx}
                    onClick={() => setStepIndex(idx)}
                    className={`cursor-pointer transition-colors ${stepIndex === idx ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'}`}
                  >
                    T+{ts.timestep_min}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Emergency Flood Arrival Clock & Real Raster Telemetry (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Emergency Flood Arrival Clock Widget (Reading Directly from Arrival Raster) */}
          <div className="glass-panel p-5 space-y-4 border-red-900/40 bg-gradient-to-b from-slate-900/90 to-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-400 animate-spin" />
                <h3 className="font-display font-bold text-white text-base">
                  ⏱️ Flood Arrival Clock
                </h3>
              </div>
              <span className="badge badge-red text-[10px]">TIME-AWARE</span>
            </div>

            <p className="text-xs text-slate-400 leading-snug">
              Tactical lead times computed from the simulation <code className="text-cyan-400 font-mono">arrival_time</code> raster. Status transitions automatically as the flood wave reaches each village.
            </p>

            {/* Settlements Countdown Cards */}
            <div className="space-y-3">
              {settlementsDisplay.map(set => {
                const isReached = set.is_reached;
                const minutesLeft = set.minutes_left;
                const arrTime = set.arrival_time_min;
                const currDepth = set.current_depth_m;

                let statusBadge = 'badge-emerald';
                let clockBg = 'bg-slate-950';

                if (isReached) {
                  statusBadge = 'badge-red';
                  clockBg = 'bg-red-950/40 border-red-800';
                } else if (minutesLeft !== null && minutesLeft <= 15) {
                  statusBadge = 'badge-red';
                  clockBg = 'bg-red-950/20 border-red-800';
                } else if (minutesLeft !== null && minutesLeft <= 35) {
                  statusBadge = 'badge-amber';
                  clockBg = 'bg-amber-950/20 border-amber-800';
                }

                return (
                  <div
                    key={set.name}
                    className={`p-3.5 rounded-lg border border-slate-800 transition-all ${clockBg}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-white">{set.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{set.dist_km} km away</span>
                    </div>

                    {/* Prominent countdown banner */}
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        {isReached ? (
                          <div className="flex items-center gap-1.5 text-red-400 font-mono font-bold text-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                            <span>INUNDATED ({currDepth.toFixed(1)}m depth)</span>
                          </div>
                        ) : minutesLeft !== null ? (
                          <div className="text-amber-300 font-mono font-bold text-base">
                            ⏱️ {minutesLeft} MIN REMAINING
                          </div>
                        ) : (
                          <div className="text-emerald-400 font-mono font-bold text-sm">
                            ✓ SAFE (OUTSIDE FLOOD REACH)
                          </div>
                        )}
                      </div>
                      <span className={`badge ${statusBadge} text-[10px]`}>
                        {isReached ? 'PEAK FLOOD' : minutesLeft !== null && minutesLeft <= 15 ? 'IMMEDIATE EVAC' : minutesLeft !== null && minutesLeft <= 35 ? 'WARNING' : 'ADVISORY'}
                      </span>
                    </div>

                    {/* Progress bar towards arrival */}
                    <div className="mt-2 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isReached ? 'bg-red-500' : minutesLeft !== null && minutesLeft <= 15 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{
                          width: `${isReached ? 100 : arrTime ? Math.min(100, Math.max(0, (currentStepMin / arrTime) * 100)) : 0}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Dynamic Reach Telemetry from Raster */}
          <div className="glass-panel p-4 space-y-3">
            <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> REAL TIMESTEP TELEMETRY
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Inundated Area</span>
                <span className="text-cyan-400 font-bold">
                  {currentRaster?.flooded_area_km2 ?? currentStep?.flooded_area_km2 ?? 0.0} km²
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Max Depth</span>
                <span className="text-white font-bold">
                  {currentRaster?.max_depth_m ?? currentStep?.max_depth_m ?? 0.0} m
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Peak Velocity</span>
                <span className="text-amber-400 font-bold">
                  {currentRaster?.max_velocity_ms ?? 0.0} m/s
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Current Dam Outflow</span>
                <span className="text-red-400 font-bold">
                  {simulationState.currentDamDischarge.toLocaleString()} m³/s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
