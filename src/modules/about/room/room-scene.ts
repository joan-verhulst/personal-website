
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
import { createProfiler, type PerfReport } from "~/modules/about/room/profiler";
import { type Activity, ACTIVITY_LABELS, activityAt, homeHourAt } from "~/modules/about/room/schedule";
import { createStyle } from "~/modules/about/room/toon";
import { sunTransmittance } from "~/modules/core/utils/sky-light";
import { sunAt } from "~/modules/core/utils/sun";

const { home } = siteData.owner;
const RAD = Math.PI / 180;

const NEAR = 0.05;
const FAR = 30;

const PIXEL_BUDGET = 2_200_000;
const MAX_PIXEL_RATIO = 1.5;

const PENDANT_FROM = 18;
const PENDANT_UNTIL = 22;

const WALK_SPEED = 1.1;
const STEPS_PER_METER = 1.7;

export interface RoomView {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface RoomCallbacks {
  onStatus: (label: string) => void;
  onProgress?: (share: number) => void;
  onReady?: () => void;
  onPerf?: (report: PerfReport) => void;
}

const PAINTED_SHARE = 0.4;

export interface RoomTuning {
  layout: RoomLayout;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  overlay: Scene;
  pieces: Record<PieceKey, Group>;
  applyCamera: () => void;
  applyColors: () => void;
  placePieces: () => void;
  rebuildShell: () => void;
  resettle: () => void;
  setActivity: (activity: Activity | null) => void;
  setTuning: (isOn: boolean) => void;
  highlight: (piece: Group | null) => void;
  relight: () => void;
  snapshot: (width: number, type?: string, quality?: number) => Promise<Blob | null>;
  whenSettled: () => Promise<void>;
  onFrame: (callback: (() => void) | null) => void;
}

export interface Room {
  resize: (view: RoomView) => void;
  setVisible: (isShown: boolean) => void;
  setOffset: (ms: number) => void;
  pick: (x: number, y: number) => Hotspot | null;
  hover: (point: { x: number; y: number } | null) => Hotspot | null;
  tuning: RoomTuning;
  destroy: () => void;
}

type Resting = "desk" | "bed" | "away";

const facing = (dx: number, dz: number) => Math.atan2(dx, dz);

const spotFor = (activity: Activity): Resting =>
  activity === "sleep" ? "bed" : activity === "away" ? "away" : "desk";

const framesOf = (palette: Palette, pictures: string[]) => {
  const frames = {} as Record<keyof typeof FRAMES, Group>;
  for (const [key, { width, height, style, picture }] of Object.entries(FRAMES)) {
    const url = pictures.length > 0 ? pictures[picture % pictures.length] : undefined;
    frames[key as keyof typeof FRAMES] = createFrame(palette, width, height, style, url);
  }
  return frames;
};

interface Pointed {
  hotspot: Hotspot;
  group: Object3D;
}

const HOVER_GROWTH = 1.06;
const HOVER_EASE = 14;

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

const SETTLE_FRAMES = 4;
const IDLE_EVERY = 60_000;
const MAX_FPS = 30;
const FRAME_SLACK = 1;
const PLAY_SHADOWS_EVERY = 3;
const PLAY_LINGERS = 250;

const TONE_MAPPINGS: Record<RoomLayout["light"]["toneMapping"], ToneMapping> = {
  aces: ACESFilmicToneMapping,
  agx: AgXToneMapping,
  neutral: NeutralToneMapping,
};

type Step =
  | { kind: "walk"; to: Vector3 }
  | { kind: "hold"; pose: Pose; yaw: number; seconds: number }
  | { kind: "rise" }
  | { kind: "appear"; at: Vector3 }
  | { kind: "vanish" }
  | { kind: "settle"; at: Resting };

const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export const createRoom = async (
  canvas: HTMLCanvasElement | OffscreenCanvas,
  {
    onStatus,
    onProgress,
    onReady,
    onPerf,
    layout,
    pictures,
    sleeve,
    painting,
    reducedMotion = false,
  }: RoomCallbacks & {
    layout: RoomLayout;
    pictures: string[];
    sleeve?: string;
    painting?: Painting;
    reducedMotion?: boolean;
  },
): Promise<Room> => {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.debug.checkShaderErrors = process.env.NODE_ENV === "development";
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  const profiler = onPerf ? createProfiler(renderer, onPerf) : null;
  RectAreaLightUniformsLib.init();

  const scene = new Scene();
  scene.background = new Color("#0a0a0a");
  const overlay = new Scene();
  const camera = new PerspectiveCamera(layout.camera.fov, 2, NEAR, FAR);

  let isReady = false;
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
      if (key !== "walkway") pieces[key].visible = !hidden;
      pieces[key].updateMatrixWorld(true);
    }
  };
  placePieces();

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

  duvet.userData.keepApart = true;
  await breathe();
  const mergeStill = createMerger(tintedBy(palette));
  for (const key of PIECE_KEYS) mergeStill(pieces[key]);
  mergeStill(shell);
  const watchParts = () =>
    profiler?.watch(scene, { ...pieces, shell, figure: figure.root, sunbeams: sunbeams.beams });
  watchParts();
  await breathe();

  const style = createStyle();
  style.style(scene);
  style.outline(scene);
  await breathe();

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  scene.traverse((child) => {
    if (!(child instanceof Mesh) || !(child.material instanceof MeshStandardMaterial)) return;
    for (const map of [child.material.map, child.material.bumpMap]) {
      if (map) map.anisotropy = anisotropy;
    }
  });

  let windowInfo = windowOf(layout.room);

  const sun = new DirectionalLight("#ffffff", 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  const roomCenter = new Vector3(0, 1, 0);
  sun.target.position.copy(roomCenter);
  scene.add(sun, sun.target);

  const sky = new SpotLight("#dfe7f2", 0, 0, 1.1, 1, 2);
  sky.castShadow = true;
  sky.shadow.mapSize.set(1024, 1024);
  sky.shadow.camera.near = 0.1;
  sky.shadow.camera.far = 20;
  sky.shadow.bias = -0.0005;
  sky.shadow.normalBias = 0.03;
  sky.shadow.radius = 8;
  scene.add(sky, sky.target);

  const bounce = new PointLight("#ffcf9a", 0, 7, 2);
  scene.add(bounce);

  const ambience = new HemisphereLight("#e3e8f0", "#9a6b45", 0);
  const fill = new AmbientLight("#ffe6c8", 0);
  scene.add(ambience, fill);

  const shadowLights = [sun, sky, lampLight, ...deskLamps];
  for (const light of shadowLights) light.shadow.autoUpdate = false;

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

  let lampOn = 0;
  let deskOn = 0;
  let screenOn = 0;
  let isLightEasing = false;

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

  const light = (now: Date, hour: number, dt: number, activity: Activity) => {
    const settings = layout.light;
    const { elevation, azimuth } = sunAt(now, home);
    const up = MathUtils.smoothstep(elevation, -2, 4);
    const faces = layout.room.nearWallFaces;

    let sunshine = 0;
    if (up > 0) {
      const flat = Math.cos(elevation * RAD);
      toSun.set(
        flat * Math.cos((azimuth - (faces - 90)) * RAD),
        Math.sin(elevation * RAD),
        flat * Math.cos((azimuth - faces) * RAD),
      );
      const through = sunTransmittance(0, elevation);
      const brightest = Math.max(through[0], through[1], through[2], 0.001);
      sunColor.setRGB(through[0] / brightest, through[1] / brightest, through[2] / brightest);
      sunshine = up * (0.35 + 0.65 * brightest);
      sun.color.copy(sunColor);
      sun.intensity = settings.sun * sunshine;
    } else {
      toSun.copy(windowInfo.outward).multiplyScalar(0.9).setY(0.42).normalize();
      sun.color.copy(MOON);
      sun.intensity = 0.04 * settings.sun;
    }
    sun.position.copy(roomCenter).addScaledVector(toSun, 16);

    const inside = MathUtils.smoothstep(toSun.dot(windowInfo.outward), 0.05, 0.3) * sunshine;
    sunbeams.update(toSun, settings.beams * inside, windowInfo.panes);
    const away = toSun.clone().negate();
    const lands = landingOf(windowInfo.center, away);
    if (lands) bounce.position.copy(lands).addScaledVector(toSun, 0.5);
    bounce.color.copy(sunColor).lerp(BOUNCE_TINT, 0.5);
    bounce.intensity = settings.bounce * inside;

    const dayness = MathUtils.smoothstep(elevation, -7, 8);
    const noon = MathUtils.smoothstep(elevation, 0, 14);
    dayColor.copy(DUSK_SKY).lerp(DAY_SKY, noon);
    skyColor.copy(NIGHT_SKY).lerp(dayColor, dayness);
    sky.color.copy(skyColor);
    sky.intensity = settings.window * (0.06 + 0.94 * dayness);
    ambience.color.copy(skyColor);
    ambience.intensity = settings.sky * (0.25 + 0.75 * dayness);
    fill.intensity = settings.ambient;

    const isWorking = activity === "work";
    const isEvening = hour >= PENDANT_FROM && hour < PENDANT_UNTIL;
    const ease = isReady ? 1 - Math.exp(-dt * 3) : 1;
    const lampTo = isEvening || (elevation < 3 && isWorking) ? 1 : 0;
    const deskTo = elevation < 6 && activity !== "sleep" ? 1 : 0;
    const screenTo = isWorking ? 1 : 0;
    const approach = (from: number, to: number) => {
      const next = from + (to - from) * ease;
      return Math.abs(to - next) < 0.01 ? to : next;
    };
    lampOn = approach(lampOn, lampTo);
    deskOn = approach(deskOn, deskTo);
    screenOn = approach(screenOn, screenTo);
    isLightEasing = lampOn !== lampTo || deskOn !== deskTo || screenOn !== screenTo;
    lampLight.intensity = settings.lamp * lampOn;
    bulbMaterial.emissiveIntensity = 4 * lampOn;
    for (const deskLamp of deskLamps) deskLamp.intensity = settings.deskLamps * deskOn;
    shadeMaterial.emissiveIntensity = 0.5 * deskOn * Math.min(1, settings.deskLamps);
    ledLight.intensity = settings.ledStrip * deskOn;
    ledMaterial.emissiveIntensity = 2 * deskOn * Math.min(1, settings.ledStrip / 10);
    screenMaterial.emissiveIntensity = 0.6 * settings.screens * screenOn;

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

  const PROBE_SPACING = 0.9;
  const PROBES_PER_FRAME = 4;
  const HIDDEN_PROBES_PER_FRAME = 10;
  const PROBES_FROM = 0.75;
  const PROBE_LAYERS = 2;

  const createGrid = () => {
    const { width, depth, height } = layout.room;
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
    profiler?.wrap(made, "bake", "light bake");
    return made;
  };
  let grid = createGrid();
  if (layout.light.gi > 0) scene.add(grid);

  const smallThings: Object3D[] = [];
  const findSmallThings = () => {
    smallThings.length = 0;
    scene.updateMatrixWorld(true);
    const scale = new Vector3();
    scene.traverse((child) => {
      if (!(child instanceof Mesh) || child.userData.isOutline) return;
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
      if (isReady) for (const light of dueShadows) light.shadow.needsUpdate = true;
      dueShadows.length = 0;
    }
  };

  const pmrem = new PMREMGenerator(renderer);
  profiler?.wrap(pmrem, "fromScene", "reflections");
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
  // Empty at first, so materials are built with a reflection and not rebuilt later
  captureEnvironment(new Scene());
  await breathe();

  let bake: { pass: number; next: number } | null = { pass: 0, next: 0 };
  let bakedKey: string | null = null;
  let isBaked = false;
  let isPainted = false;
  let isRevealDue = false;

  const READY_WITHIN = 5000;
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  const ready = () => {
    if (readyTimer) clearTimeout(readyTimer);
    readyTimer = null;
    if (isReady) return;
    isReady = true;
    for (const light of shadowLights) light.userData.isShadowStale = true;
    isOcclusionFresh = false;
    isRevealDue = true;
  };
  const readyOnceDone = () => {
    if (isBaked && isPainted) ready();
  };
  palette.painted.then(() => {
    isPainted = true;
    if (isBaked && !isDestroyed) captureEnvironment();
    readyOnceDone();
  });

  const CAPTURE_EVERY = 1500;
  let lastCapture = Number.NEGATIVE_INFINITY;

  const bakeStep = () => {
    if (layout.light.gi <= 0) {
      if (grid.parent) scene.remove(grid);
      bake = null;
      if (lightingKey === bakedKey || isPlayingDay) return;
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

  const picture = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    samples: layout.paint.smooth ? 4 : 0,
  });
  let isSmooth = layout.paint.smooth;
  const composer = new EffectComposer(renderer);
  composer.addPass(new TexturePass(picture.texture));
  const occlusion = new GTAOPass(scene, camera, 1, 1);
  occlusion.updateGtaoMaterial({
    radius: 0.35,
    thickness: 1,
    scale: 1,
    samples: 16,
    screenSpaceRadius: false,
  });
  composer.addPass(occlusion);
  const keptOcclusion = new ShaderPass(KEPT_OCCLUSION);
  keptOcclusion.uniforms.tOcclusion.value = occlusion.gtaoMap;
  keptOcclusion.enabled = false;
  composer.addPass(keptOcclusion);
  let isOcclusionFresh = false;
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.2, 0.6, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const outline = new OutlinePass(new Vector2(1, 1), scene, camera);
  outline.edgeStrength = 4;
  outline.edgeGlow = 0;
  outline.edgeThickness = 1;
  outline.pulsePeriod = 0;
  outline.visibleEdgeColor.set("#fff6e4");
  outline.hiddenEdgeColor.set("#000000");
  outline.enabled = false;
  composer.addPass(outline);
  if (profiler) {
    const names = ["copy", "contact shade", "kept shade", "glow", "tone mapping", "outline"];
    for (const [index, pass] of composer.passes.entries()) {
      profiler.wrap(pass, "render", names[index] ?? `pass ${index}`);
    }
  }
  let pixelRatio = 1;
  let pixels = { x: 1, y: 1 };
  let shadeScale = 1;
  const sizeShade = () =>
    occlusion.setSize(Math.round(pixels.x * shadeScale), Math.round(pixels.y * shadeScale));

  const applyCamera = () => {
    camera.position.fromArray(layout.camera.position);
    camera.fov = layout.camera.fov;
    camera.lookAt(new Vector3().fromArray(layout.camera.target));
    camera.updateProjectionMatrix();
  };
  applyCamera();

  let view: RoomView = { width: 0, height: 0, devicePixelRatio: 1 };
  let isPlayResolution = false;
  const resize = (ratio?: number) => {
    const { width, height } = view;
    if (width === 0 || height === 0) return;
    const fit = Math.min(
      view.devicePixelRatio || 1,
      MAX_PIXEL_RATIO,
      Math.sqrt(PIXEL_BUDGET / (width * height)),
    );
    pixelRatio = ratio ?? fit * (isPlayResolution ? layout.quality.playResolution : 1);
    const pixelsX = Math.round(width * pixelRatio);
    const pixelsY = Math.round(height * pixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    picture.setSize(pixelsX, pixelsY);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    pixels = { x: pixelsX, y: pixelsY };
    if (shadeScale !== 1) sizeShade();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    isOcclusionFresh = false;
    needsDraw = true;
  };

  let stillFrames = 0;
  let figureKey = "";
  const moved = () => {
    stillFrames = 0;
  };
  const sunAtShadow = new Vector3();

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

    const hasSunMoved = sun.position.distanceToSquared(sunAtShadow) > 1e-4;
    for (const light of shadowLights) {
      const isDue = light === sun || !isPlayingDay || playFrames % PLAY_SHADOWS_EVERY === 0;
      if ((isMoving && isDue) || (light === sun && hasSunMoved)) {
        light.userData.isShadowStale = true;
      }
      // An off light still needs a drawn shadow map: Firefox refuses draws
      // that sample an unbound cube depth map
      const isNeeded = light.intensity > 0 || light.shadow.map === null;
      if (isNeeded && light.userData.isShadowStale !== false) {
        light.shadow.needsUpdate = true;
        light.userData.isShadowStale = false;
        if (light === sun) sunAtShadow.copy(sun.position);
      }
    }
    return isMoving;
  };

  const lampLights = [lampLight, ...deskLamps];
  const isMe = (object: Object3D) => {
    for (let node: Object3D | null = object; node; node = node.parent) {
      if (node === figure.root) return true;
    }
    return false;
  };
  const drawShadows = renderer.shadowMap.render;
  const leftOut: Object3D[] = [];
  renderer.shadowMap.render = function (lights, of, viewer) {
    const lamps = lampLights.filter((lamp) => lights.includes(lamp) && lamp.shadow.needsUpdate);
    if (lamps.length > 0) {
      for (const thing of smallThings) {
        if (thing.castShadow && !isMe(thing)) {
          thing.castShadow = false;
          leftOut.push(thing);
        }
      }
      try {
        drawShadows.call(this, lamps, of, viewer);
      } finally {
        for (const thing of leftOut) thing.castShadow = true;
        leftOut.length = 0;
      }
    }
    drawShadows.call(this, lights, of, viewer);
  };

  const finish = (isMoving: boolean) => {
    const { paint, light: settings } = layout;
    renderer.toneMapping = TONE_MAPPINGS[settings.toneMapping] ?? ACESFilmicToneMapping;
    renderer.toneMappingExposure = settings.exposure;
    const hasOcclusion = settings.ao > 0;
    const scale = isMoving && !isPlayingDay ? layout.quality.movingShade : 1;
    if (scale !== shadeScale) {
      shadeScale = scale;
      sizeShade();
      isOcclusionFresh = false;
    }
    occlusion.enabled = hasOcclusion && (!isOcclusionFresh || (isMoving && !isPlayingDay));
    keptOcclusion.enabled = hasOcclusion && !occlusion.enabled;
    occlusion.blendIntensity = settings.ao;
    keptOcclusion.uniforms.uIntensity.value = settings.ao;
    style.setBounce(settings.gi);
    scene.environmentIntensity = settings.reflections;
    bloom.enabled = settings.bloom > 0;
    bloom.strength = settings.bloom;
    bloom.radius = settings.bloomRadius;
    bloom.threshold = settings.bloomThreshold;
    if (paint.smooth !== isSmooth) {
      isSmooth = paint.smooth;
      picture.samples = isSmooth ? 4 : 0;
      picture.dispose();
    }
    style.setBands(paint.bands, paint.softness);
    style.setDetail(paint.detail);
    const height = view.height || 1;
    const pixel = (2 * Math.tan((camera.fov / 2) * RAD)) / height;
    style.setOutline(paint.outline, pixel, layout.colors.outline);
  };

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

  const lie = () => {
    const head = BED_SIZE.length / 2 - 0.3;
    figure.root.position.copy(at("bed", -0.38, 0.62, head + 1.575));
    figure.root.rotation.copy(new Euler(-Math.PI / 2, turnOf("bed"), 0, "YXZ"));
    figure.root.visible = true;
    figure.showBody(false);
    pose = SLEEP;
  };

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

  let offset = 0;
  let isRunning = false;
  let lastNow = 0;
  let isDestroyed = false;
  let frameCallback: (() => void) | null = null;
  const timer = new Timer();
  if (typeof document !== "undefined") timer.connect(document);

  let needsDraw = true;
  let lastDrawn = Number.NEGATIVE_INFINITY;
  let isPlayingDay = false;
  let playingUntil = 0;
  let playFrames = 0;
  let isGrowing = false;
  const isTuning = () =>
    frameCallback !== null || walkway.visible || overlay.children.length > 0;

  const drawFrame = (time: number) => {
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
    if (time - lastDrawn < 1000 / MAX_FPS - FRAME_SLACK) return;
    const isPlaying = time < playingUntil;
    if (isPlaying !== isPlayingDay) {
      isPlayingDay = isPlaying;
      playFrames = 0;
      isPlayResolution = isPlaying;
      resize();
    }
    if (isPlaying) playFrames += 1;
    lastDrawn = time;
    needsDraw = false;

    timer.update(time);
    const dtReal = Math.min(0.1, timer.getDelta());
    const nowMs = Date.now() + offset;
    const now = new Date(nowMs);
    const dt = lastNow ? Math.min(Math.max(0, (nowMs - lastNow) / 1000), 600) : 0;
    lastNow = nowMs;

    const hour = homeHourAt(now);
    direct(hour, dt);
    light(now, hour, dtReal, activity ?? "sleep");

    const seconds = time / 1000;
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
    if (!isReady) return;

    renderer.setRenderTarget(picture);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    const beams = sunbeams.beams.visible;
    sunbeams.beams.visible = false;
    style.hideOutlines(true);
    if (isRevealDue) {
      outline.selectedObjects = [pieces.headphones];
      outline.enabled = true;
    }
    composer.render();
    style.hideOutlines(false);
    sunbeams.beams.visible = beams;
    if (occlusion.enabled) isOcclusionFresh = true;
    if (isRevealDue) {
      isRevealDue = false;
      onReady?.();
    }
    if (settleWaiters.length > 0) {
      const isSettled = !bake && lightingKey === bakedKey && !isLightEasing && stillFrames >= SETTLE_FRAMES;
      settledFrames = isSettled ? settledFrames + 1 : 0;
      if (settledFrames >= 10) {
        const waiting = settleWaiters;
        settleWaiters = [];
        for (const settled of waiting) settled();
      }
    }
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

  const stateOf = () => {
    if (!isReady) return "building";
    if (bake) return "baking light";
    if (isPlayingDay) return "playing the day";
    if (hovered || isGrowing) return "pointing";
    if (stillFrames <= SETTLE_FRAMES) return "moving";
    return "resting";
  };
  const loop = profiler ? (time: number) => profiler.frame(() => drawFrame(time), stateOf) : drawFrame;

  let capture: { resolve: (blob: Blob | null) => void; type: string; quality?: number } | null = null;
  let settleWaiters: (() => void)[] = [];
  let settledFrames = 0;
  const SETTLE_WITHIN = 15_000;

  const onContextRestored = () => {
    // Off lamps too: Firefox refuses to draw with an undrawn cube map, see keepStill
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
    if (readyTimer) clearTimeout(readyTimer);
    readyTimer = null;
  };

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let hovered: Pointed | null = null;
  let highlighted: Object3D | null = null;
  const growing = new Set<Object3D>();
  const growth = reducedMotion ? 1 : HOVER_GROWTH;

  const isShown = (object: Object3D | null) => {
    for (let node = object; node; node = node.parent) {
      if (!node.visible || node === sunbeams.beams) return false;
    }
    return true;
  };

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

  const hover = (point: { x: number; y: number } | null) => {
    const next = point ? pointAt(point.x, point.y) : null;
    if (next?.group !== hovered?.group) needsDraw = true;
    hovered = next;
    if (hovered) growing.add(hovered.group);
    return hovered?.hotspot ?? null;
  };

  resize();

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
    watchParts();
    windowInfo = windowOf(layout.room);
    fitLights();
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

  // Compiled one at a time: all at once, Firefox fills the queue every canvas
  // waits in for seconds, holding up e.g. the loupe's picture
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
  // Shadow maps incl. off lamps are made here: Firefox refuses to draw without,
  // see keepStill
  for (const light of shadowLights) light.shadow.needsUpdate = true;
  for (const mesh of shown) {
    mesh.visible = false;
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
      profiler?.dispose();
      timer.dispose();
      picture.dispose();
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
      for (const light of shadowLights) light.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};
