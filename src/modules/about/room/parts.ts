// What's in the room, built in code. The room itself is a closed box: four
// walls, a floor and a ceiling, every one of them solid to the sun, with the
// window and the door cut out of them. Everything in it is built around its
// own origin and placed by the layout, see layout.json, so the tuner can
// move it. Every surface is painted, see textures.ts

import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  Euler,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Path,
  PlaneGeometry,
  PointLight,
  Quaternion,
  RectAreaLight,
  RingGeometry,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { gear } from "~/data/favorites";
import type { RoomLayout, RoomShape } from "~/modules/about/room/layout";
import type { Painting } from "~/modules/about/room/painter";
import { fbm, random, ridged } from "~/modules/about/room/painting";
import {
  createSurfaces,
  leafTexture,
  screenTexture,
  type Surface,
} from "~/modules/about/room/textures";
import { COVER_COLORS } from "~/modules/favorites/utils/brochure";

// What a click on something in the room opens on the page
export type Hotspot = { label: string; target: "gear" | "music" };

// How thick the walls, the floor's edge and the ceiling are
export const WALL = 0.12;

// ── Materials ───────────────────────────────────────────────────────────────

const standard = (
  color: string,
  options: {
    roughness?: number;
    metalness?: number;
    emissive?: string;
    emissiveIntensity?: number;
  } = {},
) =>
  new MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.85,
    metalness: options.metalness ?? 0,
    ...(options.emissive && {
      emissive: options.emissive,
      emissiveIntensity: options.emissiveIntensity ?? 1,
    }),
  });

// A painted surface on a material: its picture and its bumps, repeated
// this many times across and up whatever it's on
const painted = (
  surface: Surface,
  repeatX: number,
  repeatY: number,
  options: { roughness?: number; bump?: number } = {},
) => {
  const map = surface.color.clone();
  const bumpMap = surface.bump.clone();
  surface.copies.push(map, bumpMap);
  map.repeat.set(repeatX, repeatY);
  bumpMap.repeat.set(repeatX, repeatY);
  return new MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: options.bump ?? 0.02,
    roughness: options.roughness ?? 0.85,
  });
};

/** Everything the room is painted with, made once per room. */
export interface Palette {
  // Painted once, then shared
  walnut: Surface;
  planks: Surface;
  spruce: Surface;
  sunburst: Surface;
  rug: Surface;
  // Every texture made, to let go of with the room, and whether it's gone:
  // a picture that arrives after that is let go of right away
  textures: Texture[];
  isDisposed: boolean;
  // Settles once the surfaces are painted: flat colours until then
  painted: Promise<void>;
  // Stops the painting, when the room goes before it's done
  stopPainting: () => void;
  // Materials whose colour the layout sets, see applyColors
  walls: MeshStandardMaterial;
  hallway: MeshStandardMaterial;
  floor: MeshStandardMaterial;
  hallFloor: MeshStandardMaterial;
  duvet: MeshStandardMaterial;
  sheets: MeshStandardMaterial;
  pillows: MeshStandardMaterial;
  chair: MeshStandardMaterial;
  // Every walnut surface, tinted together
  wood: MeshStandardMaterial[];
  // Coloured with the trim: casings, skirting, the window frame, the door
  trim: MeshStandardMaterial;
  frame: MeshStandardMaterial;
  door: MeshStandardMaterial;
  // Plain ones
  ceiling: MeshStandardMaterial;
  brass: MeshStandardMaterial;
  pictureFrame: MeshStandardMaterial;
  ceramic: MeshStandardMaterial;
  stem: MeshStandardMaterial;
  blackMetal: MeshStandardMaterial;
  blackPlastic: MeshStandardMaterial;
  rubber: MeshStandardMaterial;
  chrome: MeshStandardMaterial;
  camera: MeshStandardMaterial;
  cameraTrim: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  terracotta: MeshStandardMaterial;
  paper: MeshStandardMaterial;
  cream: MeshStandardMaterial;
  rosewood: MeshStandardMaterial;
  maple: MeshStandardMaterial;
  string: MeshStandardMaterial;
  leaf: MeshStandardMaterial;
}

/**
 * Every material, on surfaces that are painted in the background: flat
 * colours until `painted` settles, see createSurfaces in textures.ts. The
 * painting may have been started before the room, see painter.ts.
 */
export const createPalette = (
  painting?: Painting,
  onPainted?: (done: number, total: number) => void,
): Palette => {
  const { surfaces, painted: isPainted, stop } = createSurfaces(painting, onPainted);
  const { plaster, fabric, linen, leather, walnut, planks, spruce, sunburst, rug } = surfaces;
  const leaf = leafTexture();

  // The walls' picture repeats with their size, see wallBox
  const plasterMaterial = () =>
    new MeshStandardMaterial({
      map: plaster.color,
      bumpMap: plaster.bump,
      bumpScale: 0.025,
      roughness: 0.95,
    });

  const camera = standard("#141414", { roughness: 0.55 });
  const cameraBump = leather.bump.clone();
  leather.copies.push(cameraBump);
  cameraBump.repeat.set(6, 6);
  camera.bumpMap = cameraBump;
  camera.bumpScale = 0.004;

  const textures = [plaster, fabric, linen, leather, walnut, planks, spruce, sunburst, rug].flatMap(
    ({ color, bump }) => [color, bump],
  );

  return {
    walnut,
    planks,
    spruce,
    sunburst,
    rug,
    textures: [...textures, leaf],
    isDisposed: false,
    painted: isPainted,
    stopPainting: stop,
    walls: plasterMaterial(),
    hallway: plasterMaterial(),
    floor: painted(planks, 1, 1, { roughness: 0.45, bump: 0.02 }),
    hallFloor: painted(planks, 1, 1, { roughness: 0.45, bump: 0.02 }),
    duvet: painted(fabric, 1.5, 1.6, { roughness: 1, bump: 0.012 }),
    sheets: painted(linen, 1.5, 2, { roughness: 0.95, bump: 0.01 }),
    pillows: painted(linen, 1, 1, { roughness: 0.95, bump: 0.012 }),
    chair: painted(leather, 2, 2, { roughness: 0.6, bump: 0.006 }),
    wood: [],
    ceiling: standard("#ebe6dc", { roughness: 1 }),
    trim: standard("#f2eee6", { roughness: 0.6 }),
    frame: standard("#f2eee6", { roughness: 0.7 }),
    door: standard("#f2eee6", { roughness: 0.55 }),
    brass: standard("#b08d57", { roughness: 0.35, metalness: 0.8 }),
    pictureFrame: standard("#1d1b1a", { roughness: 0.55 }),
    ceramic: standard("#ece6da", { roughness: 0.45 }),
    stem: standard("#3d5e30", { roughness: 0.9 }),
    blackMetal: standard("#161618", { roughness: 0.45, metalness: 0.35 }),
    blackPlastic: standard("#1a1a1c", { roughness: 0.65 }),
    rubber: standard("#2a2a2e", { roughness: 0.9 }),
    chrome: standard("#c8c8cc", { roughness: 0.25, metalness: 0.8 }),
    camera,
    cameraTrim: standard("#3c3c40", { roughness: 0.4, metalness: 0.5 }),
    glass: standard("#1c2b3c", { roughness: 0.12, metalness: 0.5 }),
    terracotta: standard("#95603f", { roughness: 0.9 }),
    paper: standard("#f1ede4", { roughness: 0.9 }),
    cream: standard("#f3ead6", { roughness: 0.6 }),
    rosewood: standard("#2b1810", { roughness: 0.6 }),
    maple: standard("#d9b57a", { roughness: 0.5 }),
    string: standard("#d8d8dc", { metalness: 0.7, roughness: 0.35 }),
    leaf: new MeshStandardMaterial({
      map: leaf,
      alphaTest: 0.5,
      side: DoubleSide,
      roughness: 0.85,
    }),
  };
};

// Walnut, at this many repeats, tinted with the rest of the wood
const woodMaterial = (palette: Palette, repeatX: number, repeatY: number) => {
  const material = painted(palette.walnut, repeatX, repeatY, { roughness: 0.5, bump: 0.015 });
  palette.wood.push(material);
  return material;
};

/**
 * The palette's own materials: they keep their own identity when the room
 * is merged, see merge.ts, so the layout's colours still reach them.
 */
export const tintedBy = (palette: Palette) => {
  const materials = new Set<Material>(palette.wood);
  for (const value of Object.values(palette)) {
    if (value instanceof MeshStandardMaterial) materials.add(value);
  }
  return materials;
};

/** Gives the materials the layout's colours. */
export const applyColors = (palette: Palette, colors: RoomLayout["colors"]) => {
  palette.walls.color.set(colors.walls);
  palette.hallway.color.set(colors.hallway);
  palette.duvet.color.set(colors.duvet);
  palette.sheets.color.set(colors.sheets);
  palette.pillows.color.set(colors.sheets);
  palette.chair.color.set(colors.chair);
  palette.floor.color.set(colors.floor);
  palette.hallFloor.color.set(colors.floor);
  for (const material of palette.wood) material.color.set(colors.wood);
  palette.trim.color.set(colors.trim);
  palette.frame.color.set(colors.trim);
  palette.door.color.set(colors.trim);
};

