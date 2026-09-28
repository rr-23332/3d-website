import React from 'react';
import type { HotspotData } from '../../types/hotspot';
import { X, ShoppingBag, CheckCircle2, Cpu } from 'lucide-react';

interface ProductCardProps {
  hotspot: HotspotData | null;
  onClose: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ hotspot, onClose }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!hotspot) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900/90 border border-cyan-500/40 p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 backdrop-blur-2xl"
        data-testid="product-card-modal"
      >
        {/* Top Glow Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-pink-500 to-cyan-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          data-testid="close-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono tracking-wider uppercase text-cyan-400">
              {hotspot.category}
            </span>
            <h2 className="text-2xl font-extrabold text-white">{hotspot.title}</h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm leading-relaxed mb-6 font-sans">
          {hotspot.description}
        </p>

        {/* Technical Specs List */}
        {hotspot.specs && Object.keys(hotspot.specs).length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-mono uppercase text-slate-400 mb-3 tracking-wide">
              Technical Specifications
            </h4>
            <ul className="space-y-2">
              {Object.entries(hotspot.specs).map(([key, value]) => (
                <li key={key} className="flex items-center justify-between text-xs text-cyan-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-slate-300">{key}:</span>
                  </div>
                  <span className="text-cyan-300 font-mono">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" /> Acquire Specimen
          </button>
          <button
            onClick={onClose}
            className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
