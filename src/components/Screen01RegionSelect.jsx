import React, { useState } from 'react';
import { DAMS_DATABASE } from '../data/damsData';
import damImages from '../data/damImages.json';
import ThreeIndiaMap from './ThreeIndiaMap';
import { 
  Compass, 
  Layers, 
  MapPin, 
  Gauge, 
  Mountain, 
  CheckCircle2, 
  ArrowRight, 
  Info, 
  ShieldCheck, 
  Building,
  Activity,
  Camera,
  Droplets,
  AlertTriangle,
  FileCheck
} from 'lucide-react';

export default function Screen01RegionSelect({
  selectedDam,
  setSelectedDam,
  onProceedToBreach
}) {
  const [basinStateFilter, setBasinStateFilter] = useState('ALL');

  // Active dam Wikimedia Commons photo & attribution
  const activeDamImage = damImages[selectedDam?.id] || {
    imageUrl: selectedDam?.satelliteImage,
    attribution: 'Wikimedia Commons / Public Domain',
    source: 'Wikimedia Commons',
    license: 'CC BY-SA'
  };

  // Filtered dams for switcher
  const filteredBasinDams = basinStateFilter === 'ALL'
    ? DAMS_DATABASE
    : DAMS_DATABASE.filter(d => d.state?.includes(basinStateFilter));

  const stateCounts = {
    'ALL': DAMS_DATABASE.length,
    'Tamil Nadu': DAMS_DATABASE.filter(d => d.state?.includes('Tamil Nadu')).length,
    'Kerala': DAMS_DATABASE.filter(d => d.state?.includes('Kerala')).length,
    'Karnataka': DAMS_DATABASE.filter(d => d.state?.includes('Karnataka')).length,
    'Andhra Pradesh': DAMS_DATABASE.filter(d => d.state?.includes('Andhra Pradesh')).length
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 py-5 space-y-5">
      {/* Sleek Command Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0e1611] border border-cyan-900/40 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              STEP 01 // BASIN SELECTION
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              PS161 // NTRO SPECIFICATION • SOUTH INDIA SCOPE
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            Hydro-Geographic Basin &amp; Dam Selection
          </h1>
          <p className="text-xs text-slate-300">
            Real 3D digital twin loaded with 20 CWC NRLD specified large dams across Tamil Nadu, Kerala, Karnataka, and Andhra Pradesh.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121e16] border border-cyan-800/40 text-xs font-mono">
            <span className="text-slate-400">ACTIVE:</span>
            <span className="text-cyan-300 font-semibold">{selectedDam?.name}</span>
            <span className="text-amber-400">({selectedDam?.grossStorageTmc || (selectedDam?.storageCapacityMm3 / 28.32).toFixed(1)} TMC)</span>
          </div>

          <button
            onClick={onProceedToBreach}
            className="btn btn-primary text-xs font-semibold px-4 py-2 shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Proceed to Breach Scenario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* FEATURE 1: 3D INTERACTIVE INDIA MAP DIGITAL TWIN */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="font-bold uppercase tracking-wider">
              Subcontinent 3D Terrain Twin • 20 South Indian Dam Beacons
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Click any beacon to open the auditable CWC NRLD data panel
          </span>
        </div>

        <ThreeIndiaMap
          selectedDam={selectedDam}
          onSelectDam={setSelectedDam}
          onProceedToBreach={onProceedToBreach}
        />
      </section>

      {/* FEATURE 2: BASIN SELECTION SWITCHER & DETAILED DOSSIER */}
      <section className="space-y-3">
        {/* State Filter + Basin Switcher */}
        <div className="space-y-2">
          {/* State Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-mono text-slate-400 uppercase hidden md:inline px-1">
              Filter State:
            </span>
            {['ALL', 'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh'].map((st) => {
              const isSelected = basinStateFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setBasinStateFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                      : 'bg-[#0e1611] hover:bg-[#131f18] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st === 'ALL' ? 'ALL REGIONS' : st.toUpperCase()} ({stateCounts[st]})
                </button>
              );
            })}
          </div>

          {/* Dam Buttons Strip */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {filteredBasinDams.map((dam) => {
              const isSelected = selectedDam?.id === dam.id;
              return (
                <button
                  key={dam.id}
                  onClick={() => setSelectedDam(dam)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                    isSelected
                      ? 'bg-[#15241b] border-cyan-400 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                      : 'bg-[#0e1611]/80 hover:bg-[#131f18] text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span 
                    className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} 
                  />
                  <div className="text-left">
                    <div className="font-bold leading-tight flex items-center gap-1.5">
                      <span>{dam.name.split(' ')[0]}</span>
                      {dam.hasDualStateJurisdiction && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                          TN/KL
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {dam.state.split(' ')[0]} • {dam.grossStorageTmc || (dam.storageCapacityMm3 / 28.32).toFixed(1)} TMC
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Unified 2-Column Basin Intelligence Dossier */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (5 of 12 cols): Dam Physical Profile & High-Res Imagery */}
          <div className="lg:col-span-5 glass-panel p-4 space-y-3.5 bg-[#0e1611]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    HYDROLOGICAL PROFILE
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    {selectedDam?.sourcing?.cwcNrldCode || 'CWC SPECIFIED'}
                  </span>
                </div>
                <h2 className="text-lg font-display font-bold text-white leading-tight mt-0.5">
                  {selectedDam?.name}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedDam?.river} • {selectedDam?.state}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                Built {selectedDam?.builtYear}
              </span>
            </div>

            {/* Dual-State Alert (Mullaperiyar) */}
            {selectedDam?.hasDualStateJurisdiction && (
              <div className="bg-amber-950/60 border border-amber-600/80 p-2.5 rounded-lg text-amber-200 space-y-1 font-mono text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>SENSITIVE DUAL-STATE JURISDICTION</span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-amber-100 font-sans">
                  {selectedDam?.dualStateDetails}
                </p>
              </div>
            )}

            {/* Dam Photograph with Wikimedia Commons Attribution */}
            <div className="rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950 h-44">
              <img
                src={activeDamImage.imageUrl}
                alt={selectedDam?.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              
              <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center justify-between">
                <span className="text-cyan-400 font-medium flex items-center gap-1.5 truncate">
                  <Camera className="w-3 h-3 text-cyan-400" />
                  {activeDamImage.source || 'Wikimedia Commons'}
                </span>
                <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 uppercase shrink-0">
                  {activeDamImage.license || 'CC BY-SA'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {selectedDam?.description}
            </p>

            {/* Compact Technical Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px]">GROSS STORAGE</span>
                <span className="text-amber-400 font-bold">
                  {selectedDam?.grossStorageTmc || (selectedDam?.storageCapacityMm3 / 28.32).toFixed(1)} TMC
                </span>
                <span className="text-[9px] text-slate-400 block">({selectedDam?.storageCapacityMm3} MCM)</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px]">DAM HEIGHT</span>
                <span className="text-white font-bold">{selectedDam?.damHeight} m</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px]">CREST LENGTH</span>
                <span className="text-cyan-400 font-bold">{selectedDam?.crestLength?.toLocaleString()} m</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px]">FRL ELEVATION</span>
                <span className="text-white font-bold">{selectedDam?.fullReservoirLevel} m</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px]">CATCHMENT AREA</span>
                <span className="text-cyan-400 font-bold">{selectedDam?.catchmentAreaKm2?.toLocaleString()} km²</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px]">NEAREST CITY</span>
                <span className="text-white font-medium text-[10px] truncate block" title={selectedDam?.nearestCity}>
                  {selectedDam?.nearestCity?.split('(')[0] || selectedDam?.district}
                </span>
              </div>
            </div>

            {/* Auditable CWC Registry & Sourcing Notes Box */}
            <div className="bg-[#121f17] border border-cyan-800/50 p-2.5 rounded-lg space-y-1 font-mono text-[10px]">
              <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-cyan-900/60 pb-1">
                <span className="flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5" />
                  CWC NRLD Audit &amp; Technical Discrepancy Notes
                </span>
                <span className="text-slate-400 text-[9px]">
                  {selectedDam?.sourcing?.cwcNrldCode}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans text-[10.5px]">
                {selectedDam?.dataNotes || 'Calibrated from official Central Water Commission National Register of Large Dams and State Water Resources Department registers.'}
              </p>
              <div className="text-[9px] text-slate-400 font-mono pt-0.5">
                Source: {selectedDam?.sourcing?.reference || selectedDam?.sourcing?.agency}
              </div>
            </div>
          </div>

          {/* Right Column (7 of 12 cols): Longitudinal Profile & Downstream Settlements */}
          <div className="lg:col-span-7 glass-panel p-4 space-y-4 bg-[#0e1611] flex flex-col justify-between">
            {/* CartoDEM 30m Elevation Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-display font-bold text-white text-sm">
                    Downstream DEM Longitudinal Profile (CartoDEM 30m)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Total Reach: {selectedDam?.elevationProfile ? selectedDam.elevationProfile[selectedDam.elevationProfile.length - 1].km : 50} km
                </span>
              </div>

              {/* Interactive SVG DEM Elevation Plot */}
              <div className="w-full h-48 bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 relative">
                <svg className="w-full h-full" viewBox="0 0 700 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="demGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#37735f" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0d1410" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="riverBedGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6bbf9e" />
                      <stop offset="100%" stopColor="#4a9d7f" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  <line x1="50" y1="25" x2="680" y2="25" stroke="#1d2c23" strokeDasharray="3,3" />
                  <line x1="50" y1="70" x2="680" y2="70" stroke="#1d2c23" strokeDasharray="3,3" />
                  <line x1="50" y1="115" x2="680" y2="115" stroke="#1d2c23" strokeDasharray="3,3" />
                  <line x1="50" y1="150" x2="680" y2="150" stroke="#2b3d32" />

                  {/* Elevation Curve Polygon */}
                  {(() => {
                    const pts = selectedDam?.elevationProfile || [
                      { km: 0, elevation: 280, riverBed: 240 },
                      { km: 15, elevation: 250, riverBed: 220 },
                      { km: 35, elevation: 220, riverBed: 200 },
                      { km: 50, elevation: 195, riverBed: 180 }
                    ];
                    const maxKm = pts[pts.length - 1].km;
                    const maxElev = Math.max(...pts.map(p => p.elevation));
                    const minBed = Math.min(...pts.map(p => p.riverBed));
                    const elevRange = maxElev - minBed || 100;

                    const mapX = (km) => 60 + (km / maxKm) * 600;
                    const mapY = (elev) => 140 - ((elev - minBed) / elevRange) * 110;

                    const valleyPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.km)} ${mapY(p.elevation)}`).join(' ');
                    const bedPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.km)} ${mapY(p.riverBed)}`).join(' ');
                    const closedValley = `${valleyPath} L ${mapX(maxKm)} 150 L ${mapX(0)} 150 Z`;

                    return (
                      <g>
                        <path d={closedValley} fill="url(#demGradient)" />
                        <path d={valleyPath} fill="none" stroke="#587361" strokeWidth="1.5" strokeDasharray="4,2" />
                        <path d={bedPath} fill="none" stroke="url(#riverBedGradient)" strokeWidth="2.5" />

                        {pts.map((p, idx) => (
                          <g key={idx}>
                            <circle cx={mapX(p.km)} cy={mapY(p.riverBed)} r="3.5" fill="#4a9d7f" stroke="#e8ede8" strokeWidth="1.5" />
                            <text x={mapX(p.km)} y={mapY(p.riverBed) - 8} fill="#e8ede8" fontSize="9" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">
                              {p.riverBed}m
                            </text>
                            <text x={mapX(p.km)} y="165" fill="#8ca293" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                              {p.km} km
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>

                <div className="absolute top-2 left-4 text-[10px] font-mono text-slate-400 flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> River Bed Thalweg (m MSL)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 border-dashed border-t border-slate-400 inline-block" /> Valley Bank Elevation (m MSL)
                  </span>
                </div>
              </div>
            </div>

            {/* Downstream Settlements Vulnerability Cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-red-400" />
                  <span>Downstream Vulnerable Settlements Along Reach</span>
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  {selectedDam?.settlements?.length || 4} Critical Zones
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(selectedDam?.settlements || []).map((set) => (
                  <div key={set.id} className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs truncate max-w-[90px]">{set.name}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-red-950/80 text-red-400 border border-red-900">
                        {set.distanceKm} km
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Pop:</span>
                      <span className="text-slate-200">{set.population?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Wave Arrival:</span>
                      <span className="text-amber-400 font-bold">~{set.criticalArrivalTimeMin}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {selectedDam?.isFullySimulated 
                    ? '2D Shallow Water Equations & Full Inundation Twin Wired.' 
                    : 'CWC NRLD Verified Static Telemetry [SIH PS161 Scope].'}
                </span>
              </div>
              <button
                onClick={onProceedToBreach}
                className="btn btn-primary text-xs px-4 py-2 font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>{selectedDam?.isFullySimulated ? 'Configure Breach Scenario [Step 02]' : 'Inspect Simulation Benchmark'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