// ── Builders ────────────────────────────────────────────────────────────────

const mesh = (
  geometry: BufferGeometry,
  material: Material,
  x = 0,
  y = 0,
  z = 0,
) => {
  const made = new Mesh(geometry, material);
  made.position.set(x, y, z);
  made.castShadow = true;
  made.receiveShadow = true;
  return made;
};

const box = (
  width: number,
  height: number,
  depth: number,
  material: Material,
  x = 0,
  y = 0,
  z = 0,
) => mesh(new BoxGeometry(width, height, depth), material, x, y, z);

const rounded = (
  width: number,
  height: number,
  depth: number,
  radius: number,
  material: Material,
  x = 0,
  y = 0,
  z = 0,
) =>
  mesh(
    // A bevel under 2 cm reads the same in two steps as in four, at a
    // third of the triangles
    new RoundedBoxGeometry(width, height, depth, radius < 0.02 ? 2 : 4, radius),
    material,
    x,
    y,
    z,
  );

const cylinder = (
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: Material,
  x = 0,
  y = 0,
  z = 0,
  segments = 32,
) =>
  mesh(
    new CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
    x,
    y,
    z,
  );

// A box whose picture repeats every `tile` meters on every face, whatever
// its size, so plaster looks the same on a narrow piece of wall and a wide one
const wallBox = (
  width: number,
  height: number,
  depth: number,
  material: Material,
  x: number,
  y: number,
  z: number,
  tile = 2,
) => {
  const geometry = new BoxGeometry(width, height, depth);
  const uv = geometry.attributes.uv;
  // The faces in order, +x, -x, +y, -y, +z, -z, four corners each
  const sizes = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ];
  sizes.forEach(([across, up], face) => {
    for (let corner = 0; corner < 4; corner++) {
      const i = face * 4 + corner;
      uv.setXY(i, (uv.getX(i) * across) / tile, (uv.getY(i) * up) / tile);
    }
  });
  return mesh(geometry, material, x, y, z);
};

// Something that can be clicked: every mesh in it says what it opens, and
// which group is the whole thing, to outline and grow under the pointer
const markHotspot = (group: Group, hotspot: Hotspot) => {
  group.traverse((child) => {
    if (child instanceof Mesh) {
      child.userData.hotspot = hotspot;
      child.userData.hotspotGroup = group;
    }
  });
  return group;
};

// ── The shell ───────────────────────────────────────────────────────────────

interface Opening {
  from: number;
  to: number;
  bottom: number;
  top: number;
  isDoor: boolean;
}

/**
 * A wall along its own x, `length` long, centred on its origin, standing on
 * the floor, WALL thick, with its room side facing +z. Openings are cut out
 * of it; a window gets a frame, mullions and a sill, a door a casing.
 * Skirting runs along the room side, around the doors.
 */
const buildWall = (
  palette: Palette,
  material: Material,
  length: number,
  height: number,
  openings: Opening[],
) => {
  const wall = new Group();
  const half = length / 2;
  const face = WALL / 2;
  const sorted = [...openings].sort((a, b) => a.from - b.from);

  let x = -half;
  for (const { from, to, bottom, top } of sorted) {
    if (from > x) wall.add(wallBox(from - x, height, WALL, material, (x + from) / 2, height / 2, 0));
    if (bottom > 0) wall.add(wallBox(to - from, bottom, WALL, material, (from + to) / 2, bottom / 2, 0));
    if (top < height) wall.add(wallBox(to - from, height - top, WALL, material, (from + to) / 2, (top + height) / 2, 0));
    x = Math.max(x, to);
  }
  if (x < half) wall.add(wallBox(half - x, height, WALL, material, (x + half) / 2, height / 2, 0));

  for (const { from, to, bottom, top, isDoor } of sorted) {
    const width = to - from;
    const middle = (from + to) / 2;
    if (isDoor) {
      // The casing around the doorway, on the room side, and the jambs
      // lining it through the wall
      wall.add(box(0.07, top, 0.03, palette.trim, from - 0.035, top / 2, face + 0.015));
      wall.add(box(0.07, top, 0.03, palette.trim, to + 0.035, top / 2, face + 0.015));
      wall.add(box(width + 0.14, 0.07, 0.03, palette.trim, middle, top + 0.035, face + 0.015));
      wall.add(box(0.02, top, WALL + 0.004, palette.trim, from + 0.01, top / 2, 0));
      wall.add(box(0.02, top, WALL + 0.004, palette.trim, to - 0.01, top / 2, 0));
      wall.add(box(width, 0.02, WALL + 0.004, palette.trim, middle, top - 0.01, 0));
      continue;
    }
    // The reveal, lining the opening through the wall
    const height = top - bottom;
    wall.add(box(0.015, height, WALL + 0.004, palette.frame, from + 0.0075, (bottom + top) / 2, 0));
    wall.add(box(0.015, height, WALL + 0.004, palette.frame, to - 0.0075, (bottom + top) / 2, 0));
    wall.add(box(width, 0.015, WALL + 0.004, palette.frame, middle, top - 0.0075, 0));
    wall.add(box(width, 0.015, WALL + 0.004, palette.frame, middle, bottom + 0.0075, 0));
    // The window: a frame in the opening, two mullions across it and a sill
    // under it on the room side. They block the sun like the walls do
    const middleY = (bottom + top) / 2;
    wall.add(box(0.05, top - bottom, 0.06, palette.frame, from + 0.025, middleY, 0));
    wall.add(box(0.05, top - bottom, 0.06, palette.frame, to - 0.025, middleY, 0));
    wall.add(box(width, 0.05, 0.06, palette.frame, middle, bottom + 0.025, 0));
    wall.add(box(width, 0.05, 0.06, palette.frame, middle, top - 0.025, 0));
    wall.add(box(0.045, top - bottom, 0.05, palette.frame, middle, middleY, 0));
    wall.add(box(width, 0.045, 0.05, palette.frame, middle, middleY, 0));
    wall.add(box(width + 0.12, 0.03, 0.16, palette.frame, middle, bottom - 0.015, face + 0.05));
  }

  // Skirting on the room side, broken by the doors
  let from = -half;
  for (const opening of [...sorted.filter(({ isDoor }) => isDoor), { from: half, to: half }]) {
    if (opening.from > from) {
      wall.add(box(opening.from - from, 0.09, 0.016, palette.trim, (from + opening.from) / 2, 0.045, face + 0.008));
    }
    from = opening.to + 0.07;
  }
  return wall;
};

/** Where the window is and which way it faces, worked out from the room. */
export const windowOf = (room: RoomShape) => {
  const { window: win, width, depth } = room;
  // A point on the window's opening: along the wall, and up it
  const point = (along: number, y: number) =>
    win.wall === "near"
      ? new Vector3(along, y, depth / 2)
      : new Vector3(-width / 2, y, along);
  const outward = win.wall === "near" ? new Vector3(0, 0, 1) : new Vector3(-1, 0, 0);
  const middle = (win.from + win.to) / 2;
  const middleY = (win.bottom + win.top) / 2;
  const gap = 0.03;
  // The four panes between the mullions, each as its four corners
  const panes = [
    [win.from + 0.05, middle - gap, win.bottom + 0.05, middleY - gap],
    [middle + gap, win.to - 0.05, win.bottom + 0.05, middleY - gap],
    [win.from + 0.05, middle - gap, middleY + gap, win.top - 0.05],
    [middle + gap, win.to - 0.05, middleY + gap, win.top - 0.05],
  ].map(([a0, a1, y0, y1]) => [point(a0, y0), point(a1, y0), point(a1, y1), point(a0, y1)]);
  return {
    center: point(middle, middleY),
    outward,
    panes,
    width: win.to - win.from,
    height: win.top - win.bottom,
  };
};

/**
 * The closed box of the room: the floor, the ceiling and four walls, all
 * solid to the sun, the window in the near or the left wall and the door in
 * the right one. Through the door, the hallway, with its own light.
 */
