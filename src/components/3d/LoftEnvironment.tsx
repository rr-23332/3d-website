import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Sparkles, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import './Shaders/NightWindowMaterial';

// Custom interface for NightWindowShaderMaterial elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      nightWindowShaderMaterial: any;
    }
  }
}

export const LoftEnvironment: React.FC = () => {
  const nightMaterialRef = useRef<any>(null);

  // Real photographic PBR maps (three.js example assets, MIT-licensed) instead
  // of flat colors, so the floor and back wall read as actual materials.
  const [floorMap, floorBump, floorRoughness] = useTexture([
    '/textures/pbr/hardwood2_diffuse.jpg',
    '/textures/pbr/hardwood2_bump.jpg',
    '/textures/pbr/hardwood2_roughness.jpg',
  ]);
  const [brickMap, brickBump, brickRoughness] = useTexture([
    '/textures/pbr/brick_diffuse.jpg',
    '/textures/pbr/brick_bump.jpg',
    '/textures/pbr/brick_roughness.jpg',
  ]);

  [floorMap, floorBump, floorRoughness].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    t.colorSpace = THREE.SRGBColorSpace;
  });
  floorRoughness.colorSpace = THREE.NoColorSpace;
  floorBump.colorSpace = THREE.NoColorSpace;

  [brickMap, brickBump, brickRoughness].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 2.5);
    t.colorSpace = THREE.SRGBColorSpace;
  });
  brickRoughness.colorSpace = THREE.NoColorSpace;
  brickBump.colorSpace = THREE.NoColorSpace;

  useFrame((_state, delta) => {
    if (nightMaterialRef.current) {
      nightMaterialRef.current.uTime += delta;
    }
  });

  return (
    <group name="loft-environment">
      {/* 1. LIGHTING HIERARCHY */}
      {/* Warm Ambient Fill for Shadow Visibility */}
      <ambientLight intensity={0.8} color="#ffdfd3" />

      {/* Primary Key Light with Dynamic Shadows */}
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.2}
        color="#e0f2fe"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />

      {/* Cool Rim/Back Accent Light behind workstation/sofa */}
      <pointLight position={[-3, 2.5, -2]} intensity={2.5} color="#00f0ff" distance={8} decay={2} />
      
      {/* Warm Accent Interior Lights (Desk/Shelves) */}
      <pointLight position={[1.8, 1.4, -0.8]} intensity={1.8} color="#ffaa55" distance={5} decay={2} />
      <pointLight position={[-1.5, 2.2, -1.8]} intensity={1.2} color="#ff77aa" distance={4} decay={2} />

      {/* Image-based lighting: gives metal (headphone shells, pedestal,
          monitor frames) real reflections instead of flat mirror-gray,
          and fills in ambient specular the point lights alone can't. */}
      <Environment files="/hdri/lebombo_1k.hdr" background={false} environmentIntensity={0.35} />

      {/* Soft Contact Shadows on Floor */}
      <ContactShadows
        position={[0, -1.24, 0]}
        opacity={0.65}
        scale={14}
        blur={2}
        far={4}
        resolution={512}
        color="#050b14"
      />

      {/* 2. ROOM ENCLOSURE / ARCHITECTURE */}
      {/* Floor with real hardwood PBR maps */}
      <mesh position={[0, -1.25, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial
          map={floorMap}
          bumpMap={floorBump}
          bumpScale={0.015}
          roughnessMap={floorRoughness}
          roughness={0.6}
          metalness={0.1}
          color="#3a3229"
        />
      </mesh>

      {/* Back Wall with real brick PBR maps */}
      <mesh position={[0, 2.75, -4]} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial
          map={brickMap}
          bumpMap={brickBump}
          bumpScale={0.02}
          roughnessMap={brickRoughness}
          roughness={0.9}
          metalness={0.0}
          color="#7a7480"
        />
      </mesh>

      {/* Left Wall — same real brick PBR maps as the back wall */}
      <mesh position={[-6, 2.75, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial
          map={brickMap}
          bumpMap={brickBump}
          bumpScale={0.02}
          roughnessMap={brickRoughness}
          roughness={0.9}
          metalness={0.0}
          color="#7a7480"
        />
      </mesh>

      {/* Right Wall — same real brick PBR maps as the back wall */}
      <mesh position={[6, 2.75, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial
          map={brickMap}
          bumpMap={brickBump}
          bumpScale={0.02}
          roughnessMap={brickRoughness}
          roughness={0.9}
          metalness={0.0}
          color="#7a7480"
        />
      </mesh>

      {/* Side-wall details: wall-wash lights so the brick is actually lit,
          baseboard trim, and neon LED strips so the walls read as part of
          the loft instead of dark voids at the edges. */}
      <pointLight position={[-5.0, 1.6, -0.5]} intensity={3.2} color="#ffb27a" distance={7} decay={2} />
      <pointLight position={[5.0, 1.6, -0.5]} intensity={3.2} color="#6fd8ff" distance={7} decay={2} />
      <pointLight position={[-5.0, 1.6, 2.2]} intensity={1.6} color="#ffb27a" distance={6} decay={2} />
      <pointLight position={[5.0, 1.6, 2.2]} intensity={1.6} color="#6fd8ff" distance={6} decay={2} />

      {/* Baseboards */}
      <mesh position={[-5.97, -1.05, 0]}>
        <boxGeometry args={[0.06, 0.4, 12]} />
        <meshStandardMaterial color="#14171f" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[5.97, -1.05, 0]}>
        <boxGeometry args={[0.06, 0.4, 12]} />
        <meshStandardMaterial color="#14171f" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, -1.05, -3.97]}>
        <boxGeometry args={[12, 0.4, 0.06]} />
        <meshStandardMaterial color="#14171f" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Neon LED strips along the side walls */}
      <mesh position={[-5.96, 1.9, 0]}>
        <boxGeometry args={[0.03, 0.04, 12]} />
        <meshStandardMaterial color="#ff7a45" emissive="#ff7a45" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[5.96, 1.9, 0]}>
        <boxGeometry args={[0.03, 0.04, 12]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>

      {/* 3. NIGHT WINDOW — moon, twinkling stars, and drifting clouds
          instead of the old rain shader. The shelf (below) has been moved
          off this section of the back wall so nothing overlaps it. */}
      <group position={[0, 2.2, -3.95]}>
        {/* Window Metallic Outer Frame */}
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[6.2, 3.2, 0.08]} />
          <meshStandardMaterial color="#050811" roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Window Mullions (cross-bars), cyber-loft styling */}
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.05, 3, 0.03]} />
          <meshStandardMaterial color="#0a0e1a" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[5.9, 0.05, 0.03]} />
          <meshStandardMaterial color="#0a0e1a" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Night Sky Shader Plane */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[6, 3]} />
          <nightWindowShaderMaterial
            ref={nightMaterialRef}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 4. ATMOSPHERIC PARTICLES */}
      <Sparkles
        count={60}
        scale={[10, 5, 8]}
        position={[0, 1, -1]}
        size={2.5}
        speed={0.4}
        opacity={0.4}
        color="#00f0ff"
      />
    </group>
  );
};

export default LoftEnvironment;
