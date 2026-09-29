import * as THREE from 'three';
import { MODEL_HEIGHT_CM, type MarchRig } from './marchRig';

/** World scale: the character is ~1.85 units tall, the room is ~1 unit per metre-ish. */
export const HEIGHT_WORLD = 1.85;
export const S = HEIGHT_WORLD / MODEL_HEIGHT_CM; // world units per model-centimetre
export const FLOOR_Y = -1.25;

// ---- room layout the routine is written against (keep in sync with LoftFurniture/HeroProduct) ----
const PEDESTAL = { x: 0, z: 0.5, topY: -0.94, edge: 1.15, inner: 0.85 };
const HOLO_TARGET = new THREE.Vector3(0, 0.2, 0.5); // headphones floating over the pedestal
const KEYBOARD = new THREE.Vector3(-1.75, -0.32, -1.35); // keys, world
const MONITOR = new THREE.Vector3(-2.1, 0.05, -2.0);
const CAMERA_EYE = new THREE.Vector3(0, 0.3, 4.5);

const SOFA_YAW = -0.25;
const SOFA_SEAT = { x: 2.9, z: -0.9, topY: -0.525 };
const SOFA_STAND = {
  x: SOFA_SEAT.x + Math.sin(SOFA_YAW) * 0.7,
  z: SOFA_SEAT.z + Math.cos(SOFA_YAW) * 0.7,
};

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const lerp = THREE.MathUtils.lerp;
const smooth = (t: number) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const angDiff = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
/** 0 -> 1 over `fade`, holds, then 1 -> 0 over the last `fade` of `dur`. */
const envelope = (t: number, dur: number, fade: number) =>
  smooth(t / fade) * (1 - smooth((t - (dur - fade)) / fade));

function groundAt(x: number, z: number) {
  const d = Math.hypot(x - PEDESTAL.x, z - PEDESTAL.z);
  const t = smooth((PEDESTAL.edge - d) / (PEDESTAL.edge - PEDESTAL.inner));
  return lerp(FLOOR_Y, PEDESTAL.topY, t);
}

interface Seat {
  backCm: number; // how far (model cm) the hips travel back from the stand spot
  hipYcm: number; // pelvis height above the floor when seated (cm)
  footZ: number; // where the ankles end up relative to the stand spot (cm)
  recline: number; // radians of lean-back
}
const SOFA: Seat = {
  backCm: 0.7 / S,
  hipYcm: (SOFA_SEAT.topY + 0.085 - FLOOR_Y) / S,
  footZ: -0.7 / S + 34,
  recline: 0.1,
};

type Step =
  | { k: 'wait'; t: number; look?: THREE.Vector3 }
  | { k: 'walk'; path: [number, number][] }
  | { k: 'turn'; yaw: number }
  | { k: 'reach'; t: number }
  | { k: 'type'; t: number }
  | { k: 'sit'; t: number; seat: Seat };

const SPAWN: [number, number] = [-1.3, 1.95];
const STEPS: Step[] = [
  { k: 'wait', t: 2.2, look: CAMERA_EYE },
  { k: 'walk', path: [[0, 1.95], [0, 1.02]] },
  { k: 'turn', yaw: Math.PI },
  { k: 'reach', t: 6 },
  { k: 'walk', path: [[0, 1.95], [-1.6, 1.95], [-1.75, -0.3], [-1.75, -0.95]] },
  { k: 'turn', yaw: Math.PI },
  { k: 'type', t: 7 },
  { k: 'walk', path: [[-1.75, -0.3], [-1.4, 1.95], [1.6, 2.0], [3.2, 1.4], [3.15, 0.4], [SOFA_STAND.x, SOFA_STAND.z]] },
  { k: 'turn', yaw: SOFA_YAW },
  { k: 'sit', t: 12, seat: SOFA },
  { k: 'walk', path: [[3.15, 0.5], [3.2, 1.4], [1.6, 2.0], [0, 1.95]] },
];

export class MarchController {
  readonly group = new THREE.Group();
  private R: MarchRig;

  // world state
  private x = SPAWN[0];
  private z = SPAWN[1];
  private yaw = 0;
  private ground = FLOOR_Y;

  // script
  private si = 0;
  private st = 0;
  private wi = 0;
  private time = 0;

  // smoothed animation layers
  private walk = 0;
  private phase = 0;
  private sit = 0;
  private seat: Seat = SOFA;
  private reach = 0;
  private typing = 0;
  private wave = 0;
  private lookYaw = 0;
  private lookPitch = 0;
  private lookTarget: THREE.Vector3 | null = null;

  // rig lengths (cm)
  private lThigh: number;
  private lShin: number;
  private lUpperArm: number;
  private lForeArm: number;

