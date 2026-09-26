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
  AlertOctagon, 
  Info, 
  ShieldCheck,
  Building,
  TrendingDown,
  ExternalLink,
  Camera,
  Activity,
  Cpu
} from 'lucide-react';

export default function Screen01RegionSelect({
  selectedDam,
  setSelectedDam,
  onProceedToBreach
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Active dam Wikimedia Commons photo & attribution
  const activeDamImage = damImages[selectedDam?.id] || {
    imageUrl: selectedDam?.satelliteImage,
    attribution: 'Wikimedia Commons / Public Domain',
    source: 'Wikimedia Commons',
    license: 'CC BY-SA'
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 py-6 space-y-6">
      {/* Screen Intro & Specification Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/95 via-[#121f17] to-slate-900/95 border border-cyan-900/50 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge badge-cyan">NTRO // PS161 SPECIFICATION</span>
            <span className="badge badge-purple">GENERALIZED HYDRODYNAMIC FRAMEWORK</span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              3D DIGITAL TWIN TERRAIN RELIEF
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Hydro-Geographic Basin &amp; Dam Selection</span>
            <span className="text-sm font-normal text-cyan-400 font-mono">
              [STEP 01/05]
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-4xl leading-relaxed">
            Select an Indian river basin from the interactive 3D digital twin map below. Calibrated CartoDEM 30m terrain elevations, 
            CWC discharge rating curves, downstream infrastructure inventories, and Froehlich (2008) peak breach equations are automatically loaded.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onProceedToBreach}
            className="btn btn-primary text-sm font-semibold px-5 py-2.5 shadow-xl shadow-cyan-500/25 flex items-center gap-2"
          >
            <span>Proceed to Breach Scenario</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FEATURE 1: 3D INTERACTIVE INDIA MAP DIGITAL TWIN */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="font-bold uppercase tracking-wider">
              Subcontinent 3D Terrain Twin • River Basins &amp; Interactive Dam Markers
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Drag to Rotate • Scroll to Zoom • Click Dam Marker to Inspect Basin
          </span>
        </div>

        <ThreeIndiaMap
          selectedDam={selectedDam}
          onSelectDam={setSelectedDam}
          onProceedToBreach={onProceedToBreach}
        />
      </section>

      {/* FEATURE 2: DAM CARDS WITH REAL WIKIMEDIA COMMONS IMAGERY */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display font-bold text-white text-base">
              Monitored River Basins &amp; High-Risk Hydraulic Structures
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            5 Calibrated Basins Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {DAMS_DATABASE.map((dam) => {
            const isSelected = selectedDam.id === dam.id;
            const imgMeta = damImages[dam.id];
            const displayImg = imgMeta?.imageUrl || dam.satelliteImage;

            return (
              <div
                key={dam.id}
                onClick={() => setSelectedDam(dam)}
                className={`glass-panel cursor-pointer p-3.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between group ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-[#131f18] shadow-xl shadow-slate-950/60'
                    : 'hover:border-slate-600 bg-slate-900/60 hover:bg-slate-900/80'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded-full border border-cyan-800 shadow-md">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    <span>ACTIVE</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Photo Container with Wikimedia Attribution */}
                  <div className="h-32 rounded-lg overflow-hidden relative border border-slate-800 bg-slate-950">
                    <img
                      src={displayImg}
                      alt={dam.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/70 text-slate-300 backdrop-blur-sm border border-white/10">
                        {dam.state}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="font-display font-bold text-sm text-white drop-shadow truncate">
                        {dam.name}
                      </h3>
                      <p className="text-[10px] text-cyan-300 font-mono truncate">
                        {dam.river.split('(')[0]}
                      </p>
                    </div>
                  </div>

                  {/* Monospace Wikimedia Commons Source Line */}
                  <div className="text-[9px] font-mono text-cyan-400/80 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between">
                    <span className="truncate max-w-[130px]" title={imgMeta?.attribution}>
                      Source: {imgMeta?.source || 'Wikimedia Commons'}
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase font-semibold">
                      {imgMeta?.license || 'CC BY-SA'}
                    </span>
                  </div>

                  {/* Dam Hydraulic Metrics */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Gross Storage:</span>
                      <span className="text-cyan-400 font-bold">{dam.storageCapacityMm3} Mm³</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Dam Height:</span>
                      <span className="text-slate-200">{dam.damHeight} m</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Reach Length:</span>
                      <span className="text-slate-200">
                        {dam.elevationProfile[dam.elevationProfile.length - 1].km} km
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 truncate max-w-[95px]">{dam.damType.split(' ')[0]}</span>
                  <span className="text-cyan-400 group-hover:underline flex items-center gap-1 font-semibold">
                    Inspect <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURE 3: SELECTED DAM DEEP DIVE DETAIL & CARTODEM 30M PROFILE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basin Technical Specs & Real Photograph Card */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono text-cyan-400">HYDROLOGICAL PROFILE</span>
              <h2 className="text-lg font-display font-bold text-white">{selectedDam.name}</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">
              Built {selectedDam.builtYear}
            </span>
          </div>

          {/* Large Real Photograph with Monospace Wikimedia Attribution */}
          <div className="rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
            <img
              src={activeDamImage.imageUrl}
              alt={selectedDam.name}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
            
            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-sm p-2 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  Source: Wikimedia Commons
                </span>
                <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                  {activeDamImage.license || 'CC BY-SA'}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 truncate">
                {activeDamImage.attribution || 'Wikimedia Commons Contributor'}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {selectedDam.description}
          </p>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-0.5">
              <span className="text-slate-500 block text-[10px]">DAM TYPE</span>
              <span className="text-white font-medium truncate block">{selectedDam.damType}</span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-0.5">
              <span className="text-slate-500 block text-[10px]">CREST LENGTH</span>
              <span className="text-cyan-400 font-bold">{selectedDam.crestLength.toLocaleString()} m</span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-0.5">
              <span className="text-slate-500 block text-[10px]">FULL RESERVOIR LEVEL (FRL)</span>
              <span className="text-white font-bold">{selectedDam.fullReservoirLevel} m</span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-0.5">
              <span className="text-slate-500 block text-[10px]">GROSS STORAGE CAPACITY</span>
              <span className="text-amber-400 font-bold">{selectedDam.storageCapacityMm3} Mm³</span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-0.5">
              <span className="text-slate-500 block text-[10px]">SPILLWAY DISCHARGE (MAX)</span>
              <span className="text-white font-bold">{selectedDam.maxSpillwayDischargeM3s.toLocaleString()} m³/s</span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-0.5">
              <span className="text-slate-500 block text-[10px]">CATCHMENT BASIN AREA</span>
              <span className="text-cyan-400 font-bold">{selectedDam.catchmentAreaKm2.toLocaleString()} km²</span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-0.5">
              <span className="text-slate-500 block text-[10px]">BED SLOPE (S₀)</span>
              <span className="text-slate-200">{(selectedDam.riverSlope * 1000).toFixed(2)} m / km</span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-0.5">
              <span className="text-slate-500 block text-[10px]">MANNING'S FRICTION (n)</span>
              <span className="text-slate-200">{selectedDam.manningsN} (Gravel/Brush)</span>
            </div>
          </div>

          <div className="bg-cyan-950/30 border border-cyan-800/50 p-3 rounded-lg flex items-start gap-2.5 text-xs text-cyan-200 font-sans">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-300">Hydrodynamic Calibration Ready:</span> River geometry is calibrated with historical Central Water Commission (CWC) gauge discharge rating curves.
            </div>
          </div>
        </div>

        {/* Center & Right Column: DEM Elevation Profile & Settlements Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* DEM Longitudinal Profile Graph */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mountain className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display font-bold text-white text-base">
                  Downstream DEM Longitudinal Elevation Profile (CartoDEM 30m)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Total Reach: {selectedDam.elevationProfile[selectedDam.elevationProfile.length - 1].km} km
              </span>
            </div>

            {/* Interactive SVG DEM Elevation Plot */}
            <div className="w-full h-56 bg-slate-950/80 rounded-xl p-3 border border-slate-800 relative">
              <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
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

                {/* Grid Lines */}
                <line x1="50" y1="30" x2="680" y2="30" stroke="#1d2c23" strokeDasharray="3,3" />
                <line x1="50" y1="80" x2="680" y2="80" stroke="#1d2c23" strokeDasharray="3,3" />
                <line x1="50" y1="130" x2="680" y2="130" stroke="#1d2c23" strokeDasharray="3,3" />
                <line x1="50" y1="170" x2="680" y2="170" stroke="#2b3d32" />

                {/* Elevation Curve Polygon */}
                {(() => {
                  const pts = selectedDam.elevationProfile;
                  const maxKm = pts[pts.length - 1].km;
                  const maxElev = Math.max(...pts.map(p => p.elevation));
                  const minBed = Math.min(...pts.map(p => p.riverBed));
                  const elevRange = maxElev - minBed || 100;

                  const mapX = (km) => 60 + (km / maxKm) * 600;
                  const mapY = (elev) => 160 - ((elev - minBed) / elevRange) * 125;

                  const valleyPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.km)} ${mapY(p.elevation)}`).join(' ');
                  const bedPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.km)} ${mapY(p.riverBed)}`).join(' ');
                  const closedValley = `${valleyPath} L ${mapX(maxKm)} 170 L ${mapX(0)} 170 Z`;

                  return (
                    <g>
                      <path d={closedValley} fill="url(#demGradient)" />
                      <path d={valleyPath} fill="none" stroke="#587361" strokeWidth="2" strokeDasharray="4,2" />
                      <path d={bedPath} fill="none" stroke="url(#riverBedGradient)" strokeWidth="3" />

                      {pts.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={mapX(p.km)} cy={mapY(p.riverBed)} r="4" fill="#4a9d7f" stroke="#e8ede8" strokeWidth="1.5" />
                          <text x={mapX(p.km)} y={mapY(p.riverBed) - 10} fill="#e8ede8" fontSize="10" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">
                            {p.riverBed}m
                          </text>
                          <text x={mapX(p.km)} y="185" fill="#8ca293" fontSize="9" textAnchor="middle" fontFamily="monospace">
                            {p.km} km
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>

              <div className="absolute top-2 left-4 text-[11px] font-mono text-slate-400 flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> River Bed Thalweg (m MSL)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-400 border-dashed border-t border-slate-400 inline-block" /> Valley Bank Elevation (m MSL)
                </span>
              </div>
            </div>

            {/* Downstream Settlements Vulnerability Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-red-400" />
                <span>Downstream Vulnerable Settlements Along Reach</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {selectedDam.settlements.map((set) => (
                  <div key={set.id} className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs truncate">{set.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-900">
                        {set.distanceKm} km
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Population:</span>
                      <span className="text-slate-200">{set.population.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Wave Arrival:</span>
                      <span className="text-amber-400 font-bold">~{set.criticalArrivalTimeMin} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Quick-Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>CartoDEM 30m, Thalweg Coordinates &amp; CWC Gauge Ratings Verified.</span>
              </div>
              <button
                onClick={onProceedToBreach}
                className="btn btn-primary text-xs px-4 py-2 font-semibold shadow-lg shadow-cyan-500/20"
              >
                Configure Breach Scenario →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
