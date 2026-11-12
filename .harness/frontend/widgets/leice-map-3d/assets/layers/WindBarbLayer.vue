<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import * as THREE from "three";
import { watch } from "vue";
import { arrowLocalSegments, barbLocalSegments, barbSamples, barbSize } from "../logic/barbs.mjs";
import { alignCoords } from "../logic/grid.mjs";
import { barbOrder, layerDisplayZ, markColor, BARB_Z_OFFSET } from "../logic/stack.mjs";
import { useLeiceMap3d } from "./useLeiceMap3d.js";

export default {
  name: "WindBarbLayer",
  props: {
    levels: { type: Array, default: () => [] },
    heightMode: { type: String, default: "multi" },
    heightSize: { type: Number, default: 1 },
    exaggeration: { type: Number, default: 1 },
    density: { type: Number, default: 1 },
    sizeScale: { type: Number, default: 1 },
    zoom: { type: Number, default: 13 },
    mapStyle: { type: String, default: "satellite" },
    kind: { type: String, default: "barb" },
  },
  setup(props) {
    useLeiceMap3d((ctx) => {
      const groups = [];
      const clear = () => {
        groups.splice(0).forEach((group) => {
          ctx.overlayScene.remove(group);
          group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
        });
      };
      const redraw = () => {
        clear();
        alignCoords(ctx);
        const color = new THREE.Color(markColor(props.mapStyle));
        (props.levels || []).forEach((level) => {
          if (!level.header || !level.speeds || !level.dirs) return;
          const z = layerDisplayZ(level.height, props.heightMode, props.heightSize, props.exaggeration, BARB_Z_OFFSET);
          const size = barbSize(props.zoom) * Math.max(0.1, props.sizeScale);
          const positions = [];
          barbSamples(level.header, level.speeds, props.zoom, props.density).forEach((sample) => {
            const dir = level.dirs[sample.index];
            const anchor = ctx.customCoords.lngLatsToCoords(level.header.displayCoordinates?.[sample.index] || [sample.longitude, sample.latitude])[0];
            const angle = (Math.abs(360 - Number(dir)) * Math.PI) / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const segments = props.kind === "arrow"
              ? arrowLocalSegments(sample.speed, size)
              : barbLocalSegments(sample.speed, size);
            segments.forEach((line) => {
              line.forEach(([x, y]) => {
                positions.push(anchor[0] + x * cos - y * sin, anchor[1] + x * sin + y * cos, z);
              });
            });
          });
          if (!positions.length) return;
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
            color,
            transparent: true,
            depthTest: true,
            depthWrite: false,
          }));
          lines.renderOrder = barbOrder(level.height);
          ctx.overlayScene.add(lines);
          groups.push(lines);
        });
      };
      redraw();
      const stop = watch(() => props, redraw, { deep: true });
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
