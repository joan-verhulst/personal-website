// Every piece of the room is built from dozens of small shapes, and every
// shape is a separate thing for the graphics card to draw: in the picture,
// in each lamp's six shadow views and in each light probe's six. The parts
// of a piece that never move on their own are merged here into one shape
// per material, their outlines with them, so a piece is drawn in a few
// calls instead of dozens. It still moves, hides and colours as a whole.
//
// Plain parts that differ only in colour, like a row of books, merge too:
// their colours go into the shape, one material for all of them. Materials
// the layout tints, or that get a picture later, stay their own.
//
// Clickable things merge within themselves, so each still outlines and
// grows on its own. Small parts merge apart from large ones, so the light
// probes can still leave them out, see room-scene.ts

import {
  type BufferGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { hullGeometry, wantsOutline } from "~/modules/about/room/toon";

// Smaller than this across, a part barely changes how light bounces
export const SMALL_PART = 0.3;

interface Batch {
  unit: Object3D;
  // The parts' own material, or for plain ones, null: they get a shared one
  material: Material | null;
  plain: string | null;
  isSmall: boolean;
  meshes: Mesh[];
}

// A shape rarely has an index where another has one: where they're mixed,
// none keep it
const alike = (geometries: BufferGeometry[]) =>
  geometries.every(({ index }) => index !== null) || geometries.every(({ index }) => index === null)
    ? geometries
    : geometries.map((geometry) => (geometry.index ? geometry.toNonIndexed() : geometry));

// What a plain material is, besides its colour: parts alike in this can
// share one material, each with its colour in its shape. Null for anything
// more than a colour: a picture, a glow, see-through, or tinted by the layout
const plainness = (material: Material, keep: Set<Material>) => {
  if (!(material instanceof MeshStandardMaterial) || keep.has(material)) return null;
  const isPlain =
    !material.map &&
    !material.bumpMap &&
    !material.emissiveMap &&
    !material.vertexColors &&
    !material.transparent &&
    material.alphaTest === 0 &&
    material.emissive.getHex() === 0 &&
    !material.userData.isPicture;
  return isPlain ? `${material.roughness}|${material.metalness}|${material.side}|${material.flatShading}` : null;
};

/**
 * Makes the merger for one room. `keep` are the materials that stay their
 * own: the ones the layout tints, which merge only with their own kind.
 */
export const createMerger = (keep: Set<Material>) => {
  // One shared material for each kind of plain part, across the room
  const shared = new Map<string, MeshStandardMaterial>();
  const sharedFor = (plain: string, like: MeshStandardMaterial) => {
    const made = shared.get(plain);
    if (made) return made;
    const material = new MeshStandardMaterial({
      color: "#ffffff",
      roughness: like.roughness,
      metalness: like.metalness,
      side: like.side,
      flatShading: like.flatShading,
      vertexColors: true,
    });
    shared.set(plain, material);
    return material;
  };

  const scale = new Vector3();
  const fromUnit = new Matrix4();
  const relative = new Matrix4();

  /** Merges the still parts under `root`, a piece of the room or its shell. */
  return (root: Object3D) => {
    root.updateMatrixWorld(true);
    const batches = new Map<string, Batch>();
    root.traverse((child) => {
      if (!(child instanceof Mesh) || child instanceof InstancedMesh) return;
      const { material, geometry } = child;
      if (Array.isArray(material) || !child.visible) return;
      // Moves on its own, like the duvet breathing, or holds something, like
      // a light: left as it is
      if (child.userData.keepApart || child.userData.isOutline || child.children.length > 0) return;
      // Mirrored: merged, it would turn inside out
      if (child.matrixWorld.determinant() < 0) return;
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      child.getWorldScale(scale);
      const radius = (geometry.boundingSphere?.radius ?? 0) * Math.max(scale.x, scale.y, scale.z);
      const isSmall = radius < SMALL_PART / 2;
      const unit = (child.userData.hotspotGroup as Object3D | undefined) ?? root;
      const attributes = Object.keys(geometry.attributes).sort().join();
      const plain = plainness(material, keep);
      const kind = plain ? `plain|${plain}` : material.uuid;
      const key = [unit.uuid, kind, child.castShadow, child.receiveShadow, isSmall, attributes].join("|");
      const batch = batches.get(key);
      if (batch) batch.meshes.push(child);
      else batches.set(key, { unit, material: plain ? null : material, plain, isSmall, meshes: [child] });
    });

    for (const { unit, material, plain, isSmall, meshes } of batches.values()) {
      if (meshes.length < 2) continue;
      fromUnit.copy(unit.matrixWorld).invert();
      const shapes: BufferGeometry[] = [];
      const outlines: BufferGeometry[] = [];
      for (const mesh of meshes) {
        relative.multiplyMatrices(fromUnit, mesh.matrixWorld);
        const shape = mesh.geometry.clone().applyMatrix4(relative);
        if (plain) {
          // The part's colour, at every corner
          const { r, g, b } = (mesh.material as MeshStandardMaterial).color;
          const count = shape.attributes.position.count;
          const colors = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) colors.set([r, g, b], i * 3);
          shape.setAttribute("color", new Float32BufferAttribute(colors, 3));
        }
        shapes.push(shape);
        if (wantsOutline(mesh)) outlines.push(hullGeometry(mesh.geometry).clone().applyMatrix4(relative));
      }
      const merged = mergeGeometries(alike(shapes));
      const hull = merged && outlines.length > 0 ? mergeGeometries(outlines) : null;
      for (const shape of shapes) shape.dispose();
      for (const outline of outlines) outline.dispose();
      if (!merged) continue;

      const made = new Mesh(
        merged,
        material ?? sharedFor(plain as string, meshes[0].material as MeshStandardMaterial),
      );
      made.castShadow = meshes[0].castShadow;
      made.receiveShadow = meshes[0].receiveShadow;
      made.userData = { ...meshes[0].userData, isSmall };
      if (hull) made.userData.hull = hull;
      else made.userData.noOutline = true;
      unit.add(made);
      for (const mesh of meshes) mesh.removeFromParent();
    }
  };
};