export const createShell = (palette: Palette, room: RoomShape) => {
  const shell = new Group();
  const { width, depth, height, hallway, window: win, door } = room;
  const halfW = width / 2;
  const halfD = depth / 2;
  const outerW = width + WALL * 2;
  const outerD = depth + WALL * 2;

  // The floor, with its boards about 12 cm wide, a slab under it
  for (const material of [palette.floor]) {
    material.map?.repeat.set(outerW / 1.85, outerD / 1.85);
    material.bumpMap?.repeat.set(outerW / 1.85, outerD / 1.85);
  }
  const floor = mesh(new PlaneGeometry(outerW, outerD), palette.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  shell.add(floor);
  shell.add(box(outerW, WALL, outerD, palette.trim, 0, -WALL / 2 - 0.001, 0));

  // The ceiling: a slab, so the sun can't come through it
  shell.add(box(outerW, WALL, outerD, palette.ceiling, 0, height + WALL / 2, 0));

  // Openings in each wall's own x. The near and the left wall run the other
  // way from the room's x and z, see the turns below
  const windowOpening: Opening = { from: -win.to, to: -win.from, bottom: win.bottom, top: win.top, isDoor: false };
  const doorOpening: Opening = { from: door.from, to: door.to, bottom: 0, top: door.height, isDoor: true };

  const place = (wall: Group, x: number, z: number, turn: number) => {
    wall.position.set(x, 0, z);
    wall.rotation.y = turn;
    shell.add(wall);
  };
  place(buildWall(palette, palette.walls, outerW, height, []), 0, -halfD - WALL / 2, 0);
  place(
    buildWall(palette, palette.walls, outerW, height, win.wall === "near" ? [windowOpening] : []),
    0,
    halfD + WALL / 2,
    Math.PI,
  );
  place(
    buildWall(palette, palette.walls, outerD, height, win.wall === "left" ? [windowOpening] : []),
    -halfW - WALL / 2,
    0,
    Math.PI / 2,
  );
  place(buildWall(palette, palette.walls, outerD, height, [doorOpening]), halfW + WALL / 2, 0, -Math.PI / 2);

  // The hallway beyond the door: a closed box of its own, lit from inside
  const hallX = halfW + WALL + hallway / 2;
  palette.hallFloor.map?.repeat.set(hallway / 1.85, outerD / 1.85);
  palette.hallFloor.bumpMap?.repeat.set(hallway / 1.85, outerD / 1.85);
  const hallFloor = mesh(new PlaneGeometry(hallway, outerD), palette.hallFloor, hallX, 0, 0);
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.castShadow = false;
  shell.add(hallFloor);
  shell.add(box(hallway + WALL * 2, WALL, outerD, palette.ceiling, hallX, height + WALL / 2, 0));
  shell.add(wallBox(WALL, height, outerD, palette.hallway, hallX + hallway / 2 + WALL / 2, height / 2, 0));
  for (const z of [-halfD - WALL / 2, halfD + WALL / 2]) {
    shell.add(wallBox(hallway + WALL * 2, height, WALL, palette.hallway, hallX, height / 2, z));
  }
  const hallLight = new PointLight("#ffd2a6", 2.5, 5, 2);
  hallLight.position.set(hallX, height - 0.35, (door.from + door.to) / 2);
  shell.add(hallLight);

  // The door, hinged at the doorway's far edge, swung open into the hallway
  const span = door.to - door.from;
  const leaf = new Group();
  leaf.position.set(halfW + WALL, 0, door.from);
  leaf.rotation.y = (door.open * Math.PI) / 180;
  leaf.add(rounded(0.04, door.height - 0.02, span - 0.02, 0.004, palette.door, 0.02, door.height / 2, span / 2));
  leaf.add(rounded(0.012, 0.9, span * 0.62, 0.003, palette.trim, 0.046, door.height * 0.72, span / 2));
  leaf.add(rounded(0.012, 0.7, span * 0.62, 0.003, palette.trim, 0.046, door.height * 0.26, span / 2));
  const handle = cylinder(0.008, 0.008, 0.1, palette.chrome, 0.07, 1.02, span - 0.09, 10);
  handle.rotation.x = Math.PI / 2;
  leaf.add(handle);
  shell.add(leaf);

  return shell;
};

// ── The bed ─────────────────────────────────────────────────────────────────

// Its own origin is its middle on the floor; the head is toward its +z
export const BED_SIZE = { width: 1.6, length: 2.0 };

// A duvet thrown over the bed: a slab with folds pressed into its top
// The top is a soft, uneven drape with a few creases running through it,
// from noise rather than waves, so no fold repeats another. Fine enough for
// the creases to be round
const duvetGeometry = (width: number, depth: number) => {
  const geometry = new BoxGeometry(width, 0.2, depth, 96, 1, 96);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (y < 0.09) continue;
    const u = x / width + 0.5;
    const v = z / depth + 0.5;
    const drape = fbm(u * 0.8 + 0.3, v * 0.8 + 0.1, 4, 3) - 0.5;
    const crease = ridged(u * 0.7, v * 0.9 + 0.2, 4, 3) ** 3;
    const wrinkle = fbm(u, v, 32, 2) - 0.5;
    const fold = 0.09 * drape + 0.03 * crease + 0.006 * wrinkle;
    // Lower toward the edges, where it hangs
    const edge = Math.max(Math.abs(x) / (width / 2), Math.abs(z) / (depth / 2));
    position.setY(i, y + fold - 0.06 * edge ** 4);
  }
  geometry.computeVertexNormals();
  return geometry;
};

export const createBed = (palette: Palette) => {
  const bed = new Group();
  const { width, length } = BED_SIZE;
  bed.add(rounded(width, 0.3, length, 0.03, palette.sheets, 0, 0.15, 0));
  bed.add(rounded(width - 0.04, 0.16, length - 0.04, 0.05, palette.sheets, 0, 0.38, 0));
  for (const side of [-1, 1]) {
    bed.add(rounded(0.6, 0.14, 0.4, 0.06, palette.pillows, side * 0.38, 0.5, length / 2 - 0.3));
  }
  // From the foot up to just short of the pillows
  const duvet = mesh(duvetGeometry(width + 0.06, 1.6), palette.duvet, 0, 0.55, -length / 2 + 0.85);
  duvet.rotation.y = 0.02;
  bed.add(duvet);
  return { bed, duvet };
};

/** The round rug, around its middle. */
export const createRug = (palette: Palette) => {
  const rug = new Group();
  const woven = painted(palette.rug, 1, 1, { roughness: 1, bump: 0.03 });
  const disc = cylinder(0.8, 0.8, 0.014, woven, 0, 0.007, 0, 64);
  disc.castShadow = false;
  const edge = mesh(new RingGeometry(0.73, 0.8, 64), woven, 0, 0.015, 0);
  edge.rotation.x = -Math.PI / 2;
  edge.castShadow = false;
  rug.add(disc, edge);
  return rug;
};

// ── The desk ────────────────────────────────────────────────────────────────

// Its own origin is its middle on the floor; its front is toward its +z
export const DESK_SIZE = { width: 2.4, depth: 0.7, top: 0.74 };

