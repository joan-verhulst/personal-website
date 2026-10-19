// The room on the about page: my room as a closed box, with the sun outside
// it shining in through the window as it does at home right now, and me in
// it on my day's schedule. Everything about it comes from the layout, see
// layout.json, which the tuner edits, see tuner.ts. Drawn with three.js, its
// style in its materials and models, see toon.ts

import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Euler,
  Group,
  HalfFloatType,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  type Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Raycaster,
  RingGeometry,
  Scene,
  SpotLight,
  Texture,
  Timer,
  type ToneMapping,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { LightProbeGridWebGL } from "three/examples/jsm/lighting/LightProbeGridWebGL.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { TexturePass } from "three/examples/jsm/postprocessing/TexturePass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { siteData } from "~/data/site";
import { createFigure, type Pose, SIT, SLEEP, STAND, TYPE } from "~/modules/about/room/figure";
import { PIECE_KEYS, type PieceKey, type RoomLayout } from "~/modules/about/room/layout";
import { createMerger, SMALL_PART } from "~/modules/about/room/merge";
import type { Painting } from "~/modules/about/room/painter";
import {
  applyColors,
  BED_SIZE,
  createAcoustic,
  createBed,
  createChair,
  createDesk,
  createElectric,
  createFrame,
  createHangingPlant,
  createHeadphones,
  createLamp,
  createPalette,
  createTurntable,
  tintedBy,
  createPlant,
  createRug,
  createShell,
  createShelves,
  createSunbeams,
  createTallPlant,
  createWallShelf,
  FRAMES,
  guitarName,
  type Hotspot,
  type Palette,
  WALL,
  windowOf,
} from "~/modules/about/room/parts";
import { type Activity, ACTIVITY_LABELS, activityAt, homeHourAt } from "~/modules/about/room/schedule";
import { createStyle } from "~/modules/about/room/toon";
import { sunTransmittance } from "~/modules/core/utils/sky-light";
import { sunAt } from "~/modules/core/utils/sun";

const { home } = siteData.owner;
const RAD = Math.PI / 180;

const NEAR = 0.05;
const FAR = 30;

// Drawn this sharp at most. Every pixel is lit by five lights with shadows,
// smoothed four times over and shaded where things meet, so this is where
// the graphics card's time goes. With the smoothing, one and a half pixels
// a screen pixel look as clean as two, at half the work
const PIXEL_BUDGET = 2_200_000;
const MAX_PIXEL_RATIO = 1.5;

// When the pendant is on every evening, as hours at home
const PENDANT_FROM = 18;
const PENDANT_UNTIL = 22;

// How fast I walk, in meters a second, and how many steps that is
const WALK_SPEED = 1.1;
const STEPS_PER_METER = 1.7;

/**
 * How large the room shows on the page, in CSS pixels, and how many device
 * pixels each is. The page tells the room, which may be drawn in a worker,
 * where there's no page to measure.
 */
