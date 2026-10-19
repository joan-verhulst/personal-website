// The room's style, in its materials and its models rather than laid over
// the picture: every light falls across a surface in a few flat bands, its
// shadows with hard edges, like cel animation; every object has an outline
// that's part of it, an inside-out copy a little larger, drawn in the line
// colour; and the painted surfaces can be toned down toward flat colour

import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  ShaderChunk,
  ShaderMaterial,
} from "three";

// A share of light, 0 to 1, stepped into uBands flat bands with a soft edge
// uSoftness wide between them. With no bands it stays as it is
const BANDING = /* glsl */ `
  uniform float uBands;
  uniform float uSoftness;
  uniform float uBounce;
  float roomBand( float share ) {
    if ( uBands < 0.5 ) return share;
    float level = share * uBands;
    float edge = clamp( uSoftness, 0.001, 0.5 );
    return ( floor( level ) + smoothstep( 0.5 - edge, 0.5 + edge, fract( level ) ) ) / uBands;
  }
`;

// How much of each light reaches a surface as it turns away from it, banded
const LIGHTS = ShaderChunk.lights_physical_pars_fragment.replace(
  "vec3 irradiance = dotNL * directLight.color;",
  "vec3 irradiance = roomBand( dotNL ) * directLight.color;",
);

// How much of each light its shadows let through, banded, so they have
// edges. And the light bounced around the room, from the probe grid baked
// in room-scene.ts, as strong as the layout asks
const SHADOWS = ShaderChunk.lights_fragment_begin
  .replace(
    /directLight\.color \*= \( directLight\.visible && receiveShadow \) \? (.+?) : 1\.0;/g,
    "directLight.color *= roomBand( ( directLight.visible && receiveShadow ) ? $1 : 1.0 );",
  )
  .replace(
    "irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );",
    "irradiance += uBounce * getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );",
  );

// The room captured as an environment gives reflections only: its diffuse
// light is the probe grid's, which knows where in the room a surface is
const REFLECTIONS = ShaderChunk.lights_fragment_maps.replace(
  "iblIrradiance += getIBLIrradiance( geometryNormal );",
  "",
);

// A surface's picture mixed with its own average colour, read from its
// smallest mipmap: at 0 a painted wall is a flat one
const DETAIL = /* glsl */ `
  #ifdef USE_MAP
    vec4 sampledDiffuseColor = texture2D( map, vMapUv );
    sampledDiffuseColor.rgb = mix( textureLod( map, vMapUv, 12.0 ).rgb, sampledDiffuseColor.rgb, uDetail );
    diffuseColor *= sampledDiffuseColor;
  #endif
`;

// Flat things have no inside to turn out
const FLAT = new Set(["PlaneGeometry", "RingGeometry", "CircleGeometry"]);

/** Whether a mesh gets an outline: solid, painted, and not one of many. */
export const wantsOutline = (mesh: Mesh) =>
  !(mesh instanceof InstancedMesh) &&
  mesh.material instanceof MeshStandardMaterial &&
  !mesh.userData.isOutline &&
  !FLAT.has(mesh.geometry.type);

// Positions closer than this are one corner
const WELD = 1e-4;
// Corners on a grid of WELD, as whole numbers, packed into one number each:
// 17 bits a side covers ±6.5 m, three sides fit in a double exactly
const SIDE = 131_072;
const HALF = SIDE / 2;

const hulls = new WeakMap<BufferGeometry, BufferGeometry>();

/**
 * A shape's outline shape: its corners joined, with normals averaged over
 * the faces around each, so a box's outline is a slightly larger box with
 * no gaps at its edges. Made once per shape.
 */
