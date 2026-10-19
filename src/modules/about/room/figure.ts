// Me, as a small figure for the room: a mop of dark curls, a mustache, a
// white tee, dark trousers. Rounded shapes on joints at the shoulders,
// elbows, hips, knees and ankles, so it can stand, walk, sit, type, stretch
// and lie down. Shapes that move together are merged into one, so the whole
// figure is a handful of draw calls.
//
// The figure faces +z, so its own left is +x

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

// Every joint angle, in radians. How high the hips are follows from the
// legs: the lower foot is on the floor
export interface Pose {
  // Forward swing at the hips (negative is forward), bend at the knees
  legL: number;
  legR: number;
  kneeL: number;
  kneeR: number;
  // Forward swing at the shoulders (negative is forward, toward -π is up),
  // and how far out from the body each arm hangs (negative is in, across)
  armLx: number;
  armLz: number;
  armRx: number;
  armRz: number;
  // Bend at the elbows, the forearm coming forward
  elbowL: number;
  elbowR: number;
  // Leaning forward from the hips
  lean: number;
  // The head turned toward its left, and nodded down
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

// From the hip joint to the knee, and from the knee to the sole: standing,
// the hips are their sum over the floor
const THIGH = 0.42;
const SHIN = 0.43;
const HIP_HEIGHT = THIGH + SHIN;
// Where the hips are over the floor seated: the desk chair's cushion is
// 0.55 up, and the thighs rest on it. They slope down just enough for the
// soles to reach the floor, the shins upright
const SEAT_HEIGHT = 0.6;
const THIGH_SLOPE = Math.asin((SEAT_HEIGHT - SHIN) / THIGH);

/** On a chair or the edge of the bed: thighs out, shins down, hands on the thighs. */
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

/** At the desk, leaning in, hands on the keyboard, eyes on the screens. */
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

/** On the bed with the guitar: the left hand up the neck, the right over the strings. */
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

/** Asleep on my back: the head turned a little on the pillow. */
export const SLEEP: Pose = { ...STAND, headTurn: 0.35 };

// Where the head's middle is over the hips
const HEAD_Y = 0.725;
// Where the shoulder joints are, over the hips and out from the middle
const SHOULDER_Y = 0.48;
const SHOULDER_X = 0.205;

// ── At work ─────────────────────────────────────────────────────────────────
//
// Sitting at the desk I don't just type: I look from one screen to the
// other, take the mouse, lean back, now and then stretch. Each a change to
// the typing pose, held a few seconds

interface Gesture {
  weight: number;
  // How long it's held, at least and at most, in seconds
  seconds: [number, number];
  // How much each hand keeps typing meanwhile, 0 to 1
  typing: [left: number, right: number];
  pose: Partial<Pose>;
}

const GESTURES: Gesture[] = [
  // A look at the left screen, and at the right
  { weight: 3, seconds: [1.5, 3], typing: [0.4, 0.4], pose: { headTurn: 0.3 } },
  { weight: 3, seconds: [1.5, 3], typing: [0.4, 0.4], pose: { headTurn: -0.26, headTilt: -0.04 } },
  // The right hand on the mouse, out beside the keyboard
  {
    weight: 4,
    seconds: [3, 7],
    typing: [0.6, 0],
    pose: { armRx: -0.9, armRz: 0.32, elbowR: 0.6, headTurn: -0.06 },
  },
  // Back in the chair, hands on the thighs
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
  // A stretch, both arms up
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

// ── Building ────────────────────────────────────────────────────────────────

// A shape, sized and moved into place before it's merged with others
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

// Shapes merged into one. A rounded box comes without an index and the
// rest with one: where they're mixed, all of them go without
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

// The tee, from the waist up: narrow at the waist, full at the chest,
// rounding over the shoulders to the collar. Turned about its middle, then
// flattened front to back
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

// The curls: small balls over the back and top of the head, down to the
// nape, clear of the face and the ears, on a spiral so they spread evenly
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
  // Fuller over the forehead
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
  // Its feet, facing +z
  root: Group;
  // Shows only the head, its eyes shut, for sleeping under the duvet
  showBody: (isShown: boolean) => void;
  // Where a guitar goes while it's played, across the lap
  lap: Group;
  // Eases the joints toward a pose, with what I do at the desk on top, then
  // adds the walk, the breath and the typing. Returns whether the joints are
  // still on their way, so the room draws their shadows meanwhile
  update: (target: Pose, dt: number, motion: Motion) => boolean;
}

export interface Motion {
  // Where the walk cycle is, in radians, and how much of it shows: 1 while
  // walking, 0 at rest
  walk: number;
  stepping: number;
  breath: number;
  // The right arm over the strings
  strum: number;
  // Real time, in seconds, and since the last frame: what I do at the desk
  // runs on it, also while a day is played fast
  seconds: number;
  realDt: number;
  // Settled at the desk, working
  isWorking: boolean;
}

/** Builds the figure, standing at the origin. Its materials are its own. */
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

