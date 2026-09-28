import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

export const NightWindowShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uSkyColorTop: new THREE.Color('#050914'),
    uSkyColorBottom: new THREE.Color('#141d33'),
    uMoonColor: new THREE.Color('#eef4ff'),
  },
  // Vertex Shader
  /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  /* glsl */ `
    varying vec2 vUv;

    uniform float uTime;
    uniform vec3 uSkyColorTop;
    uniform vec3 uSkyColorBottom;
    uniform vec3 uMoonColor;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 4; i++) {
        v += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
      }
      return v;
    }

    void main() {
      // Base night-sky gradient
      vec3 sky = mix(uSkyColorBottom, uSkyColorTop, vUv.y);

      // Moon: soft disc + glow, upper-right of the frame
      vec2 moonPos = vec2(0.72, 0.68);
      float moonDist = distance(vUv, moonPos);
      float moonDisc = smoothstep(0.052, 0.046, moonDist);
      float moonGlow = smoothstep(0.22, 0.0, moonDist) * 0.35;
      sky += uMoonColor * moonGlow;
      sky = mix(sky, uMoonColor, moonDisc);
      // A little crater shading so the moon isn't a flat dot
      float craters = smoothstep(0.5, 0.0, length(vUv - moonPos + vec2(0.012, -0.008)) * 22.0) * 0.15;
      sky -= craters * moonDisc;

      // Stars: sparse hashed points that twinkle
      vec2 starGrid = vUv * vec2(40.0, 22.0);
      vec2 starId = floor(starGrid);
      float starRand = hash(starId);
      vec2 starLocal = fract(starGrid) - 0.5;
      float starDist = length(starLocal);
      float twinkle = 0.5 + 0.5 * sin(uTime * (1.5 + starRand * 3.0) + starRand * 20.0);
      float star = smoothstep(0.05, 0.0, starDist) * step(0.965, starRand) * (0.4 + 0.6 * twinkle);
      sky += vec3(star);

      // Clouds: two soft fbm layers drifting slowly in opposite directions
      float cloud1 = fbm(vUv * 3.0 + vec2(uTime * 0.015, 0.0));
      float cloud2 = fbm(vUv * 4.5 + vec2(-uTime * 0.01, 0.1));
      float clouds = smoothstep(0.55, 0.85, cloud1 * 0.6 + cloud2 * 0.4);
      sky = mix(sky, vec3(0.15, 0.17, 0.24), clouds * 0.5);

      gl_FragColor = vec4(sky, 0.96);
    }
  `
);

extend({ NightWindowShaderMaterial });