  // scratch
  private invM = new THREE.Matrix4();
  private tmpM = new THREE.Matrix4();
  private _p = new THREE.Vector3();
  private _s = new THREE.Vector3();
  private _pA = new THREE.Vector3();
  private _d = new THREE.Vector3();
  private _pv = new THREE.Vector3();
  private _d1 = new THREE.Vector3();
  private _pE = new THREE.Vector3();
  private _pT = new THREE.Vector3();
  private _d2 = new THREE.Vector3();
  private _b1 = new THREE.Vector3();
  private _b2 = new THREE.Vector3();
  private _qP = new THREE.Quaternion();
  private _qA = new THREE.Quaternion();
  private _qB = new THREE.Quaternion();
  private _qF = new THREE.Quaternion();
  private _e = new THREE.Euler();
  private _t = new THREE.Vector3();
  private _sh = new THREE.Vector3();
  private _hp = new THREE.Vector3();
  private _hipPos = new THREE.Vector3();

  constructor(rig: MarchRig) {
    this.R = rig;
    this.group.add(rig.skinned);
    this.group.scale.setScalar(S);
    const b = rig.bind;
    this.lThigh = b.upperLegL.distanceTo(b.lowerLegL);
    this.lShin = b.lowerLegL.distanceTo(b.footL);
    this.lUpperArm = b.upperArmL.distanceTo(b.lowerArmL);
    this.lForeArm = b.lowerArmL.distanceTo(b.handL);
    this.ground = groundAt(this.x, this.z);
  }

  /** Debug/testing: run the simulation forward. */
  fastForward(seconds: number, dt = 1 / 30) {
    for (let t = 0; t < seconds; t += dt) this.update(dt);
  }

  /** Jump to the start of step `i` (debug). */
  gotoStep(i: number) {
    this.si = i % STEPS.length;
    this.st = 0;
    this.wi = 0;
  }

  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    this.time += dt;
    this.st += dt;

    const step = STEPS[this.si];
    let walkT = 0;
    let reachT = 0;
    let typeT = 0;
    let waveT = 0;
    let sitT = 0;
    let look: THREE.Vector3 | null = null;
    let done = false;

    switch (step.k) {
      case 'wait':
        look = step.look ?? null;
        done = this.st >= step.t;
        break;

      case 'walk': {
        const [tx, tz] = step.path[this.wi];
        const dx = tx - this.x;
        const dz = tz - this.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.07) {
          this.wi++;
          if (this.wi >= step.path.length) done = true;
          break;
        }
        const want = Math.atan2(dx, dz);
        const err = angDiff(this.yaw, want);
        this.yaw += clamp(err, -5 * dt, 5 * dt);
        const speedFactor = clamp(1 - Math.abs(err) / 0.9, 0.12, 1);
        const v = 1.02 * speedFactor * Math.min(1, 0.35 + dist * 2);
        this.x += Math.sin(this.yaw) * v * dt;
        this.z += Math.cos(this.yaw) * v * dt;
        walkT = 0.4 + 0.6 * speedFactor;
        break;
      }

      case 'turn': {
        const err = angDiff(this.yaw, step.yaw);
        this.yaw += clamp(err, -3.2 * dt, 3.2 * dt);
        walkT = Math.abs(err) > 0.12 ? 0.45 : 0;
        done = Math.abs(err) < 0.03;
        break;
      }

      case 'reach':
        reachT = envelope(this.st, step.t, 0.9);
        look = HOLO_TARGET;
        done = this.st >= step.t;
        break;

      case 'type':
        typeT = envelope(this.st, step.t, 0.9);
        look = MONITOR;
        done = this.st >= step.t;
        break;

