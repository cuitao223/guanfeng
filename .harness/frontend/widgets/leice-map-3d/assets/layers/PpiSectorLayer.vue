<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import * as THREE from "three";
import { watch } from "vue";
import { colorForSpeed, WIND_LEGEND_COLORS, WIND_LEGEND_MAX, WIND_LEGEND_MIN } from "../logic/legend.mjs";
import { ppiRenderAngle, ppiValue, sectorDegrees, shouldDrawPpiGate, splitAngleGroups } from "../logic/ppi.mjs";
import { useLeiceMap3d } from "./useLeiceMap3d.js";

export default {
  name: "PpiSectorLayer",
  props: {
    longitude: { type: Number, required: true },
    latitude: { type: Number, required: true },
    angles: { type: Array, default: () => [] },
    ranges: { type: Array, default: () => [] },
    values: { type: Array, default: () => [] },
    field: { type: String, default: "speed" },
    renderHeight: { type: Number, default: 15000 },
    renderMaxHeight: { type: Number, default: 15000 },
    metersToScene: { type: Number, default: 1 },
    legendMin: { type: Number, default: WIND_LEGEND_MIN },
    legendMax: { type: Number, default: WIND_LEGEND_MAX },
    colors: { type: Array, default: () => WIND_LEGEND_COLORS.slice() },
  },
  setup(props) {
    useLeiceMap3d((ctx) => {
      let group = null;
      const clear = () => {
        if (!group) return;
        ctx.scene.remove(group);
        group.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        group = null;
      };
      const redraw = () => {
        clear();
        const anchor = ctx.customCoords.lngLatsToCoords([props.longitude, props.latitude])[0];
        group = new THREE.Group();
        group.position.set(anchor[0], anchor[1], 1);
        const legend = { min: props.legendMin, max: props.legendMax, colors: props.colors };
        let cursor = 0;
        splitAngleGroups(props.angles).forEach((angles) => {
          angles.forEach((angle, index) => {
            const row = props.values[cursor + index] || [];
            const [startDeg, endDeg] = sectorDegrees(angles, index);
            const start = ppiRenderAngle(startDeg);
            const end = ppiRenderAngle(endDeg);
            row.forEach((value, gate) => {
              const range = props.ranges[gate];
              const speed = ppiValue(value, props.field);
              if (speed == null || !shouldDrawPpiGate(gate, range, props.renderHeight, props.renderMaxHeight)) return;
              const inner = Number(props.ranges[gate - 1]) * props.metersToScene;
              const outer = Number(range) * props.metersToScene;
              const [r, g, b] = colorForSpeed(speed, legend, "smooth");
              const color = new THREE.Color(r / 255, g / 255, b / 255);
              const positions = [];
              const segments = 4;
              for (let step = 0; step <= segments; step += 1) {
                const theta = start + (end - start) * (step / segments);
                positions.push(outer * Math.cos(theta), outer * Math.sin(theta), 0);
                positions.push(inner * Math.cos(theta), inner * Math.sin(theta), 0);
              }
              const indices = [];
              for (let step = 0; step < segments; step += 1) {
                const base = step * 2;
                indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
              }
              const geometry = new THREE.BufferGeometry();
              geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
              geometry.setIndex(indices);
              group.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })));
            });
          });
          cursor += angles.length;
        });
        ctx.scene.add(group);
      };
      redraw();
      const stop = watch(() => [props.angles, props.ranges, props.values, props.field, props.longitude, props.latitude, props.metersToScene], redraw);
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