export const createDesk = (palette: Palette) => {
  const desk = new Group();
  const { width, depth, top } = DESK_SIZE;
  const back = -depth / 2;
  const front = depth / 2;
  desk.add(rounded(width, 0.05, depth, 0.012, woodMaterial(palette, 2, 1), 0, top, 0));
  for (const legX of [-width / 2 + 0.06, width / 2 - 0.06]) {
    for (const legZ of [back + 0.06, front - 0.06]) {
      desk.add(box(0.045, top - 0.025, 0.045, palette.blackMetal, legX, (top - 0.025) / 2, legZ));
    }
  }
  desk.add(box(width - 0.2, 0.04, 0.045, palette.blackMetal, 0, 0.12, back + 0.06));

  // Two monitors, on their stands, turned a little toward each other. Their
  // pictures show, but they don't light the room
  const screen = screenTexture();
  palette.textures.push(screen);
  const screenMaterial = new MeshStandardMaterial({
    color: "#000000",
    map: screen,
    emissive: "#ffffff",
    emissiveMap: screen,
    emissiveIntensity: 0,
    roughness: 0.25,
  });
  for (const [x, turn] of [
    [-0.41, 0.22],
    [0.31, -0.1],
  ]) {
    const monitor = new Group();
    monitor.position.set(x, top + 0.025, back + 0.2);
    monitor.rotation.y = turn;
    monitor.add(rounded(0.26, 0.016, 0.18, 0.005, palette.blackPlastic, 0, 0.008, 0));
    monitor.add(box(0.035, 0.26, 0.03, palette.blackPlastic, 0, 0.14, -0.03));
    monitor.add(rounded(0.68, 0.39, 0.03, 0.006, palette.blackPlastic, 0, 0.37, 0));
    const face = mesh(new PlaneGeometry(0.64, 0.355), screenMaterial, 0, 0.375, 0.0155);
    face.castShadow = false;
    monitor.add(face);
    desk.add(monitor);
  }

  // Two warm lamps, one at either end: a round foot, a stem and a fabric
  // shade the light glows through
  const shadeMaterial = new MeshStandardMaterial({
    color: "#efe3cf",
    emissive: "#ffb46a",
    emissiveIntensity: 0,
    roughness: 0.95,
    side: DoubleSide,
  });
  const deskLamps = [-1, 1].map((side) => {
    const lamp = new Group();
    lamp.position.set(side * (width / 2 - 0.17), top + 0.025, back + 0.18);
    lamp.add(cylinder(0.065, 0.07, 0.016, palette.brass, 0, 0.008, 0, 32));
    lamp.add(cylinder(0.008, 0.008, 0.26, palette.brass, 0, 0.14, 0, 12));
    const shade = mesh(new CylinderGeometry(0.075, 0.11, 0.14, 40, 1, true), shadeMaterial, 0, 0.3, 0);
    // The shade lets its light through, so it casts no shadow of its own
    shade.castShadow = false;
    lamp.add(shade);
    const light = new PointLight("#ffb46a", 0, 4, 2);
    light.position.set(0, 0.29, 0);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.004;
    light.shadow.normalBias = 0.02;
    lamp.add(light);
    desk.add(lamp);
    return light;
  });

  // An LED strip along the back edge, under the top, washing the wall
  // behind with light. The strip shines away from the room, toward the wall
  const ledMaterial = standard("#000000", { emissive: "#ffc890", emissiveIntensity: 0 });
  const led = box(width - 0.12, 0.012, 0.008, ledMaterial, 0, top - 0.035, back + 0.004);
  led.castShadow = false;
  desk.add(led);
  const ledLight = new RectAreaLight("#ffc890", 0, width - 0.12, 0.04);
  ledLight.position.set(0, top - 0.035, back - 0.002);
  desk.add(ledLight);

  // The keyboard, key by key, and the mouse
  const keyboard = new Group();
  keyboard.position.set(-0.13, top + 0.025, front - 0.2);
  keyboard.add(rounded(0.44, 0.014, 0.15, 0.004, palette.rubber, 0, 0.007, 0));
  const keyMaterial = standard("#46464c", { roughness: 0.6, emissive: "#5050ff", emissiveIntensity: 0.12 });
  const keys = new InstancedMesh(new RoundedBoxGeometry(0.024, 0.008, 0.024, 2, 0.003), keyMaterial, 70);
  const key = new Object3D();
  let count = 0;
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 14; column++) {
      key.position.set(-0.195 + column * 0.03, 0.018, -0.06 + row * 0.03);
      key.updateMatrix();
      keys.setMatrixAt(count++, key.matrix);
    }
  }
  keys.castShadow = true;
  keys.receiveShadow = true;
  keyboard.add(keys);
  desk.add(keyboard);
  desk.add(rounded(0.065, 0.036, 0.11, 0.016, palette.rubber, 0.27, top + 0.043, front - 0.2));

  // The PC on the floor under the desk's right end, its fans dark
  const pc = new Group();
  pc.position.set(width / 2 - 0.25, 0.225, 0.05);
  pc.add(rounded(0.22, 0.45, 0.42, 0.01, palette.blackPlastic, 0, 0, 0));
  for (const y of [-0.12, 0, 0.12]) {
    pc.add(mesh(new TorusGeometry(0.04, 0.006, 8, 28), palette.cameraTrim, 0, y, 0.211));
    pc.add(cylinder(0.034, 0.034, 0.004, palette.rubber, 0, y, 0.209, 20).rotateX(Math.PI / 2));
  }
  desk.add(pc);

  // The book of gear, lying on the desk to be picked up
  const book = new Group();
  book.position.set(-width / 2 + 0.25, top + 0.025, front - 0.22);
  book.rotation.y = -0.3;
  const cover = standard(COVER_COLORS.paper, { roughness: 0.55 });
  book.add(box(0.18, 0.003, 0.24, cover, 0, 0.0015, 0));
  book.add(box(0.18, 0.003, 0.24, cover, 0, 0.0225, 0));
  book.add(box(0.006, 0.024, 0.24, cover, -0.087, 0.012, 0));
  book.add(box(0.17, 0.018, 0.232, palette.paper, 0.002, 0.012, 0));
  desk.add(markHotspot(book, { label: "The gear book", target: "gear" }));

  return { desk, screenMaterial, shadeMaterial, deskLamps, ledMaterial, ledLight };
};

/**
 * Headphones lying on the desk: the band in a half circle, a cup at either
 * end. They open what's on rotation. Their own origin is under the band's
 * middle, on whatever they lie on.
 */
export const createHeadphones = (palette: Palette) => {
  const headphones = new Group();
  const band = mesh(new TorusGeometry(0.085, 0.011, 10, 32, Math.PI), palette.blackPlastic, 0, 0.022, 0);
  band.rotation.x = -Math.PI / 2;
  headphones.add(band);
  for (const side of [-1, 1]) {
    headphones.add(cylinder(0.045, 0.048, 0.032, palette.rubber, side * 0.085, 0.016, 0.01, 32));
    headphones.add(cylinder(0.034, 0.034, 0.004, palette.chair, side * 0.085, 0.034, 0.01, 32));
  }
  return markHotspot(headphones, { label: "On rotation", target: "music" });
};

// The colours of the sleeves in the record cabinet, muted, like a shelf of
// records seen from the side
const SLEEVE_COLORS = ["#e8e1d2", "#1d1d1f", "#b8452c", "#d8b25a", "#5d7a8c", "#3b4a36", "#a59c8c", "#7a3b2e", "#f1ece2", "#2f3b52"];

/**
 * The record player on a low cabinet of records: two cubbies of sleeves,
 * the deck on top with a record on the platter and the arm down on it, and
 * the record's sleeve leaning on the wall beside it. The record's label and
 * sleeve show `cover`, what's on rotation first. It opens what's on
 * rotation. Its own origin is on the floor at the middle of the cabinet's
 * back, against the wall; it stands out along +z.
 */
export const createTurntable = (palette: Palette, cover: string | undefined) => {
  const player = new Group();
  const width = 0.78;
  const depth = 0.4;
  const height = 0.56;
  const board = 0.025;
  const wood = woodMaterial(palette, 1, 0.4);

  // The cabinet: open at the front, a board down the middle
  player.add(box(width, board, depth, wood, 0, height - board / 2, depth / 2));
  player.add(box(width, board, depth, wood, 0, board / 2, depth / 2));
  for (const x of [-(width - board) / 2, 0, (width - board) / 2]) {
    player.add(box(board, height - board * 2, depth, wood, x, height / 2, depth / 2));
  }
  player.add(box(width, height, 0.008, wood, 0, height / 2, 0.004));

  // The records, standing on edge in both cubbies, each its own colour
  const inner = (width - board * 3) / 2;
  const sleeve = 0.315;
  const perCubby = 30;
  const sleeveMaterial = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });
  const sleeves = new InstancedMesh(new BoxGeometry(0.0062, sleeve, sleeve), sleeveMaterial, perCubby * 2);
  const next = random(11);
  const placed = new Object3D();
  const tint = new Color();
  for (const [cubby, side] of [-1, 1].entries()) {
    const from = side * (board / 2 + inner / 2) - inner / 2 + 0.006;
    for (let i = 0; i < perCubby; i++) {
      placed.position.set(from + i * 0.0075, board + sleeve / 2 + next() * 0.003, depth / 2 + 0.01 + (next() - 0.5) * 0.008);
      placed.rotation.set(0, 0, (next() - 0.5) * 0.02);
      placed.updateMatrix();
      sleeves.setMatrixAt(cubby * perCubby + i, placed.matrix);
      sleeves.setColorAt(cubby * perCubby + i, tint.set(SLEEVE_COLORS[Math.floor(next() * SLEEVE_COLORS.length)]));
    }
  }
  sleeves.castShadow = true;
  sleeves.receiveShadow = true;
  player.add(sleeves);

  // The deck: a lacquered plinth on four feet, at the cabinet's left
  const deckX = -width / 2 + 0.22;
  const deckZ = depth / 2;
  const lacquer = standard("#1c1c1e", { roughness: 0.3 });
  const aluminium = standard("#c4c4c6", { roughness: 0.3, metalness: 0.85 });
  for (const x of [-0.17, 0.17]) {
    for (const z of [-0.13, 0.13]) {
      player.add(cylinder(0.02, 0.022, 0.012, palette.rubber, deckX + x, height + 0.006, deckZ + z, 16));
    }
  }
  player.add(rounded(0.42, 0.07, 0.34, 0.01, lacquer, deckX, height + 0.047, deckZ));
  const top = height + 0.082;

  // The platter, the record on it, its label and the spindle
  const platterX = deckX - 0.05;
  const platterZ = deckZ + 0.01;
  player.add(cylinder(0.148, 0.148, 0.018, aluminium, platterX, top + 0.009, platterZ, 64));
  const vinyl = standard("#0e0e0f", { roughness: 0.25 });
  player.add(cylinder(0.146, 0.146, 0.003, vinyl, platterX, top + 0.0195, platterZ, 64));
  // What's on rotation, on the label and the sleeve both, once it's loaded
  const art = new MeshStandardMaterial({ color: "#e9dcc0", roughness: 0.6 });
  if (cover) showPicture(palette, art, cover, 1);
  const label = mesh(new CircleGeometry(0.045, 40), art, platterX, top + 0.0215, platterZ);
  label.rotation.x = -Math.PI / 2;
  label.castShadow = false;
  player.add(label);
  player.add(cylinder(0.0035, 0.0035, 0.014, palette.chrome, platterX, top + 0.025, platterZ, 12));

  // The tonearm, from its pivot at the back right down onto the record
  const pivotX = deckX + 0.16;
  const pivotZ = deckZ - 0.1;
  player.add(cylinder(0.028, 0.03, 0.02, aluminium, pivotX, top + 0.01, pivotZ, 32));
  player.add(cylinder(0.008, 0.008, 0.05, palette.chrome, pivotX, top + 0.045, pivotZ, 16));
  const toX = platterX + 0.03 - pivotX;
  const toZ = platterZ + 0.105 - pivotZ;
  const reach = Math.hypot(toX, toZ);
  const arm = new Group();
  arm.position.set(pivotX, top + 0.062, pivotZ);
  // Turned toward the record, then tipped down onto it
  arm.rotation.set(Math.atan2(0.035, reach), Math.atan2(toX, toZ), 0, "YXZ");
  const tube = cylinder(0.0045, 0.0045, reach, palette.chrome, 0, 0, reach / 2, 12);
  tube.rotation.x = Math.PI / 2;
  arm.add(tube);
  const weight = cylinder(0.018, 0.018, 0.035, palette.blackMetal, 0, 0, -0.04, 24);
  weight.rotation.x = Math.PI / 2;
  arm.add(weight);
  arm.add(box(0.024, 0.006, 0.042, palette.chrome, 0, -0.002, reach));
  arm.add(box(0.014, 0.012, 0.02, palette.blackPlastic, 0, -0.01, reach + 0.004));
  player.add(arm);

  // Its knobs: the speed at the front left, start at the front right
  player.add(cylinder(0.013, 0.013, 0.008, aluminium, deckX - 0.18, top + 0.004, deckZ + 0.14, 20));
  player.add(cylinder(0.011, 0.011, 0.006, aluminium, deckX + 0.17, top + 0.003, deckZ + 0.14, 20));

  // The sleeve, standing on the cabinet's right, leaning on the wall
  const leaning = new Group();
  leaning.position.set(width / 2 - 0.175, height, 0.05);
  leaning.rotation.x = -0.12;
  leaning.add(box(sleeve, sleeve, 0.004, palette.paper, 0, sleeve / 2, 0));
  const front = mesh(new PlaneGeometry(sleeve - 0.006, sleeve - 0.006), art, 0, sleeve / 2, 0.0021);
  front.castShadow = false;
  leaning.add(front);
  player.add(leaning);

  return markHotspot(player, { label: "Record player", target: "music" });
};

