
import {
  type BufferGeometry,
  CapsuleGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface Pose {
  legL: number;
  legR: number;
  kneeL: number;
  kneeR: number;
  armLx: number;
  armLz: number;
  armRx: number;
  armRz: number;
  elbowL: number;
  elbowR: number;
  lean: number;
  headTurn: number;
  headTilt: number;
}

export const STAND: Pose = {
  legL: 0,
  legR: 0,
  kneeL: 0,
  kneeR: 0,
  armLx: 0.04,
  armLz: 0.07,
  armRx: 0.04,
  armRz: 0.07,
  elbowL: 0.18,
  elbowR: 0.18,
  lean: 0,
  headTurn: 0,
  headTilt: 0,
};

const THIGH = 0.42;
const SHIN = 0.43;
const HIP_HEIGHT = THIGH + SHIN;
const SEAT_HEIGHT = 0.6;
const THIGH_SLOPE = Math.asin((SEAT_HEIGHT - SHIN) / THIGH);

export const SIT: Pose = {
  ...STAND,
  legL: -(Math.PI / 2 - THIGH_SLOPE),
  legR: -(Math.PI / 2 - THIGH_SLOPE),
  kneeL: Math.PI / 2 - THIGH_SLOPE,
  kneeR: Math.PI / 2 - THIGH_SLOPE,
  armLx: -0.05,
  armRx: -0.05,
  armLz: -0.06,
  armRz: -0.06,
  elbowL: 0.6,
  elbowR: 0.6,
};

export const TYPE: Pose = {
  ...SIT,
  armLx: -0.85,
  armRx: -0.85,
  armLz: -0.17,
  armRz: -0.17,
  elbowL: 0.6,
  elbowR: 0.6,
  lean: 0.2,
  headTilt: 0.05,
};

export const STRUM: Pose = {
  ...SIT,
  armLx: -0.9,
  armLz: 0.75,
  armRx: -1.25,
  armRz: -0.35,
  elbowL: 0.6,
  elbowR: 1.1,
  lean: 0.12,
};

export const SLEEP: Pose = { ...STAND, headTurn: 0.35 };

const HEAD_Y = 0.725;
const SHOULDER_Y = 0.48;
const SHOULDER_X = 0.205;

interface Gesture {
  weight: number;
  seconds: [number, number];
  typing: [left: number, right: number];
  pose: Partial<Pose>;
}

const GESTURES: Gesture[] = [
  { weight: 3, seconds: [1.5, 3], typing: [0.4, 0.4], pose: { headTurn: 0.3 } },
  { weight: 3, seconds: [1.5, 3], typing: [0.4, 0.4], pose: { headTurn: -0.26, headTilt: -0.04 } },
  {
    weight: 4,
    seconds: [3, 7],
    typing: [0.6, 0],
    pose: { armRx: -0.9, armRz: 0.32, elbowR: 0.6, headTurn: -0.06 },
  },
  {
    weight: 2,
    seconds: [3, 6],
    typing: [0, 0],
    pose: {
      lean: -0.06,
      armLx: -0.05,
      armRx: -0.05,
      armLz: -0.06,
      armRz: -0.06,
      elbowL: 0.6,
      elbowR: 0.6,
      headTilt: -0.04,
    },
  },
  {
    weight: 1,
    seconds: [1.6, 2.4],
    typing: [0, 0],
    pose: {
      lean: -0.14,
      armLx: -2.85,
      armRx: -2.85,
      armLz: 0.3,
      armRz: 0.3,
      elbowL: 0.45,
      elbowR: 0.45,
      headTilt: -0.3,
    },
  },
];
const TOTAL_WEIGHT = GESTURES.reduce((sum, { weight }) => sum + weight, 0);

const pickGesture = () => {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const gesture of GESTURES) {
    roll -= gesture.weight;
    if (roll <= 0) return gesture;
  }
  return GESTURES[0];
};

const between = ([least, most]: [number, number]) => least + Math.random() * (most - least);

const placed = (
  geometry: BufferGeometry,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
) => geometry.scale(sx, sy, sz).translate(x, y, z);