      case 'sit': {
        const down = 1.7;
        const up = 1.5;
        this.seat = step.seat;
        sitT = smooth(this.st / down) * (1 - smooth((this.st - down - step.t) / up));
        // wave at the camera for a few seconds while seated
        const wt = this.st - down - 2;
        waveT = wt > 0 ? envelope(wt, Math.max(step.t - 4, 1), 0.7) : 0;
        look = this.st < down + 1.5 ? null : CAMERA_EYE;
        done = this.st >= down + step.t + up;
        break;
      }
    }

    if (done) {
      this.si = (this.si + 1) % STEPS.length;
      this.st = 0;
      this.wi = 0;
      if (this.si === 0) {
        // loop restart: come back from the sofa side is already handled by the path
      }
    }

    // layers
    this.walk = damp(this.walk, walkT, 7, dt);
    this.reach = damp(this.reach, reachT, 9, dt);
    this.typing = damp(this.typing, typeT, 9, dt);
    this.wave = damp(this.wave, waveT, 9, dt);
    this.sit = sitT; // already smooth
    this.phase = (this.phase + (dt * this.walk) / 1.05) % 1;
    this.lookTarget = look;
    this.ground = damp(this.ground, groundAt(this.x, this.z), 14, dt);

    this.applyPose(dt);
  }

  // ------------------------------------------------------------------ pose

  private posRig(b: THREE.Object3D, out: THREE.Vector3) {
    this.tmpM.multiplyMatrices(this.invM, b.matrixWorld);
    return out.setFromMatrixPosition(this.tmpM);
  }

  private quatRig(b: THREE.Object3D, out: THREE.Quaternion) {
    this.tmpM.multiplyMatrices(this.invM, b.matrixWorld);
    this.tmpM.decompose(this._p, out, this._s);
    return out;
  }

  private updateAll() {
    this.group.updateMatrixWorld(true);
    this.invM.copy(this.R.skinned.matrixWorld).invert();
  }

  /**
   * Two-bone IK in rig space. Bones are built world-aligned (identity bind
   * rotation), so a bone's desired world quaternion is simply the rotation
   * that takes its bind direction onto the new direction.
   */
  private ik(
    A: THREE.Bone, B: THREE.Bone,
    aBind: THREE.Vector3, bBind: THREE.Vector3, cBind: THREE.Vector3,
    l1: number, l2: number,
    target: THREE.Vector3, pole: THREE.Vector3
  ): THREE.Quaternion {
    const pA = this.posRig(A, this._pA);
    this.quatRig(A.parent!, this._qP);
    const d = this._d.copy(target).sub(pA);
    let dist = d.length();
    dist = clamp(dist, Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.02);
    d.normalize();
    const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
    const ang = Math.acos(cosA);
    const pv = this._pv.copy(pole);
    pv.addScaledVector(d, -pv.dot(d));
    if (pv.lengthSq() < 1e-6) pv.set(0, 0, 1).addScaledVector(d, -d.z);
    pv.normalize();
    const dir1 = this._d1.copy(d).multiplyScalar(Math.cos(ang)).addScaledVector(pv, Math.sin(ang)).normalize();
    const pE = this._pE.copy(pA).addScaledVector(dir1, l1);
    const pT = this._pT.copy(pA).addScaledVector(d, dist);
    const dir2 = this._d2.copy(pT).sub(pE).normalize();

    this._b1.copy(bBind).sub(aBind).normalize();
    this._b2.copy(cBind).sub(bBind).normalize();

    const qA = this._qA.setFromUnitVectors(this._b1, dir1);
    A.quaternion.copy(this._qP).invert().multiply(qA);
    const qB = this._qB.setFromUnitVectors(this._b2, dir2);
    B.quaternion.copy(qA).invert().multiply(qB);
    return qB;
  }

  private applyPose(dt: number) {
    const { bones: B, bind, skinned } = this.R;
    const t = this.time;
    const walk = this.walk;
    const sit = this.sit;
    const phase = this.phase;
    const TAU = Math.PI * 2;

    // 1) place the rig
    this.group.position.set(this.x, this.ground, this.z);
    this.group.rotation.y = this.yaw;

    // 2) hips + torso (forward kinematics)
    const bob = -1.4 * walk * (0.5 - 0.5 * Math.cos(2 * TAU * phase));
    const sway = 1.3 * walk * Math.sin(TAU * phase);
    const standHipY = 86 + bob;
    const hipY = lerp(standHipY, this.seat.hipYcm, sit) - this.typing * 3;
    const hipZ = lerp(0, -this.seat.backCm, sit) + this.typing * 4;
    B.hips.position.set(sway * (1 - sit), hipY, hipZ);

    const lean =
      walk * 0.05 +
      Math.sin(Math.PI * sit) * 0.32 -
      sit * this.seat.recline +
      this.typing * 0.5;
    const twist = Math.sin(TAU * phase) * walk;
    const breathe = Math.sin(t * 1.7) * 0.012;
    B.hips.rotation.set(lean * 0.25, 0.1 * twist, 0);
    B.spine.rotation.set(lean * 0.4 + breathe, -0.07 * twist, Math.sin(t * 0.7) * 0.015);
    B.chest.rotation.set(lean * 0.35 + breathe, -0.05 * twist, 0);

    // 3) head look-at (uses last frame's matrices - fine for a smooth follow)
    this.updateAll();
    let ty = 0;
    let tp = 0;
    if (this.lookTarget) {
      const head = this.posRig(B.head, this._hp);
      const tgt = this._t.copy(this.lookTarget);
      skinned.worldToLocal(tgt);
      const dx = tgt.x - head.x, dy = tgt.y - head.y, dz = tgt.z - head.z;
      ty = clamp(Math.atan2(dx, dz), -1.1, 1.1);
      tp = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.45, 0.45);
    } else {
      ty = Math.sin(t * 0.5) * 0.15;
      tp = 0.05;
    }
    this.lookYaw = damp(this.lookYaw, ty, 5, dt);
    this.lookPitch = damp(this.lookPitch, tp, 5, dt);
    B.neck.rotation.set(this.lookPitch * 0.35 - lean * 0.15, this.lookYaw * 0.35, 0);
    B.head.rotation.set(this.lookPitch * 0.65 - lean * 0.2, this.lookYaw * 0.65, Math.sin(t * 0.9) * 0.02);

    this.updateAll();

    // 4) legs
    const stride = 56; // cm foot travel while walking
    const lift = 8;
    const beta = 0.6;
    for (const side of [1, -1] as const) {
      const key = side === 1 ? 'L' : 'R';
      const ph = (phase + (side === 1 ? 0 : 0.5)) % 1;
      let gz: number;
      let gy = 0;
      if (ph < beta) {
        gz = stride / 2 - stride * (ph / beta);
      } else {
        const u = (ph - beta) / (1 - beta);
        gz = -stride / 2 + stride * (0.5 - 0.5 * Math.cos(Math.PI * u));
        gy = lift * Math.sin(Math.PI * u);
      }
      const walkX = side * 9;
      const target = this._t.set(
        lerp(walkX, side * 10, sit),
        10 + gy * walk,
        lerp(gz * walk, this.seat.footZ, sit)
      );
      const pole = this._sh.set(side * 0.18, 0.1, 1);
      const qLower = this.ik(
        B['upperLeg' + key], B['lowerLeg' + key],
        bind['upperLeg' + key], bind['lowerLeg' + key], bind['foot' + key],
        this.lThigh, this.lShin, target, pole
      );
      // keep the foot flat on the ground
      const pitch = -0.25 * walk * (gy > 0 ? Math.sin((gy / lift) * Math.PI * 0.5) : 0);
      this._qF.setFromEuler(this._e.set(pitch, 0, 0));
      B['foot' + key].quaternion.copy(qLower).invert().multiply(this._qF);
    }

    this.updateAll();

    // 5) arms
    const hips = this.posRig(B.hips, this._hipPos).clone();
    const kb = this.keyboardRig();
    const holo = this.holoRig();
    for (const side of [1, -1] as const) {
      const key = side === 1 ? 'L' : 'R';
      const shoulder = this.posRig(B['upperArm' + key], this._sh).clone();

      // layer 0: relaxed hang with a counter-swing
      const legPh = (phase + (side === 1 ? 0 : 0.5)) % 1;
      const legZ =
        legPh < beta
          ? stride / 2 - stride * (legPh / beta)
          : -stride / 2 + stride * (0.5 - 0.5 * Math.cos(Math.PI * ((legPh - beta) / (1 - beta))));
      const hang = new THREE.Vector3(
        shoulder.x + side * 4,
        shoulder.y - 40,
        shoulder.z + 4 - 0.28 * legZ * walk
      );
      // layer 1: hands resting on the lap
      const lap = new THREE.Vector3(side * 15, hips.y + 3, hips.z + 26);
      // layer 2: typing
      const type = kb.clone().add(new THREE.Vector3(side * 7, 0, 0));
      type.y += Math.sin(t * 13 + side * 2) * 0.35 * this.typing;
      type.z += Math.sin(t * 9 + side) * 0.5 * this.typing;

      const target = hang.clone().lerp(lap, sit).lerp(type, this.typing);
      const pole = new THREE.Vector3(side * 0.6, -0.3, -1);

      if (side === -1) {
        // right arm only: reaching to the hologram / waving
        const reachT = holo.clone();
        target.lerp(reachT, this.reach);
        const waveP = new THREE.Vector3(-26, hips.y + 60, hips.z + 14);
        waveP.x += Math.sin(t * 9) * 5;
        waveP.y += Math.sin(t * 9 + 1.3) * 2;
        target.lerp(waveP, this.wave);
        if (this.reach > 0.05 || this.wave > 0.05) pole.set(-0.5, -1, -0.2);
      }

      this.ik(
        B['upperArm' + key], B['lowerArm' + key],
        bind['upperArm' + key], bind['lowerArm' + key], bind['hand' + key],
        this.lUpperArm, this.lForeArm, target, pole
      );
      B['hand' + key].quaternion.identity();
    }
  }

  private keyboardRig() {
    return this.R.skinned.worldToLocal(KEYBOARD.clone());
  }

  private holoRig() {
    return this.R.skinned.worldToLocal(HOLO_TARGET.clone());
  }
}
