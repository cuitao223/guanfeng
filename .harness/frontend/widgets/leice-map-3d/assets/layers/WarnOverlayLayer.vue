<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import * as THREE from "three";
import { watch } from "vue";
import { alignCoords, gridBounds } from "../logic/grid.mjs";
import { fieldOpacity, layerDisplayZ, markColor, warnOrder, WARN_Z_OFFSET } from "../logic/stack.mjs";
import { resolveThreshold, warnBoundaryEdges, warnSeverity, warnTexel } from "../logic/warn.mjs";
import { fieldMaterial, planeGeometry, rgbaTexture } from "./fieldMesh.js";
import { useLeiceMap3d } from "./useLeiceMap3d.js";

const WARN_HEX = ["#ffbb00", "#ff5100", "#ff0000"];

function warnLut() {
  const data = new Uint8Array(256 * 4);
  const rgb = WARN_HEX.map((hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);
  for (let k = 0; k < 256; k += 1) {
    const base = k * 4;
    let color = null;
    if (k >= 48 && k < 112) color = rgb[0];
    else if (k >= 112 && k < 176) color = rgb[1];
    else if (k >= 192) color = rgb[2];
    if (!color) continue;
    data[base] = color[0];
    data[base + 1] = color[1];
    data[base + 2] = color[2];
    data[base + 3] = 255;
  }
  return data;
}

function planeCorners(customCoords, header) {
  const bounds = gridBounds(header);
  return {
    bl: customCoords.lngLatsToCoords(header.displayCorners?.bl || [bounds.west, bounds.south])[0],
    br: customCoords.lngLatsToCoords(header.displayCorners?.br || [bounds.east, bounds.south])[0],
    tl: customCoords.lngLatsToCoords(header.displayCorners?.tl || [bounds.west, bounds.north])[0],
    tr: customCoords.lngLatsToCoords(header.displayCorners?.tr || [bounds.east, bounds.north])[0],
  };
}

function pointAt(corners, nx, ny, gx, gy, z) {
  const u = gx / nx;
  const v = 1 - gy / ny;
  const x = (1 - u) * (1 - v) * corners.bl[0]
    + u * (1 - v) * corners.br[0]
    + u * v * corners.tr[0]
    + (1 - u) * v * corners.tl[0];
  const y = (1 - u) * (1 - v) * corners.bl[1]
    + u * (1 - v) * corners.br[1]
    + u * v * corners.tr[1]
    + (1 - u) * v * corners.tl[1];
  return [x, y, z];
}

export default {
  name: "WarnOverlayLayer",
  props: {
    levels: { type: Array, default: () => [] },
    warnType: { type: String, default: "" },
    thresholds: { type: Object, default: () => ({}) },
    heightMode: { type: String, default: "multi" },
    heightSize: { type: Number, default: 1 },
    exaggeration: { type: Number, default: 1 },
    opacity: { type: Number, default: 0.8 },
    mapStyle: { type: String, default: "satellite" },
  },
  setup(props) {
    useLeiceMap3d((ctx) => {
      const groups = [];
      const clear = () => {
        groups.splice(0).forEach((group) => {
          ctx.scene.remove(group);
          group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              const material = child.material;
              if (material.uniforms && material.uniforms.uSpeedTex) material.uniforms.uSpeedTex.value.dispose();
              if (material.uniforms && material.uniforms.uLutTex) material.uniforms.uLutTex.value.dispose();
              material.dispose();
            }
          });
        });
      };
      const redraw = () => {
        clear();
        alignCoords(ctx);
        const configured = props.thresholds && props.thresholds[props.warnType];
        const ready = configured
          && [configured.min, configured.medium, configured.max].every((item) => Number.isFinite(Number(item)));
        if (!props.warnType || !ready) return;
        const threshold = resolveThreshold(props.warnType, props.thresholds[props.warnType]);
        const opacity = fieldOpacity(props.opacity);
        const lineColor = new THREE.Color(markColor(props.mapStyle));
        (props.levels || []).forEach((level) => {
          const values = level.values;
          const header = level.header;
          if (!header || !values || values.length !== header.nx * header.ny) return;
          const severity = new Int8Array(values.length);
          const pixels = new Uint8Array(values.length * 4);
          let visible = false;
          values.forEach((value, index) => {
            const levelIndex = warnSeverity(value, threshold);
            severity[index] = levelIndex;
            if (levelIndex >= 0) visible = true;
            pixels.set(warnTexel(levelIndex), index * 4);
          });
          if (!visible) return;
          const z = layerDisplayZ(level.height, props.heightMode, props.heightSize, props.exaggeration, WARN_Z_OFFSET);
          const order = warnOrder(level.height);
          const fill = new THREE.Mesh(
            planeGeometry(ctx.customCoords, header, z),
            fieldMaterial(
              rgbaTexture(pixels, header.nx, header.ny, false),
              rgbaTexture(warnLut(), 256, 1, false),
              header.nx,
              header.ny,
              opacity,
              false,
              false,
            ),
          );
          fill.renderOrder = order;
          fill.userData.isWarnFill = true;
          const group = new THREE.Group();
          group.name = "warnOverlay";
          group.renderOrder = order;
          group.add(fill);
          const corners = planeCorners(ctx.customCoords, header);
          const lineZ = z + 0.4;
          const positions = [];
          warnBoundaryEdges(severity, header.nx, header.ny).forEach(([x1, y1, x2, y2]) => {
            positions.push(...pointAt(corners, header.nx, header.ny, x1, y1, lineZ));
            positions.push(...pointAt(corners, header.nx, header.ny, x2, y2, lineZ));
          });
          if (positions.length) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
              color: lineColor,
              transparent: true,
              depthTest: true,
              depthWrite: false,
            }));
            lines.renderOrder = order;
            group.add(lines);
          }
          ctx.scene.add(group);
          groups.push(group);
        });
      };
      redraw();
      const stop = watch(
        () => [props.levels, props.warnType, props.thresholds, props.heightMode, props.heightSize, props.exaggeration, props.opacity, props.mapStyle],
        redraw,
      );
      return () => {
        stop();
        clear();
      };
    });
  },
};
</script>

<style>
.leice-map-anchor { display: none; }
</style>
