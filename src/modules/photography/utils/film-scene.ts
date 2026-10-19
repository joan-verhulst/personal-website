// Film hanging to dry, as decoration on the about page: a roll of negatives
// cut into strips, see film-strip.ts, each held in a steel clip hooked over
// a short chrome rail, which a bracket on its left holds off the page as if
// it were the wall, where they cast their shadows. They sway in the air,
// and swing and twist where the pointer brushes past or pokes them. Drawn
// with three.js, in centimetres, at a set size, in the canvas's top right
// corner.

import {
  type BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  ShadowMaterial,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  VSMShadowMap,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  drawStrip,
  FILM_WIDTH,
  sizeStrip,
  stripLength,
} from "~/modules/photography/utils/film-strip";

// The film is measured in millimetres, the scene in centimetres
const MM = 0.1;

// The strips, left to right: the roll cut into lengths, where each hangs
// along the rail, and how far behind it or in front its clip hangs, so
// they lie over each other without touching
export const STRIPS = [
  { frames: 8, x: 0, depth: -0.9 },
  { frames: 6, x: 1.4, depth: 0.9 },
];

const FILM_HALF = (FILM_WIDTH * MM) / 2;

// The rail runs along x through the origin, from its bracket on the left,
// past the first strip by this much, to past the last by this much, where
// it ends round. The bracket: an arm back to the wall, and a round plate
// screwed to it
const RAIL_RADIUS = 0.42;
const RAIL_FROM = 1.2;
const RAIL_TO = 0.3;
const ARM_RADIUS = 0.3;
const ROSE_RADIUS = 0.95;
const ROSE_DEPTH = 0.3;

// Below the rail: the clip's hinge, the bottom of its jaws, and the film's
// top edge, held between them. The hook's top is the highest of the film
const HINGE_Y = -1.5;
const JAW_BOTTOM = -2.95;
const FILM_TOP = -2.1;
const GRIP = FILM_TOP - JAW_BOTTOM;
const HOOK_TOP = 0.6;

// The page, as the wall, behind the rail: close, so the shadows stay near
const WALL = 4.5;

// CSS pixels to a centimetre, at the rail: a strip is about 56 wide
export const SCALE = 16;

// Room in the canvas, in CSS pixels: above the rail, and right of its end,
// and for the shadows, which fall down and to the left
const ROOM = { top: 24, right: 4 };

const FOV = 20;
const MAX_PIXEL_RATIO = 2;

// The light: soft, from the front, above and to the right, so the shadows
// fall away from the text, and the sky around. The film also shines a
// little of its own, as if lit through from behind. Matte film and brushed
// steel, so not much of the room shows in them
const SUN = 1;
const SUN_FROM = new Vector3(8, 20, 40);
const SKY = 0.6;
const GLOW = 0.28;
const FILM = { roughness: 0.6, reflections: 0.1 };
const METAL = { roughness: 0.48, reflections: 0.55 };
// The shadows: how dark at most, and how far they're blurred, in shadow
// map texels
const SHADOW = 0.08;
const SHADOW_BLUR = 10;

// How the film moves, in radians and seconds: its swing on the hook, front
// to back and sideways, and its twist below the clip, each a spring with
// its own speed and damping, and limits. Not far front to back or turned,
// or the strips would touch each other or the wall
const SWING = { speed: 5.5, damping: 0.05, limit: 0.025 };
const SWAY = { speed: 5.8, damping: 0.08, limit: 0.06 };
const TWIST = { speed: 2.6, damping: 0.04, limit: 0.3 };
// Moved along this far behind its swing at the bottom, per radian a second
const LAG = 0.015;
// Its shape at rest: a slow curve down its length, and cupped across
const BOW = 0.012;
const CURL = 0.1;
// How much it twists at rest, at most, either way
const REST_TWIST = 0.2;
// The air in the room, pushing at each
const AIR = { swing: 0.25, sway: 0.2, twist: 0.4 };
// Brushed past: how fast it takes on the pointer's speed, how much that
// twists and pushes it, the fastest that counts, in cm/s, and how far
// beside its edge it's touched
const FOLLOW = 7;
const TWIST_PUSH = 0.15;
const SWING_PUSH = 0.02;
const MAX_BRUSH = 150;
const BRUSH_REACH = 0.4;
// Poked: pushed back on its hook, and turned a little
const POKE = { swing: 0.2, twist: 0.2 };
// Hung up: pushed this much, one after another
const HANG = { swing: 0.12, sway: 0.12, twist: 0.3, after: 0.09 };
// Simulated in steps no longer than this
const STEP = 1 / 120;
const MAX_DT = 1 / 20;