const solid = (geometry: BufferGeometry, material: MeshStandardMaterial) => {
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const merged = (geometries: BufferGeometry[]) => {
  const isMixed = geometries.some(({ index }) => index === null);
  const parts = isMixed
    ? geometries.map((geometry) => (geometry.index === null ? geometry : geometry.toNonIndexed()))
    : geometries;
  const made = mergeGeometries(parts);
  for (const geometry of new Set([...geometries, ...parts])) geometry.dispose();
  if (!made) throw new Error("The figure's shapes don't merge");
  return made;
};

const TORSO = [
  [0, -0.03],
  [0.13, -0.03],
  [0.135, 0.05],
  [0.14, 0.14],
  [0.152, 0.25],
  [0.165, 0.36],
  [0.17, 0.43],
  [0.16, 0.49],
  [0.13, 0.535],
  [0.085, 0.56],
  [0.05, 0.57],
  [0, 0.572],
].map(([radius, y]) => new Vector2(radius, y));

const curls = () => {
  const balls: BufferGeometry[] = [];
  const count = 110;
  const turn = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const x = Math.cos(turn * i) * ring;
    const z = Math.sin(turn * i) * ring;
    const isFace = z > 0.3 && y < 0.55;
    const isEar = Math.abs(x) > 0.6 && z > -0.3 && y < 0.15;
    if (y < -0.5 || isFace || isEar) continue;
    const size = 0.034 + ((i * 7919) % 13) / 13 * 0.013;
    balls.push(placed(new SphereGeometry(size, 8, 6), x * 0.112, y * 0.112 + 0.012, z * 0.112 - 0.008));
  }
  for (const [x, y, z, size] of [
    [-0.05, 0.085, 0.082, 0.042],
    [0.0, 0.098, 0.088, 0.044],
    [0.052, 0.082, 0.08, 0.041],
  ]) {
    balls.push(placed(new SphereGeometry(size, 8, 6), x, y, z));
  }
  return balls;
};

export interface Figure {
  root: Group;
  showBody: (isShown: boolean) => void;
  lap: Group;
  update: (target: Pose, dt: number, motion: Motion) => boolean;
}

export interface Motion {
  walk: number;
  stepping: number;
  breath: number;
  strum: number;
  seconds: number;
  realDt: number;
  isWorking: boolean;
}

