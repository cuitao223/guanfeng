import * as THREE from "three";
import { gridBounds } from "../logic/grid.mjs";

const FIELD_FRAGMENT = `
precision highp float;
uniform sampler2D uSpeedTex;
uniform sampler2D uLutTex;
uniform vec2 uGridSize;
uniform float uOpacity;
uniform float uContiguous;
varying vec2 vUv;
void main() {
  vec2 uv = clamp(vUv, 0.0, 0.999999);
  float gx = uGridSize.x;
  float gy = uGridSize.y;
  vec2 tc;
  if (uContiguous > 0.5) {
    tc = vec2(uv.x, 1.0 - uv.y);
  } else {
    float cellX = min(gx - 1.0, floor(uv.x * gx));
    float cellY = min(gy - 1.0, floor((1.0 - vUv.y) * gy));
    tc = (vec2(cellX, cellY) + 0.5) / vec2(gx, gy);
  }
  vec4 texel = texture2D(uSpeedTex, tc);
  if (texel.a < 0.5) discard;
  float speedN = clamp(texel.r, 0.0, 0.999999);
  vec4 color = texture2D(uLutTex, vec2(speedN, 0.5));
  gl_FragColor = vec4(color.rgb, uOpacity);
}
`;

const FIELD_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export function planeGeometry(customCoords, header, z) {
  const bounds = gridBounds(header);
  const tl = customCoords.lngLatsToCoords(header.displayCorners?.tl || [bounds.west, bounds.north])[0];
  const tr = customCoords.lngLatsToCoords(header.displayCorners?.tr || [bounds.east, bounds.north])[0];
  const bl = customCoords.lngLatsToCoords(header.displayCorners?.bl || [bounds.west, bounds.south])[0];
  const br = customCoords.lngLatsToCoords(header.displayCorners?.br || [bounds.east, bounds.south])[0];
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([
      bl[0], bl[1], z,
      br[0], br[1], z,
      tr[0], tr[1], z,
      tl[0], tl[1], z,
    ], 3),
  );
  geom.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geom.setIndex([0, 1, 2, 0, 2, 3]);
  return geom;
}

export function rgbaTexture(data, width, height, linear) {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  const filter = linear ? THREE.LinearFilter : THREE.NearestFilter;
  texture.needsUpdate = true;
  texture.minFilter = filter;
  texture.magFilter = filter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function fieldMaterial(speedTex, lutTex, width, height, opacity, depthWrite, contiguous) {
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: true,
    depthWrite,
    uniforms: {
      uSpeedTex: { value: speedTex },
      uLutTex: { value: lutTex },
      uGridSize: { value: new THREE.Vector2(width, height) },
      uOpacity: { value: opacity },
      uContiguous: { value: contiguous ? 1 : 0 },
    },
    vertexShader: FIELD_VERTEX,
    fragmentShader: FIELD_FRAGMENT,
  });
  return material;
}

export { FIELD_FRAGMENT };