/** The desk chair, around its middle, facing its -z. */
export const createChair = (palette: Palette) => {
  const chair = new Group();
  const leather = palette.chair;
  chair.add(rounded(0.52, 0.1, 0.5, 0.04, leather, 0, 0.5, 0));
  const back = rounded(0.5, 0.72, 0.1, 0.05, leather, 0, 0.9, 0.22);
  back.rotation.x = 0.12;
  chair.add(back);
  chair.add(rounded(0.3, 0.14, 0.09, 0.04, leather, 0, 1.3, 0.27));
  for (const side of [-1, 1]) {
    chair.add(rounded(0.07, 0.03, 0.3, 0.012, palette.blackPlastic, side * 0.29, 0.72, 0.02));
    chair.add(box(0.03, 0.2, 0.03, palette.blackPlastic, side * 0.29, 0.6, 0.02));
  }
  chair.add(cylinder(0.025, 0.025, 0.4, palette.blackMetal, 0, 0.25, 0));
  for (let spoke = 0; spoke < 5; spoke++) {
    const angle = (spoke / 5) * Math.PI * 2;
    const arm = rounded(0.34, 0.03, 0.05, 0.01, palette.blackMetal, Math.cos(angle) * 0.17, 0.04, Math.sin(angle) * 0.17);
    arm.rotation.y = -angle;
    chair.add(arm);
    chair.add(mesh(new SphereGeometry(0.03, 12, 8), palette.rubber, Math.cos(angle) * 0.32, 0.03, Math.sin(angle) * 0.32));
  }
  return chair;
};

// ── The shelves with the gear ───────────────────────────────────────────────

const named = (id: string) => gear.find((item) => item.id === id)?.name ?? id;

// A lens barrel pointing +z, with its rings and glass
const lens = (palette: Palette, radius: number, length: number) => {
  const barrel = new Group();
  const body = cylinder(radius, radius * 1.05, length, palette.camera, 0, 0, length / 2, 28);
  body.rotation.x = Math.PI / 2;
  barrel.add(body);
  for (const at of [0.3, 0.7]) {
    barrel.add(mesh(new TorusGeometry(radius * 1.02, radius * 0.08, 8, 28), palette.cameraTrim, 0, 0, length * at));
  }
  const glass = cylinder(radius * 0.72, radius * 0.72, 0.004, palette.glass, 0, 0, length + 0.001, 24);
  glass.rotation.x = Math.PI / 2;
  barrel.add(glass);
  return barrel;
};

/**
 * Two shelves with the cameras, the lens and the film. Its own origin is on
 * the wall behind, at the floor; the shelves run along its x and stand out
 * along its +z.
 */
export const createShelves = (palette: Palette) => {
  const shelves = new Group();
  const upper = 1.95;
  const lower = 1.58;
  const out = 0.12;
  const wood = woodMaterial(palette, 1, 0.3);

  for (const y of [upper, lower]) {
    shelves.add(rounded(0.78, 0.028, 0.24, 0.004, wood, 0, y, out));
    for (const x of [-0.34, 0.34]) {
      shelves.add(box(0.02, 0.02, 0.2, palette.blackMetal, x, y - 0.024, 0.1));
      shelves.add(box(0.02, 0.16, 0.02, palette.blackMetal, x, y - 0.1, 0.01));
    }
  }
  const top = upper + 0.014;

  // The RZ67: a box of a body with its finder on top, the lens out front
  // and the focus knob on the side
  const rz67 = new Group();
  rz67.position.set(0.225, top, out);
  rz67.add(rounded(0.11, 0.12, 0.1, 0.008, palette.camera, 0, 0.06, 0));
  rz67.add(rounded(0.085, 0.045, 0.085, 0.006, palette.camera, 0, 0.14, 0));
  rz67.add(box(0.07, 0.004, 0.07, palette.glass, 0, 0.163, 0));
  const rzLens = lens(palette, 0.042, 0.09);
  rzLens.position.set(0, 0.06, 0.05);
  rz67.add(rzLens);
  const knob = cylinder(0.022, 0.022, 0.012, palette.cameraTrim, 0.06, 0.05, 0, 20);
  knob.rotation.z = Math.PI / 2;
  rz67.add(knob);
  shelves.add(markHotspot(rz67, { label: named("mamiya-rz67"), target: "gear" }));

  // The M645, smaller, with its prism
  const m645 = new Group();
  m645.position.set(-0.025, top, out);
  m645.add(rounded(0.08, 0.075, 0.09, 0.006, palette.camera, 0, 0.0375, 0));
  m645.add(rounded(0.05, 0.035, 0.05, 0.005, palette.camera, 0, 0.09, 0));
  const mLens = lens(palette, 0.03, 0.065);
  mLens.position.set(0, 0.04, 0.045);
  m645.add(mLens);
  shelves.add(markHotspot(m645, { label: named("mamiya-m645"), target: "gear" }));

  // The 110mm, standing on end
  const standing = new Group();
  standing.position.set(-0.225, top, out);
  standing.add(cylinder(0.04, 0.045, 0.1, palette.camera, 0, 0.05, 0, 28));
  standing.add(mesh(new TorusGeometry(0.041, 0.004, 8, 28), palette.cameraTrim, 0, 0.065, 0).rotateX(Math.PI / 2));
  standing.add(cylinder(0.03, 0.03, 0.004, palette.glass, 0, 0.102, 0, 24));
  shelves.add(markHotspot(standing, { label: named("mamiya-sekor-z-110mm"), target: "gear" }));

  // The film, boxes in a row on the lower shelf, each with its label
  const films: [string, string, string][] = [
    ["kodak-ektar-100", "#f3c300", "#d11a2a"],
    ["kodak-gold-200", "#f3c300", "#2a2a2a"],
    ["kodak-tmax-100", "#1d1d1d", "#f3c300"],
    ["cinestill-bwxx", "#3a3a3a", "#e8e8e8"],
  ];
  films.forEach(([id, color, band], index) => {
    const film = new Group();
    film.position.set(0.315 - index * 0.075, lower + 0.014, out);
    film.add(rounded(0.044, 0.064, 0.042, 0.003, standard(color, { roughness: 0.7 }), 0, 0.032, 0));
    film.add(box(0.038, 0.018, 0.002, standard(band, { roughness: 0.7 }), 0, 0.02, 0.0215));
    shelves.add(markHotspot(film, { label: named(id), target: "gear" }));
  });

  // A small plant at the end of the lower shelf
  const plant = createPlant(palette, 0.05, 0.09, 14, 0.13);
  plant.position.set(-0.325, lower + 0.014, out);
  shelves.add(plant);

  return shelves;
};

