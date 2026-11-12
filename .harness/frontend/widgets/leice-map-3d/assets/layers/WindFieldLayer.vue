<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import * as THREE from "three";
import { watch } from "vue";
import { alignCoords, bilinearGrid, contourGridScale, softBilinearGrid, speedTexel } from "../logic/grid.mjs";
import { colorForSpeed, WIND_LEGEND_COLORS, WIND_LEGEND_MAX, WIND_LEGEND_MIN } from "../logic/legend.mjs";
import { fieldOpacity, layerDisplayZ, windFieldOrder, windFieldWritesDepth } from "../logic/stack.mjs";
import { fieldMaterial, planeGeometry, rgbaTexture } from "./fieldMesh.js";
import { useLeiceMap3d } from "./useLeiceMap3d.js";

function legendOf(props) {
  return {
    min: props.legendMin,
    max: props.legendMax,
    colors: props.colors,
    domainPoints: props.domainPoints,
  };
}

function buildLut(legend, style) {
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i += 1) {
    const speed = legend.min + (i / 255) * (legend.max - legend.min);
    const [r, g, b] = colorForSpeed(speed, legend, style);
    const base = i * 4;
    data[base] = r;
    data[base + 1] = g;
    data[base + 2] = b;
    data[base + 3] = 255;
  }
  return data;
}

export default {
  name: "WindFieldLayer",
  props: {
    levels: { type: Array, default: () => [] },
    heightMode: { type: String, default: "multi" },
    heightSize: { type: Number, default: 1 },
    exaggeration: { type: Number, default: 1 },
    opacity: { type: Number, default: 0.8 },
    colorStyle: { type: String, default: "smooth" },
    domainPoints: { type: Array, default: () => [] },
    legendMin: { type: Number, default: WIND_LEGEND_MIN },
    legendMax: { type: Number, default: WIND_LEGEND_MAX },
    colors: { type: Array, default: () => WIND_LEGEND_COLORS.slice() },
  },
  setup(props) {
    useLeiceMap3d((ctx) => {
      const meshes = [];
      const clear = () => {
        meshes.splice(0).forEach((mesh) => {
          ctx.scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.uniforms.uSpeedTex.value.dispose();
          mesh.material.uniforms.uLutTex.value.dispose();
          mesh.material.dispose();
        });
      };
      const redraw = () => {
        clear();
        alignCoords(ctx);
        const opacity = fieldOpacity(props.opacity);
        const legend = legendOf(props);
        const style = props.colorStyle === "contour" ? "contour" : "smooth";
        (props.levels || []).forEach((level) => {
          const header = level.header;
          if (!header || !level.speeds) return;
          const scale = style === "contour" ? contourGridScale(header.nx, header.ny) : 1;
          const speeds = style === "contour"
            ? softBilinearGrid(level.speeds, header.nx, header.ny, scale)
            : bilinearGrid(level.speeds, header.nx, header.ny, scale);
          const width = style === "contour" ? Math.max(2, Math.floor(header.nx * scale)) : Math.floor(header.nx * scale);
          const height = style === "contour" ? Math.max(2, Math.floor(header.ny * scale)) : Math.floor(header.ny * scale);
          const pixels = new Uint8Array(width * height * 4);
          for (let index = 0; index < speeds.length; index += 1) {
            pixels.set(speedTexel(speeds[index], legend.min, legend.max), index * 4);
          }
          const speedTex = rgbaTexture(pixels, width, height, style === "contour");
          const lutTex = rgbaTexture(buildLut(legend, style), 256, 1, style !== "contour");
          const z = layerDisplayZ(level.height, props.heightMode, props.heightSize, props.exaggeration);
          const mesh = new THREE.Mesh(
            planeGeometry(ctx.customCoords, header, z),
            fieldMaterial(speedTex, lutTex, width, height, opacity, windFieldWritesDepth(opacity), style === "contour"),
          );
          mesh.renderOrder = windFieldOrder(level.height);
          ctx.scene.add(mesh);
          meshes.push(mesh);
        });
      };
      redraw();
      const stop = watch(() => [props.levels, props.heightMode, props.heightSize, props.exaggeration, props.opacity, props.colorStyle, props.legendMin, props.legendMax, props.colors], redraw);
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
