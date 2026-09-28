import React, { useMemo } from 'react';
import { RoundedBox, useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRugTextures, createWovenFabricTextures } from '../../utils/textureGenerators';

/** Injects a small GLSL patch into a standard material that paints a
 * woven-fabric pattern from the vertex's LOCAL POSITION instead of its
 * UVs. The Kenney pillow models ship UV coordinates that run from -9 to
 * +9 (garbage — not a real 0..1 unwrap), so a normal `map`/`normalMap`
 * texture samples chaotically and just reads as a flat, slightly noisy
 * color. Position-based triplanar-style shading sidesteps the broken UVs
 * entirely and gives a real, visible woven pattern on every face. */
function applyProceduralFabricShading(material: THREE.MeshStandardMaterial, scale = 40) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFabricScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vFabricPos;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvFabricPos = position;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vFabricPos;
        uniform float uFabricScale;
        float fabricThread(vec2 p) {
          vec2 g = fract(p) - 0.5;
          float lineX = smoothstep(0.42, 0.5, abs(g.x));
          float lineY = smoothstep(0.42, 0.5, abs(g.y));
          return max(lineX, lineY);
        }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          // Blend two triplanar projections of a simple woven-thread
          // pattern so every face — whatever its normal — shows real
          // visible weave detail instead of a flat color.
          vec3 an = abs(normalize(vFabricPos + 0.0001));
          float wxy = fabricThread(vFabricPos.xy * uFabricScale);
          float wyz = fabricThread(vFabricPos.yz * uFabricScale);
          float wxz = fabricThread(vFabricPos.xz * uFabricScale);
          float weave = wxy * an.z + wyz * an.x + wxz * an.y;
          diffuseColor.rgb *= mix(1.0, 0.82, weave);
        }`
      );
  };
  material.needsUpdate = true;
}

/** Clones a loaded GLTF scene so the same model can be placed more than
 * once (a THREE.Object3D can only live at one spot in the graph at a time),
 * and optionally re-tints/re-textures its material. */
type MaterialStyle = {
  color: string;
  metalness?: number;
  roughness?: number;
  fabricScale?: number;
};

function useClonedModel(
  url: string,
  tint?: string,
  fabricScale?: number,
  styles?: Record<string, MaterialStyle>
) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const named = styles && mesh.material
          ? styles[(mesh.material as THREE.Material).name]
          : undefined;
        if (named) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.color = new THREE.Color(named.color);
          mat.metalness = named.metalness ?? 0;
          mat.roughness = named.roughness ?? 0.8;
          if (named.fabricScale) applyProceduralFabricShading(mat, named.fabricScale);
          mesh.material = mat;
        } else if ((tint || fabricScale) && mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          if (tint) mat.color = new THREE.Color(tint);
          if (fabricScale) {
            // Smooth the faceted low-poly shape into a soft, puffy cushion:
            // weld vertices and recompute averaged normals so light rolls
            // over the surface instead of snapping between flat facets.
            const g = mesh.geometry.clone();
            g.deleteAttribute('uv');
            g.deleteAttribute('normal');
            const smooth = mergeVertices(g, 1e-4);
            smooth.computeVertexNormals();
            mesh.geometry = smooth;
            mat.roughness = 0.85;
            mat.metalness = 0.0;
            applyProceduralFabricShading(mat, fabricScale);
          }
          mesh.material = mat;
        }
      }
    });
    return clone;
  }, [scene, tint, fabricScale, styles]);
}

// The Kenney chair only has two flat materials (pink "carpet" + grey
// "metalMedium"). Restyle them to match the loft: dark woven upholstery
// with the procedural fabric shader, and dark brushed metal for the frame.
const CHAIR_STYLES: Record<string, MaterialStyle> = {
  carpet: { color: '#1a2030', roughness: 0.85, metalness: 0, fabricScale: 26 },
  metalMedium: { color: '#2a3344', roughness: 0.32, metalness: 0.85 },
};

export const LoftFurniture: React.FC = () => {
  // Real photographic wood for the desk/table; procedural (but PBR-correct,
  // normal-mapped) fabric and rug — no equivalent free photographic
  // fabric/carpet texture was available from an open-license source.
  const sofaFabric = useMemo(() => createWovenFabricTextures(512, 10), []);
  const rug = useMemo(() => createRugTextures(512), []);
  const legWood = useTexture('/textures/pbr/roughness_map.jpg');

  // Real CC0 models (Kenney Furniture Kit, github.com/shorepine/kenney —
  // mirrors kenney.nl under CC0) replacing the hand-built pillow boxes,
  // plus a real desk chair and keyboard for the workstation. The pillow
  // fabric look is a procedural shader (see applyProceduralFabricShading
  // above) rather than a UV-mapped texture, because these models' UVs
  // are broken.
  const pillowPink = useClonedModel('/models/kenney/pillow.glb', '#ff4477', 40);
  const pillowCyan = useClonedModel('/models/kenney/pillowBlue.glb', undefined, 40);
  const deskChair = useClonedModel('/models/kenney/chairDesk.glb', undefined, undefined, CHAIR_STYLES);
  const keyboard = useClonedModel('/models/kenney/computerKeyboard.glb');


  const [woodMap, woodBump, woodRoughness] = useTexture([
    '/textures/pbr/hardwood2_diffuse.jpg',
    '/textures/pbr/hardwood2_bump.jpg',
    '/textures/pbr/hardwood2_roughness.jpg',
  ]);
  const deskWood = useMemo(() => {
    const clones = [woodMap, woodBump, woodRoughness].map((t) => {
      const c = t.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(1.5, 0.8);
      c.needsUpdate = true;
      return c;
    });
    clones[0].colorSpace = THREE.SRGBColorSpace;
    return { map: clones[0], bump: clones[1], roughness: clones[2] };
  }, [woodMap, woodBump, woodRoughness]);

  // Dynamic Canvas Texture for Workstation Monitors
  const monitorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark cyber interface background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, 512, 256);

      // Grid lines
      ctx.strokeStyle = '#00f0ff22';
      ctx.lineWidth = 1;
      for (let i = 0; i < 512; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.stroke();
      }

      // UI Glow accents & code lines
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('NEXUS OS v3.4 // ACTIVE CORE', 24, 40);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(24, 60, 200, 8);
      ctx.fillRect(24, 80, 320, 6);
      ctx.fillRect(24, 96, 180, 6);

      ctx.fillStyle = '#ff77aa';
      ctx.fillRect(24, 120, 140, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.fillText('AUDIO DSP: 96kHz 24bit', 30, 134);

      // Graph wave
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 240; x < 480; x += 10) {
        const y = 180 + Math.sin(x * 0.05) * 25;
        if (x === 240) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group name="loft-furniture">
      {/* 1. COZY AREA RUG — real woven pile + border via normal/roughness map,
          repositioned to sit under the relocated sofa/table nook. Sits
          BELOW the ContactShadows catcher plane (-1.24) and ABOVE the
          floor (-1.25) so it doesn't z-fight/flicker with either. */}
      <mesh position={[2.5, -1.245, -0.4]} rotation={[-Math.PI / 2, 0, 0.08]} receiveShadow>
        <planeGeometry args={[4.2, 3]} />
        <meshStandardMaterial
          map={rug.map}
          normalMap={rug.normalMap}
          roughnessMap={rug.roughnessMap}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* 2. SOFA ZONE — pushed further right/back so it (and the coffee
          table) clear the hero hologram pedestal at the room's center
          instead of clipping into it */}
      <group position={[2.9, -0.75, -0.9]} rotation={[0, -0.25, 0]}>
        {/* Main Seat Cushion */}
        <RoundedBox args={[2.1, 0.45, 1.1]} radius={0.06} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial
            color="#232c3d"
            map={sofaFabric.map}
            normalMap={sofaFabric.normalMap}
            roughnessMap={sofaFabric.roughnessMap}
            roughness={0.85}
            metalness={0.0}
          />
        </RoundedBox>

        {/* Backrest Cushion */}
        <RoundedBox args={[2.2, 0.6, 0.3]} radius={0.06} smoothness={4} position={[0, 0.45, -0.41]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#1c2333"
            map={sofaFabric.map}
            normalMap={sofaFabric.normalMap}
            roughnessMap={sofaFabric.roughnessMap}
            roughness={0.85}
            metalness={0.0}
          />
        </RoundedBox>

        {/* Left Armrest */}
        <RoundedBox args={[0.3, 0.55, 1.2]} radius={0.05} smoothness={4} position={[-1.17, 0.15, 0]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#161b28"
            map={sofaFabric.map}
            normalMap={sofaFabric.normalMap}
            roughnessMap={sofaFabric.roughnessMap}
            roughness={0.85}
            metalness={0.0}
          />
        </RoundedBox>

        {/* Right Armrest */}
        <RoundedBox args={[0.3, 0.55, 1.2]} radius={0.05} smoothness={4} position={[1.17, 0.15, 0]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#161b28"
            map={sofaFabric.map}
            normalMap={sofaFabric.normalMap}
            roughnessMap={sofaFabric.roughnessMap}
            roughness={0.85}
            metalness={0.0}
          />
        </RoundedBox>

        {/* Sofa Legs — real roughness texture instead of flat dark plastic;
            it was floating with no legs before */}
        {[-1.0, 1.0].map((x, i) =>
          [-0.45, 0.45].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, -0.36, z]} castShadow>
              <cylinderGeometry args={[0.025, 0.02, 0.27, 8]} />
              <meshStandardMaterial color="#0b0f17" roughnessMap={legWood} roughness={0.4} metalness={0.75} />
            </mesh>
          ))
        )}

        {/* Throw Pillows — real CC0 models (Kenney) instead of plain boxes */}
        <group position={[-0.7, 0.35, -0.2]} rotation={[0, 0.3, 0.15]}>
          <primitive object={pillowPink} scale={1.8} position={[-0.207, -0.2, 0.079]} />
        </group>
        <group position={[0.7, 0.35, -0.2]} rotation={[0, -0.25, -0.15]}>
          <primitive object={pillowCyan} scale={1.8} position={[-0.207, -0.116, 0.057]} />
        </group>
      </group>

      {/* 3. COFFEE TABLE ZONE — moved in lockstep with the sofa, and kept
          far enough from the hologram pedestal (world origin) that its
          footprint no longer overlaps it */}
      <group position={[2.15, -0.95, 0.4]}>
        {/* Dark Walnut / Matte Table Top */}
        <RoundedBox args={[1.3, 0.08, 0.7]} radius={0.02} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial
            color="#3a2f22"
            map={deskWood.map}
            bumpMap={deskWood.bump}
            bumpScale={0.01}
            roughnessMap={deskWood.roughness}
            roughness={0.4}
            metalness={0.1}
          />
        </RoundedBox>

        {/* Metal Legs */}
        {[-0.55, 0.55].map((x, i) =>
          [-0.25, 0.25].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, -0.14, z]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
              <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
            </mesh>
          ))
        )}

        {/* Decorative Mug / Cyber Coffee */}
        <group position={[-0.2, 0.1, 0]}>
          <cylinderGeometry args={[0.05, 0.04, 0.12, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </group>
      </group>

      {/* Desk Chair — real CC0 model (Kenney), sits on the floor in front
          of the workstation desk. Exact scale/rotation is a best-effort
          estimate (no way to render/preview WebGL in this environment to
          fine-tune it against the desk) — nudge the `scale`/`rotation`
          below if it doesn't quite line up. */}
      <primitive object={deskChair} scale={1.6} position={[-2.2, -1.25, -0.85]} rotation={[0, Math.PI, 0]} />

      {/* 4. TECH WORKSTATION DESK */}
      <group position={[-2.2, -0.4, -1.8]}>
        {/* Sleek Matte Desk Surface */}
        <RoundedBox args={[2.8, 0.1, 1.2]} radius={0.02} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial
            color="#3a2f22"
            map={deskWood.map}
            bumpMap={deskWood.bump}
            bumpScale={0.01}
            roughnessMap={deskWood.roughness}
            roughness={0.35}
            metalness={0.2}
          />
        </RoundedBox>

        {/* Desk Legs */}
        {[-1.25, 1.25].map((x, i) => (
          <RoundedBox key={i} args={[0.08, 0.75, 1.0]} radius={0.01} position={[x, -0.4, 0]} castShadow>
            <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
          </RoundedBox>
        ))}

        {/* Main Workstation Curved Ultrawide Monitor */}
        <group position={[0, 0.55, -0.2]} rotation={[0, 0, 0]}>
          {/* Monitor Display Frame */}
          <RoundedBox args={[1.6, 0.7, 0.05]} radius={0.02} smoothness={4} castShadow>
            <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.8} />
          </RoundedBox>
          {/* Screen Canvas Texture */}
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[1.52, 0.62]} />
            <meshBasicMaterial map={monitorTexture} />
          </mesh>
          {/* Monitor Stand */}
          <mesh position={[0, -0.38, -0.1]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 0.2, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.9} />
          </mesh>
          <mesh position={[0, -0.48, -0.05]} castShadow>
            <boxGeometry args={[0.4, 0.02, 0.25]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>

        {/* Secondary Vertical Monitor */}
        <group position={[1.0, 0.55, -0.0]} rotation={[0, -0.3, 0]}>
          <RoundedBox args={[0.5, 0.8, 0.04]} radius={0.02} castShadow>
            <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.8} />
          </RoundedBox>
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[0.45, 0.74]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.2} roughness={0.1} />
          </mesh>
        </group>

        {/* Desk Lamp */}
        <group position={[-1.1, 0.25, -0.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.04, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[0, 0, -0.2]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
            <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>

        {/* Keyboard — real CC0 model (Kenney), sitting on the desk surface
            (desk top is at local y≈0.05) in front of the main monitor. */}
        <primitive object={keyboard} position={[-0.141, 0.036, 0.309]} />
      </group>

      {/* 5. WALL FLOATING SHELVES & ORGANIC PLANT — moved off the back wall's
          central window (see LoftEnvironment) so it no longer sits over it */}
      <group position={[-4.6, 1.6, -3.85]}>
        {/* Shelf Board */}
        <RoundedBox args={[2.0, 0.06, 0.35]} radius={0.01} castShadow receiveShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
        </RoundedBox>

        {/* Books on Shelf */}
        <RoundedBox args={[0.08, 0.22, 0.25]} radius={0.01} position={[-0.6, 0.14, 0]} castShadow>
          <meshStandardMaterial color="#ff4466" roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.07, 0.26, 0.25]} radius={0.01} position={[-0.5, 0.16, 0]} castShadow>
          <meshStandardMaterial color="#00d2ff" roughness={0.5} />
        </RoundedBox>

        {/* Organic Pot & Plant Leaves */}
        <group position={[0.6, 0.15, 0]}>
          {/* Ceramic Pot */}
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.09, 0.2, 16]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
          </mesh>
          {/* Plant Leaf Cluster */}
          {[0, 1.2, 2.4, 3.6, 4.8].map((angle, k) => (
            <mesh
              key={k}
              position={[Math.cos(angle) * 0.08, 0.18, Math.sin(angle) * 0.08]}
              rotation={[0.4, angle, 0.3]}
              castShadow
            >
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color="#22c55e" roughness={0.6} metalness={0.0} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};

export default LoftFurniture;
