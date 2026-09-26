import React, { useState, useMemo, lazy, Suspense } from 'react';
import Header from './components/Header';
import StatusTickerBar from './components/StatusTickerBar';
import Screen01RegionSelect from './components/Screen01RegionSelect';

// Code-split heavy screens so initial load does not block on Three.js & Leaflet
const Screen02BreachScenario = lazy(() => import('./components/Screen02BreachScenario'));
const Screen03FloodTwin = lazy(() => import('./components/Screen03FloodTwin'));
const Screen04ImpactEvacuation = lazy(() => import('./components/Screen04ImpactEvacuation'));
const Screen05ValidationReport = lazy(() => import('./components/Screen05ValidationReport'));

// Military HUD Styled Skeleton Loader
function HUDSkeletonLoader({ label }) {
  return (
    <div className="max-w-[1720px] mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[540px] space-y-6">
      <div className="relative w-80 h-48 rounded-2xl border border-cyan-800/60 bg-[#101912]/90 p-5 overflow-hidden shadow-2xl flex flex-col justify-between">
        <div className="hud-scanline" />
        
        <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-800/80 pb-2">
          <span className="text-cyan-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            NTRO // HYDRO COMMAND
          </span>
          <span className="text-slate-500">PS161 SPEC</span>
        </div>

        <div className="space-y-2.5 py-2">
          <div className="h-3 w-4/5 hud-skeleton" />
          <div className="h-2.5 w-3/5 hud-skeleton" />
          <div className="h-2.5 w-full hud-skeleton" />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
          <span className="tracking-wide uppercase">{label || 'CALIBRATING HYDRODYNAMIC MESH...'}</span>
          <span className="text-cyan-400 animate-pulse font-bold">[SYNCING]</span>
        </div>
      </div>

      <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
        <span className="text-cyan-400">►</span>
        <span>Loading CartoDEM 30m, 2D Shallow Water Grids &amp; Sentinel-1 Telemetry...</span>
      </div>
    </div>
  );
}

import { DAMS_DATABASE } from './data/damsData';
import { calculateBreachOutflow, simulatePropagationState } from './services/hydroEngine';
import { assessInfrastructureImpact } from './services/impactEngine';
import { calculateEvacuationOptions } from './services/evacuationEngine';
import { interpretHydrodynamicRisk } from './services/aiInterpreter';
import { downloadHADRReport } from './services/gisExport';

