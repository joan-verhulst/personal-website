
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

export const SMALL_PART = 0.3;

interface Batch {
  unit: Object3D;
  material: Material | null;
  plain: string | null;
  isSmall: boolean;
  meshes: Mesh[];
}

const alike = (geometries: BufferGeometry[]) =>
  geometries.every(({ index }) => index !== null) || geometries.every(({ index }) => index === null)
    ? geometries
    : geometries.map((geometry) => (geometry.index ? geometry.toNonIndexed() : geometry));

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

export const createMerger = (keep: Set<Material>) => {
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

  return (root: Object3D) => {
    root.updateMatrixWorld(true);
    const batches = new Map<string, Batch>();
    root.traverse((child) => {
      if (!(child instanceof Mesh) || child instanceof InstancedMesh) return;
      const { material, geometry } = child;
      if (Array.isArray(material) || !child.visible) return;
      if (child.userData.keepApart || child.userData.isOutline || child.children.length > 0) return;
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