const STEEL = "#cdd1d5";
const CHROME = "#e6e8ea";

export interface Film {
  // Fits it to the canvas's box
  resize: () => void;
  // Drawn while shown
  setVisible: (isShown: boolean) => void;
  // Off, it hangs still
  setMotion: (hasMotion: boolean) => void;
  // Swung, one strip after another, as if just hung up
  hang: () => void;
  // The pointer over the canvas, in CSS pixels, or null when it left: the
  // strips it passes swing along a little
  point: (at: { x: number; y: number } | null) => void;
  // A click or a tap there: the strip swings back
  poke: (x: number, y: number) => void;
  destroy: () => void;
}

interface Spring {
  speed: number;
  damping: number;
  limit: number;
}

interface Strip {
  pivot: Group;
  mesh: Mesh<BufferGeometry, MeshStandardMaterial>;
  // The flat strip's vertices, x and y in turn
  rest: Float32Array;
  // In centimetres
  length: number;
  frames: number;
  // Its first frame's place on the roll
  first: number;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: CanvasTexture;
  photos: (HTMLImageElement | null)[];
  // Front to back, sideways and twisted, and how fast each is changing
  swing: number;
  swingSpeed: number;
  sway: number;
  swaySpeed: number;
  twist: number;
  twistSpeed: number;
  restTwist: number;
  // Which way brushing past twists it
  hand: number;
  // Where it is in the air's push
  phases: number[];
  // Waiting to be swung, as it's hung up
  kick: { at: number; swing: number; sway: number; twist: number } | null;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

// One spring's step, toward rest: semi-implicit, so it keeps its energy
const spring = (
  value: number,
  speed: number,
  { speed: rate, damping, limit }: Spring,
  push: number,
  dt: number,
) => {
  const next =
    speed +
    (-rate * rate * Math.sin(value) - 2 * damping * rate * speed + push) * dt;
  return [MathUtils.clamp(value + next * dt, -limit, limit), next] as const;
};

// ── The clip ──────────────────────────────────────────────────────────────────

// A stainless film clip, around its hook's pivot on the rail, hanging this
// far in front of it, or behind: two jaws that pinch the film, hinged on a
// pin with a spring coiled round it, a lever above each, and a wire hook
// over the rail. One geometry
const createClipGeometry = (depth: number) => {
  const parts: BufferGeometry[] = [];
  const sheet = {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 8,
  };

  // The jaw, as wide as the film and a little more, below the hinge
  const jawHalf = 1.95;
  const jawBottom = JAW_BOTTOM - HINGE_Y;
  const corner = 0.22;
  const jaw = new Shape();
  jaw.moveTo(-jawHalf + corner, jawBottom);
  jaw.lineTo(jawHalf - corner, jawBottom);
  jaw.quadraticCurveTo(jawHalf, jawBottom, jawHalf, jawBottom + corner);
  jaw.lineTo(jawHalf, 0);
  jaw.lineTo(-jawHalf, 0);
  jaw.lineTo(-jawHalf, jawBottom + corner);
  jaw.quadraticCurveTo(-jawHalf, jawBottom, -jawHalf + corner, jawBottom);

  // The lever, narrower, above it, rounded at the top
  const leverHalf = 1.05;
  const leverTop = 0.75;
  const round = 0.32;
  const lever = new Shape();
  lever.moveTo(-leverHalf, 0);
  lever.lineTo(leverHalf, 0);
  lever.lineTo(leverHalf, leverTop - round);
  lever.quadraticCurveTo(leverHalf, leverTop, leverHalf - round, leverTop);
  lever.lineTo(-leverHalf + round, leverTop);
  lever.quadraticCurveTo(-leverHalf, leverTop, -leverHalf, leverTop - round);
  lever.lineTo(-leverHalf, 0);

  // Either side of the pin: the jaws close on the film below, the levers
  // open above. Extruded, they're already unindexed, as the merge needs
  const atHinge = 0.13;
  const jawTilt = Math.asin((atHinge - 0.03) / -jawBottom);
  const leverTilt = 0.4;
  for (const side of [1, -1]) {
    for (const [shape, tilt] of [
      [jaw, jawTilt],
      [lever, leverTilt],
    ] as const) {
      const plate = new ExtrudeGeometry(shape, sheet);
      plate.translate(0, 0, -sheet.depth / 2);
      plate.rotateX(side * tilt);
      plate.translate(0, HINGE_Y, side * atHinge);
      parts.push(plate);
    }
  }

  // The pin, with the plates' rolled edges round it
  const pin = new CylinderGeometry(0.1, 0.1, jawHalf * 2, 16);
  pin.rotateZ(Math.PI / 2);
  pin.translate(0, HINGE_Y, 0);
  parts.push(pin.toNonIndexed());

  // The spring, coiled round the pin in the middle
  const coil: Vector3[] = [];
  const turns = 6;
  for (let i = 0; i <= turns * 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    coil.push(
      new Vector3(
        -0.6 + (1.2 * i) / (turns * 24),
        HINGE_Y + Math.sin(angle) * 0.17,
        Math.cos(angle) * 0.17,
      ),
    );
  }
  parts.push(
    new TubeGeometry(new CatmullRomCurve3(coil), turns * 24, 0.035, 6).toNonIndexed(),
  );

  // All of that hangs in front of the rail, or behind it
  for (const part of parts) part.translate(0, 0, depth);

  // The hook: up from the pin between the levers, round the rail on the
  // clip's side, over it and down the other
  const side = depth < 0 ? -1 : 1;
  const away = Math.abs(depth);
  const hook = new CatmullRomCurve3(
    [
      [HINGE_Y, away],
      [-0.95, Math.max(away, 0.02)],
      [-0.5, Math.max(away * 0.75, 0.3)],
      [-0.08, 0.5],
      [0.38, 0.35],
      [0.53, 0],
      [0.38, -0.36],
      [0, -0.5],
      [-0.3, -0.42],
    ].map(([y, z]) => new Vector3(0, y, side * z)),
  );
  parts.push(new TubeGeometry(hook, 64, 0.055, 8).toNonIndexed());

  const clip = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!clip) throw new Error("The clip couldn't be made");
  return clip;
};