export default function App() {
  const [activeTab, setActiveTab] = useState('region'); // 'region' | 'breach' | 'twin' | 'impact' | 'validation'
  const [selectedDam, setSelectedDam] = useState(DAMS_DATABASE[0]); // Bhavanisagar default
  
  // Breach Variables
  const [breachParams, setBreachParams] = useState({
    reservoirPercent: 95,
    breachWidthM: 100,
    breachFormationMin: 20,
    rainfallScenario: 'heavy',
    breachType: 'piping'
  });

  // Solver Mode (Delft3D vs SPH)
  const [solverType, setSolverType] = useState('delft3d');

  // Simulation Timeline State (minutes from breach)
  const [simMinute, setSimMinute] = useState(38);

  // Backend Simulation Result
  const [backendSimResult, setBackendSimResult] = useState(null);

  // Compute live Hydrodynamics
  const breachInfo = useMemo(() => {
    return calculateBreachOutflow({
      dam: selectedDam,
      reservoirPercent: breachParams.reservoirPercent,
      breachWidthM: breachParams.breachWidthM,
      breachFormationMin: breachParams.breachFormationMin,
      rainfallScenario: breachParams.rainfallScenario,
      breachType: breachParams.breachType
    });
  }, [selectedDam, breachParams]);

  // Compute time-stepped simulation state
  const simulationState = useMemo(() => {
    return simulatePropagationState({
      dam: selectedDam,
      breachInfo,
      currentSimMinute: simMinute,
      solverType
    });
  }, [selectedDam, breachInfo, simMinute, solverType]);

  // Compute Infrastructure Consequence Analytics
  const impactData = useMemo(() => {
    return assessInfrastructureImpact({
      dam: selectedDam,
      simulationState,
      breachInfo
    });
  }, [selectedDam, simulationState, breachInfo]);

  // Compute Dynamic Evacuation Routes
  const evacuationData = useMemo(() => {
    return calculateEvacuationOptions({
      dam: selectedDam,
      originSettlementId: selectedDam?.settlements?.[0]?.id,
      destinationShelterId: selectedDam?.infrastructure?.schoolsShelters?.[0]?.id,
      currentSimMinute: simMinute
    });
  }, [selectedDam, simMinute]);

  // Compute AI Risk Advisory
  const aiAdvisory = useMemo(() => {
    return interpretHydrodynamicRisk({
      dam: selectedDam,
      simulationState,
      breachInfo,
      impactData
    });
  }, [selectedDam, simulationState, breachInfo, impactData]);

  // Quick export handler
  const handleExportReport = () => {
    downloadHADRReport({
      dam: selectedDam,
      simulationState,
      breachInfo,
      impactData,
      evacuationData,
      aiAdvisory
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Tactical Disaster Command Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDam={selectedDam}
        onExportReport={handleExportReport}
      />

      {/* Persistent HUD Telemetry Status Ticker Bar (Persists across ALL 5 screens) */}
      <StatusTickerBar
        selectedDam={selectedDam}
        simMinute={simMinute}
        solverType={solverType}
      />

      {/* Main Screen View Router with Smooth Fade & Slide Transition */}
      <main className="flex-1 pb-12">
        <Suspense fallback={<HUDSkeletonLoader label="LOADING HYDRODYNAMIC MODEL..." />}>
          <div key={activeTab} className="animate-screen-enter">
            {activeTab === 'region' && (
              <Screen01RegionSelect
                selectedDam={selectedDam}
                setSelectedDam={setSelectedDam}
                onProceedToBreach={() => setActiveTab('breach')}
              />
            )}

            {activeTab === 'breach' && (
              <Screen02BreachScenario
                selectedDam={selectedDam}
                breachParams={breachParams}
                setBreachParams={setBreachParams}
                solverType={solverType}
                setSolverType={setSolverType}
                onRunSimulation={() => setActiveTab('twin')}
                onSimulationComplete={(result) => setBackendSimResult(result)}
              />
            )}

            {activeTab === 'twin' && (
              <Screen03FloodTwin
                selectedDam={selectedDam}
                simulationState={simulationState}
                breachInfo={breachInfo}
                backendSimResult={backendSimResult}
                simMinute={simMinute}
                setSimMinute={setSimMinute}
                onProceedToImpact={() => setActiveTab('impact')}
              />
            )}

            {activeTab === 'impact' && (
              <Screen04ImpactEvacuation
                selectedDam={selectedDam}
                simulationState={simulationState}
                breachInfo={breachInfo}
                impactData={impactData}
                backendSimResult={backendSimResult}
                onProceedToValidation={() => setActiveTab('validation')}
              />
            )}

            {activeTab === 'validation' && (
              <Screen05ValidationReport
                selectedDam={selectedDam}
                simulationState={simulationState}
                breachInfo={breachInfo}
                impactData={impactData}
                evacuationData={evacuationData}
                aiAdvisory={aiAdvisory}
              />
            )}
          </div>
        </Suspense>
      </main>

      {/* Military Command Center Footer */}
      <footer className="w-full bg-[#0a110c] border-t border-slate-800/80 py-4 px-6 text-xs text-slate-400">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-display font-semibold text-slate-200">
              JALASURAKSHA AI DIGITAL TWIN
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400 font-mono">
              SIH26161 (PS161) — NTRO
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono text-center sm:text-right">
            <span>Delft3D (2D SWE) + SPH Lagrangian Solvers • GEE Sentinel-1 SAR Validation • OGC SHP/KML Pipeline</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
