import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  ShieldAlert, 
  Clock, 
  Cpu, 
  Activity,
  CheckCircle2
} from 'lucide-react';

export default function StatusTickerBar({
  selectedDam,
  simMinute = 38,
  solverType = 'delft3d'
}) {
  const [istTime, setIstTime] = useState('');

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine threat severity based on simulation timeline
  const isEmergency = simMinute > 0 && simMinute <= 60;

  return (
    <div className="w-full bg-[#0a110d] border-b border-slate-800/80 px-4 py-1.5 shadow-md">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Left Telemetry Group */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Live System Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">NTRO STATUS:</span>
            <span className="text-emerald-300 font-bold">OPERATIONAL</span>
          </div>

          {/* Active Basin & Dam */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#131f18] border border-cyan-800/50 text-[11px]">
            <span className="text-slate-400">BASIN:</span>
            <span className="text-cyan-300 font-semibold">{selectedDam?.river?.split('(')[0] || 'Cauvery'}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-100 font-bold">{selectedDam?.name || 'Bhavanisagar Dam'}</span>
            <span className="text-[10px] text-amber-400 font-mono">({selectedDam?.storageCapacityMm3} Mm³)</span>
          </div>

          {/* Simulation Timeline Clock */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded border text-[11px] ${
            isEmergency 
              ? 'bg-red-950/40 border-red-800/80 text-red-300' 
              : 'bg-slate-900/80 border-slate-800 text-slate-300'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isEmergency ? 'text-red-400 animate-spin' : 'text-slate-400'}`} />
            <span className="text-slate-400">SIM TIMELINE:</span>
            <span className="font-bold text-slate-100">T+{simMinute || 0} MIN</span>
            <span className="text-[10px] uppercase text-cyan-400">
              {simMinute <= 0 ? 'PRE-BREACH' : simMinute < 30 ? 'BORE WAVE SURGE' : 'PROPAGATING'}
            </span>
          </div>

          {/* Solver Benchmark Mode */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">SOLVER:</span>
            <span className="text-purple-300 font-semibold uppercase">{solverType === 'sph' ? 'SPH Lagrangian' : 'Delft3D 2D SWE'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">DEM:</span>
            <span className="text-cyan-400">CartoDEM 30m</span>
          </div>
        </div>

        {/* Right Action & Threat Group */}
        <div className="flex items-center gap-3">
          {/* Real-time sync status */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>FEEDS SYNCED</span>
          </div>

          {/* Threat Defense Tag */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-slate-400">DEFENSE LEVEL:</span>
            <span className="font-bold">ALERT ORANGE</span>
          </div>

          {/* Real-time IST Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-semibold">{istTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