export interface RoomView {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface RoomCallbacks {
  // What I'm doing, whenever it changes
  onStatus: (label: string) => void;
  // How far the room is from showing, 0 to 1: its surfaces painted, then
  // its light baked
  onProgress?: (share: number) => void;
  // The room's light is baked for the first time: it can be shown
  onReady?: () => void;
}

// How much of the way to showing the painting is; the bake is the rest.
// They run side by side
const PAINTED_SHARE = 0.4;

/** What the tuner needs to reach into the room. */
export interface RoomTuning {
  // The live layout: change it, then call what applies the change
  layout: RoomLayout;
  camera: PerspectiveCamera;
  // On the page: the tuner only runs there
  canvas: HTMLCanvasElement;
  // Drawn over the painting, unpainted: the tuner's handles
  overlay: Scene;
  pieces: Record<PieceKey, Group>;
  applyCamera: () => void;
  applyColors: () => void;
  placePieces: () => void;
  rebuildShell: () => void;
  // Puts me back where I am, after something I use was moved
  resettle: () => void;
  setActivity: (activity: Activity | null) => void;
  setTuning: (isOn: boolean) => void;
  // Outlines what's picked in the tuner
  highlight: (piece: Group | null) => void;
  // Bakes the bounced light again, after something changed that it sees
  relight: () => void;
  // A clean picture of the room as it is now, this many pixels wide, as a
  // PNG unless another type is asked for
  snapshot: (width: number, type?: string, quality?: number) => Promise<Blob | null>;
  // Settles once the room has: its light baked as it is now, the lamps done
  // fading, me done moving. Or after a while, regardless
  whenSettled: () => Promise<void>;
  onFrame: (callback: (() => void) | null) => void;
}

export interface Room {
  // The room's size on the page has changed
  resize: (view: RoomView) => void;
  // Draws while shown
  setVisible: (isShown: boolean) => void;
  // How far off the clock the room is, in milliseconds, for playing a day
  setOffset: (ms: number) => void;
  // What's under a point on the canvas, in CSS pixels
  pick: (x: number, y: number) => Hotspot | null;
  // The pointer over the canvas: what it's on is outlined and grows a
  // little, if it opens something. Null when it leaves
  hover: (point: { x: number; y: number } | null) => Hotspot | null;
  tuning: RoomTuning;
  destroy: () => void;
}

// ── Where I am ──────────────────────────────────────────────────────────────

// At the desk, in bed, or out of the room
type Resting = "desk" | "bed" | "away";

const facing = (dx: number, dz: number) => Math.atan2(dx, dz);

const spotFor = (activity: Activity): Resting =>
  activity === "sleep" ? "bed" : activity === "away" ? "away" : "desk";

// The frames, each with its picture: the site's own, in turn
const framesOf = (palette: Palette, pictures: string[]) => {
  const frames = {} as Record<keyof typeof FRAMES, Group>;
  for (const [key, { width, height, style, picture }] of Object.entries(FRAMES)) {
    const url = pictures.length > 0 ? pictures[picture % pictures.length] : undefined;
    frames[key as keyof typeof FRAMES] = createFrame(palette, width, height, style, url);
  }
  return frames;
};

// Something under the pointer that opens something: what, and all of it
interface Pointed {
  hotspot: Hotspot;
  group: Object3D;
}

// How much a hovered thing grows, and how fast it gets there
const HOVER_GROWTH = 1.06;
const HOVER_EASE = 14;

// Multiplies the picture by a contact shade worked out on an earlier frame,
// the way the occlusion pass blends its own
const KEPT_OCCLUSION = {
  uniforms: {
    tDiffuse: { value: null },
    tOcclusion: { value: null },
    uIntensity: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tOcclusion;
    uniform float uIntensity;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D( tDiffuse, vUv );
      vec3 shade = texture2D( tOcclusion, vUv ).rgb;
      gl_FragColor = vec4( color.rgb * mix( vec3( 1.0 ), shade, uIntensity ), color.a );
    }
  `,
};

// How many frames after something moved its shadows and shade keep being
// drawn, so it ends where it settles. What eases on its own, my joints and
// what grows under the pointer, counts as moving itself
const SETTLE_FRAMES = 4;
// While nothing moves, the room is drawn again this often, in ms: once a
// minute, for the sun, a quarter of a degree further, and the lamps, which
// go by the clock. In between the graphics card has nothing to do. I sit
// still meanwhile, see the loop. Anything that moves, a hover, a walk, the
// day played, brings the full rate back
const IDLE_EVERY = 60_000;
// While the day plays, everything moves fast and the eye can tell little
// apart: drawn this often a second, as sharp as ever, with the lamps' and
// the sky's shadows every this many frames. The sun's, which is what sweeps
// across the room, every frame
const PLAY_FPS = 30;
const PLAY_SHADOWS_EVERY = 3;
// Playing, until this long after the clock was last moved, in ms
const PLAY_LINGERS = 250;

const TONE_MAPPINGS: Record<RoomLayout["light"]["toneMapping"], ToneMapping> = {
  aces: ACESFilmicToneMapping,
  agx: AgXToneMapping,
  neutral: NeutralToneMapping,
};

// One thing after another on the way from one place to the next
type Step =
  | { kind: "walk"; to: Vector3 }
  | { kind: "hold"; pose: Pose; yaw: number; seconds: number }
  | { kind: "rise" }
  | { kind: "appear"; at: Vector3 }
  | { kind: "vanish" }
  | { kind: "settle"; at: Resting };

// ── The room ────────────────────────────────────────────────────────────────

// A pause in building the room, so the page gets a turn: no one stretch of
// the work holds the page up for long
const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Builds the room on `canvas`, in steps, giving the page a turn between
 * them. Settles once it's ready to draw; it shows itself once its light is
 * baked, see onReady.
 */
export const createRoom = async (
  // On the page, or handed to a worker, see room.worker.ts
  canvas: HTMLCanvasElement | OffscreenCanvas,
  {
    onStatus,
    onProgress,
    onReady,
    layout,
    pictures,
    sleeve,
    painting,
    reducedMotion = false,
  }: RoomCallbacks & {
    layout: RoomLayout;
    // What hangs in the frames, as image addresses
    pictures: string[];
    // What's on rotation first, as an image address: on the record player
    sleeve?: string;
    // The surfaces' painting, if it was started before the room
    painting?: Painting;
    // The visitor asks for less motion: nothing grows under the pointer
    reducedMotion?: boolean;
  },
): Promise<Room> => {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  // Checking each shader for errors makes the browser finish compiling it
  // right then, holding the page up: only while developing
  renderer.debug.checkShaderErrors = process.env.NODE_ENV === "development";
  renderer.shadowMap.enabled = true;
  // Already soft; its radius widens the soft edge. PCFSoftShadowMap is
  // retired and falls back to this one anyway
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  // For the LED strip behind the desk, a light with an area
  RectAreaLightUniformsLib.init();

  const scene = new Scene();
  scene.background = new Color("#0a0a0a");
  const overlay = new Scene();
  const camera = new PerspectiveCamera(layout.camera.fov, 2, NEAR, FAR);

  // ── What's in it ─────────────────────────────────────────────────────────

  // Whether the room shows yet, see ready
  let isReady = false;
  // How far the painting and the first bake are, each 0 to 1. They run side
  // by side; together they're the way to showing the room
  let paintedShare = 0;
  let bakedShare = 0;
  const tellProgress = () => {
    if (!isReady) onProgress?.(PAINTED_SHARE * paintedShare + (1 - PAINTED_SHARE) * bakedShare);
  };
  const palette = createPalette(painting, (done, total) => {
    paintedShare = done / total;
    tellProgress();
  });
  const { bed, duvet } = createBed(palette);
  // The duvet is thousands of folds, and never what the pointer is after:
  // a look under the pointer skips it
  duvet.raycast = () => {};
  const { desk, screenMaterial, shadeMaterial, deskLamps, ledMaterial, ledLight } = createDesk(palette);
  const { lamp, bulbMaterial, light: lampLight } = createLamp(palette);
  const guitarNatural = createAcoustic(palette, palette.spruce, guitarName);
  const walkway = new Group();
  const marker = new Mesh(
    new RingGeometry(0.08, 0.14, 32),
    new MeshBasicMaterial({ color: "#3a9bd8" }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.02;
  walkway.add(marker);
  walkway.visible = false;

  const pieces: Record<PieceKey, Group> = {
    bed,
    desk,
    chair: createChair(palette),
    rug: createRug(palette),
    shelves: createShelves(palette),
    guitarNatural,
    guitarSunburst: createAcoustic(palette, palette.sunburst, guitarName),
    electric: createElectric(palette),
    plant: createPlant(palette, 0.16, 0.32, 34, 0.32),
    lamp,
    walkway,
    headphones: createHeadphones(palette),
    turntable: createTurntable(palette, sleeve),
    ...framesOf(palette, pictures),
    shelfBooks: createWallShelf(palette, "books"),
    shelfTrinkets: createWallShelf(palette, "trinkets"),
    plantTall: createTallPlant(palette),
    plantHanging: createHangingPlant(palette),
    plantDesk: createPlant(palette, 0.045, 0.07, 10, 0.08, palette.ceramic),
  };
  for (const key of PIECE_KEYS) {
    pieces[key].userData.piece = key;
    scene.add(pieces[key]);
  }
  await breathe();

  const placePieces = () => {
    for (const key of PIECE_KEYS) {
      const { position, rotation, hidden } = layout.pieces[key];
      pieces[key].position.fromArray(position);
      pieces[key].rotation.set(0, rotation * RAD, 0);
      // The walkway only shows while tuning, see setTuning
      if (key !== "walkway") pieces[key].visible = !hidden;
      pieces[key].updateMatrixWorld(true);
    }
  };
  placePieces();

  // The materials' colours, and the desk's lights'
  const colorize = () => {
    applyColors(palette, layout.colors);
    for (const light of deskLamps) light.color.set(layout.colors.deskLamps);
    shadeMaterial.emissive.set(layout.colors.deskLamps);
    ledLight.color.set(layout.colors.ledStrip);
    ledMaterial.emissive.set(layout.colors.ledStrip);
  };
  colorize();

  let shell = createShell(palette, layout.room);
  scene.add(shell);

  const figure = createFigure();
  scene.add(figure.root);
  const sunbeams = createSunbeams();
  scene.add(sunbeams.beams);

  // Each piece's still parts as one shape per material, so the room is a
  // few dozen things to draw instead of hundreds, see merge.ts. The duvet
  // breathes on its own
  duvet.userData.keepApart = true;
  await breathe();
  const mergeStill = createMerger(tintedBy(palette));
  for (const key of PIECE_KEYS) mergeStill(pieces[key]);
  mergeStill(shell);
  await breathe();

  // The style, in every material and around every object, see toon.ts
  const style = createStyle();
  style.style(scene);
  style.outline(scene);
  await breathe();

  // Every painted surface as sharp as the graphics card allows, also seen
  // at a glancing angle, like the floor toward the far wall
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  scene.traverse((child) => {
    if (!(child instanceof Mesh) || !(child.material instanceof MeshStandardMaterial)) return;
    for (const map of [child.material.map, child.material.bumpMap]) {
      if (map) map.anisotropy = anisotropy;
    }
  });

  // ── Light ────────────────────────────────────────────────────────────────
  //
  // The room is a closed box, so light only gets in where it would: the sun
  // and the sky through the window, both blocked by the walls, the ceiling
  // and the window's frame. Where the sun lands, it lights the room back.
  // A little light from everywhere stands in for everything bouncing
  // around after that.

  let windowInfo = windowOf(layout.room);

  // The sun, outside, far off along its direction
  const sun = new DirectionalLight("#ffffff", 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  // The edge of the window's shadow is soft, as a sun's is a step away
  sun.shadow.radius = 4;
  const roomCenter = new Vector3(0, 1, 0);
  sun.target.position.copy(roomCenter);
  scene.add(sun, sun.target);

  // The sky, seen through the window: a wide, soft light from just outside
  // it, into the room, so it falls off from the window inward
  const sky = new SpotLight("#dfe7f2", 0, 0, 1.1, 1, 2);
  sky.castShadow = true;
  sky.shadow.mapSize.set(1024, 1024);
  sky.shadow.camera.near = 0.1;
  sky.shadow.camera.far = 20;
  sky.shadow.bias = -0.0005;
  sky.shadow.normalBias = 0.03;
  sky.shadow.radius = 8;
  scene.add(sky, sky.target);

  // The sunlit patch, lighting the room back in its own colour
  const bounce = new PointLight("#ffcf9a", 0, 7, 2);
  scene.add(bounce);

  // Everything else that bounces around
  const ambience = new HemisphereLight("#e3e8f0", "#9a6b45", 0);
  const fill = new AmbientLight("#ffe6c8", 0);
  scene.add(ambience, fill);

  // The lights with shadows. Their shadows are drawn only when something
  // moved, see keepStill
  const shadowLights = [sun, sky, lampLight, ...deskLamps];
  for (const light of shadowLights) light.shadow.autoUpdate = false;

  // Sizes the lights to the room, after it's built or rebuilt
  const fitLights = () => {
    const { width, depth } = layout.room;
    const reach = Math.max(width, depth) / 2 + 1.5;
    sun.shadow.camera.left = -reach;
    sun.shadow.camera.right = reach;
    sun.shadow.camera.top = reach;
    sun.shadow.camera.bottom = -reach;
    sun.shadow.camera.updateProjectionMatrix();
    sky.position.copy(windowInfo.center).addScaledVector(windowInfo.outward, 0.6);
    sky.target.position.copy(windowInfo.center).addScaledVector(windowInfo.outward, -2);
    sky.target.updateMatrixWorld();
  };
  fitLights();

  const DAY_SKY = new Color("#dfe7f2");
  const DUSK_SKY = new Color("#e0b08f");
  const NIGHT_SKY = new Color("#28325a");
  const MOON = new Color("#8fa6d8");
  const BOUNCE_TINT = new Color("#ffcf9a");
  const skyColor = new Color();
  const dayColor = new Color();
  const sunColor = new Color();
  const toSun = new Vector3();
  const landing = new Vector3();

  // The lamps and the monitors come on and go off over a moment
  let lampOn = 0;
  let deskOn = 0;
  let screenOn = 0;
  // Whether one of them is still on its way
  let isLightEasing = false;

  // Where a ray from the window's middle away from the sun first meets the
  // floor or a wall
  const landingOf = (from: Vector3, toward: Vector3) => {
    const { width, depth } = layout.room;
    let along = Number.POSITIVE_INFINITY;
    const consider = (distance: number) => {
      if (distance > 0.01) along = Math.min(along, distance);
    };
    if (toward.y < 0) consider(from.y / -toward.y);
    if (toward.x < 0) consider((from.x + width / 2) / -toward.x);
    if (toward.x > 0) consider((width / 2 - from.x) / toward.x);
    if (toward.z < 0) consider((from.z + depth / 2) / -toward.z);
    if (toward.z > 0) consider((depth / 2 - from.z) / toward.z);
    return Number.isFinite(along) ? landing.copy(from).addScaledVector(toward, along) : null;
  };

  // Always a clear sky: only the sun, never the weather
  // `hour` is the hour at home at `now`, worked out once a frame
  const light = (now: Date, hour: number, dt: number, activity: Activity) => {
    const settings = layout.light;
    const { elevation, azimuth } = sunAt(now, home);
    const up = MathUtils.smoothstep(elevation, -2, 4);
    // The near wall faces the layout's compass direction; the room's x
    // faces a quarter turn anticlockwise of it
    const faces = layout.room.nearWallFaces;

    let sunshine = 0;
    if (up > 0) {
      const flat = Math.cos(elevation * RAD);
      toSun.set(
        flat * Math.cos((azimuth - (faces - 90)) * RAD),
        Math.sin(elevation * RAD),
        flat * Math.cos((azimuth - faces) * RAD),
      );
      // How much of it gets through the air, in its colour
      const through = sunTransmittance(0, elevation);
      const brightest = Math.max(through[0], through[1], through[2], 0.001);
      sunColor.setRGB(through[0] / brightest, through[1] / brightest, through[2] / brightest);
      sunshine = up * (0.35 + 0.65 * brightest);
      sun.color.copy(sunColor);
      sun.intensity = settings.sun * sunshine;
    } else {
      // The night: a faint blue from the street, low through the window
      toSun.copy(windowInfo.outward).multiplyScalar(0.9).setY(0.42).normalize();
      sun.color.copy(MOON);
      sun.intensity = 0.04 * settings.sun;
    }
    sun.position.copy(roomCenter).addScaledVector(toSun, 16);

    // Whether the sun is on the window's side of the house at all
    const inside = MathUtils.smoothstep(toSun.dot(windowInfo.outward), 0.05, 0.3) * sunshine;
    sunbeams.update(toSun, settings.beams * inside, windowInfo.panes);
    const away = toSun.clone().negate();
    const lands = landingOf(windowInfo.center, away);
    if (lands) bounce.position.copy(lands).addScaledVector(toSun, 0.5);
    bounce.color.copy(sunColor).lerp(BOUNCE_TINT, 0.5);
    bounce.intensity = settings.bounce * inside;

    // The sky's light through the window: bright and a little cool by day,
    // warmer at dusk, a faint blue at night
    const dayness = MathUtils.smoothstep(elevation, -7, 8);
    const noon = MathUtils.smoothstep(elevation, 0, 14);
    dayColor.copy(DUSK_SKY).lerp(DAY_SKY, noon);
    skyColor.copy(NIGHT_SKY).lerp(dayColor, dayness);
    sky.color.copy(skyColor);
    sky.intensity = settings.window * (0.06 + 0.94 * dayness);
    ambience.color.copy(skyColor);
    ambience.intensity = settings.sky * (0.25 + 0.75 * dayness);
    fill.intensity = settings.ambient;

    // The pendant every evening from 18:00 to 22:00, and whenever it's dark
    // and I'm working. The desk's lamps and strip from dusk until I go to
    // bed, home or not. The monitors while I work
    const isWorking = activity === "work";
    const isEvening = hour >= PENDANT_FROM && hour < PENDANT_UNTIL;
    // They fade while the room shows; before, they're simply as they are,
    // so the light is captured once, as it will be seen
    const ease = isReady ? 1 - Math.exp(-dt * 3) : 1;
    const lampTo = isEvening || (elevation < 3 && isWorking) ? 1 : 0;
    const deskTo = elevation < 6 && activity !== "sleep" ? 1 : 0;
    const screenTo = isWorking ? 1 : 0;
    lampOn += (lampTo - lampOn) * ease;
    deskOn += (deskTo - deskOn) * ease;
    screenOn += (screenTo - screenOn) * ease;
    isLightEasing =
      Math.abs(lampTo - lampOn) > 0.01 || Math.abs(deskTo - deskOn) > 0.01 || Math.abs(screenTo - screenOn) > 0.01;
    lampLight.intensity = settings.lamp * lampOn;
    bulbMaterial.emissiveIntensity = 4 * lampOn;
    for (const deskLamp of deskLamps) deskLamp.intensity = settings.deskLamps * deskOn;
    shadeMaterial.emissiveIntensity = 0.5 * deskOn * Math.min(1, settings.deskLamps);
    ledLight.intensity = settings.ledStrip * deskOn;
    ledMaterial.emissiveIntensity = 2 * deskOn * Math.min(1, settings.ledStrip / 10);
    screenMaterial.emissiveIntensity = 0.6 * settings.screens * screenOn;

    // When this changes, the light bouncing around the room is refreshed:
    // the sun two degrees further, a lamp on or off, or something changed in
    // the tuner. At night the sun is no part of it: wherever it is, the night
    // is the same
    const isNight = elevation < -8;
    lightingKey = [
      isNight ? "night" : Math.round(elevation / 2),
      isNight ? "night" : Math.round(azimuth / 2),
      lampOn.toFixed(1),
      deskOn.toFixed(1),
      screenOn.toFixed(1),
      lightVersion,
    ].join();
  };
  let lightingKey = "";
  let lightVersion = 0;

  // ── Bounced light and reflections ────────────────────────────────────────
  //
  // Light doesn't stop where it lands: the sunlit patch lights the walls,
  // the walls light the corners. A grid of light probes through the room
  // captures that from the room as it's lit, and every surface takes the
  // light of the probes around it.
  //
  // The first bake is done while the room is still hidden: direct light,
  // then a bounce on top. It starts right away, while the surfaces are still
  // being painted: each starts as its painted average colour, which is all
  // light bouncing off it takes. The room is shown once both are done, see
  // onReady. After that, when the light changes, it's refreshed in the same
  // way, each probe taking the light as it is now plus the bounce it had, so
  // it never drops back to direct light only and the room never dims. Once a
  // bake is done, the room is captured from its middle as an environment,
  // for shiny things to reflect.
  //
  // Every probe draws the room six times, so there are few of them: a coarse
  // grid across the room in two layers, a few probes a frame, with the small
  // things and the outlines left out. More a frame while the room is hidden,
  // where a slow frame doesn't show

  const PROBE_SPACING = 0.9;
  const PROBES_PER_FRAME = 4;
  const HIDDEN_PROBES_PER_FRAME = 10;
  // The lowest probes hang above the bed and the desk: a probe inside
  // furniture sees only its dark inside, and darkens everything around it.
  // The highest are just under the ceiling
  const PROBES_FROM = 0.75;
  const PROBE_LAYERS = 2;

  const createGrid = () => {
    const { width, depth, height } = layout.room;
    // Just inside the walls and under the ceiling
    const w = width - 0.2;
    const d = depth - 0.2;
    const h = height - 0.15 - PROBES_FROM;
    const made = new LightProbeGridWebGL(
      w,
      h,
      d,
      Math.round(w / PROBE_SPACING) + 1,
      PROBE_LAYERS,
      Math.round(d / PROBE_SPACING) + 1,
    );
    made.position.set(0, PROBES_FROM + h / 2, 0);
    return made;
  };
  let grid = createGrid();
  // Only when there's bounced light to bake, see bakeStep
  if (layout.light.gi > 0) scene.add(grid);

  // The small things barely change how light bounces, and every probe draws
  // the room six times: they're left out of the captures
  const smallThings: Object3D[] = [];
  const findSmallThings = () => {
    smallThings.length = 0;
    scene.updateMatrixWorld(true);
    const scale = new Vector3();
    scene.traverse((child) => {
      if (!(child instanceof Mesh) || child.userData.isOutline) return;
      // Small parts merged together are still small ones, see merge.ts
      if (child.userData.isSmall === true) {
        smallThings.push(child);
        return;
      }
      if (child.userData.isSmall === false) return;
      const geometry = child.geometry;
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      child.getWorldScale(scale);
      const radius = (geometry.boundingSphere?.radius ?? 0) * Math.max(scale.x, scale.y, scale.z);
      if (radius < SMALL_PART / 2) smallThings.push(child);
    });
  };
  findSmallThings();

  // Hides what a capture of the room's light shouldn't see: the beams in
  // the air, the outlines, the walkway and the small things. The bounce is
  // captured at its true strength, whatever the slider shows it at, so
  // refreshing on top of the last bake settles instead of running away.
  //
  // A shadow due to be drawn would be drawn in the capture, without the
  // small things, and then kept for the picture: it's marked due again
  // afterwards, so the picture's shadows have everything in them
  const hiddenForCapture: Object3D[] = [];
  const dueShadows: typeof shadowLights = [];
  const prepareCapture = (isCapturing: boolean) => {
    style.hideOutlines(isCapturing);
    style.setBounce(isCapturing ? 1 : layout.light.gi);
    if (isCapturing) {
      for (const thing of [...smallThings, sunbeams.beams, walkway]) {
        if (thing.visible) {
          thing.visible = false;
          hiddenForCapture.push(thing);
        }
      }
      for (const light of shadowLights) if (light.shadow.needsUpdate) dueShadows.push(light);
    } else {
      for (const thing of hiddenForCapture) thing.visible = true;
      hiddenForCapture.length = 0;
      // Only once the room shows: before, nothing's drawn with them, and
      // they're all drawn anew as it's shown, see ready
      if (isReady) for (const light of dueShadows) light.shadow.needsUpdate = true;
      dueShadows.length = 0;
    }
  };

  const pmrem = new PMREMGenerator(renderer);
  let environment: WebGLRenderTarget | null = null;
  const captureEnvironment = (of: Scene = scene) => {
    prepareCapture(true);
    const made = pmrem.fromScene(of, 0.02, 0.05, 20, {
      size: 128,
      position: new Vector3(0, 1.3, 0),
    });
    prepareCapture(false);
    environment?.dispose();
    environment = made;
    scene.environment = made.texture;
  };
  // An empty one to start, so every material is built with a reflection
  // from the start, and isn't built again, with a stall, once there's one
  captureEnvironment(new Scene());
  await breathe();

  // Where the bake is: which pass (0 for direct light, 1 for the bounce on
  // top) and the next probe. Null when there's nothing to do
  let bake: { pass: number; next: number } | null = { pass: 0, next: 0 };
  let bakedKey: string | null = null;
  // Whether the first bake is done, and the surfaces painted, see parts.ts
  let isBaked = false;
  let isPainted = false;
  // Shown on the frame after the first full draw, so the drawing steps'
  // own setting up happens while the room is still hidden
  let isRevealDue = false;

  // Shown anyway if the bake takes this long, in ms, once drawing started:
  // a slow machine. Its light then settles in view, which beats a blank
  const READY_WITHIN = 5000;
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  const ready = () => {
    if (readyTimer) clearTimeout(readyTimer);
    readyTimer = null;
    if (isReady) return;
    isReady = true;
    // The shadows drawn so far were the bake's, without the small things:
    // drawn again once, with everything, before the room shows. Nothing
    // moved, so once is all: not a run of full frames during the fade in
    for (const light of shadowLights) light.userData.isShadowStale = true;
    isOcclusionFresh = false;
    isRevealDue = true;
  };
  const readyOnceDone = () => {
    if (isBaked && isPainted) ready();
  };
  palette.painted.then(() => {
    isPainted = true;
    // The reflections were of the room unpainted: again, painted
    if (isBaked && !isDestroyed) captureEnvironment();
    readyOnceDone();
  });

  // The reflections are captured again at most this often, in ms
  const CAPTURE_EVERY = 1500;
  let lastCapture = Number.NEGATIVE_INFINITY;

  // With no bounced light asked for, the probes would be baked for nothing
  // and sampled by every pixel for nothing: they're taken out of the room,
  // and only the reflections are captured, whenever the light changes
  const bakeStep = () => {
    if (layout.light.gi <= 0) {
      if (grid.parent) scene.remove(grid);
      bake = null;
      // Captured again once the day has played, not on the way
      if (lightingKey === bakedKey || isPlayingDay) return;
      // Once the lamps are done fading, and not more often than every so
      // often while a day is played: each capture draws the room six times
      const now = performance.now();
      if (isReady && (isLightEasing || now - lastCapture < CAPTURE_EVERY)) return;
      lastCapture = now;
      bakedKey = lightingKey;
      captureEnvironment();
      if (!isBaked) {
        isBaked = true;
        bakedShare = 1;
        tellProgress();
        readyOnceDone();
      }
      return;
    }
    if (!grid.parent) {
      // Bounced light asked for again, in the tuner: baked anew
      scene.add(grid);
      bake = { pass: 0, next: 0 };
    }
    if (!bake) {
      if (lightingKey === bakedKey) return;
      bake = { pass: 1, next: 0 };
    }
    if (bake.next === 0) bakedKey = lightingKey;
    const { x, y, z } = grid.resolution;
    const total = x * y * z;
    const count = Math.min(isReady ? PROBES_PER_FRAME : HIDDEN_PROBES_PER_FRAME, total - bake.next);
    prepareCapture(true);
    try {
      grid.bake(renderer, scene, {
        start: bake.next,
        count,
        pass: bake.pass,
        cubemapSize: 16,
        near: 0.05,
        far: 20,
      });
    } catch {
      // Without bounced light, the room still has its own lights: show it
      bake = null;
      isBaked = true;
      readyOnceDone();
      return;
    } finally {
      prepareCapture(false);
    }
    bake.next += count;
    if (!isReady) {
      bakedShare = (bake.pass * total + bake.next) / (2 * total);
      tellProgress();
    }
    if (bake.next < total) return;
    if (bake.pass === 0) {
      bake = { pass: 1, next: 0 };
      return;
    }
    bake = null;
    isBaked = true;
    captureEnvironment();
    readyOnceDone();
  };

  // ── Drawing ──────────────────────────────────────────────────────────────

  // The scene is drawn into a picture with smooth edges, then darkened where
  // things meet, given a soft glow on its bright parts and tone mapped.
  // Nothing is laid over it but the highlight around what the pointer is on
  const picture = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    samples: layout.paint.smooth ? 4 : 0,
  });
  let isSmooth = layout.paint.smooth;
  const composer = new EffectComposer(renderer);
  composer.addPass(new TexturePass(picture.texture));
  // Ambient occlusion: soft shade in corners and where things touch, from
  // the room's depth. A measure of light, not a style
  const occlusion = new GTAOPass(scene, camera, 1, 1);
  occlusion.updateGtaoMaterial({
    radius: 0.35,
    thickness: 1,
    scale: 1,
    samples: 16,
    screenSpaceRadius: false,
  });
  composer.addPass(occlusion);
  // The shade worked out last time, applied again on the frames where
  // nothing moved, which costs next to nothing, see keepStill
  const keptOcclusion = new ShaderPass(KEPT_OCCLUSION);
  keptOcclusion.uniforms.tOcclusion.value = occlusion.gtaoMap;
  keptOcclusion.enabled = false;
  composer.addPass(keptOcclusion);
  let isOcclusionFresh = false;
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.2, 0.6, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // The highlight around what the pointer is on, or what's picked in the
  // tuner. Off while there's none
  const outline = new OutlinePass(new Vector2(1, 1), scene, camera);
  outline.edgeStrength = 4;
  outline.edgeGlow = 0;
  outline.edgeThickness = 1;
  outline.pulsePeriod = 0;
  outline.visibleEdgeColor.set("#fff6e4");
  outline.hiddenEdgeColor.set("#000000");
  outline.enabled = false;
  composer.addPass(outline);
  let pixelRatio = 1;

  const applyCamera = () => {
    camera.position.fromArray(layout.camera.position);
    camera.fov = layout.camera.fov;
    camera.lookAt(new Vector3().fromArray(layout.camera.target));
    camera.updateProjectionMatrix();
  };
  applyCamera();

  // Sizes everything to the room's size on the page, see RoomView. `ratio`
  // overrides the pixel ratio, for a picture saved larger than it shows
  let view: RoomView = { width: 0, height: 0, devicePixelRatio: 1 };
  const resize = (ratio?: number) => {
    const { width, height } = view;
    if (width === 0 || height === 0) return;
    pixelRatio =
      ratio ??
      Math.min(
        view.devicePixelRatio || 1,
        MAX_PIXEL_RATIO,
        Math.sqrt(PIXEL_BUDGET / (width * height)),
      );
    const pixelsX = Math.round(width * pixelRatio);
    const pixelsY = Math.round(height * pixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    picture.setSize(pixelsX, pixelsY);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // The kept shade was the old size, and resizing clears the canvas:
    // drawn again on the next frame, even while idle
    isOcclusionFresh = false;
    needsDraw = true;
  };

  // ── Keeping still ────────────────────────────────────────────────────────
  //
  // The camera never moves and most of the room never does, so shadows and
  // the contact shade are kept from frame to frame, and only drawn again
  // when something moved: me, something growing under the pointer, a change
  // in the tuner, or the sun a little further along

  let stillFrames = 0;
  let figureKey = "";
  const moved = () => {
    stillFrames = 0;
  };
  const sunAtShadow = new Vector3();

  // Whether anything moved lately. Marks the shadows to draw again: each
  // light's when something moved, the sun's when it has moved on, and a
  // lamp's when it comes on after something moved while it was off
  const keepStill = () => {
    const { position, rotation } = figure.root;
    const key = [
      position.x.toFixed(2),
      position.z.toFixed(2),
      rotation.y.toFixed(2),
      figure.root.visible,
      resting,
      plan.length,
    ].join();
    if (key !== figureKey) {
      figureKey = key;
      moved();
    }
    const isMoving = stillFrames < SETTLE_FRAMES;
    stillFrames += 1;

    // Every frame while something moves: drawn every other frame, a shadow
    // or shade a frame old trails behind me as I walk
    const hasSunMoved = sun.position.distanceToSquared(sunAtShadow) > 1e-4;
    for (const light of shadowLights) {
      // While the day plays, the lamps' and the sky's every few frames
      const isDue = light === sun || !isPlayingDay || playFrames % PLAY_SHADOWS_EVERY === 0;
      if ((isMoving && isDue) || (light === sun && hasSunMoved)) {
        light.userData.isShadowStale = true;
      }
      // A light that's off still needs a shadow map, drawn at least once:
      // the lamps' maps are cube depth maps, and with none to bind, the
      // browser can refuse every draw that samples them, leaving the room
      // undrawn (Firefox does)
      const isNeeded = light.intensity > 0 || light.shadow.map === null;
      if (isNeeded && light.userData.isShadowStale !== false) {
        light.shadow.needsUpdate = true;
        light.userData.isShadowStale = false;
        if (light === sun) sunAtShadow.copy(sun.position);
      }
    }
    return isMoving;
  };

  // The exposure, the glow and the style, from the layout, every frame: the
  // tuner changes them live
  const finish = (isMoving: boolean) => {
    const { paint, light: settings } = layout;
    renderer.toneMapping = TONE_MAPPINGS[settings.toneMapping] ?? ACESFilmicToneMapping;
    renderer.toneMappingExposure = settings.exposure;
    // The shade is worked out again every frame while things move, and kept
    // otherwise
    const hasOcclusion = settings.ao > 0;
    // Not while the day plays: the shade from before is kept meanwhile
    occlusion.enabled = hasOcclusion && (isMoving || !isOcclusionFresh) && !isPlayingDay;
    keptOcclusion.enabled = hasOcclusion && !occlusion.enabled;
    occlusion.blendIntensity = settings.ao;
    keptOcclusion.uniforms.uIntensity.value = settings.ao;
    style.setBounce(settings.gi);
    scene.environmentIntensity = settings.reflections;
    // The glow blurs the whole picture several times over: off when it's off
    bloom.enabled = settings.bloom > 0;
    bloom.strength = settings.bloom;
    bloom.radius = settings.bloomRadius;
    bloom.threshold = settings.bloomThreshold;
    if (paint.smooth !== isSmooth) {
      // A render target only takes its sampling when it's made: let go of
      // this one, and the next draw makes it again
      isSmooth = paint.smooth;
      picture.samples = isSmooth ? 4 : 0;
      picture.dispose();
    }
    style.setBands(paint.bands, paint.softness);
    style.setDetail(paint.detail);
    // How large a screen pixel is a meter from the camera, so the outline
    // is the same width near and far
    const height = view.height || 1;
    const pixel = (2 * Math.tan((camera.fov / 2) * RAD)) / height;
    style.setOutline(paint.outline, pixel, layout.colors.outline);
  };

  // ── Me ───────────────────────────────────────────────────────────────────

  let activity: Activity | null = null;
  let activityOverride: Activity | null = null;
  let resting: Resting | null = null;
  let plan: Step[] = [];
  let held = 0;
  let yaw = 0;
  let walkPhase = 0;
  let stepping = 0;
  let pose: Pose = STAND;
  let status = "";

  const tell = (label: string) => {
    if (label === status) return;
    status = label;
    onStatus(label);
  };

  // Where things are, from the pieces as they stand now
  const at = (key: PieceKey, x: number, y: number, z: number) =>
    pieces[key].localToWorld(new Vector3(x, y, z));
  const turnOf = (key: PieceKey) => pieces[key].rotation.y;
  const spots = () => {
    const { width, hallway, door } = layout.room;
    const doorMiddle = (door.from + door.to) / 2;
    const side = BED_SIZE.width / 2;
    return {
      seat: at("chair", 0, 0, 0),
      seatYaw: turnOf("chair") + Math.PI,
      desk: at("chair", 0, 0, 0.32),
      bedEdge: at("bed", side + 0.02, 0, 0),
      bedYaw: turnOf("bed") + Math.PI / 2,
      bedside: at("bed", side + 0.45, 0, 0),
      walkway: at("walkway", 0, 0, 0),
      door: new Vector3(width / 2 - 0.35, 0, doorMiddle),
      outside: new Vector3(width / 2 + WALL + hallway / 2, 0, doorMiddle),
    };
  };

  const walk = (points: Vector3[]) =>
    points.map((to): Step => ({ kind: "walk", to }));

  // What to do when the day moves on to something else: out of where I am,
  // past the walkway, and to the next place
  const planFor = (goal: Activity): Step[] => {
    const s = spots();
    const steps: Step[] = [];
    if (resting === "bed") steps.push({ kind: "rise" });
    if (resting === "desk") steps.push(...walk([s.desk]));
    if (resting === "away") steps.push({ kind: "appear", at: s.outside }, ...walk([s.door]));
    steps.push(...walk([s.walkway]));

    const to = spotFor(goal);
    if (to === "away") {
      steps.push(...walk([s.door, s.outside]), { kind: "vanish" });
    } else if (to === "bed") {
      steps.push(...walk([s.bedside, s.bedEdge]), {
        kind: "hold",
        pose: SIT,
        yaw: s.bedYaw,
        seconds: 0.8,
      });
    } else {
      steps.push(...walk([s.desk, s.seat]));
    }
    steps.push({ kind: "settle", at: to });
    return steps;
  };

  const stand = (position: Vector3) => {
    figure.root.position.copy(position);
    figure.root.rotation.set(0, yaw, 0);
    figure.root.visible = true;
    figure.showBody(true);
  };

  // In bed: the head on the pillow, face up, the rest under the duvet. The
  // head is 1.575 up the figure, which lies along the bed toward its foot
  const lie = () => {
    const head = BED_SIZE.length / 2 - 0.3;
    figure.root.position.copy(at("bed", -0.38, 0.62, head + 1.575));
    figure.root.rotation.copy(new Euler(-Math.PI / 2, turnOf("bed"), 0, "YXZ"));
    figure.root.visible = true;
    figure.showBody(false);
    pose = SLEEP;
  };

  // Straight into place, without the walk: the first time, and at the end
  // of every walk
  const settle = (where: Resting) => {
    resting = where;
    plan = [];
    if (where === "bed") {
      lie();
    } else if (where === "away") {
      figure.root.visible = false;
    } else {
      const s = spots();
      yaw = s.seatYaw;
      pose = TYPE;
      stand(s.seat);
    }
  };

  const turnToward = (target: number, dt: number) => {
    const delta = Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw));
    yaw += delta * Math.min(1, dt * 8);
    figure.root.rotation.set(0, yaw, 0);
  };

  // Runs the plan on, in seconds of the room's own time. Returns whether
  // I'm walking
  const act = (dt: number): boolean => {
    const step = plan[0];
    if (!step) return false;

    switch (step.kind) {
      case "walk": {
        const position = figure.root.position;
        const dx = step.to.x - position.x;
        const dz = step.to.z - position.z;
        const left = Math.hypot(dx, dz);
        const travel = WALK_SPEED * dt;
        figure.showBody(true);
        figure.root.visible = true;
        figure.root.rotation.order = "XYZ";
        pose = STAND;
        if (left <= travel) {
          position.set(step.to.x, 0, step.to.z);
          plan.shift();
          return plan[0]?.kind === "walk";
        }
        turnToward(facing(dx, dz), dt);
        position.x += (dx / left) * travel;
        position.z += (dz / left) * travel;
        walkPhase += travel * STEPS_PER_METER * Math.PI * 2;
        return true;
      }
      case "hold":
        pose = step.pose;
        turnToward(step.yaw, dt);
        held += dt;
        if (held >= step.seconds) {
          held = 0;
          plan.shift();
        }
        return false;
      case "rise": {
        // Up on the edge of the bed, then on my feet beside it
        const s = spots();
        yaw = s.bedYaw;
        figure.root.rotation.order = "XYZ";
        stand(s.bedEdge);
        plan.shift();
        plan.unshift(
          { kind: "hold", pose: SIT, yaw, seconds: 0.8 },
          { kind: "walk", to: s.bedside },
        );
        return false;
      }
      case "appear":
        yaw = facing(-1, 0);
        stand(step.at);
        plan.shift();
        return false;
      case "vanish":
        figure.root.visible = false;
        plan.shift();
        return false;
      case "settle":
        settle(step.at);
        return false;
    }
  };

  // `hour` is the hour at home now
  const direct = (hour: number, dt: number) => {
    const goal = activityOverride ?? activityAt(hour);
    if (goal !== activity) {
      activity = goal;
      if (resting === null) settle(spotFor(goal));
      else {
        plan = planFor(goal);
        held = 0;
      }
    }

    const isWalking = act(dt);
    tell(ACTIVITY_LABELS[goal]);
    stepping += ((isWalking ? 1 : 0) - stepping) * Math.min(1, dt * 10);
    if (!isWalking) walkPhase = 0;
  };

  // ── The loop ─────────────────────────────────────────────────────────────

  let offset = 0;
  let isRunning = false;
  let lastNow = 0;
  let isDestroyed = false;
  let frameCallback: (() => void) | null = null;
  // Real time between frames, held still while the tab is hidden
  const timer = new Timer();
  // Held still while the tab is hidden, where there's a page to tell. In a
  // worker, the browser stops its frames anyway
  if (typeof document !== "undefined") timer.connect(document);

  // Drawn on the next frame whatever else is still: the pointer came onto
  // something, or left it
  let needsDraw = true;
  let lastDrawn = Number.NEGATIVE_INFINITY;
  // Whether the day is playing, see setOffset, until when, and its frames
  let isPlayingDay = false;
  let playingUntil = 0;
  let playFrames = 0;
  // Whether something under the pointer is still growing or shrinking
  let isGrowing = false;
  const isTuning = () =>
    frameCallback !== null || walkway.visible || overlay.children.length > 0;

  const loop = (time: number) => {
    // While nothing moves, frames are left out, see IDLE_EVERY. The time
    // carries over: the next frame drawn takes the whole gap
    const isIdle =
      isReady &&
      !needsDraw &&
      !capture &&
      !bake &&
      lightingKey === bakedKey &&
      !isLightEasing &&
      stillFrames >= SETTLE_FRAMES &&
      !isGrowing &&
      !isPlayingDay &&
      !isTuning();
    if (isIdle && time - lastDrawn < IDLE_EVERY) return;
    // The day playing, or done
    const isPlaying = time < playingUntil;
    if (isPlaying !== isPlayingDay) {
      isPlayingDay = isPlaying;
      playFrames = 0;
    }
    if (isPlaying && time - lastDrawn < 1000 / PLAY_FPS) return;
    if (isPlaying) playFrames += 1;
    lastDrawn = time;
    needsDraw = false;

    timer.update(time);
    const dtReal = Math.min(0.1, timer.getDelta());
    const nowMs = Date.now() + offset;
    const now = new Date(nowMs);
    // The room's own time, which runs fast while a day plays. A jump, like
    // the tuner moving the clock, isn't a walk
    const dt = lastNow ? Math.min(Math.max(0, (nowMs - lastNow) / 1000), 600) : 0;
    lastNow = nowMs;

    const hour = homeHourAt(now);
    direct(hour, dt);
    light(now, hour, dtReal, activity ?? "sleep");

    const seconds = time / 1000;
    // At rest I sit or lie still: no typing, no breathing, no stretching at
    // the desk, so there's nothing to draw between the minutes, see
    // IDLE_EVERY. I still walk, sit down and get up, which the room draws
    // in full while it happens
    const isMovingJoints = figure.update(pose, dt, {
      walk: walkPhase,
      stepping,
      breath: 0,
      strum: 0,
      seconds,
      realDt: dtReal,
      isWorking: false,
    });
    if (isMovingJoints) moved();

    // What the pointer is on grows a little, and shrinks back after. The
    // room counts as moving only while a size is changing, not while
    // something stays grown under a pointer at rest
    isGrowing = false;
    for (const group of growing) {
      const target = hovered?.group === group ? growth : 1;
      const was = group.scale.x;
      const next = was + (target - was) * Math.min(1, dtReal * HOVER_EASE);
      group.scale.setScalar(Math.abs(next - target) < 0.001 ? target : next);
      if (group.scale.x !== was) isGrowing = true;
      if (target === 1 && group.scale.x === 1) growing.delete(group);
    }
    if (isGrowing) moved();
    const outlined = highlighted ?? hovered?.group ?? null;
    outline.selectedObjects = outlined ? [outlined] : [];
    outline.enabled = outlined !== null;

    frameCallback?.();
    const isMoving = keepStill();
    finish(isMoving);
    bakeStep();
    // Until its light is baked the room is hidden, so there's nothing to
    // draw: the bake's own captures draw the shadows marked above
    if (!isReady) return;

    renderer.setRenderTarget(picture);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    // The occlusion pass draws the room's depth again: without the beams
    // in the air and the outlines, which aren't surfaces
    const beams = sunbeams.beams.visible;
    sunbeams.beams.visible = false;
    style.hideOutlines(true);
    // The first draw, still hidden, highlights something too, so the
    // highlight's own set-up is done before anyone points at anything
    if (isRevealDue) {
      outline.selectedObjects = [pieces.headphones];
      outline.enabled = true;
    }
    composer.render();
    style.hideOutlines(false);
    sunbeams.beams.visible = beams;
    // Only a drawn shade is one to keep: the frames before the room shows
    // get this far without drawing, and a kept shade that was never drawn
    // would black the picture out
    if (occlusion.enabled) isOcclusionFresh = true;
    // Drawn whole once, still hidden: now it can show
    if (isRevealDue) {
      isRevealDue = false;
      onReady?.();
    }
    // Whoever waits for the room to settle, once its light is baked as it
    // is now, the lamps are done fading and I've stopped moving
    if (settleWaiters.length > 0) {
      const isSettled = !bake && lightingKey === bakedKey && !isLightEasing && stillFrames >= SETTLE_FRAMES;
      settledFrames = isSettled ? settledFrames + 1 : 0;
      if (settledFrames >= 10) {
        const waiting = settleWaiters;
        settleWaiters = [];
        for (const settled of waiting) settled();
      }
    }
    // A picture asked for: read straight after drawing, before the browser
    // clears the canvas, and without the tuner's handles
    if (capture) {
      const { resolve, type, quality } = capture;
      capture = null;
      if ("toBlob" in canvas) canvas.toBlob(resolve, type, quality);
      else canvas.convertToBlob({ type, quality }).then(resolve, () => resolve(null));
      return;
    }
    if (overlay.children.length > 0) {
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(overlay, camera);
      renderer.autoClear = true;
    }
  };

  // A picture of the room as it is, asked for by the tuner, see `snapshot`
  let capture: { resolve: (blob: Blob | null) => void; type: string; quality?: number } | null = null;
  // Who waits for the room to settle, and for how many frames it has
  let settleWaiters: (() => void)[] = [];
  let settledFrames = 0;
  // Waited for this long at most, in ms
  const SETTLE_WITHIN = 15_000;

  // The browser can take the drawing context away and give it back later,
  // when the page has too many: everything drawn into it is gone then, and
  // is drawn again: the shadows, the bounced light and the reflections
  const onContextRestored = () => {
    // Every shadow map made anew and drawn, lamps that are off too: an
    // undrawn cube map is what Firefox refuses to draw with, see keepStill
    for (const light of shadowLights) {
      light.shadow.map?.dispose();
      light.shadow.map = null;
      light.userData.isShadowStale = true;
    }
    bake = { pass: 0, next: 0 };
    bakedKey = null;
    isOcclusionFresh = false;
    needsDraw = true;
    moved();
  };
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  const start = () => {
    if (isRunning || isDestroyed) return;
    isRunning = true;
    timer.reset();
    if (!isReady && !readyTimer) readyTimer = setTimeout(ready, READY_WITHIN);
    renderer.setAnimationLoop(loop);
  };

  const stop = () => {
    isRunning = false;
    renderer.setAnimationLoop(null);
    // The wait for the light counts only while the room is on screen
    if (readyTimer) clearTimeout(readyTimer);
    readyTimer = null;
  };

  // ── Pointing ─────────────────────────────────────────────────────────────

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let hovered: Pointed | null = null;
  let highlighted: Object3D | null = null;
  const growing = new Set<Object3D>();
  const growth = reducedMotion ? 1 : HOVER_GROWTH;

  // Whether something is drawn: it and everything it's in shows
  const isShown = (object: Object3D | null) => {
    for (let node = object; node; node = node.parent) {
      if (!node.visible || node === sunbeams.beams) return false;
    }
    return true;
  };

  // The first thing under a point that's drawn, if it opens something. Things
  // in front of it are in the way, as they would be
  const pointAt = (x: number, y: number): Pointed | null => {
    const { width, height } = view;
    if (!width || !height) return null;
    ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster
      .intersectObjects(scene.children, true)
      .find(({ object }) => isShown(object));
    const hotspot = hit?.object.userData.hotspot as Hotspot | undefined;
    const group = hit?.object.userData.hotspotGroup as Object3D | undefined;
    return hotspot && group ? { hotspot, group } : null;
  };

  const pick = (x: number, y: number) => pointAt(x, y)?.hotspot ?? null;

  // Browsers send pointer moves once a frame at most, and the room is a few
  // hundred shapes: each move looks under the pointer, so the last one is
  // always the one that counts
  const hover = (point: { x: number; y: number } | null) => {
    const next = point ? pointAt(point.x, point.y) : null;
    if (next?.group !== hovered?.group) needsDraw = true;
    hovered = next;
    if (hovered) growing.add(hovered.group);
    return hovered?.hotspot ?? null;
  };

  resize();

  // ── Tuning ───────────────────────────────────────────────────────────────

  const rebuildShell = () => {
    scene.remove(shell);
    style.forget(shell);
    shell.traverse((child) => {
      if (child instanceof Mesh) child.geometry.dispose();
    });
    shell = createShell(palette, layout.room);
    mergeStill(shell);
    style.style(shell);
    style.outline(shell);
    scene.add(shell);
    windowInfo = windowOf(layout.room);
    fitLights();
    // A grid the room's new size, baked from scratch
    scene.remove(grid);
    grid.dispose();
    grid = createGrid();
    scene.add(grid);
    bake = { pass: 0, next: 0 };
    findSmallThings();
    lightVersion += 1;
    moved();
  };

  const tuning: RoomTuning = {
    layout,
    camera,
    // The tuner is only attached to a room drawn on the page, see room.tsx
    canvas: canvas as HTMLCanvasElement,
    overlay,
    pieces,
    applyCamera: () => {
      applyCamera();
      moved();
    },
    applyColors: colorize,
    placePieces,
    rebuildShell,
    resettle: () => {
      if (resting && plan.length === 0) settle(resting);
    },
    setActivity: (next) => {
      activityOverride = next;
    },
    setTuning: (isOn) => {
      walkway.visible = isOn;
    },
    highlight: (piece) => {
      highlighted = piece;
      needsDraw = true;
    },
    relight: () => {
      lightVersion += 1;
      moved();
    },
    onFrame: (callback) => {
      frameCallback = callback;
    },
    snapshot: (width, type, quality) =>
      new Promise((resolve) => {
        // Drawn once this wide, clean: no walkway, no highlight, no handles
        const wasHighlighted = highlighted;
        const wasHovered = hovered;
        highlighted = null;
        hovered = null;
        walkway.visible = false;
        resize(width / (view.width || 1));
        capture = {
          type: type ?? "image/png",
          quality,
          resolve: (blob) => {
            highlighted = wasHighlighted;
            hovered = wasHovered;
            walkway.visible = true;
            resize();
            resolve(blob);
          },
        };
        start();
      }),
    whenSettled: () =>
      new Promise((resolve) => {
        settledFrames = 0;
        const settled = () => {
          clearTimeout(giveUp);
          resolve();
        };
        const giveUp = setTimeout(() => {
          settleWaiters = settleWaiters.filter((waiting) => waiting !== settled);
          resolve();
        }, SETTLE_WITHIN);
        settleWaiters.push(settled);
        start();
      }),
  };

  // Every material's shader compiled before the first draw, one at a time:
  // each is drawn once, small, which waits for it to be done, then the
  // next. All at once, in Firefox, they'd fill the one line every canvas on
  // the page waits in for seconds, and another canvas needing an answer,
  // like the light table's loupe sending up its picture, would hold the
  // page up until they're through. One at a time, it waits for one at most.
  // Drawn as the picture the room is drawn into, which is what they're
  // drawn with
  await breathe();
  const warmTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
  const shown: Mesh[] = [];
  scene.traverse((child) => {
    if (child instanceof Mesh && child.visible) shown.push(child);
  });
  const byMaterial = new Map<unknown, Mesh[]>();
  for (const mesh of shown) {
    const group = byMaterial.get(mesh.material);
    if (group) group.push(mesh);
    else byMaterial.set(mesh.material, [mesh]);
  }
  const culled = shown.map((mesh) => mesh.frustumCulled);
  // Every shadow map made in the first of these draws, the lamps' too, and
  // their shaders with them: Firefox refuses to draw with a shadow map
  // that isn't there. They're drawn properly once the room is, see keepStill
  for (const light of shadowLights) light.shadow.needsUpdate = true;
  for (const mesh of shown) {
    mesh.visible = false;
    // Out of the camera's view too: every shader, not just what it sees
    mesh.frustumCulled = false;
  }
  try {
    for (const group of byMaterial.values()) {
      if (isDestroyed) break;
      const compiled = renderer.info.programs?.length ?? 0;
      for (const mesh of group) mesh.visible = true;
      renderer.setRenderTarget(warmTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      for (const mesh of group) mesh.visible = false;
      // A new shader was made: the next waits for the line to clear
      if ((renderer.info.programs?.length ?? 0) > compiled) await breathe();
    }
  } finally {
    shown.forEach((mesh, index) => {
      mesh.visible = true;
      mesh.frustumCulled = culled[index];
    });
    renderer.setRenderTarget(null);
    warmTarget.dispose();
  }

  return {
    resize: (next) => {
      view = next;
      resize();
    },
    setVisible: (shown) => {
      if (shown) start();
      else stop();
    },
    setOffset: (ms) => {
      if (ms !== offset) playingUntil = performance.now() + PLAY_LINGERS;
      // A played day: the sun and the shadows move every frame
      if (ms !== offset) moved();
      offset = ms;
    },
    pick,
    hover,
    tuning,
    destroy: () => {
      isDestroyed = true;
      palette.isDisposed = true;
      palette.stopPainting();
      if (readyTimer) clearTimeout(readyTimer);
      // Whoever waits on the room hears it's gone
      capture?.resolve(null);
      capture = null;
      for (const settled of settleWaiters) settled();
      settleWaiters = [];
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      stop();
      const disposed = new Set<object>();
      scene.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (disposed.has(material)) continue;
          disposed.add(material);
          for (const key of ["map", "bumpMap", "emissiveMap"] as const) {
            const map = (material as unknown as Record<string, unknown>)[key];
            if (map instanceof Texture) map.dispose();
          }
          material.dispose();
        }
      });
      for (const texture of palette.textures) texture.dispose();
      style.dispose();
      grid.dispose();
      environment?.dispose();
      pmrem.dispose();
      timer.dispose();
      picture.dispose();
      // The composer only lets go of its own two buffers: each pass has its
      // own, and each light its shadow map
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
      for (const light of shadowLights) light.shadow.dispose();
      renderer.dispose();
      // The page draws with several canvases, and a browser allows only so
      // many at once: this one's is given back right away, not when the
      // browser gets round to it
      renderer.forceContextLoss();
    },
  };
};
