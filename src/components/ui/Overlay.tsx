import React from 'react';
import { Compass, Layers } from 'lucide-react';

interface OverlayProps {
  currentStage: number;
}

export const Overlay: React.FC<OverlayProps> = ({ currentStage }) => {
  const stages = [
    { id: 1, label: '01 / Loft Room' },
    { id: 2, label: '02 / Character' },
    { id: 3, label: '03 / Tech Workstation' },
    { id: 4, label: '04 / Free Showcase' },
  ];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 select-none font-mono">
      {/* Top Header */}
      <header className="flex items-center justify-between w-full">
        {/* Logo Brand */}
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="text-base font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-pink-500">
            THE NEXUS
          </span>
        </div>

        {/* Scroll Stage Indicators */}
        <div className="hidden md:flex items-center gap-2 pointer-events-auto px-4 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <Layers className="w-4 h-4 text-cyan-400 mr-2" />
          {stages.map((st) => (
            <div
              key={st.id}
              className={`px-3 py-1 rounded-full text-xs transition-all duration-300 ${
                currentStage === st.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.label}
            </div>
          ))}
        </div>
      </header>

      {/* Bottom Footer Info */}
      <footer className="flex items-end justify-between w-full">
        <div className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md text-xs text-slate-400">
          <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span>SCROLL TO EXPLORE | CLICK HOTSPOTS TO INSPECT</span>
        </div>

        <div className="pointer-events-auto text-right text-[10px] text-slate-500 font-mono tracking-widest hidden sm:block">
          <div>WEBGL 2.0 / R3F + THREE.JS</div>
          <div>STABLE 60 FPS OPTIMIZED</div>
        </div>
      </footer>
    </div>
  );
};
