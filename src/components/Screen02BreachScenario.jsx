import React, { useState, useMemo, useEffect } from 'react';
import { calculateBreachOutflow } from '../services/hydroEngine';
import { runSimulationAndPoll, runBackendScenarioComparison } from '../api/simulate';
import { 
  Layers, 
  Sliders, 
  Cpu, 
  Activity, 
  Zap, 
  Droplets, 
  Clock, 
  CloudRain, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Maximize2,
  GitCompare,
  Gauge,
  Loader2,
  RefreshCw,
  Server
} from 'lucide-react';

export default function Screen02BreachScenario({
  selectedDam,
  breachParams,
  setBreachParams,
  solverType,
  setSolverType,
  onRunSimulation,
  onSimulationComplete
}) {
  // Live Simulation execution state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simStatusMsg, setSimStatusMsg] = useState('');
  const [simError, setSimError] = useState(null);

  // Scenario Comparison Backend Execution State
  const [isComparing, setIsComparing] = useState(false);
  const [scenarioProgress, setScenarioProgress] = useState({ 0: 0, 1: 0, 2: 0 });
  const [backendComparisonResults, setBackendComparisonResults] = useState([]);
  const [comparisonTimestamp, setComparisonTimestamp] = useState(null);

  // Compute live current breach metrics for preview
  const currentBreachInfo = useMemo(() => {
    return calculateBreachOutflow({
      dam: selectedDam,
      reservoirPercent: breachParams.reservoirPercent,
      breachWidthM: breachParams.breachWidthM,
      breachFormationMin: breachParams.breachFormationMin,
      rainfallScenario: breachParams.rainfallScenario,
      breachType: breachParams.breachType
    });
  }, [selectedDam, breachParams]);

  // Define the 3 dynamic scenario configurations
  // Notice Scenario C uses the active custom breach parameters from the user's sliders!
  const comparisonPresets = useMemo(() => {
    return [
      {
        id: 'scen-a',
        name: 'Scenario A: Moderate Overtopping',
        breachWidthM: 100,
        reservoirPercent: 85,
        breachFormationMin: 45,
        rainfallScenario: 'normal',
        breachType: 'overtopping',
        badgeColor: 'amber',
        tag: 'Controlled'
      },
      {
        id: 'scen-b',
        name: 'Scenario B: Major Piping Failure',
        breachWidthM: 220,
        reservoirPercent: 95,
        breachFormationMin: 25,
        rainfallScenario: 'heavy',
        breachType: 'piping',
        badgeColor: 'orange',
        tag: 'Severe'
      },
      {
        id: 'scen-c',
        name: `Scenario C: Active Custom (${breachParams.breachWidthM}m Breach)`,
        breachWidthM: breachParams.breachWidthM,
        reservoirPercent: breachParams.reservoirPercent,
        breachFormationMin: breachParams.breachFormationMin,
        rainfallScenario: breachParams.rainfallScenario,
        breachType: breachParams.breachType,
        badgeColor: 'red',
        tag: 'Custom Input'
      }
    ];
  }, [breachParams]);

  // Function to execute real backend comparison across Scenarios A, B, and C
  const executeBackendComparison = async () => {
    setIsComparing(true);
    setScenarioProgress({ 0: 0, 1: 0, 2: 0 });
    try {
      const results = await runBackendScenarioComparison(
        selectedDam.id,
        comparisonPresets,
        (idx, prog) => {
          setScenarioProgress(prev => ({
            ...prev,
            [idx]: prog.progress_pct || 0
          }));
        }
      );
      setBackendComparisonResults(results);
      setComparisonTimestamp(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    } catch (err) {
      console.error('Backend Comparison Error:', err);
    } finally {
      setIsComparing(false);
    }
  };

  // Run backend comparison automatically on first mount or dam change
  useEffect(() => {
    executeBackendComparison();
  }, [selectedDam.id]);

  // Quick preset loader
  const loadPreset = (presetKey) => {
    if (presetKey === 'A') {
      setBreachParams({
        reservoirPercent: 85,
        breachWidthM: 100,
        breachFormationMin: 45,
        rainfallScenario: 'normal',
        breachType: 'overtopping'
      });
    } else if (presetKey === 'B') {
      setBreachParams({
        reservoirPercent: 95,
        breachWidthM: 220,
        breachFormationMin: 25,
        rainfallScenario: 'heavy',
        breachType: 'piping'
      });
    } else if (presetKey === 'C') {
      setBreachParams({
        reservoirPercent: 102,
        breachWidthM: 350,
        breachFormationMin: 12,
        rainfallScenario: 'cloudburst',
        breachType: 'overtopping'
      });
    }
  };

  // Handle Run Simulation with real backend call and polling
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimProgress(5);
    setSimStatusMsg('Dispatching simulation job to FastAPI backend...');
    setSimError(null);

    try {
      const jobData = await runSimulationAndPoll(
        {
          dam_id: selectedDam.id,
          reservoir_level: breachParams.reservoirPercent,
          breach_width: breachParams.breachWidthM,
          breach_formation_time: breachParams.breachFormationMin,
          rainfall_scenario: breachParams.rainfallScenario,
          duration_hours: 1.0,
          timestep_minutes: 10.0,
        },
        (prog) => {
          setSimProgress(prog.progress_pct || 15);
          if (prog.progress_pct < 30) {
            setSimStatusMsg('Calculating Froehlich breach hydrograph & loading 30m DEM...');
          } else if (prog.progress_pct < 80) {
            setSimStatusMsg('Solving 2D Diffusive-Wave flood wave propagation over raster cells...');
          } else {
            setSimStatusMsg('Exporting multi-band GeoTIFF rasters and compiling arrival times...');
          }
        }
      );

      setSimProgress(100);
      setSimStatusMsg('Simulation complete! Navigating to Digital Twin...');

      if (onSimulationComplete) {
        onSimulationComplete(jobData);
      }

      setTimeout(() => {
        setIsSimulating(false);
        onRunSimulation();
      }, 600);

    } catch (err) {
      console.error('Simulation Failed:', err);
      setSimError(err.message || 'Simulation failed on backend.');
      setIsSimulating(false);
    }
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-slate-900/90 via-[#0e1a30] to-slate-900/90 border border-cyan-900/40 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge badge-amber">MODULE 02 // BREACH DYNAMICS</span>
            <span className="badge badge-emerald flex items-center gap-1">
              <Server className="w-3 h-3" /> FASTAPI BACKEND CONNECTED
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
            Dam Breach Scenario & Hydrodynamic Solver Setup
          </h1>
          <p className="text-sm text-slate-400 max-w-3xl">
            Configure real reservoir storage, breach mechanics (Froehlich 2008), rainfall surcharge, and execute genuine 2D diffusive-wave raster simulations via our FastAPI backend.
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="btn btn-primary text-sm font-semibold px-6 py-3 shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSimulating ? (
            <>
              <Loader2 className="w-4 h-4 text-cyan-200 animate-spin" />
              <span>Simulating ({simProgress}%)...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-cyan-200" />
              <span>Run Digital Twin Simulation</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Real Backend Polling Progress Modal Overlay */}
      {isSimulating && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1322] border border-cyan-500/60 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-base">
                  Executing Backend Hydrodynamic Simulation
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Target: {selectedDam.name} • Solver: 2D Diffusive Wave
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-cyan-300">{simStatusMsg}</span>
                <span className="text-white font-bold">{simProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${simProgress}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
              Computing Froehlich (2008) hydrograph, loading CartoDEM 30m raster, and routing flow fluxes cell-by-cell using Manning's equation.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Controls vs Hydrodynamic Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sliders & Parameter Builder (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Quick Scenario Presets */}
          <div className="glass-panel p-4 space-y-3">
            <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> QUICK BENCHMARK SCENARIO PRESETS
            </span>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => loadPreset('A')}
                className="p-3 rounded-lg border border-slate-700 bg-slate-900/80 hover:border-emerald-500 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm text-emerald-400">Scenario A</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-xs text-white font-medium mt-1">Moderate Overtopping</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">100m • 85% FRL • Normal</div>
              </button>

              <button
                type="button"
                onClick={() => loadPreset('B')}
                className="p-3 rounded-lg border border-slate-700 bg-slate-900/80 hover:border-amber-500 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm text-amber-400">Scenario B</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <div className="text-xs text-white font-medium mt-1">Major Piping Failure</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">220m • 95% FRL • Heavy</div>
              </button>

              <button
                type="button"
                onClick={() => loadPreset('C')}
                className="p-3 rounded-lg border border-slate-700 bg-slate-900/80 hover:border-red-500 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm text-red-400">Scenario C</span>
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                </div>
                <div className="text-xs text-white font-medium mt-1">Catastrophic Worst-Case</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">350m • 102% • Cloudburst</div>
              </button>
            </div>
          </div>

          {/* Granular Parameter Controls */}
          <div className="glass-panel p-5 space-y-5">
            <h3 className="font-display font-bold text-white text-base flex items-center justify-between">
              <span>Parametric Breach Variables</span>
              <span className="text-xs font-mono text-cyan-400">Froehlich (2008) Invert Solver</span>
            </h3>

            {/* Slider 1: Reservoir Level */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  Initial Reservoir Level (% of FRL)
                </span>
                <span className="font-mono text-cyan-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {breachParams.reservoirPercent}% ({Math.round(selectedDam.storageCapacityMm3 * (breachParams.reservoirPercent / 100))} Mm³)
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="108"
                step="1"
                value={breachParams.reservoirPercent}
                onChange={(e) => setBreachParams({ ...breachParams, reservoirPercent: Number(e.target.value) })}
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>50% (Dry Season)</span>
                <span>80% (Normal Full)</span>
                <span>100% (FRL Crest)</span>
                <span className="text-red-400 font-bold">108% (Uncontrolled Surcharge)</span>
              </div>
            </div>

            {/* Slider 2: Breach Width */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4 text-amber-400" />
                  Breach Width (Bb)
                </span>
                <span className="font-mono text-amber-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {breachParams.breachWidthM} meters
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="400"
                step="5"
                value={breachParams.breachWidthM}
                onChange={(e) => setBreachParams({ ...breachParams, breachWidthM: Number(e.target.value) })}
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>30 m (Partial Piping)</span>
                <span>150 m (Embankment Slump)</span>
                <span className="text-red-400 font-bold">400 m (Complete Structural Breach)</span>
              </div>
            </div>

            {/* Slider 3: Breach Formation Time */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Breach Formation Time (τ)
                </span>
                <span className="font-mono text-emerald-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {breachParams.breachFormationMin} minutes
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="2"
                value={breachParams.breachFormationMin}
                onChange={(e) => setBreachParams({ ...breachParams, breachFormationMin: Number(e.target.value) })}
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span className="text-red-400 font-bold">10 min (Flash Collapse)</span>
                <span>30 min (Rapid Erosion)</span>
                <span>90 min (Gradual Washout)</span>
              </div>
            </div>

            {/* Radio Selectors: Rainfall & Breach Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-blue-400" />
                  Upstream Rainfall Surcharge
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['normal', 'heavy', 'cloudburst'].map((rain) => (
                    <button
                      key={rain}
                      type="button"
                      onClick={() => setBreachParams({ ...breachParams, rainfallScenario: rain })}
                      className={`text-xs py-1.5 rounded border font-mono capitalize transition-all cursor-pointer ${
                        breachParams.rainfallScenario === rain
                          ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {rain}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-400" />
                  Primary Failure Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'piping', label: 'Piping Failure' },
                    { id: 'overtopping', label: 'Overtopping' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setBreachParams({ ...breachParams, breachType: mode.id })}
                      className={`text-xs py-1.5 rounded border font-mono transition-all cursor-pointer ${
                        breachParams.breachType === mode.id
                          ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hydrodynamic Solvers & Outflow Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Hydrodynamic Solver Selection Card */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> HYDRODYNAMIC SOLVER (NTRO REQUIREMENT)
              </span>
              <span className="badge badge-cyan text-[10px]">SWE vs SPH</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSolverType('delft3d')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  solverType === 'delft3d'
                    ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Delft3D Engine</span>
                  {solverType === 'delft3d' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">2D Depth-Averaged SWE</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Multi-grid Navier-Stokes</div>
              </button>

              <button
                type="button"
                onClick={() => setSolverType('sph')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  solverType === 'sph'
                    ? 'bg-purple-950/40 border-purple-400 ring-1 ring-purple-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">SPH Solver</span>
                  {solverType === 'sph' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Smooth Particle Hydrodynamics</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Lagrangian Free Surface</div>
              </button>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Active Solver Model:</span>
                <span className="font-mono font-bold text-cyan-400">
                  {solverType === 'sph' ? currentBreachInfo.sphMetrics.modelName : currentBreachInfo.delft3DMetrics.modelName}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Wavefront Mechanics:</span>
                <span className="font-mono text-slate-200">
                  {solverType === 'sph' ? currentBreachInfo.sphMetrics.waveFrontType : currentBreachInfo.delft3DMetrics.waveFrontType}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Max Surge Wave Velocity:</span>
                <span className="font-mono font-bold text-amber-400">
                  {solverType === 'sph' ? currentBreachInfo.sphMetrics.maxWavefrontVelocityMs : currentBreachInfo.delft3DMetrics.maxWavefrontVelocityMs} m/s
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Dam Toe Hydraulic Jump:</span>
                <span className="font-mono text-slate-200">
                  {solverType === 'sph' ? currentBreachInfo.sphMetrics.toeHydraulicJumpHeightM : currentBreachInfo.delft3DMetrics.toeHydraulicJumpHeightM} m
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Calculated Outflow KPI Panel */}
          <div className="glass-panel p-5 space-y-3 bg-gradient-to-b from-slate-900/90 to-slate-950">
            <span className="text-xs font-mono text-slate-400">PREDICTED OUTFLOW DYNAMICS (FROEHLICH 2008)</span>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block">Peak Discharge (Qₚ)</span>
                <span className="text-xl font-mono font-bold text-red-400">
                  {currentBreachInfo.peakDischargeM3s.toLocaleString()} <span className="text-xs font-normal text-slate-400">m³/s</span>
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block">Hydraulic Head (h𝓌)</span>
                <span className="text-xl font-mono font-bold text-cyan-400">
                  {currentBreachInfo.hydraulicHeadM} <span className="text-xs font-normal text-slate-400">m</span>
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block">Reservoir Drainage</span>
                <span className="text-lg font-mono font-bold text-amber-400">
                  {(currentBreachInfo.reservoirVolumeM3 / 1e6).toFixed(1)} <span className="text-xs font-normal text-slate-400">Mm³</span>
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block">Rainfall Inflow Surge</span>
                <span className="text-lg font-mono font-bold text-blue-400">
                  +{currentBreachInfo.inflowM3s.toLocaleString()} <span className="text-xs font-normal text-slate-400">m³/s</span>
                </span>
              </div>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full btn btn-primary py-2.5 text-xs font-bold tracking-wide mt-2 cursor-pointer"
            >
              RUN FULL BACKEND SIMULATION & LAUNCH 3D TWIN →
            </button>
          </div>
        </div>
      </div>

      {/* Real Scenario Comparison Matrix Powered by Backend */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-bold text-white text-base">
              "What-If" Multi-Scenario Vulnerability Comparison Matrix
            </h3>
            {comparisonTimestamp && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                ⚡ Backend Verified at {comparisonTimestamp}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={executeBackendComparison}
              disabled={isComparing}
              className="btn btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 border-slate-700 hover:border-cyan-400 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isComparing ? 'animate-spin' : ''}`} />
              <span>{isComparing ? 'Computing...' : 'Recompute Scenarios via Backend'}</span>
            </button>
          </div>
        </div>

        {/* Live Multi-bar Progress indicator if comparing */}
        {isComparing && (
          <div className="p-3 bg-slate-950/80 rounded-lg border border-cyan-800/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Dispatching parallel 2D diffusive-wave simulations to FastAPI...
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[10px] font-mono">
              <div>
                <span className="text-slate-400">Scenario A: {scenarioProgress[0]}%</span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${scenarioProgress[0]}%` }} />
                </div>
              </div>
              <div>
                <span className="text-slate-400">Scenario B: {scenarioProgress[1]}%</span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-orange-400 h-full transition-all" style={{ width: `${scenarioProgress[1]}%` }} />
                </div>
              </div>
              <div>
                <span className="text-slate-400">Scenario C: {scenarioProgress[2]}%</span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-red-400 h-full transition-all" style={{ width: `${scenarioProgress[2]}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-mono">
                <th className="py-2.5 px-3">METRIC / ASSET</th>
                {comparisonPresets.map((sc, scIdx) => (
                  <th key={sc.id} className="py-2.5 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      sc.badgeColor === 'amber' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                      sc.badgeColor === 'orange' ? 'bg-orange-950 text-orange-400 border border-orange-900' :
                      'bg-red-950 text-red-400 border border-red-900'
                    }`}>
                      {sc.name.split(':')[0]} ({sc.tag})
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="py-2.5 px-3 text-slate-300 font-sans font-medium">Breach Geometry</td>
                {comparisonPresets.map(sc => (
                  <td key={sc.id} className="py-2.5 px-3 text-slate-200">
                    {sc.breachWidthM}m width • {sc.breachFormationMin}m formation • {sc.reservoirPercent}% FRL
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-slate-300 font-sans font-medium">
                  Peak Outflow (Qₚ)
                  <span className="block text-[10px] text-slate-500 font-mono font-normal">Froehlich (2008) formula</span>
                </td>
                {backendComparisonResults.length === 3 ? (
                  backendComparisonResults.map(res => (
                    <td key={res.id} className="py-2.5 px-3 text-red-400 font-bold">
                      {res.peakDischargeM3s?.toLocaleString()} m³/s
                    </td>
                  ))
                ) : (
                  comparisonPresets.map(sc => (
                    <td key={sc.id} className="py-2.5 px-3 text-slate-400 italic">Computing...</td>
                  ))
                )}
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-slate-300 font-sans font-medium">Max Wave Velocity</td>
                {backendComparisonResults.length === 3 ? (
                  backendComparisonResults.map(res => (
                    <td key={res.id} className="py-2.5 px-3 text-amber-400 font-bold">
                      {res.maxVelocityMs} m/s ({(res.maxVelocityMs * 3.6).toFixed(1)} km/h)
                    </td>
                  ))
                ) : (
                  comparisonPresets.map(sc => (
                    <td key={sc.id} className="py-2.5 px-3 text-slate-400 italic">Computing...</td>
                  ))
                )}
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-slate-300 font-sans font-medium">
                  Flooded Raster Area
                  <span className="block text-[10px] text-slate-500 font-mono font-normal">Derived from GeoTIFF depth</span>
                </td>
                {backendComparisonResults.length === 3 ? (
                  backendComparisonResults.map(res => (
                    <td key={res.id} className="py-2.5 px-3 text-cyan-400 font-bold">
                      {res.floodedAreaKm2} km²
                    </td>
                  ))
                ) : (
                  comparisonPresets.map(sc => (
                    <td key={sc.id} className="py-2.5 px-3 text-slate-400 italic">Computing...</td>
                  ))
                )}
              </tr>

              {/* Settlement Inundation & Arrival Rows from Real Raster Analysis */}
              {selectedDam.settlements.map((st) => (
                <tr key={st.id} className="bg-slate-900/30">
                  <td className="py-2.5 px-3 text-slate-200 font-sans font-semibold">
                    📍 {st.name} ({st.distanceKm} km)
                  </td>
                  {backendComparisonResults.length === 3 ? (
                    backendComparisonResults.map(res => {
                      const stMatch = res.settlements?.find(s => s.name.toLowerCase().includes(st.name.toLowerCase().split(' ')[0]));
                      const depth = stMatch?.max_depth_m ?? 0.0;
                      const arrival = stMatch?.arrival_time_min;
                      const hasFlooded = depth > 0.05 || (arrival !== null && arrival >= 0);

                      return (
                        <td key={res.id} className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              !hasFlooded ? 'bg-slate-600' : depth < 1.5 ? 'bg-emerald-400' : depth < 3.0 ? 'bg-amber-400' : 'bg-red-500 animate-pulse'
                            }`} />
                            <span className="text-white font-bold">
                              {hasFlooded ? `${depth.toFixed(1)}m depth` : 'Dry'}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {arrival !== null && arrival !== undefined ? `(${arrival.toFixed(0)}m arrival)` : '(Not reached)'}
                            </span>
                          </div>
                        </td>
                      );
                    })
                  ) : (
                    comparisonPresets.map(sc => (
                      <td key={sc.id} className="py-2.5 px-3 text-slate-400 italic">Computing...</td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
