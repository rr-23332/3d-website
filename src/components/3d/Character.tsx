import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { loadMarchRig } from './march/marchRig';
import { MarchController } from './march/marchBrain';

export interface CharacterProps {
  modelUrl?: string;
  mousePos?: { x: number; y: number };
  onTargetChange?: (pos: [number, number, number]) => void;
}

/**
 * March 7th, rigged at load time (the source FBX is a static mesh) and
 * animated procedurally: she walks between the hologram, the desk and the
 * sofa, gestures at the headphones, types, sits down and waves.
 */
export const Character: React.FC<CharacterProps> = () => {
  const [ctrl, setCtrl] = useState<MarchController | null>(null);
  const ref = useRef<MarchController | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMarchRig()
      .then((rig) => {
        if (cancelled) return;
        const c = new MarchController(rig);
        ref.current = c;
        // Exposed on window so the animation state machine can be inspected
        // or scrubbed from the browser console (window.__march).
        (window as any).__march = c;
        setCtrl(c);
      })
      .catch((e) => console.error('March 7th failed to load', e));
    return () => {
      cancelled = true;
    };
  }, []);

  useFrame((_state, delta) => {
    ref.current?.update(delta);
  });

  return ctrl ? <primitive object={ctrl.group} /> : null;
};
