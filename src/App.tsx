import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Scene } from './components/3d/Scene';
import { Overlay } from './components/ui/Overlay';
import { Loader } from './components/ui/Loader';
import { ProductCard } from './components/ui/ProductCard';
import type { HotspotData } from './types/hotspot';
import { useMouseParallax } from './hooks/useMouseParallax';
import { useScrollTimeline, stageTargets } from './hooks/useScrollTimeline';

export const App: React.FC = () => {
  const [activeHotspot, setActiveHotspot] = useState<HotspotData | null>(null);

  const cameraTargetRef = useRef({ x: 0, y: 0, z: 4.5 });
  const mousePos = useMouseParallax();
  const { currentStage } = useScrollTimeline({
    activeHotspotId: activeHotspot ? activeHotspot.id : null,
    cameraTargetRef,
  });

  // Handle scroll lock when hotspot modal is active
  useEffect(() => {
    if (activeHotspot) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [activeHotspot]);

  const handleSelectHotspot = (hotspot: HotspotData) => {
    setActiveHotspot(hotspot);

    gsap.to(cameraTargetRef.current, {
      x: hotspot.targetCameraPos[0],
      y: hotspot.targetCameraPos[1],
      z: hotspot.targetCameraPos[2],
      duration: 1.2,
      ease: 'power3.inOut',
    });
  };

  const handleCloseModal = () => {
    setActiveHotspot(null);
    const restoreTarget = stageTargets[currentStage] || stageTargets[1];
    gsap.to(cameraTargetRef.current, {
      x: restoreTarget.x,
      y: restoreTarget.y,
      z: restoreTarget.z,
      duration: 1.0,
      ease: 'power2.out',
    });
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-mono">
      <Scene
        mousePos={mousePos}
        cameraTargetRef={cameraTargetRef}
        onSelectHotspot={handleSelectHotspot}
        activeHotspotId={activeHotspot ? activeHotspot.id : null}
      />

      <Overlay currentStage={currentStage} />

      <ProductCard hotspot={activeHotspot} onClose={handleCloseModal} />

      <Loader />

      <div id="scroll-container" className="relative z-10 pointer-events-none">
        {/* Scroll-driven camera stages. The four full-height sections below
            drive the GSAP ScrollTrigger timeline that moves the camera
            between stages — kept as invisible spacers now that the text
            cards are gone, so scrolling still works. */}
        <section className="h-screen" />
        <section className="h-screen" />
        <section className="h-screen" />
        <section className="h-screen" />
      </div>
    </div>
  );
};

export default App;