// ── Guitars ─────────────────────────────────────────────────────────────────

// Half of a dreadnought's outline, mirrored: the body about the origin, in
// the x and y plane, 0.4 wide and 0.52 tall
const acousticOutline = () => {
  const shape = new Shape();
  shape.moveTo(0, -0.26);
  shape.bezierCurveTo(0.14, -0.26, 0.21, -0.18, 0.2, -0.08);
  shape.bezierCurveTo(0.2, 0.0, 0.16, 0.03, 0.155, 0.06);
  shape.bezierCurveTo(0.15, 0.1, 0.17, 0.12, 0.17, 0.17);
  shape.bezierCurveTo(0.17, 0.24, 0.1, 0.26, 0, 0.26);
  shape.bezierCurveTo(-0.1, 0.26, -0.17, 0.24, -0.17, 0.17);
  shape.bezierCurveTo(-0.17, 0.12, -0.15, 0.1, -0.155, 0.06);
  shape.bezierCurveTo(-0.16, 0.03, -0.2, 0.0, -0.2, -0.08);
  shape.bezierCurveTo(-0.21, -0.18, -0.14, -0.26, 0, -0.26);
  const hole = new Path();
  hole.absarc(0, 0.07, 0.045, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
};

// A strat's outline, with its horns, about the origin
const electricOutline = () => {
  const shape = new Shape();
  shape.moveTo(0, -0.21);
  shape.bezierCurveTo(0.12, -0.21, 0.17, -0.14, 0.16, -0.06);
  shape.bezierCurveTo(0.155, 0.0, 0.12, 0.02, 0.12, 0.06);
  shape.bezierCurveTo(0.12, 0.12, 0.14, 0.17, 0.1, 0.2);
  shape.bezierCurveTo(0.07, 0.22, 0.06, 0.17, 0.05, 0.14);
  shape.bezierCurveTo(0.03, 0.11, -0.03, 0.11, -0.05, 0.14);
  shape.bezierCurveTo(-0.07, 0.19, -0.08, 0.24, -0.12, 0.22);
  shape.bezierCurveTo(-0.16, 0.19, -0.15, 0.1, -0.14, 0.05);
  shape.bezierCurveTo(-0.13, 0.0, -0.17, -0.06, -0.16, -0.1);
  shape.bezierCurveTo(-0.15, -0.17, -0.1, -0.21, 0, -0.21);
  return shape;
};

// A body cut from a shape, this thick, with a bevelled edge. Its picture is
// laid over the body's own coordinates, this wide, centred
const body = (shape: Shape, depth: number, bevel: number, material: Material, span: number) => {
  const made = mesh(
    new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 32,
    }),
    material,
    0,
    0,
    -depth / 2,
  );
  if (material instanceof MeshStandardMaterial) {
    for (const map of [material.map, material.bumpMap]) {
      if (!map) continue;
      map.repeat.set(1 / span, 1 / span);
      map.offset.set(0.5, 0.5);
    }
  }
  return made;
};

// The neck up +y from `from`, with its fretboard, frets, headstock and tuners
const neck = (
  palette: Palette,
  group: Group,
  from: number,
  length: number,
  surface: number,
  wood: Material,
  board: Material,
) => {
  const middle = from + length / 2;
  group.add(rounded(0.046, length, 0.022, 0.006, wood, 0, middle, surface - 0.013));
  group.add(box(0.047, length - 0.02, 0.005, board, 0, middle, surface));
  // Frets, closer together up the neck
  for (let fret = 1; fret <= 12; fret++) {
    const at = from + length * (1 - 0.5 ** (fret / 12)) * 1.45;
    if (at > from + length - 0.02) break;
    group.add(box(0.047, 0.003, 0.002, palette.string, 0, at, surface + 0.003));
  }
  group.add(rounded(0.078, 0.17, 0.016, 0.004, wood, 0, from + length + 0.08, surface - 0.012));
  for (let tuner = 0; tuner < 3; tuner++) {
    for (const side of [-1, 1]) {
      const peg = cylinder(0.006, 0.006, 0.022, palette.chrome, side * 0.045, from + length + 0.04 + tuner * 0.04, surface - 0.012, 10);
      peg.rotation.z = Math.PI / 2;
      group.add(peg);
    }
  }
  // The strings, from the bridge up to the nut
  for (let string = 0; string < 6; string++) {
    const wire = box(0.0012, length + 0.32, 0.0012, palette.string, -0.0175 + string * 0.007, from + 0.11, surface + 0.006);
    wire.castShadow = false;
    group.add(wire);
  }
};

/**
 * An acoustic on its hanger, its top facing +z and its neck up +y, the body
 * at the origin. The hanger is behind it, at the wall.
 */
export const createAcoustic = (palette: Palette, top: Surface, label: string) => {
  const guitar = new Group();
  guitar.add(body(acousticOutline(), 0.1, 0.012, painted(top, 1, 1, { roughness: 0.4, bump: 0.004 }), 0.56));
  // The dark inside, seen through the soundhole
  const inside = cylinder(0.06, 0.06, 0.004, standard("#17100a"), 0, 0.07, 0.02, 24);
  inside.rotation.x = Math.PI / 2;
  guitar.add(inside);
  guitar.add(mesh(new TorusGeometry(0.05, 0.004, 6, 32), palette.rosewood, 0, 0.07, 0.062));
  guitar.add(rounded(0.15, 0.014, 0.024, 0.004, palette.rosewood, 0, -0.07, 0.064));
  neck(palette, guitar, 0.24, 0.5, 0.064, woodMaterial(palette, 0.2, 1), palette.rosewood);
  guitar.add(box(0.08, 0.03, 0.04, palette.blackMetal, 0, 0.75, -0.045));
  return markHotspot(guitar, { label, target: "gear" });
};

/** The electric on its stand, around the stand's middle on the floor. */
export const createElectric = (palette: Palette) => {
  const stand = new Group();
  const guitar = new Group();
  guitar.add(body(electricOutline(), 0.045, 0.008, standard("#9ec5d6", { roughness: 0.3 }), 0.5));
  guitar.add(rounded(0.17, 0.25, 0.004, 0.02, palette.cream, -0.03, 0.0, 0.034));
  for (const y of [0.08, 0.0, -0.07]) {
    guitar.add(rounded(0.07, 0.018, 0.006, 0.002, palette.paper, 0, y, 0.038));
  }
  for (const [kx, ky] of [
    [0.11, -0.1],
    [0.11, -0.15],
  ]) {
    guitar.add(cylinder(0.012, 0.012, 0.012, palette.paper, kx, ky, 0.04, 16).rotateX(Math.PI / 2));
  }
  guitar.add(rounded(0.07, 0.016, 0.016, 0.003, palette.chrome, 0, -0.13, 0.038));
  neck(palette, guitar, 0.19, 0.5, 0.036, palette.maple, palette.maple);
  guitar.position.set(0, 0.26, 0.02);
  guitar.rotation.x = -0.12;
  stand.add(markHotspot(guitar, { label: named("ibanez-azes31"), target: "gear" }));

  for (const side of [-1, 1]) {
    const leg = cylinder(0.008, 0.008, 0.36, palette.blackMetal, side * 0.09, 0.17, -0.06, 10);
    leg.rotation.x = -0.35;
    leg.rotation.z = side * 0.28;
    stand.add(leg);
    stand.add(box(0.02, 0.025, 0.09, palette.rubber, side * 0.11, 0.015, 0.04));
  }
  stand.add(cylinder(0.008, 0.008, 0.6, palette.blackMetal, 0, 0.3, -0.07, 10));
  return stand;
};

export const guitarName = named("epiphone-hummingbird");

// ── Plants and the lamp ─────────────────────────────────────────────────────

/**
 * A pot with a head of leaves, on the floor at its own origin: `leaves`
 * painted leaves, each about `leaf` long, fanning out and up from the stem.
 */
