import * as THREE from 'three';

interface PbrTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/** Turns a grayscale height canvas into a tangent-space normal map via a Sobel filter. */
function heightCanvasToNormalMap(heightData: Uint8ClampedArray, size: number, strength: number): THREE.CanvasTexture {
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nctx = normalCanvas.getContext('2d')!;
  const out = nctx.createImageData(size, size);

  const h = (x: number, y: number) => {
    const xx = (x + size) % size;
    const yy = (y + size) % size;
    return heightData[(yy * size + xx) * 4] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (h(x - 1, y) - h(x + 1, y)) * strength;
      const ny = (h(x, y - 1) - h(x, y + 1)) * strength;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const idx = (y * size + x) * 4;
      out.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[idx + 3] = 255;
    }
  }
  nctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(normalCanvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Woven upholstery fabric: a near-white basketweave pattern meant to be
 * tinted via the mesh's own `color`, plus a real normal map derived from
 * the weave so light actually catches individual threads instead of the
 * flat single-tone look of the old low-res dot texture.
 */
export function createWovenFabricTextures(size = 512, repeat = 8): PbrTextureSet {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e9e9e9';
  ctx.fillRect(0, 0, size, size);

  const thread = Math.max(3, Math.round(size / 64));
  for (let y = 0; y < size; y += thread * 2) {
    for (let x = 0; x < size; x += thread * 2) {
      const horizontal = ((x / thread + y / thread) % 4) < 2;
      ctx.fillStyle = horizontal ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)';
      if (horizontal) ctx.fillRect(x, y, thread * 2, thread);
      else ctx.fillRect(x, y, thread, thread * 2);
    }
  }
  // Fine irregular grain so it doesn't look like a perfect computer-generated grid
  for (let i = 0; i < size * size * 0.04; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, y, 1, 1);
  }

  const heightData = ctx.getImageData(0, 0, size, size).data;
  const normalMap = heightCanvasToNormalMap(heightData, size, 1.4);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d')!;
  const roughOut = rctx.createImageData(size, size);
  for (let i = 0; i < heightData.length; i += 4) {
    const lum = heightData[i] / 255;
    const rough = 210 + (1 - lum) * 35;
    roughOut.data[i] = roughOut.data[i + 1] = roughOut.data[i + 2] = Math.min(255, rough);
    roughOut.data[i + 3] = 255;
  }
  rctx.putImageData(roughOut, 0, 0);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;

  [map, normalMap, roughnessMap].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.needsUpdate = true;
  });

  return { map, normalMap, roughnessMap };
}

/**
 * Area rug: soft pile with a woven border, plus a normal map so the pile
 * catches light instead of reading as a single flat color plane.
 */
export function createRugTextures(size = 512): PbrTextureSet {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#232f45';
  ctx.fillRect(0, 0, size, size);

  // Soft pile noise
  for (let i = 0; i < size * size * 0.12; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = Math.random();
    ctx.fillStyle = shade > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Woven double-border, cyber-loft accent
  const margin = size * 0.08;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = size * 0.012;
  ctx.strokeRect(margin, margin, size - margin * 2, size - margin * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = size * 0.004;
  ctx.strokeRect(margin * 1.6, margin * 1.6, size - margin * 3.2, size - margin * 3.2);

  const heightData = ctx.getImageData(0, 0, size, size).data;
  const normalMap = heightCanvasToNormalMap(heightData, size, 1.1);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d')!;
  const roughOut = rctx.createImageData(size, size);
  for (let i = 0; i < heightData.length; i += 4) {
    roughOut.data[i] = roughOut.data[i + 1] = roughOut.data[i + 2] = 235;
    roughOut.data[i + 3] = 255;
  }
  rctx.putImageData(roughOut, 0, 0);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;

  [map, normalMap, roughnessMap].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
  });

  return { map, normalMap, roughnessMap };
}
