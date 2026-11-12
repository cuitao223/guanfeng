<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import * as THREE from "three";
import { watch } from "vue";
import { haversineMeters } from "../logic/volumeScale.mjs";
import { alignCoords, MISSING } from "../logic/grid.mjs";
import {
  PARTICLE_CANVAS,
  PARTICLE_FIELDS,
  createParticleSim,
  particleFieldKind,
} from "../logic/particles.mjs";
import { layerDisplayZ, markColor, particleOrder, PARTICLE_Z_OFFSET } from "../logic/stack.mjs";
import { planeGeometry } from "./fieldMesh.js";
import { useLeiceMap3d } from "./useLeiceMap3d.js";

function fieldSpanKm(header) {
  const west = header.lo1;
  const east = header.lo1 + header.nx * header.dx;
  const north = header.la1;
  const south = header.la1 - header.ny * header.dy;
  const eastWest = haversineMeters(west, south, east, south);
  const northSouth = haversineMeters(west, south, west, north);
  return Math.max(eastWest, northSouth) / 1000;
}

function levelUvs(level) {
  const count = level.header.nx * level.header.ny;
  if (level.uvs && level.uvs.length === count * 2) return level.uvs;
  const uvs = new Float64Array(count * 2);
  for (let index = 0; index < count; index += 1) {
    const speed = level.speeds[index];
    const dir = level.dirs ? Number(level.dirs[index]) : MISSING;
    if (speed === MISSING || dir === MISSING || !Number.isFinite(Number(speed))) continue;
    const theta = ((270 - dir) * Math.PI) / 180;
    uvs[index * 2] = Number(speed) * Math.cos(theta);
    uvs[index * 2 + 1] = Number(speed) * Math.sin(theta);
  }
  return uvs;
}

export default {
  name: "WindParticleLayer",
  props: {
    levels: { type: Array, default: () => [] },
    heightMode: { type: String, default: "multi" },
    heightSize: { type: Number, default: 1 },
    exaggeration: { type: Number, default: 1 },
    mapStyle: { type: String, default: "satellite" },
  },
  setup(props) {
    useLeiceMap3d((ctx) => {
      const meshes = [];
      let frame = 0;
      let generation = 0;
      const clear = () => {
        generation += 1;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        meshes.splice(0).forEach((mesh) => {
          ctx.overlayScene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.map.dispose();
          mesh.material.dispose();
        });
      };
      const redraw = () => {
        clear();
        alignCoords(ctx);
        const color = markColor(props.mapStyle);
        const current = generation;
        const sims = [];
        (props.levels || []).forEach((level) => {
          if (!level.header || !level.speeds) return;
          const canvas = document.createElement("canvas");
          canvas.width = PARTICLE_CANVAS;
          canvas.height = PARTICLE_CANVAS;
          const texture = new THREE.CanvasTexture(canvas);
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          const field = PARTICLE_FIELDS[particleFieldKind(fieldSpanKm(level.header))];
          const sim = createParticleSim(level.header, levelUvs(level), canvas, field);
          const z = layerDisplayZ(level.height, props.heightMode, props.heightSize, props.exaggeration, PARTICLE_Z_OFFSET);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(planeGeometry(ctx.customCoords, level.header, z), material);
          mesh.renderOrder = particleOrder(level.height);
          ctx.overlayScene.add(mesh);
          meshes.push(mesh);
          sims.push({ sim, texture });
        });
        const tick = () => {
          if (current !== generation) return;
          frame = requestAnimationFrame(tick);
          sims.forEach((item) => {
            item.sim.render(color);
            item.texture.needsUpdate = true;
          });
        };
        if (sims.length) frame = requestAnimationFrame(tick);
      };
      redraw();
      const stop = watch(() => [props.levels, props.heightMode, props.mapStyle, props.exaggeration], redraw);
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
