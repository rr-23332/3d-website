import React, { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { Loader2, Sparkles } from 'lucide-react';

export const Loader: React.FC = () => {
  const { active, progress } = useProgress();
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    // Hide loader automatically after 2.5 seconds or when assets finish loading
    const timer = setTimeout(() => {
      setMounted(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!mounted && (!active || progress >= 100)) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-slate-950 text-white font-mono transition-opacity duration-700">
      <div className="relative flex flex-col items-center p-8 rounded-2xl bg-slate-900/80 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_50px_rgba(6,182,212,0.15)] pointer-events-auto">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-pink-500/20 to-cyan-500/20 blur-lg animate-pulse pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-7 h-7 text-cyan-400 animate-spin" />
            <span className="text-2xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
              THE NEXUS
            </span>
          </div>

          <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-cyan-900 mb-4">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{ width: `${Math.min(100, Math.max(0, progress > 0 ? progress : 100))}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-64 text-sm text-cyan-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> Initializing WebGL
            </span>
            <span>{progress > 0 ? Math.round(progress) : 100}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