// The rail along x, from its bracket to its round end. One geometry
const createRailGeometry = (from: number, to: number) => {
  const rail = new CylinderGeometry(RAIL_RADIUS, RAIL_RADIUS, to - from, 40);
  rail.rotateZ(Math.PI / 2);
  rail.translate((from + to) / 2, 0, 0);
  const end = new SphereGeometry(RAIL_RADIUS, 40, 20);
  end.translate(to, 0, 0);
  const arm = new CylinderGeometry(ARM_RADIUS, ARM_RADIUS, WALL, 24);
  arm.rotateX(Math.PI / 2);
  arm.translate(from, 0, -WALL / 2);
  const rose = new CylinderGeometry(ROSE_RADIUS, ROSE_RADIUS, ROSE_DEPTH, 40);
  rose.rotateX(Math.PI / 2);
  rose.translate(from, 0, -WALL + ROSE_DEPTH / 2);
  const parts = [rail, end, arm, rose].map((part) => part.toNonIndexed());
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error("The rail couldn't be made");
  return geometry;
};

// ── The film ──────────────────────────────────────────────────────────────────

/**
 * Hangs these photos, by address, on the rail: a roll through them in
 * order, round again where there are fewer than frames. Drawn into the
 * canvas once shown. `onLost` is called if the GPU drops it.
 */
