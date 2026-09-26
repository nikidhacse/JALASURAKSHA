import React, { useState, useEffect, useRef } from 'react';
import { 
  Waves, 
  AlertTriangle, 
  FileText, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Radio, 
  Compass, 
  Layers, 
  Activity, 
  Share2 
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  selectedDam,
  onExportReport
}) {
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Air raid siren sound generator using Web Audio API
  const toggleSiren = () => {
    if (sirenPlaying) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setSirenPlaying(false);
    } else {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);

        // Siren frequency modulation (wailing between 400Hz and 750Hz)
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.35, ctx.currentTime); // 0.35 Hz cycle
        lfoGain.gain.setValueAtTime(250, ctx.currentTime);

        lfo.connect(osc.frequency);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);

        osc.start();
        lfo.start();
        oscRef.current = osc;
        setSirenPlaying(true);
      } catch (err) {
        console.error('Audio Context Error:', err);
      }
    }
  };

  const navItems = [
    { id: 'region', label: '01 🌍 Region Select', icon: Compass },
    { id: 'breach', label: '02 💥 Breach Scenario', icon: Layers },
    { id: 'twin', label: '03 🌊 Flood Digital Twin', icon: Activity },
    { id: 'impact', label: '04 🚨 Impact & Evacuation', icon: ShieldAlert },
    { id: 'validation', label: '05 🛰️ Validation & Report', icon: FileText }
  ];

  return (
    <header className="w-full bg-[#0a101d] border-b border-cyan-950/60 sticky top-0 z-50 shadow-2xl backdrop-blur-md">
      {/* Top Banner Bar */}
      <div className="max-w-[1720px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/25">
            <Waves className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xl text-white tracking-wider flex items-center gap-1.5">
                JALASURAKSHA
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  v2.6
                </span>
              </span>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold rounded-full bg-red-950/80 text-red-400 border border-red-800/80">
                <AlertTriangle className="w-3 h-3 mr-1 inline" /> PS161 / SIH26161 (NTRO)
              </span>
            </div>
            <p className="text-[11px] text-cyan-400/80 font-medium hidden sm:block">
              "Don't just simulate where the water goes. Simulate what happens next."
            </p>
          </div>
        </div>

        {/* Center telemetry: Active dam & basin */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-lg text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">ACTIVE BASIN:</span>
            <span className="text-cyan-300 font-semibold">{selectedDam.river}</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400">DAM:</span>
            <span className="text-white font-semibold">{selectedDam.name}</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-red-400 animate-spin" />
            <span className="text-red-400 font-semibold">{currentTimeStr}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Siren sound alert toggle */}
          <button
            onClick={toggleSiren}
            title={sirenPlaying ? "Mute Emergency Siren" : "Sound Emergency Flood Siren"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              sirenPlaying 
                ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/50 animate-pulse' 
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-red-900 hover:text-red-400'
            }`}
          >
            {sirenPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-red-400" />}
            <span className="hidden sm:inline">{sirenPlaying ? 'SIREN ACTIVE' : 'TEST SIREN'}</span>
          </button>

          {/* Quick HADR SITREP Export */}
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>HADR SITREP</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <nav className="max-w-[1720px] mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-800/60 bg-[#080d18]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30 shadow-[inset_0_-2px_8px_rgba(6,182,212,0.2)]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
