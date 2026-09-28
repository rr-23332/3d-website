import React, { Suspense } from 'react';
import { PerspectiveCamera, Stats } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OptimizedCanvas } from './OptimizedCanvas';
import { LoftEnvironment } from './LoftEnvironment';
import { LoftFurniture } from './LoftFurniture';
import { HeroProduct } from './HeroProduct';
import { Character } from './Character';
import type { HotspotData } from '../../types/hotspot';

interface CameraRigProps {
  cameraTarget: React.RefObject<{ x: number; y: number; z: number }>;
  mousePos: { x: number; y: number };
}

const CameraRig: React.FC<CameraRigProps> = ({ cameraTarget, mousePos }) => {
  useFrame((state, delta) => {
    if (!cameraTarget.current) return;
    const targetX = cameraTarget.current.x + mousePos.x * 0.12;
    const targetY = cameraTarget.current.y + mousePos.y * 0.08;
    const targetZ = cameraTarget.current.z;

    const lerpFactor = 1 - Math.exp(-6 * delta);
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, lerpFactor);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, lerpFactor);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, lerpFactor);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
};

interface SceneProps {
  mousePos: { x: number; y: number };
  cameraTargetRef: React.RefObject<{ x: number; y: number; z: number }>;
  onSelectHotspot: (hotspot: HotspotData) => void;
  activeHotspotId?: string | null;
  showFps?: boolean;
}

export const Scene: React.FC<SceneProps> = ({
  mousePos,
  cameraTargetRef,
  onSelectHotspot,
  activeHotspotId,
  showFps = false,
}) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-auto">
      <OptimizedCanvas>
        <PerspectiveCamera makeDefault position={[0, 0, 4.5]} fov={50} near={0.1} far={50} />
        <CameraRig cameraTarget={cameraTargetRef} mousePos={mousePos} />

        <color attach="background" args={['#030712']} />
        <fog attach="fog" args={['#030712', 6, 22]} />

        {showFps && <Stats className="!top-20 !left-4 !bottom-auto !right-auto" />}

        <Suspense fallback={null}>
          <LoftEnvironment />
          <LoftFurniture />
          <HeroProduct
            onHotspotClick={() =>
              onSelectHotspot({
                id: 'hero-product',
                title: 'Nexus Neural Headphones',
                category: 'Audio Architecture',
                description:
                  'Spatial audio headphones with active neural noise cancellation and reactive ambient lighting strips.',
                specs: {
                  Drivers: '50mm Beryllium',
                  Latency: '2.4ms Ultra-Low',
                  Battery: '45 Hours',
                },
                position: [0, 0.25, 0.5],
                targetCameraPos: [0, 0.3, 2.2],
              })
            }
            activeHotspotId={activeHotspotId}
          />
          <Character mousePos={mousePos} />
        </Suspense>
      </OptimizedCanvas>
    </div>
  );
};

export default Scene;
