import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, RoundedBox, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import './Shaders/HologramMaterial';
import { createWovenFabricTextures } from '../../utils/textureGenerators';

// Custom interface for HologramMaterial elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      hologramShaderMaterial: any;
    }
  }
}

interface HeroProductProps {
  onHotspotClick?: (id: string) => void;
  activeHotspotId?: string | null;
}

export const HeroProduct: React.FC<HeroProductProps> = ({ onHotspotClick, activeHotspotId }) => {
  const hologramRef = useRef<any>(null);
  const ringRef = useRef<THREE.Group>(null);
  const headphonesRef = useRef<THREE.Group>(null);

  // Real micro-surface roughness map (three.js example asset) so the
  // metal pedestal/ear cups pick up subtle imperfections instead of
  // looking like a flat mirror. I could not find a downloadable, openly
  // licensed 3D headphones model through the sources available to me
  // (Kenney's full CC0 library and the Khronos glTF sample sets have
  // neither headphones nor headsets) — this geometry is hand-built, but
  // its cushions now use the same real normal-mapped fabric texture as
  // the sofa/pillows instead of a flat color.
  const metalRoughness = useTexture('/textures/pbr/roughness_map.jpg');
  metalRoughness.wrapS = metalRoughness.wrapT = THREE.RepeatWrapping;
  metalRoughness.repeat.set(2, 2);

  const cushionFabric = useMemo(() => createWovenFabricTextures(256, 3), []);

  useFrame((_state, delta) => {
    if (hologramRef.current) {
      hologramRef.current.uTime += delta;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.6;
      ringRef.current.rotation.z += delta * 0.2;
    }
    if (headphonesRef.current) {
      headphonesRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={[0, -0.2, 0.5]} name="hero-product-pedestal">
      {/* 1. PEDESTAL BASE */}
      {/* Outer Metallic Base */}
      <mesh position={[0, -0.85, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.9, 1.0, 0.2, 32]} />
        <meshStandardMaterial color="#0f172a" roughnessMap={metalRoughness} roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Sleek Cyan Ring Accent on Pedestal */}
      <mesh position={[0, -0.74, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.8, 32]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={1.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Hologram Light Cone/Emitter Pass */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.7, 0.1, 0.9, 32, 1, true]} />
        <hologramShaderMaterial
          ref={hologramRef}
          uGlowColor={new THREE.Color('#00f0ff')}
          uOpacity={0.3}
          uGlitchIntensity={0.04}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. NEXUS NEURAL HEADPHONES (HERO 3D PRODUCT) */}
      <Float speed={2.5} rotationIntensity={0.4} floatIntensity={0.6}>
        <group ref={headphonesRef} position={[0, 0.25, 0]}>
          {/* Headband Arc */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <torusGeometry args={[0.38, 0.035, 16, 32, Math.PI]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>

          {/* Cushioned Top Arch */}
          <mesh position={[0, 0.38, 0]}>
            <torusGeometry args={[0.36, 0.025, 12, 32, Math.PI * 0.7]} />
            <meshStandardMaterial
              color="#1e293b"
              map={cushionFabric.map}
              normalMap={cushionFabric.normalMap}
              roughnessMap={cushionFabric.roughnessMap}
              roughness={0.8}
              metalness={0.0}
            />
          </mesh>

          {/* Left Ear Cup Assembly */}
          <group position={[-0.38, 0.0, 0]}>
            {/* Outer Ear Cup Shell */}
            <RoundedBox args={[0.12, 0.32, 0.26]} radius={0.04} smoothness={4} castShadow>
              <meshStandardMaterial color="#020617" roughnessMap={metalRoughness} roughness={0.25} metalness={0.95} />
            </RoundedBox>
            {/* Plush Cushion */}
            <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 0.06, 24]} />
              <meshStandardMaterial
                color="#0f172a"
                map={cushionFabric.map}
                normalMap={cushionFabric.normalMap}
                roughnessMap={cushionFabric.roughnessMap}
                roughness={0.85}
                metalness={0.0}
              />
            </mesh>
            {/* LED Glow Strip */}
            <mesh position={[-0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.11, 0.01, 12, 24]} />
              <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2.5} />
            </mesh>
          </group>

          {/* Right Ear Cup Assembly */}
          <group position={[0.38, 0.0, 0]}>
            {/* Outer Ear Cup Shell */}
            <RoundedBox args={[0.12, 0.32, 0.26]} radius={0.04} smoothness={4} castShadow>
              <meshStandardMaterial color="#020617" roughnessMap={metalRoughness} roughness={0.25} metalness={0.95} />
            </RoundedBox>
            {/* Plush Cushion */}
            <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 0.06, 24]} />
              <meshStandardMaterial
                color="#0f172a"
                map={cushionFabric.map}
                normalMap={cushionFabric.normalMap}
                roughnessMap={cushionFabric.roughnessMap}
                roughness={0.85}
                metalness={0.0}
              />
            </mesh>
            {/* LED Glow Strip */}
            <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.11, 0.01, 12, 24]} />
              <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2.5} />
            </mesh>
          </group>

          {/* Rotating Holographic Orbital Rings */}
          <group ref={ringRef}>
            <mesh rotation={[Math.PI / 4, 0, 0]}>
              <torusGeometry args={[0.65, 0.008, 12, 48]} />
              <meshStandardMaterial color="#ff77aa" emissive="#ff77aa" emissiveIntensity={1.5} transparent opacity={0.7} />
            </mesh>
            <mesh rotation={[-Math.PI / 4, Math.PI / 3, 0]}>
              <torusGeometry args={[0.72, 0.006, 12, 48]} />
              <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={1.5} transparent opacity={0.5} />
            </mesh>
          </group>

          {/* 3D Interactive Hotspot on Hero Product */}
          <group position={[0, 0.42, 0]}>
            <Html center occlude="blending" distanceFactor={6} zIndexRange={[100, 0]}>
              <button
                onClick={() => onHotspotClick?.('product-hotspot')}
                className={`group relative flex items-center justify-center w-8 h-8 rounded-full border border-cyan-400/50 bg-slate-950/80 backdrop-blur-md transition-all duration-300 hover:scale-125 focus:outline-none ${
                  activeHotspotId === 'product-hotspot' ? 'ring-2 ring-cyan-400 scale-110' : ''
                }`}
                title="Inspect Neural Drivers"
              >
                <span className="absolute -inset-1 rounded-full bg-cyan-500/20 animate-ping" />
                <span className="relative flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
              </button>
            </Html>
          </group>
        </group>
      </Float>
    </group>
  );
};

export default HeroProduct;