export const createFigure = (): Figure => {
  const skin = new MeshStandardMaterial({ color: "#e4c3a2", roughness: 0.85 });
  const hair = new MeshStandardMaterial({ color: "#3b2416", roughness: 1 });
  const shirt = new MeshStandardMaterial({ color: "#f2efe9", roughness: 0.95 });
  const trousers = new MeshStandardMaterial({ color: "#2c2c33", roughness: 0.95 });
  const shoes = new MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.7 });
  const eyes = new MeshStandardMaterial({ color: "#1a1210", roughness: 0.4 });

  const root = new Group();
  const hips = new Group();
  hips.position.y = HIP_HEIGHT;
  root.add(hips);
  const pelvis = solid(placed(new SphereGeometry(0.15, 20, 12), 0, 0.01, 0, 0.95, 0.55, 0.66), trousers);
  hips.add(pelvis);

  const chest = new Group();
  hips.add(chest);
  const torso = solid(
    merged([
      new LatheGeometry(TORSO, 28).scale(1, 1, 0.64),
      placed(new TorusGeometry(0.052, 0.011, 8, 24).rotateX(Math.PI / 2), 0, 0.562, 0, 1, 1, 0.8),
      placed(new SphereGeometry(0.062, 16, 12), SHOULDER_X, SHOULDER_Y, 0, 1, 1, 0.8),
      placed(new SphereGeometry(0.062, 16, 12), -SHOULDER_X, SHOULDER_Y, 0, 1, 1, 0.8),
    ]),
    shirt,
  );
  chest.add(torso);
  const neck = solid(placed(new CapsuleGeometry(0.042, 0.05, 4, 12), 0, 0.6, 0), skin);
  chest.add(neck);

  const head = new Group();
  head.position.y = HEAD_Y;
  chest.add(head);
  head.add(
    solid(
      merged([
        placed(new SphereGeometry(0.118, 28, 20), 0, 0, 0, 1, 1.06, 1.02),
        placed(new SphereGeometry(0.026, 10, 8), 0.116, -0.005, -0.005, 0.45, 1, 0.75),
        placed(new SphereGeometry(0.026, 10, 8), -0.116, -0.005, -0.005, 0.45, 1, 0.75),
        placed(new SphereGeometry(0.019, 10, 8), 0, -0.012, 0.117, 0.9, 1, 1),
      ]),
      skin,
    ),
  );
  const mustache = new TorusGeometry(0.03, 0.0095, 6, 14, Math.PI);
  mustache.scale(1, 0.55, 1).rotateX(-0.2).translate(0, -0.05, 0.108);
  head.add(
    solid(
      merged([
        placed(new SphereGeometry(0.127, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), 0, 0.014, -0.012),
        ...curls(),
        mustache,
        placed(new CapsuleGeometry(0.0045, 0.026, 2, 6).rotateZ(Math.PI / 2 - 0.12), 0.042, 0.044, 0.108),
        placed(new CapsuleGeometry(0.0045, 0.026, 2, 6).rotateZ(Math.PI / 2 + 0.12), -0.042, 0.044, 0.108),
      ]),
      hair,
    ),
  );
  const eyePair = solid(
    merged([
      placed(new SphereGeometry(0.0115, 10, 8), 0.04, 0, 0),
      placed(new SphereGeometry(0.0115, 10, 8), -0.04, 0, 0),
    ]),
    eyes,
  );
  eyePair.position.set(0, 0.012, 0.106);
  head.add(eyePair);

  const arm = (side: 1 | -1) => {
    const shoulder = new Group();
    shoulder.position.set(side * SHOULDER_X, SHOULDER_Y, 0);
    chest.add(shoulder);
    shoulder.add(solid(placed(new CapsuleGeometry(0.056, 0.1, 4, 14), 0, -0.07, 0), shirt));
    shoulder.add(solid(placed(new CapsuleGeometry(0.045, 0.16, 4, 12), 0, -0.125, 0), skin));
    const elbow = new Group();
    elbow.position.y = -0.25;
    shoulder.add(elbow);
    elbow.add(
      solid(
        merged([
          placed(new CapsuleGeometry(0.04, 0.17, 4, 12), 0, -0.125, 0),
          placed(new SphereGeometry(0.03, 12, 10), 0, -0.29, 0.004, 0.95, 1.45, 0.55),
        ]),
        skin,
      ),
    );
    return { shoulder, elbow };
  };
  const armL = arm(1);
  const armR = arm(-1);

  const leg = (side: 1 | -1) => {
    const hip = new Group();
    hip.position.set(side * 0.085, 0, 0);
    hips.add(hip);
    hip.add(solid(placed(new CapsuleGeometry(0.074, 0.27, 4, 14), 0, -0.21, 0), trousers));
    const knee = new Group();
    knee.position.y = -THIGH;
    hip.add(knee);
    knee.add(solid(placed(new CapsuleGeometry(0.062, 0.29, 4, 14), 0, -0.19, 0), trousers));
    const ankle = new Group();
    ankle.position.y = -(SHIN - 0.05);
    knee.add(ankle);
    ankle.add(solid(placed(new RoundedBoxGeometry(0.105, 0.075, 0.25, 3, 0.03), 0, -0.0125, 0.045), shoes));
    return { hip, knee, ankle };
  };
  const legL = leg(1);
  const legR = leg(-1);

  const lap = new Group();
  lap.position.set(0.02, 0.05, 0.22);
  hips.add(lap);

  let isAsleep = false;
  const bodyParts = [torso, neck, pelvis, armL.shoulder, armR.shoulder, legL.hip, legR.hip];
  const showBody = (isShown: boolean) => {
    for (const piece of bodyParts) piece.visible = isShown;
    isAsleep = !isShown;
  };

  const current: Pose = { ...STAND };
  const goal: Pose = { ...STAND };
  const keys = Object.keys(current) as (keyof Pose)[];

  let gesture: Gesture | null = null;
  let gestureLeft = 0;
  let nextGesture = 4;
  let nextBlink = 3;
  let blinkLeft = 0;

  const update: Figure["update"] = (target, dt, motion) => {
    const { walk, stepping, breath, strum, seconds, realDt, isWorking } = motion;

    if (isWorking) {
      if (gesture) {
        gestureLeft -= realDt;
        if (gestureLeft <= 0) {
          gesture = null;
          nextGesture = 4 + Math.random() * 8;
        }
      } else {
        nextGesture -= realDt;
        if (nextGesture <= 0) {
          gesture = pickGesture();
          gestureLeft = between(gesture.seconds);
        }
      }
    } else {
      gesture = null;
      nextGesture = 3 + Math.random() * 4;
    }
    Object.assign(goal, target, gesture?.pose);

    const share = 1 - Math.exp(-dt * 7);
    let farthest = 0;
    for (const key of keys) {
      current[key] += (goal[key] - current[key]) * share;
      farthest = Math.max(farthest, Math.abs(goal[key] - current[key]));
    }

    const swing = Math.sin(walk) * stepping;
    const lift = Math.cos(walk) * stepping;
    const stride = 0.42 * swing;
    const breathing = Math.sin(breath);

    const legAngles = (side: typeof legL, base: number, bend: number, forward: number, rising: number) => {
      const hipAngle = base + forward;
      const kneeAngle = bend + 0.85 * Math.max(0, rising) + 0.06 * stepping;
      side.hip.rotation.x = hipAngle;
      side.knee.rotation.x = kneeAngle;
      side.ankle.rotation.x = -(hipAngle + kneeAngle) * 0.75;
      return THIGH * Math.cos(hipAngle) + SHIN * Math.cos(hipAngle + kneeAngle);
    };
    const reachL = legAngles(legL, current.legL, current.kneeL, -stride, lift);
    const reachR = legAngles(legR, current.legR, current.kneeR, stride, -lift);

    hips.position.set(0.012 * swing, Math.max(reachL, reachR) + breathing * 0.003, 0);
    hips.rotation.set(0, 0.07 * swing, -0.035 * swing);
    chest.rotation.set(current.lean + 0.04 * stepping, -0.14 * swing, 0.035 * swing);
    torso.scale.y = 1 + breathing * 0.012;

    const typing = gesture?.typing ?? (isWorking ? [1, 1] : [0, 0]);
    const burst = MathUtils.smoothstep(Math.sin(seconds * 0.9) * Math.sin(seconds * 0.37 + 1.3), -0.2, 0.4);
    const tapL = 0.07 * Math.sin(seconds * 13) * burst * typing[0];
    const tapR = 0.07 * Math.sin(seconds * 11.3 + 2) * burst * typing[1];
    const drift = isWorking ? 1 : 0;
    const shoulderLift = breathing * 0.003;

    armL.shoulder.position.y = SHOULDER_Y + shoulderLift;
    armR.shoulder.position.y = SHOULDER_Y + shoulderLift;
    armL.shoulder.rotation.set(current.armLx + 0.38 * swing, 0, current.armLz);
    armR.shoulder.rotation.set(current.armRx - 0.38 * swing + strum, 0, -current.armRz);
    armL.elbow.rotation.x = -(current.elbowL + 0.12 * stepping + 0.15 * Math.max(0, -swing) + tapL);
    armR.elbow.rotation.x = -(current.elbowR + 0.12 * stepping + 0.15 * Math.max(0, swing) + tapR);

    head.rotation.set(
      current.headTilt - 0.04 * stepping + drift * 0.015 * Math.sin(seconds * 0.5),
      current.headTurn + 0.12 * swing + drift * (0.04 * Math.sin(seconds * 0.31) + 0.02 * Math.sin(seconds * 0.83)),
      0,
      "YXZ",
    );

    nextBlink -= realDt;
    if (nextBlink <= 0) {
      blinkLeft = 0.13;
      nextBlink = 2.5 + Math.random() * 3.5;
    }
    blinkLeft = Math.max(0, blinkLeft - realDt);
    eyePair.scale.y = isAsleep ? 0.12 : blinkLeft > 0 ? 0.15 : 1;

    return farthest > 0.012;
  };

  return { root, showBody, lap, update };
};
