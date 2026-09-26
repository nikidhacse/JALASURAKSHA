import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Volume2, 
  VolumeX, 
  FileText, 
  ShieldAlert, 
  Activity, 
  Gauge, 
  Clock, 
  Compass, 
  Layers, 
  Cpu, 
  AlertTriangle,
  Waves
} from 'lucide-react';

export default function StatusTickerBar({
  selectedDam,
  simMinute = 38,
  solverType = 'delft3d',
  onExportReport
}) {
  const [sirenActive, setSirenActive] = useState(false);
  const [istTime, setIstTime] = useState('');
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);

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

  // Web Audio Air Raid / Disaster Siren Generator
  const toggleSiren = () => {
    if (sirenActive) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setSirenActive(false);
    } else {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, ctx.currentTime);

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.35, ctx.currentTime);
        lfoGain.gain.setValueAtTime(260, ctx.currentTime);

        lfo.connect(osc.frequency);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);

        osc.start();
        lfo.start();
        oscRef.current = osc;
        setSirenActive(true);
      } catch (err) {
        console.error('Audio Context Error:', err);
      }
    }
  };

  // Determine threat severity based on simulation timeline
  const isEmergency = simMinute > 0 && simMinute <= 60;

  return (
    <div className="w-full bg-[#070d18] border-b border-cyan-950/80 px-4 py-1.5 shadow-md">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Left Telemetry Group */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Live System Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">NTRO STATUS:</span>
            <span className="text-emerald-300 font-bold">OPERATIONAL</span>
          </div>

          {/* Active Basin & Dam */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0a1426] border border-cyan-900/60 text-[11px]">
            <span className="text-slate-400">BASIN:</span>
            <span className="text-cyan-300 font-semibold">{selectedDam?.river?.split('(')[0] || 'Cauvery'}</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-bold">{selectedDam?.name || 'Bhavanisagar Dam'}</span>
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
            <span className="font-bold text-white">T+{simMinute || 0} MIN</span>
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
          {/* Threat Defense Tag */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-slate-400">DEFENSE LEVEL:</span>
            <span className="font-bold">ALERT ORANGE // HYDRO RISK</span>
          </div>

          {/* Real-time IST Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-semibold">{istTime}</span>
          </div>

          {/* Quick Siren Toggle */}
          <button
            onClick={toggleSiren}
            title={sirenActive ? "Deactivate Siren" : "Activate Emergency Flood Siren"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
              sirenActive
                ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/50 animate-pulse'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-red-900 hover:text-red-400'
            }`}
          >
            {sirenActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-red-400" />}
            <span>{sirenActive ? 'SIREN ON' : 'SIREN'}</span>
          </button>

          {/* Military SITREP Download */}
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">HADR SITREP</span>
          </button>
        </div>
      </div>
    </div>
  );
}