export const createFilm = async (
  canvas: HTMLCanvasElement,
  images: string[],
  onLost: () => void,
): Promise<Film> => {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  // Blurred, for soft shadows, like a room's light makes
  renderer.shadowMap.type = VSMShadowMap;

  let isDestroyed = false;
  let frameRequest = 0;
  const handleLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    onLost();
  };
  canvas.addEventListener("webglcontextlost", handleLost);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 400);

  // Reflections, for the steel and the film's sheen
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const reflections = pmrem.fromScene(room, 0.04);
  const environment = reflections.texture;
  room.dispose();
  pmrem.dispose();

  const metal = {
    metalness: 1,
    roughness: METAL.roughness,
    envMap: environment,
    envMapIntensity: METAL.reflections,
  };
  const steel = new MeshStandardMaterial({ color: STEEL, ...metal });
  const chrome = new MeshStandardMaterial({ color: CHROME, ...metal });

  scene.add(new HemisphereLight("#ffffff", "#e8dfd6", SKY));
  const sun = new DirectionalLight("#fff6ec", SUN);
  sun.castShadow = true;
  // Coarse, which the blur smooths over anyway
  sun.shadow.mapSize.set(512, 1024);
  sun.shadow.radius = SHADOW_BLUR;
  sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const clipGeometries: BufferGeometry[] = [];

  // ── Strips ──────────────────────────────────────────────────────────────

  const hung: Strip[] = [];

  const hangStrip = (first: number, { frames, x, depth }: (typeof STRIPS)[number]) => {
    const stripCanvas = document.createElement("canvas");
    sizeStrip(stripCanvas, frames);
    const context = stripCanvas.getContext("2d");
    if (!context) throw new Error("The film couldn't be drawn");
    const photos: (HTMLImageElement | null)[] = Array(frames).fill(null);
    drawStrip(context, photos, first + 1);
    const texture = new CanvasTexture(stripCanvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = anisotropy;

    const length = stripLength(frames) * MM;
    const geometry = new PlaneGeometry(FILM_HALF * 2, length, 6, Math.ceil(length / 0.3));
    geometry.translate(0, -length / 2, 0);
    const positions = geometry.attributes.position;
    const rest = new Float32Array(positions.count * 2);
    for (let i = 0; i < positions.count; i++) {
      rest[i * 2] = positions.getX(i);
      rest[i * 2 + 1] = positions.getY(i);
    }

    const material = new MeshStandardMaterial({
      map: texture,
      emissive: "#ffffff",
      emissiveMap: texture,
      emissiveIntensity: GLOW,
      side: DoubleSide,
      // Through the perforations, and their shadows too
      alphaTest: 0.5,
      roughness: FILM.roughness,
      envMap: environment,
      envMapIntensity: FILM.reflections,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(0, FILM_TOP, depth);
    mesh.castShadow = true;
    const clipGeometry = createClipGeometry(depth);
    clipGeometries.push(clipGeometry);
    const clip = new Mesh(clipGeometry, steel);
    clip.castShadow = true;
    const pivot = new Group();
    pivot.position.x = x;
    pivot.add(mesh, clip);
    scene.add(pivot);

    hung.push({
      pivot,
      mesh,
      rest,
      length,
      frames,
      first,
      canvas: stripCanvas,
      context,
      texture,
      photos,
      swing: 0,
      swingSpeed: 0,
      sway: 0,
      swaySpeed: 0,
      twist: 0,
      twistSpeed: 0,
      restTwist: random(-REST_TWIST, REST_TWIST),
      hand: Math.random() < 0.5 ? -1 : 1,
      phases: Array.from({ length: 6 }, () => random(0, Math.PI * 2)),
      kick: null,
    });
  };

  if (images.length === 0) throw new Error("There's no film to hang");
  let first = 0;
  for (const strip of STRIPS) {
    hangStrip(first, strip);
    first += strip.frames;
  }
  const meshes = hung.map((strip) => strip.mesh);

  const railFrom = hung[0].pivot.position.x - FILM_HALF - RAIL_FROM;
  const railTo = hung[hung.length - 1].pivot.position.x + FILM_HALF + RAIL_TO;
  const middle = (railFrom + railTo) / 2;
  // Everything there is, to place in the canvas
  const box = {
    left: railFrom - ROSE_RADIUS,
    right: railTo + RAIL_RADIUS,
    top: Math.max(HOOK_TOP, ROSE_RADIUS),
    bottom: FILM_TOP - Math.max(...hung.map((strip) => strip.length)),
  };

  // ── The rail and the wall ───────────────────────────────────────────────

  const rail = new Mesh(createRailGeometry(railFrom, railTo), chrome);
  rail.castShadow = true;
  scene.add(rail);

  const wall = new Mesh(new PlaneGeometry(200, 200), new ShadowMaterial({ opacity: SHADOW }));
  wall.position.set(middle, box.bottom / 2, -WALL);
  wall.receiveShadow = true;
  scene.add(wall);

  sun.target.position.set(middle, box.bottom / 2, 0);
  sun.position.copy(sun.target.position).add(SUN_FROM);
  const shadowCamera = sun.shadow.camera;
  const across = (box.right - box.left) / 2 + 8;
  const down = (box.top - box.bottom) / 2 + 10;
  shadowCamera.left = -across;
  shadowCamera.right = across;
  shadowCamera.top = down;
  shadowCamera.bottom = -down;
  shadowCamera.near = 1;
  shadowCamera.far = 160;
  shadowCamera.updateProjectionMatrix();

  // ── Photos ──────────────────────────────────────────────────────────────

  let needsDraw = true;

  // Each photo once, into every frame it's in, as it comes in
  images.forEach((source, index) => {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    image.decode().then(
      () => {
        if (isDestroyed) return;
        for (const strip of hung) {
          let isIn = false;
          for (let frame = 0; frame < strip.frames; frame++) {
            if ((strip.first + frame) % images.length !== index) continue;
            strip.photos[frame] = image;
            isIn = true;
          }
          if (!isIn) continue;
          drawStrip(strip.context, strip.photos, strip.first + 1);
          strip.texture.needsUpdate = true;
        }
        needsDraw = true;
      },
      // Its frames stay bare
      () => {},
    );
  });

  // ── Shape ───────────────────────────────────────────────────────────────

  // Swung on its hook, then bent: flat in the clip, twisting down its
  // length, cupped across, curved a little, and trailing its swing
  const shape = (strip: Strip) => {
    strip.pivot.rotation.set(strip.swing, 0, strip.sway);
    const { geometry } = strip.mesh;
    const positions = geometry.attributes.position;
    const array = positions.array as Float32Array;
    const free = strip.length - GRIP;
    const twist = strip.restTwist + strip.twist;
    const trailX = -LAG * strip.swaySpeed;
    const trailZ = LAG * strip.swingSpeed;
    for (let i = 0; i < positions.count; i++) {
      const x = strip.rest[i * 2];
      const y = strip.rest[i * 2 + 1];
      const below = Math.max(0, -y - GRIP);
      const along = below / free;
      const side = x / FILM_HALF;
      const curl = CURL * (side * side - 1 / 3) * Math.min(1, below / 1.5);
      const angle = twist * along;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const bend = along * along * free;
      array[i * 3] = x * cos + curl * sin + trailX * bend;
      array[i * 3 + 1] = y;
      array[i * 3 + 2] = -x * sin + curl * cos + (BOW + trailZ) * bend;
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    // Found again by the raycaster and the culling
    geometry.boundingSphere = null;
  };

  // ── Motion ──────────────────────────────────────────────────────────────

  let hasMotion = true;

  const move = (dt: number, time: number) => {
    for (const strip of hung) {
      const { kick, phases } = strip;
      if (kick && time >= kick.at) {
        strip.swingSpeed += kick.swing;
        strip.swaySpeed += kick.sway;
        strip.twistSpeed += kick.twist;
        strip.kick = null;
      }
      for (let remaining = dt; remaining > 1e-6; remaining -= STEP) {
        const step = Math.min(STEP, remaining);
        const at = time - remaining + step;
        const air = (scale: number, a: number, b: number, rate: number) =>
          scale * (Math.sin(at * rate + phases[a]) + 0.6 * Math.sin(at * rate * 2.7 + phases[b]));
        [strip.swing, strip.swingSpeed] = spring(strip.swing, strip.swingSpeed, SWING, air(AIR.swing, 0, 1, 0.53), step);
        [strip.sway, strip.swaySpeed] = spring(strip.sway, strip.swaySpeed, SWAY, air(AIR.sway, 2, 3, 0.71), step);
        [strip.twist, strip.twistSpeed] = spring(strip.twist, strip.twistSpeed, TWIST, air(AIR.twist, 4, 5, 0.41), step);
      }
      shape(strip);
    }
  };

  const still = () => {
    for (const strip of hung) {
      strip.swing = strip.swingSpeed = 0;
      strip.sway = strip.swaySpeed = 0;
      strip.twist = strip.twistSpeed = 0;
      strip.kick = null;
      shape(strip);
    }
    needsDraw = true;
  };
  still();

  // ── View ────────────────────────────────────────────────────────────────

  let width = 1;
  let height = 1;

  // At its set size, in the canvas's top right corner: whatever else of the
  // canvas there is is room for the shadows
  const resize = () => {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);

    const viewWidth = width / SCALE;
    const viewHeight = height / SCALE;
    camera.aspect = width / height;
    camera.position.set(
      box.right + ROOM.right / SCALE - viewWidth / 2,
      box.top + ROOM.top / SCALE - viewHeight / 2,
      viewHeight / 2 / Math.tan(MathUtils.degToRad(FOV / 2)),
    );
    camera.updateProjectionMatrix();
    needsDraw = true;
  };

  // ── Pointer ─────────────────────────────────────────────────────────────

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const railPlane = new Plane(new Vector3(0, 0, 1), 0);
  const onRail = new Vector3();
  let lastPoint: { x: number; y: number; time: number } | null = null;

  const aim = (x: number, y: number) => {
    ndc.set((x / width) * 2 - 1, 1 - (y / height) * 2);
    raycaster.setFromCamera(ndc, camera);
  };

  // The strips the pointer passes over take on some of its speed, sideways,
  // and twist and swing back a little
  const brush = (x: number, y: number) => {
    aim(x, y);
    const point = raycaster.ray.intersectPlane(railPlane, onRail);
    const time = performance.now() / 1000;
    if (point && lastPoint && hasMotion) {
      const dt = MathUtils.clamp(time - lastPoint.time, 1 / 240, 1 / 15);
      const speed = MathUtils.clamp((point.x - lastPoint.x) / dt, -MAX_BRUSH, MAX_BRUSH);
      const below = -point.y;
      for (const strip of hung) {
        if (below < -FILM_TOP || below > -FILM_TOP + strip.length) continue;
        const center = strip.pivot.position.x + Math.sin(strip.sway) * below;
        if (Math.abs(point.x - center) > FILM_HALF + BRUSH_REACH) continue;
        strip.swaySpeed += (speed / below - strip.swaySpeed) * Math.min(1, FOLLOW * dt);
        strip.twistSpeed += speed * TWIST_PUSH * strip.hand * dt;
        strip.swingSpeed += Math.abs(speed) * SWING_PUSH * dt;
      }
    }
    lastPoint = point ? { x: point.x, y: point.y, time } : null;
  };

  // ── Drawing ─────────────────────────────────────────────────────────────

  let isShown = false;
  let lastTime = 0;

  const loop = (now: number) => {
    frameRequest = requestAnimationFrame(loop);
    const dt = lastTime ? Math.min((now - lastTime) / 1000, MAX_DT) : 0;
    lastTime = now;
    if (hasMotion) {
      move(dt, now / 1000);
      needsDraw = true;
    }
    if (!needsDraw) return;
    needsDraw = false;
    renderer.render(scene, camera);
  };

  const start = () => {
    if (frameRequest || !isShown || isDestroyed) return;
    lastTime = 0;
    frameRequest = requestAnimationFrame(loop);
  };

  const stop = () => {
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
  };

  resize();
  // Compiled in the background where it can be, before it's first shown
  await renderer.compileAsync(scene, camera);

  return {
    resize,
    setVisible: (next) => {
      isShown = next;
      if (isShown) start();
      else stop();
    },
    setMotion: (next) => {
      if (hasMotion === next) return;
      hasMotion = next;
      if (!hasMotion) still();
    },
    hang: () => {
      if (!hasMotion) return;
      const now = performance.now() / 1000;
      hung.forEach((strip, index) => {
        strip.kick = {
          at: now + index * HANG.after,
          swing: random(0.5, 1) * HANG.swing,
          sway: random(-1, 1) * HANG.sway,
          twist: random(-1, 1) * HANG.twist,
        };
      });
    },
    point: (at) => {
      if (at) brush(at.x, at.y);
      else lastPoint = null;
    },
    poke: (x, y) => {
      if (!hasMotion) return;
      aim(x, y);
      const [hit] = raycaster.intersectObjects(meshes, false);
      const strip = hit && hung.find((candidate) => candidate.mesh === hit.object);
      if (!strip) return;
      strip.swingSpeed += POKE.swing;
      strip.twistSpeed += POKE.twist * strip.hand;
    },
    destroy: () => {
      isDestroyed = true;
      stop();
      canvas.removeEventListener("webglcontextlost", handleLost);
      for (const strip of hung) {
        strip.mesh.geometry.dispose();
        strip.mesh.material.dispose();
        strip.texture.dispose();
        strip.canvas.width = 0;
        strip.canvas.height = 0;
      }
      for (const geometry of clipGeometries) geometry.dispose();
      rail.geometry.dispose();
      wall.geometry.dispose();
      wall.material.dispose();
      steel.dispose();
      chrome.dispose();
      reflections.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};
