import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

export const HologramShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uGlowColor: new THREE.Color('#38bdf8'),
    uScanlineDensity: 30.0,
    uGlitchIntensity: 0.15,
    uOpacity: 0.85,
  },
  // Vertex Shader
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      // Geometry is left completely static: any per-vertex displacement here
      // reads as jitter/tremor on the hero object, especially at low frame
      // rates. The glitch/scanline effect lives only in the fragment shader
      // below (pure color/alpha), which can never move the silhouette.
      vec3 pos = position;

      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform float uTime;
    uniform vec3 uGlowColor;
    uniform float uScanlineDensity;
    uniform float uGlitchIntensity;
    uniform float uOpacity;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);

      float scanline = sin(vUv.y * uScanlineDensity * 3.14159 - uTime * 6.0) * 0.5 + 0.5;
      scanline = pow(scanline, 1.5);

      float glitchBar = step(0.98, sin(vUv.y * 50.0 + uTime * 20.0)) * uGlitchIntensity;

      float alpha = (fresnel * 0.8 + scanline * 0.4 + glitchBar * 0.5) * uOpacity;
      vec3 color = mix(uGlowColor, vec3(1.0), fresnel * 0.5 + glitchBar);

      gl_FragColor = vec4(color, alpha);
    }
  `
);

extend({ HologramShaderMaterial });
