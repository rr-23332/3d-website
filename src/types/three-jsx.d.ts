import type * as THREE from 'three';
import type { ThreeElement } from '@react-three/fiber';
import { HologramShaderMaterial } from '../components/3d/Shaders/HologramMaterial';
import { NightWindowShaderMaterial } from '../components/3d/Shaders/NightWindowMaterial';

declare module '@react-three/fiber' {
  interface ThreeElements {
    hologramShaderMaterial: ThreeElement<typeof HologramShaderMaterial>;
    nightWindowShaderMaterial: ThreeElement<typeof NightWindowShaderMaterial>;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      hologramShaderMaterial: ThreeElement<typeof HologramShaderMaterial>;
      nightWindowShaderMaterial: ThreeElement<typeof NightWindowShaderMaterial>;
    }
  }
}