export const createPlant = (
  palette: Palette,
  potRadius: number,
  potHeight: number,
  leaves: number,
  leaf: number,
  pot: Material = palette.terracotta,
) => {
  const plant = new Group();
  plant.add(cylinder(potRadius, potRadius * 0.8, potHeight, pot, 0, potHeight / 2, 0, 24));
  plant.add(mesh(new TorusGeometry(potRadius, potRadius * 0.09, 8, 28), pot, 0, potHeight, 0).rotateX(Math.PI / 2));
  plant.add(cylinder(potRadius * 0.9, potRadius * 0.9, 0.01, standard("#2b2016"), 0, potHeight - 0.01, 0, 20));

  // Each leaf is a picture on a plane, its stalk end at the stem, leaning
  // out and up. The plane is 1 wide and 2 tall, from its base
  const blade = new PlaneGeometry(1, 2, 1, 4);
  blade.translate(0, 1, 0);
  const heads = new InstancedMesh(blade, palette.leaf, leaves);
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const euler = new Euler();
  const scale = new Vector3();
  const position = new Vector3();
  for (let i = 0; i < leaves; i++) {
    const angle = i * 2.399 + 0.3;
    const length = leaf * (0.7 + 0.6 * (((i * 7919) % 100) / 100));
    const lean = 0.5 + 0.9 * (((i * 104729) % 100) / 100);
    position.set(Math.cos(angle) * potRadius * 0.2, potHeight + 0.02 + ((i * 31) % 5) * 0.012, Math.sin(angle) * potRadius * 0.2);
    euler.set(-lean, -angle + Math.PI / 2, 0, "YXZ");
    quaternion.setFromEuler(euler);
    scale.set(length * 0.45, length * 0.5, 1);
    matrix.compose(position, quaternion, scale);
    heads.setMatrixAt(i, matrix);
  }
  heads.castShadow = true;
  heads.receiveShadow = true;
  plant.add(heads);
  return plant;
};

/**
 * The pendant: its own origin is where it hangs from the ceiling, the cord
 * down to the socket and the bulb, and the bulb's light.
 */
export const createLamp = (palette: Palette) => {
  const lamp = new Group();
  const drop = 0.8;
  lamp.add(cylinder(0.004, 0.004, drop - 0.07, palette.blackPlastic, 0, -(drop - 0.07) / 2, 0, 8));
  lamp.add(cylinder(0.014, 0.014, 0.02, palette.blackPlastic, 0, -0.01, 0, 16));
  lamp.add(cylinder(0.02, 0.026, 0.07, palette.blackPlastic, 0, -drop + 0.075, 0, 20));
  const bulbMaterial = standard("#fff1d6", { emissive: "#ffd28a", emissiveIntensity: 0, roughness: 0.2 });
  const bulb = mesh(new SphereGeometry(0.045, 24, 16), bulbMaterial, 0, -drop, 0);
  bulb.castShadow = false;
  lamp.add(bulb);
  const light = new PointLight("#ffb46a", 0, 9, 2);
  light.position.set(0, -drop - 0.03, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.003;
  light.shadow.normalBias = 0.02;
  lamp.add(light);
  return { lamp, bulbMaterial, light };
};

// ── The sun's beams ─────────────────────────────────────────────────────────

// How far into the room a beam is drawn. Past a wall or the floor it's
// hidden by them anyway
const BEAM_LENGTH = 7;

const BEAM_SHADER = {
  vertexShader: /* glsl */ `
    attribute float aAlong;
    varying float vAlong;
    void main() {
      vAlong = aAlong;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uStrength;
    uniform vec3 uColor;
    varying float vAlong;
    void main() {
      float glow = uStrength * pow(1.0 - vAlong, 1.5);
      gl_FragColor = vec4(uColor * glow, glow);
    }
  `,
};

/**
 * The sun's light in the air: a soft prism of light from each pane of the
 * window along the sun's direction, fading as it goes, added over whatever
 * is behind it. Laid along the sun every frame, see `update`.
 */
export const createSunbeams = () => {
  const beams = new Group();
  const material = new ShaderMaterial({
    uniforms: {
      uStrength: { value: 0 },
      uColor: { value: new Color("#ffd9a8") },
    },
    vertexShader: BEAM_SHADER.vertexShader,
    fragmentShader: BEAM_SHADER.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });

  const prisms = Array.from({ length: 4 }, () => {
    const geometry = new BufferGeometry();
    // Four corners at the window, then the same four far along the beam
    const positions = new Float32Array(24);
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aAlong", new BufferAttribute(new Float32Array([0, 0, 0, 0, 1, 1, 1, 1]), 1));
    geometry.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 4, 5, 6, 4, 6, 7]);
    const prism = new Mesh(geometry, material);
    prism.frustumCulled = false;
    prism.renderOrder = 10;
    beams.add(prism);
    return { geometry, positions };
  });

  // Lays the beams from the window's panes along the way from the sun
  const update = (toSun: Vector3, strength: number, panes: Vector3[][]) => {
    material.uniforms.uStrength.value = strength;
    beams.visible = strength > 0.002;
    if (!beams.visible) return;
    prisms.forEach(({ geometry, positions }, index) => {
      const pane = panes[index];
      if (!pane) return;
      pane.forEach((corner, at) => {
        positions[at * 3] = corner.x;
        positions[at * 3 + 1] = corner.y;
        positions[at * 3 + 2] = corner.z;
        positions[12 + at * 3] = corner.x - toSun.x * BEAM_LENGTH;
        positions[12 + at * 3 + 1] = corner.y - toSun.y * BEAM_LENGTH;
        positions[12 + at * 3 + 2] = corner.z - toSun.z * BEAM_LENGTH;
      });
      geometry.attributes.position.needsUpdate = true;
    });
  };

  return { beams, update };
};

// ── Decoration ──────────────────────────────────────────────────────────────

const pictures = new TextureLoader();

// What a picture's material shows until its picture comes: white, under
// the material's own colour. With a picture from the start, the material is
// built for one, and the real one coming later doesn't build it again
const blankPicture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
blankPicture.colorSpace = SRGBColorSpace;
blankPicture.needsUpdate = true;

// Lays a picture over a material, cropped to fill it like object-fit: cover,
// once it has loaded
const showPicture = (
  palette: Palette,
  material: MeshStandardMaterial,
  url: string,
  aspect: number,
) => {
  // Its picture comes later: never merged into a plain colour, see merge.ts
  material.userData.isPicture = true;
  material.map = blankPicture;
  pictures.load(url, (texture) => {
    if (palette.isDisposed) {
      texture.dispose();
      return;
    }
    texture.colorSpace = SRGBColorSpace;
    palette.textures.push(texture);
    const { width, height } = texture.image as { width: number; height: number };
    const imageAspect = width / height;
    if (imageAspect > aspect) {
      texture.repeat.set(aspect / imageAspect, 1);
      texture.offset.set((1 - texture.repeat.x) / 2, 0);
    } else {
      texture.repeat.set(1, imageAspect / aspect);
      texture.offset.set(0, (1 - texture.repeat.y) / 2);
    }
    material.map = texture;
    material.color.set("#ffffff");
    material.needsUpdate = true;
  });
};

export type FrameStyle = "black" | "wood" | "white";

// The frames on the walls: how large the picture is, how it's framed, and
// which of the site's pictures hangs in it
export const FRAMES = {
  frameLarge: { width: 0.72, height: 0.52, style: "wood", picture: 0 },
  framePortrait: { width: 0.36, height: 0.46, style: "black", picture: 1 },
  frameSmall: { width: 0.24, height: 0.3, style: "white", picture: 2 },
  frameSquare: { width: 0.3, height: 0.3, style: "black", picture: 3 },
  frameLeftTall: { width: 0.4, height: 0.52, style: "black", picture: 4 },
  frameLeftSmall: { width: 0.26, height: 0.33, style: "wood", picture: 5 },
  frameNear: { width: 0.5, height: 0.38, style: "white", picture: 6 },
  frameRight: { width: 0.6, height: 0.44, style: "wood", picture: 7 },
} as const satisfies Record<string, { width: number; height: number; style: FrameStyle; picture: number }>;

/**
 * A framed picture with a mat, its face toward +z and its back on the wall,
 * centred on its own origin. Until the picture is in, and without one, the
 * mat holds a plain paper.
 */
export const createFrame = (
  palette: Palette,
  width: number,
  height: number,
  style: FrameStyle,
  picture: string | undefined,
) => {
  const frame = new Group();
  const border = 0.035;
  const material =
    style === "black"
      ? palette.pictureFrame
      : style === "wood"
        ? woodMaterial(palette, 0.4, 0.4)
        : palette.frame;
  frame.add(rounded(width + border * 2, height + border * 2, 0.03, 0.004, material, 0, 0, 0.015));
  frame.add(box(width, height, 0.004, palette.paper, 0, 0, 0.031));
  const inset = Math.min(width, height) * 0.12;
  const art = new MeshStandardMaterial({ color: "#b8ae9c", roughness: 0.8 });
  const face = mesh(new PlaneGeometry(width - inset * 2, height - inset * 2), art, 0, 0, 0.0335);
  face.castShadow = false;
  frame.add(face);
  if (picture) showPicture(palette, art, picture, (width - inset * 2) / (height - inset * 2));
  return frame;
};

const blade = () => {
  // A leaf's plane, 1 wide and 2 long, from its stalk end
  const geometry = new PlaneGeometry(1, 2, 1, 2);
  geometry.translate(0, 1, 0);
  return geometry;
};

/**
 * A trailing stem of small leaves, hanging from its own origin, this long,
 * drifting out along +z as it falls.
 */
