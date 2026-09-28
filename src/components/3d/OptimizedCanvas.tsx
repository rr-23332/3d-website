import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';

interface OptimizedCanvasProps {
  children: React.ReactNode;
}

export const OptimizedCanvas: React.FC<OptimizedCanvasProps> = ({ children }) => {
  return (
    <Canvas
      dpr={[1, typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1.5]}
      performance={{ min: 0.5 }}
      camera={{ position: [0, 1.8, 5.5], fov: 45, near: 0.1, far: 50 }}
      gl={{
        powerPreference: 'high-performance',
        antialias: true,
        stencil: false,
        depth: true,
      }}
      shadows
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}
    >
      <Suspense fallback={null}>
        {children}
        <Preload all />
      </Suspense>
      <AdaptiveDpr pixelated />
    </Canvas>
  );
};

export default OptimizedCanvas;
