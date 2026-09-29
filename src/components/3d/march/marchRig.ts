import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/**
 * March 7th arrives as a single STATIC mesh (no skeleton, no animation, no
 * texture references) exported from Blender in an A-pose. To make her walk
 * and sit we build a humanoid skeleton ourselves, compute skin weights from
 * the distance to each bone segment, and re-assign her five texture atlases
 * (two UV tiles: u<1 and u>=1) to the right triangles.
 *
 * All coordinates below are in the model's own space: centimetres, +Y up,
 * facing +Z, +X is her left side, feet at y = 0, height ~169 cm.
 */

export const MODEL_HEIGHT_CM = 169.3;

type V3 = [number, number, number];

interface BoneDef {
  name: string;
  parent: string | null;
  pos: V3; // world bind position
  tail?: V3; // end of the segment used for skin weighting
  side?: 1 | -1; // +1 = +X (her left), -1 = -X (her right)
  kind?: 'arm' | 'leg';
}

const mirror = (v: V3): V3 => [-v[0], v[1], v[2]];

const sided = (
  base: string,
  parent: string,
  pos: V3,
  tail: V3,
  kind: 'arm' | 'leg'
): BoneDef[] => [
  { name: `${base}L`, parent: `${parent}L`, pos, tail, side: 1, kind },
  { name: `${base}R`, parent: `${parent}R`, pos: mirror(pos), tail: mirror(tail), side: -1, kind },
];

export const BONE_DEFS: BoneDef[] = [
  { name: 'root', parent: null, pos: [0, 0, 0] },
  { name: 'hips', parent: 'root', pos: [0, 88, 0], tail: [0, 102, -1] },
  { name: 'spine', parent: 'hips', pos: [0, 102, -1], tail: [0, 118, -1] },
  { name: 'chest', parent: 'spine', pos: [0, 118, -1], tail: [0, 136, 0] },
  { name: 'neck', parent: 'chest', pos: [0, 136, 0], tail: [0, 146, 1] },
  { name: 'head', parent: 'neck', pos: [0, 146, 1], tail: [0, 169, 1] },
  // arms (clavicle hangs off the chest)
  { name: 'clavL', parent: 'chest', pos: [4, 127, -1], tail: [20, 125, -2], side: 1, kind: 'arm' },
  { name: 'clavR', parent: 'chest', pos: [-4, 127, -1], tail: [-20, 125, -2], side: -1, kind: 'arm' },
  ...sided('upperArm', 'clav', [20, 125, -2], [39, 110, -2], 'arm'),
  ...sided('lowerArm', 'upperArm', [39, 110, -2], [55, 100, -2], 'arm'),
  ...sided('hand', 'lowerArm', [55, 100, -2], [64, 96, -2], 'arm'),
  // legs (hang off the hips)
  { name: 'upperLegL', parent: 'hips', pos: [8, 88, 0], tail: [8, 47, 0], side: 1, kind: 'leg' },
  { name: 'upperLegR', parent: 'hips', pos: [-8, 88, 0], tail: [-8, 47, 0], side: -1, kind: 'leg' },
  ...sided('lowerLeg', 'upperLeg', [8, 47, 0], [8, 10, -1], 'leg'),
  ...sided('foot', 'lowerLeg', [8, 10, -1], [8, 1, 12], 'leg'),
];

// The order matters for skinIndex: it is the order of Skeleton.bones.
const ORDERED = BONE_DEFS.map((b) => b.name);

const FACE_MATS = new Set(['口腔', '牙', '眉毛', '眼白', '眼睛', '眼睛1', '脸']);
const HAIR_MATS = new Set(['头发']);
const HIDDEN_MATS = new Set(['表情']); // expression overlay decals (drawn over the face)

type Bucket = 'face' | 'hair' | 'cloth' | 'cloth1';
const BUCKETS: Bucket[] = ['face', 'hair', 'cloth', 'cloth1'];

export interface MarchRig {
  skinned: THREE.SkinnedMesh;
  bones: Record<string, THREE.Bone>;
  bind: Record<string, THREE.Vector3>;
  root: THREE.Bone;
}

function segDist(
  px: number, py: number, pz: number,
  a: V3, b: V3
): number {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const apx = px - a[0], apy = py - a[1], apz = pz - a[2];
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 0 ? (apx * abx + apy * aby + apz * abz) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function computeSkin(
  pos: Float32Array
): { index: Uint16Array; weight: Float32Array } {
  const n = pos.length / 3;
  const index = new Uint16Array(n * 4);
  const weight = new Float32Array(n * 4);
  const headIdx = ORDERED.indexOf('head');
  const neckIdx = ORDERED.indexOf('neck');
  const cand: { i: number; w: number }[] = [];

  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    cand.length = 0;

    for (let bi = 1; bi < BONE_DEFS.length; bi++) {
      const b = BONE_DEFS[bi];
      if (!b.tail) continue;
      // Keep limbs on their own side so the two legs / arms never tug each other.
      if (b.side && b.kind === 'leg' && x * b.side < -1.5) continue;
      if (b.side && b.kind === 'arm' && x * b.side < -3) continue;
      const d = segDist(x, y, z, b.pos, b.tail);
      cand.push({ i: bi, w: 1 / Math.pow(d + 1.5, 3.5) });
    }
    cand.sort((a, b) => b.w - a.w);
    const top = cand.slice(0, 4);
    let sum = 0;
    for (const c of top) sum += c.w;

    // Head / neck rules: everything above the chin follows the head rigidly.
    let ws = top.map((c) => ({ i: c.i, w: c.w / sum }));
    if (y >= 147) {
      ws = [{ i: headIdx, w: 1 }];
    } else if (y > 138 && Math.abs(x) < 14) {
      const t = (y - 138) / 9;
      ws = ws.map((c) => ({ i: c.i, w: c.w * (1 - t) }));
      ws.push({ i: headIdx, w: t * 0.85 }, { i: neckIdx, w: t * 0.15 });
      ws.sort((a, b) => b.w - a.w);
      ws = ws.slice(0, 4);
      const s2 = ws.reduce((s, c) => s + c.w, 0);
      ws = ws.map((c) => ({ i: c.i, w: c.w / s2 }));
    }

    for (let k = 0; k < 4; k++) {
      index[v * 4 + k] = ws[k] ? ws[k].i : 0;
      weight[v * 4 + k] = ws[k] ? ws[k].w : 0;
    }
  }
  return { index, weight };
}