  // Everything above the waist leans and turns from the hips
  const chest = new Group();
  hips.add(chest);
  const torso = solid(
    merged([
      new LatheGeometry(TORSO, 28).scale(1, 1, 0.64),
      // The collar
      placed(new TorusGeometry(0.052, 0.011, 8, 24).rotateX(Math.PI / 2), 0, 0.562, 0, 1, 1, 0.8),
      // The shoulders, rounding into the sleeves
      placed(new SphereGeometry(0.062, 16, 12), SHOULDER_X, SHOULDER_Y, 0, 1, 1, 0.8),
      placed(new SphereGeometry(0.062, 16, 12), -SHOULDER_X, SHOULDER_Y, 0, 1, 1, 0.8),
    ]),
    shirt,
  );
  chest.add(torso);
  const neck = solid(placed(new CapsuleGeometry(0.042, 0.05, 4, 12), 0, 0.6, 0), skin);
  chest.add(neck);

  // The head: a face with ears and a nose, the curls, a mustache, the brows
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
        // The brows, lying across, tipped down at the outer ends
        placed(new CapsuleGeometry(0.0045, 0.026, 2, 6).rotateZ(Math.PI / 2 - 0.12), 0.042, 0.044, 0.108),
        placed(new CapsuleGeometry(0.0045, 0.026, 2, 6).rotateZ(Math.PI / 2 + 0.12), -0.042, 0.044, 0.108),
      ]),
      hair,
    ),
  );
  // The eyes, about their own middle, so they shut by flattening
  const eyePair = solid(
    merged([
      placed(new SphereGeometry(0.0115, 10, 8), 0.04, 0, 0),
      placed(new SphereGeometry(0.0115, 10, 8), -0.04, 0, 0),
    ]),
    eyes,
  );
  eyePair.position.set(0, 0.012, 0.106);
  head.add(eyePair);

  // An arm: a sleeve over the upper arm, the forearm and the hand as one
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
          // The hand, a flattened ball
          placed(new SphereGeometry(0.03, 12, 10), 0, -0.29, 0.004, 0.95, 1.45, 0.55),
        ]),
        skin,
      ),
    );
    return { shoulder, elbow };
  };
  const armL = arm(1);
  const armR = arm(-1);

  // A leg: the thigh, the shin, and a shoe on an ankle that keeps it flat
  const leg = (side: 1 | -1) => {
    const hip = new Group();
    hip.position.set(side * 0.085, 0, 0);
    hips.add(hip);
    hip.add(solid(placed(new CapsuleGeometry(0.074, 0.27, 4, 14), 0, -0.21, 0), trousers));
    const knee = new Group();
    knee.position.y = -THIGH;
    hip.add(knee);
    knee.add(solid(placed(new CapsuleGeometry(0.062, 0.29, 4, 14), 0, -0.19, 0), trousers));
    // The sole is 0.05 under the ankle
    const ankle = new Group();
    ankle.position.y = -(SHIN - 0.05);
    knee.add(ankle);
    ankle.add(solid(placed(new RoundedBoxGeometry(0.105, 0.075, 0.25, 3, 0.03), 0, -0.0125, 0.045), shoes));
    return { hip, knee, ankle };
  };
  const legL = leg(1);
  const legR = leg(-1);

  // In front of the belly, at the height of the thighs when sitting
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

  // What I'm doing at the desk, and for how long
  let gesture: Gesture | null = null;
  let gestureLeft = 0;
  let nextGesture = 4;
  // The next blink, and how long the eyes stay shut
  let nextBlink = 3;
  let blinkLeft = 0;

  const update: Figure["update"] = (target, dt, motion) => {
    const { walk, stepping, breath, strum, seconds, realDt, isWorking } = motion;

    // At the desk, something else now and then
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

    // Eased, so a change of pose is a movement and not a jump
    const share = 1 - Math.exp(-dt * 7);
    let farthest = 0;
    for (const key of keys) {
      current[key] += (goal[key] - current[key]) * share;
      farthest = Math.max(farthest, Math.abs(goal[key] - current[key]));
    }

    // The walk on top: the legs swing against the arms, a knee bends as its
    // leg comes forward, the hips drop as the legs part and sway over the
    // foot that's down, and the shoulders turn against the hips
    const swing = Math.sin(walk) * stepping;
    const lift = Math.cos(walk) * stepping;
    const stride = 0.42 * swing;
    const breathing = Math.sin(breath);

    // Sets a leg's joints. Returns how far its sole reaches under the hip
    const legAngles = (side: typeof legL, base: number, bend: number, forward: number, rising: number) => {
      const hipAngle = base + forward;
      const kneeAngle = bend + 0.85 * Math.max(0, rising) + 0.06 * stepping;
      side.hip.rotation.x = hipAngle;
      side.knee.rotation.x = kneeAngle;
      // Flat on the floor, mostly, whatever the leg does
      side.ankle.rotation.x = -(hipAngle + kneeAngle) * 0.75;
      return THIGH * Math.cos(hipAngle) + SHIN * Math.cos(hipAngle + kneeAngle);
    };
    const reachL = legAngles(legL, current.legL, current.kneeL, -stride, lift);
    const reachR = legAngles(legR, current.legR, current.kneeR, stride, -lift);

    // The hips are as high as the lower foot holds them: standing, seated,
    // halfway up out of the chair, or over the foot that's down mid-step,
    // the feet stay on the floor
    hips.position.set(0.012 * swing, Math.max(reachL, reachR) + breathing * 0.003, 0);
    hips.rotation.set(0, 0.07 * swing, -0.035 * swing);
    chest.rotation.set(current.lean + 0.04 * stepping, -0.14 * swing, 0.035 * swing);
    torso.scale.y = 1 + breathing * 0.012;

    // The hands type in bursts while I work, and the head drifts a little
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

    // A blink every few seconds; shut while asleep
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