export const hullGeometry = (geometry: BufferGeometry) => {
  const made = hulls.get(geometry);
  if (made) return made;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const count = index ? index.count : position.count;

  // Each corner's welded number, and the first of its kind
  const welded = new Map<number, number>();
  const remap = new Uint32Array(position.count);
  const corners: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const x = Math.round(position.getX(i) / WELD) + HALF;
    const y = Math.round(position.getY(i) / WELD) + HALF;
    const z = Math.round(position.getZ(i) / WELD) + HALF;
    const key = (x * SIDE + y) * SIDE + z;
    let at = welded.get(key);
    if (at === undefined) {
      at = corners.length / 3;
      welded.set(key, at);
      corners.push(position.getX(i), position.getY(i), position.getZ(i));
    }
    remap[i] = at;
  }

  // The faces, on the welded corners, and each corner's normal from the
  // faces around it, weighted by their size
  const faces = new Uint32Array(count);
  const normals = new Float32Array(corners.length);
  for (let i = 0; i < count; i += 3) {
    const a = remap[index ? index.getX(i) : i];
    const b = remap[index ? index.getX(i + 1) : i + 1];
    const c = remap[index ? index.getX(i + 2) : i + 2];
    faces[i] = a;
    faces[i + 1] = b;
    faces[i + 2] = c;
    const abx = corners[b * 3] - corners[a * 3];
    const aby = corners[b * 3 + 1] - corners[a * 3 + 1];
    const abz = corners[b * 3 + 2] - corners[a * 3 + 2];
    const acx = corners[c * 3] - corners[a * 3];
    const acy = corners[c * 3 + 1] - corners[a * 3 + 1];
    const acz = corners[c * 3 + 2] - corners[a * 3 + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    for (const corner of [a, b, c]) {
      normals[corner * 3] += nx;
      normals[corner * 3 + 1] += ny;
      normals[corner * 3 + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }

  const hull = new BufferGeometry();
  hull.setAttribute("position", new Float32BufferAttribute(corners, 3));
  hull.setAttribute("normal", new BufferAttribute(normals, 3));
  hull.setIndex(new BufferAttribute(faces, 1));
  hulls.set(geometry, hull);
  return hull;
};

export interface Style {
  // Gives every material in it the style, once. Call again for anything new
  style: (root: Object3D) => void;
  // Gives every solid object in it an outline, once
  outline: (root: Object3D) => void;
  setBands: (bands: number, softness: number) => void;
  setDetail: (detail: number) => void;
  // How strong the bounced light from the probe grid is
  setBounce: (bounce: number) => void;
  // Hides the outlines, for a capture of the room's light
  hideOutlines: (isHidden: boolean) => void;
  // Lets go of the outlines of something taken out of the room
  forget: (root: Object3D) => void;
  // Line width in screen pixels, and the size of a pixel one meter from the
  // camera, from its field of view and the canvas's height
  setOutline: (width: number, pixel: number, color: string) => void;
  dispose: () => void;
}

export const createStyle = (): Style => {
  const uniforms = {
    uBands: { value: 0 },
    uSoftness: { value: 0.06 },
    uDetail: { value: 1 },
    uBounce: { value: 1 },
  };
  // The bump of each surface that tones down, as painted
  const bumps = new Map<MeshStandardMaterial, number>();

  const style = (root: Object3D) => {
    root.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const material = child.material;
      if (!(material instanceof MeshStandardMaterial) || material.userData.isStyled) return;
      material.userData.isStyled = true;
      // Pictures that show something stay as they are: the screens and the
      // leaves' cut-outs, and the art in the frames, which loads later
      const tones =
        Boolean(material.map) && !material.emissiveMap && material.alphaTest === 0 && !material.userData.isPicture;
      if (tones) bumps.set(material, material.bumpScale);
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        let fragment = shader.fragmentShader
          .replace("#include <common>", `#include <common>\n${BANDING}`)
          .replace("#include <lights_physical_pars_fragment>", LIGHTS)
          .replace("#include <lights_fragment_begin>", SHADOWS)
          .replace("#include <lights_fragment_maps>", REFLECTIONS);
        if (tones) {
          fragment = fragment
            .replace("void main() {", "uniform float uDetail;\nvoid main() {")
            .replace("#include <map_fragment>", DETAIL);
        }
        shader.fragmentShader = fragment;
      };
      material.customProgramCacheKey = () => (tones ? "room-style-detail" : "room-style");
      material.needsUpdate = true;
    });
  };

  // ── Outlines ─────────────────────────────────────────────────────────────

  // Pushed out along the surface by the same number of screen pixels near
  // or far, drawn from the inside, so only the rim around the object shows
  const line = new ShaderMaterial({
    uniforms: {
      uWidth: { value: 1.4 },
      uPixel: { value: 0.003 },
      uColor: { value: new Color("#21140d") },
    },
    vertexShader: /* glsl */ `
      uniform float uWidth;
      uniform float uPixel;
      void main() {
        vec4 world = modelMatrix * vec4( position, 1.0 );
        vec3 outward = normalize( mat3( modelMatrix ) * normal );
        world.xyz += outward * uWidth * uPixel * distance( cameraPosition, world.xyz );
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4( uColor, 1.0 );
      }
    `,
    side: BackSide,
  });

  // Every outline made, to hide for a capture: hidden as objects, so a
  // capture doesn't even consider them, where a hidden material still would
  const rims: Mesh[] = [];
  let isHidden = false;

  const outline = (root: Object3D) => {
    const meshes: Mesh[] = [];
    root.traverse((child) => {
      if (!(child instanceof Mesh) || child.userData.hasOutline || child.userData.noOutline) return;
      // Merged shapes bring the outlines of their parts, see merge.ts
      if (child.userData.hull || wantsOutline(child)) meshes.push(child);
    });
    for (const mesh of meshes) {
      const rim = new Mesh((mesh.userData.hull as BufferGeometry | undefined) ?? hullGeometry(mesh.geometry), line);
      rim.userData.isOutline = true;
      // Never what the pointer is on: the object inside it is
      rim.raycast = () => {};
      rim.castShadow = false;
      rim.receiveShadow = false;
      rim.visible = !isHidden;
      mesh.add(rim);
      mesh.userData.hasOutline = true;
      rims.push(rim);
    }
  };

  return {
    style,
    outline,
    setBands: (bands, softness) => {
      uniforms.uBands.value = bands;
      uniforms.uSoftness.value = softness;
    },
    setDetail: (detail) => {
      uniforms.uDetail.value = detail;
      for (const [material, bump] of bumps) material.bumpScale = bump * detail;
    },
    setBounce: (bounce) => {
      uniforms.uBounce.value = bounce;
    },
    hideOutlines: (hidden) => {
      if (hidden === isHidden) return;
      isHidden = hidden;
      for (const rim of rims) rim.visible = !hidden;
    },
    forget: (root) => {
      const gone = new Set<Object3D>();
      root.traverse((child) => {
        if (child.userData.isOutline) gone.add(child);
      });
      for (let i = rims.length - 1; i >= 0; i--) if (gone.has(rims[i])) rims.splice(i, 1);
    },
    setOutline: (width, pixel, color) => {
      line.uniforms.uWidth.value = width;
      line.uniforms.uPixel.value = pixel;
      line.visible = width > 0;
      if (line.userData.color !== color) {
        line.userData.color = color;
        line.uniforms.uColor.value.set(color);
      }
    },
    dispose: () => line.dispose(),
  };
};