export async function loadMarchRig(basePath = '/models/march7th'): Promise<MarchRig> {
  const fbx = await new FBXLoader().loadAsync(`${basePath}/march7th.fbx`);
  fbx.updateMatrixWorld(true);

  let src: THREE.Mesh | undefined;
  fbx.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !src) src = o as THREE.Mesh;
  });
  if (!src) throw new Error('March 7th: no mesh in FBX');

  // Bake Blender's Z-up + 100x scale into the vertices -> Y-up, centimetres.
  const geo = src.geometry.clone();
  geo.applyMatrix4(src.matrixWorld);
  const mats = src.material as THREE.Material[];
  const matNames = mats.map((m) => m.name);

  const posA = geo.attributes.position as THREE.BufferAttribute;
  const nrmA = geo.attributes.normal as THREE.BufferAttribute;
  const uvA = geo.attributes.uv as THREE.BufferAttribute;

  const buckets: Record<Bucket, { p: number[]; n: number[]; u: number[] }> = {
    face: { p: [], n: [], u: [] },
    hair: { p: [], n: [], u: [] },
    cloth: { p: [], n: [], u: [] },
    cloth1: { p: [], n: [], u: [] },
  };

  for (const g of geo.groups) {
    const name = matNames[g.materialIndex!];
    if (HIDDEN_MATS.has(name)) continue;
    for (let i = g.start; i < g.start + g.count; i += 3) {
      const uAvg = (uvA.getX(i) + uvA.getX(i + 1) + uvA.getX(i + 2)) / 3;
      const tile = uAvg >= 1 ? 1 : 0;
      let key: Bucket;
      if (tile === 1) key = 'cloth1';
      else if (FACE_MATS.has(name)) key = 'face';
      else if (HAIR_MATS.has(name)) key = 'hair';
      else key = 'cloth';
      const b = buckets[key];
      for (let k = 0; k < 3; k++) {
        b.p.push(posA.getX(i + k), posA.getY(i + k), posA.getZ(i + k));
        b.n.push(nrmA.getX(i + k), nrmA.getY(i + k), nrmA.getZ(i + k));
        b.u.push(uvA.getX(i + k) - tile, uvA.getY(i + k));
      }
    }
  }

  const P: number[] = [], N: number[] = [], U: number[] = [];
  const groups: { start: number; count: number; mat: number }[] = [];
  BUCKETS.forEach((key, mi) => {
    const b = buckets[key];
    const start = P.length / 3;
    P.push(...b.p); N.push(...b.n); U.push(...b.u);
    groups.push({ start, count: b.p.length / 3, mat: mi });
  });

  const geometry = new THREE.BufferGeometry();
  const pos = new Float32Array(P);
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(U), 2));
  groups.forEach((g) => geometry.addGroup(g.start, g.count, g.mat));

  const skin = computeSkin(pos);
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skin.index, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skin.weight, 4));
  geometry.computeBoundingSphere();

  // Textures (renamed to ASCII in /public so no server chokes on the originals)
  const loader = new THREE.TextureLoader();
  const materials = BUCKETS.map((key) => {
    const map = loader.load(`${basePath}/tex/${key}.png`);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return new THREE.MeshStandardMaterial({
      map,
      // The painted textures already carry their own shading; a modest
      // emissive copy keeps her readable inside a dark, moody room.
      emissiveMap: map,
      emissive: new THREE.Color(0.42, 0.42, 0.42),
      roughness: 0.85,
      metalness: 0,
      side: THREE.DoubleSide,
    });
  });

  // Skeleton
  const bones: Record<string, THREE.Bone> = {};
  const bind: Record<string, THREE.Vector3> = {};
  for (const d of BONE_DEFS) {
    const b = new THREE.Bone();
    b.name = d.name;
    bones[d.name] = b;
    bind[d.name] = new THREE.Vector3(...d.pos);
  }
  for (const d of BONE_DEFS) {
    if (d.parent) {
      bones[d.parent].add(bones[d.name]);
      bones[d.name].position.copy(bind[d.name]).sub(bind[d.parent]);
    }
  }
  // tail points that are not bones (used only for direction/length)
  bind.__handEndL = new THREE.Vector3(64, 96, -2);
  bind.__handEndR = new THREE.Vector3(-64, 96, -2);
  bind.__toeL = new THREE.Vector3(8, 1, 12);
  bind.__toeR = new THREE.Vector3(-8, 1, 12);

  const skinned = new THREE.SkinnedMesh(geometry, materials);
  skinned.add(bones.root);
  skinned.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(ORDERED.map((n) => bones[n]));
  skinned.bind(skeleton, skinned.matrixWorld);
  skinned.frustumCulled = false;
  skinned.castShadow = true;
  skinned.receiveShadow = true;

  return { skinned, bones, bind, root: bones.root };
}