export const createVine = (palette: Palette, length: number, leaves: number, seed = 0) => {
  const vine = new Group();
  const points = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return new Vector3(Math.sin(t * 3 + seed) * 0.03, -t * length, 0.02 + t * t * 0.08);
  });
  const curve = new CatmullRomCurve3(points);
  vine.add(mesh(new TubeGeometry(curve, 24, 0.0025, 5, false), palette.stem));

  const heads = new InstancedMesh(blade(), palette.leaf, leaves);
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const euler = new Euler();
  const scale = new Vector3();
  for (let i = 0; i < leaves; i++) {
    const t = (i + 0.5) / leaves;
    const side = i % 2 === 0 ? 1 : -1;
    const size = (0.035 + 0.02 * (((i * 13 + seed * 7) % 10) / 10)) * (1 - t * 0.35);
    // Out to the side and a little down, spun about the stem
    euler.set(0.3, seed + i * 1.7, side * (Math.PI / 2 + 0.3), "YXZ");
    quaternion.setFromEuler(euler);
    scale.set(size * 0.6, size * 0.5, 1);
    matrix.compose(curve.getPoint(t), quaternion, scale);
    heads.setMatrixAt(i, matrix);
  }
  heads.castShadow = true;
  heads.receiveShadow = true;
  vine.add(heads);
  return vine;
};

/** A small plant in a pot with vines trailing over the edge, standing at its own origin. */
const trailingPlant = (palette: Palette, vines: number, seed: number) => {
  const plant = createPlant(palette, 0.05, 0.085, 12, 0.11, palette.ceramic);
  for (let i = 0; i < vines; i++) {
    const angle = seed + (i / vines) * Math.PI * 2;
    const vine = createVine(palette, 0.3 + 0.18 * ((i * 7 + seed) % 3), 12, seed + i);
    vine.position.set(Math.cos(angle) * 0.045, 0.08, Math.sin(angle) * 0.045);
    vine.rotation.y = Math.PI / 2 - angle;
    plant.add(vine);
  }
  return plant;
};

const BOOK_COLORS = ["#7a3b2e", "#2f4858", "#c8b48a", "#5b6b4a", "#8c6a4a", "#3b3b3b", "#d9cfbd", "#9a5b3c"];

/**
 * A floating shelf: books, a candle and a trailing plant, or a stack of
 * books, a jar, an old camera and a trailing plant. Its own origin is on
 * the wall at the board's height; the board runs along x and stands out
 * along +z.
 */
export const createWallShelf = (palette: Palette, variant: "books" | "trinkets") => {
  const shelf = new Group();
  const length = 0.8;
  const depth = 0.22;
  shelf.add(rounded(length, 0.028, depth, 0.004, woodMaterial(palette, 1, 0.3), 0, 0, depth / 2));
  for (const x of [-0.3, 0.3]) {
    shelf.add(box(0.02, 0.02, depth - 0.03, palette.blackMetal, x, -0.024, depth / 2 - 0.01));
    shelf.add(box(0.02, 0.14, 0.02, palette.blackMetal, x, -0.09, 0.01));
  }
  const top = 0.014;
  const book = (color: string) => standard(color, { roughness: 0.8 });

  if (variant === "books") {
    // A row of books, the last one leaning on the others
    let x = -0.37;
    for (let i = 0; i < 8; i++) {
      const thickness = 0.024 + ((i * 37) % 5) * 0.006;
      const height = 0.17 + ((i * 53) % 7) * 0.012;
      const spine = rounded(thickness, height, 0.15, 0.003, book(BOOK_COLORS[i]), x + thickness / 2, top + height / 2, 0.1);
      if (i === 7) {
        spine.rotation.z = -0.3;
        spine.position.x += 0.03;
        spine.position.y -= 0.01;
      }
      shelf.add(spine);
      x += thickness + 0.003;
    }
    shelf.add(cylinder(0.042, 0.042, 0.008, palette.brass, 0.12, top + 0.004, 0.11, 24));
    shelf.add(cylinder(0.026, 0.026, 0.1, palette.paper, 0.12, top + 0.058, 0.11, 24));
  } else {
    // A stack of books lying down, a jar and an old camera
    for (let i = 0; i < 3; i++) {
      const lying = rounded(0.2 - i * 0.02, 0.032, 0.14, 0.003, book(BOOK_COLORS[(i * 3 + 1) % BOOK_COLORS.length]), -0.24, top + 0.016 + i * 0.033, 0.1);
      lying.rotation.y = (i - 1) * 0.08;
      shelf.add(lying);
    }
    shelf.add(cylinder(0.04, 0.04, 0.11, palette.glass, -0.04, top + 0.055, 0.1, 24));
    shelf.add(cylinder(0.042, 0.042, 0.02, palette.brass, -0.04, top + 0.12, 0.1, 24));
    const camera = new Group();
    camera.position.set(0.1, top, 0.1);
    camera.rotation.y = -0.3;
    camera.add(rounded(0.12, 0.07, 0.05, 0.006, palette.camera, 0, 0.035, 0));
    camera.add(cylinder(0.022, 0.024, 0.035, palette.camera, 0, 0.035, 0.04, 24).rotateX(Math.PI / 2));
    camera.add(cylinder(0.016, 0.016, 0.003, palette.glass, 0, 0.035, 0.058, 20).rotateX(Math.PI / 2));
    shelf.add(camera);
  }

  const plant = trailingPlant(palette, 3, variant === "books" ? 1 : 4);
  plant.position.set(0.3, top, 0.11);
  shelf.add(plant);
  return shelf;
};

/**
 * A plant hanging from the ceiling, its pot on three cords and its vines
 * trailing. Its own origin is the hook.
 */
export const createHangingPlant = (palette: Palette) => {
  const plant = new Group();
  const drop = 0.55;
  const rim = 0.11;
  plant.add(cylinder(0.012, 0.012, 0.02, palette.brass, 0, -0.01, 0, 12));
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const cord = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(Math.cos(angle) * rim, -drop, Math.sin(angle) * rim),
    ]);
    plant.add(mesh(new TubeGeometry(cord, 2, 0.003, 5, false), palette.paper));
  }
  const potHeight = 0.13;
  const pot = createPlant(palette, 0.12, potHeight, 18, 0.16, palette.ceramic);
  pot.position.y = -drop - potHeight + 0.01;
  plant.add(pot);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.4;
    const vine = createVine(palette, 0.45 + 0.12 * (i % 3), 16, i * 2);
    vine.position.set(Math.cos(angle) * 0.1, -drop, Math.sin(angle) * 0.1);
    vine.rotation.y = Math.PI / 2 - angle;
    plant.add(vine);
  }
  return plant;
};

/**
 * A tall plant on the floor: three stems from a ceramic pot, broad leaves
 * along them. Standing at its own origin.
 */
export const createTallPlant = (palette: Palette) => {
  const plant = new Group();
  const potRadius = 0.17;
  const potHeight = 0.36;
  plant.add(cylinder(potRadius, potRadius * 0.82, potHeight, palette.ceramic, 0, potHeight / 2, 0, 32));
  plant.add(cylinder(potRadius * 0.92, potRadius * 0.92, 0.01, standard("#2b2016"), 0, potHeight - 0.012, 0, 24));

  const stems = [
    { height: 1.3, lean: 0.12, turn: 0.3 },
    { height: 1.05, lean: 0.22, turn: 2.4 },
    { height: 0.85, lean: 0.28, turn: 4.4 },
  ];
  const perStem = 9;
  const heads = new InstancedMesh(blade(), palette.leaf, stems.length * perStem);
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const euler = new Euler();
  const scale = new Vector3();
  let count = 0;
  for (const { height, lean, turn } of stems) {
    const out = new Vector3(Math.cos(turn), 0, Math.sin(turn));
    const curve = new CatmullRomCurve3([
      new Vector3(0, potHeight - 0.01, 0),
      new Vector3(0, potHeight + height * 0.5, 0).addScaledVector(out, lean * height * 0.3),
      new Vector3(0, potHeight + height, 0).addScaledVector(out, lean * height),
    ]);
    plant.add(mesh(new TubeGeometry(curve, 16, 0.009, 6, false), palette.stem));
    for (let i = 0; i < perStem; i++) {
      const t = 0.35 + (0.65 * i) / (perStem - 1);
      const side = i % 2 === 0 ? 1 : -1;
      const size = 0.16 + 0.1 * (((i * 31) % 10) / 10);
      euler.set(0.2, turn + i * 2.3, side * 0.9, "YXZ");
      quaternion.setFromEuler(euler);
      scale.set(size * 0.55, size * 0.5, 1);
      matrix.compose(curve.getPoint(t), quaternion, scale);
      heads.setMatrixAt(count++, matrix);
    }
  }
  heads.castShadow = true;
  heads.receiveShadow = true;
  plant.add(heads);
  return plant;
};
