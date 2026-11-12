<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import L from "leaflet";
import { watch } from "vue";
import {
  PARTICLE_COLORS,
  PARTICLE_FRAME_MS,
  PARTICLE_LINE_WIDTH,
  PARTICLE_MAX_AGE,
  PARTICLE_MAX_VELOCITY,
  PARTICLE_MIN_VELOCITY,
  buildScreenField,
  createWindGrid,
  particleColorIndex,
  particleCount,
  screenVelocityScale,
  stepParticle,
} from "../logic/field.mjs";
import { particleMultiplierForDensity } from "../logic/windForm.mjs";
import { useLeiceMap } from "./useLeiceMap.js";

export default {
  name: "WindParticleLayer",
  props: {
    grid: { type: Object, default: null },
    density: { type: Number, default: 1 },
    displayValues: { type: Boolean, default: true },
  },
  emits: ["sample"],
  setup(props, { emit }) {
    useLeiceMap((map) => {
      let windGrid = props.grid ? createWindGrid(props.grid) : null;
      let frame = 0;
      const canvas = L.DomUtil.create("canvas", "leaflet-layer leice-wind-particle");
      canvas.style.pointerEvents = "none";
      map.getPane("overlayPane").appendChild(canvas);

      const stopLoop = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      };

      const restart = () => {
        stopLoop();
        if (!windGrid) return;
        const size = map.getSize();
        canvas.width = size.x;
        canvas.height = size.y;
        const origin = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(canvas, origin);
        const bounds = map.getBounds();
        const field = buildScreenField({
          grid: windGrid,
          width: size.x,
          height: size.y,
          velocityScale: screenVelocityScale(
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth(),
          ),
          project(latitude, longitude) {
            const point = map.latLngToContainerPoint([latitude, longitude]);
            return [point.x, point.y];
          },
          unproject(x, y) {
            const latlng = map.containerPointToLatLng([x, y]);
            return { lng: latlng.lng, lat: latlng.lat };
          },
        });
        const count = particleCount(size.x, size.y, particleMultiplierForDensity(props.density));
        const particles = [];
        for (let i = 0; i < count; i += 1) {
          particles.push({
            x: Math.random() * size.x,
            y: Math.random() * size.y,
            age: Math.floor(Math.random() * PARTICLE_MAX_AGE),
          });
        }
        const context = canvas.getContext("2d");
        let then = Date.now();
        const loop = () => {
          frame = requestAnimationFrame(loop);
          const now = Date.now();
          const delta = now - then;
          if (delta <= PARTICLE_FRAME_MS) return;
          then = now - (delta % PARTICLE_FRAME_MS);
          const buckets = PARTICLE_COLORS.map(() => []);
          for (let i = 0; i < particles.length; i += 1) {
            particles[i] = stepParticle(particles[i], field, PARTICLE_MAX_AGE, (item) => ({
              ...item,
              x: Math.random() * size.x,
              y: Math.random() * size.y,
            }));
            if (!particles[i].visible) continue;
            const index = particleColorIndex(
              particles[i].magnitude,
              PARTICLE_MIN_VELOCITY,
              PARTICLE_MAX_VELOCITY,
            );
            buckets[index].push(particles[i]);
          }
          context.globalCompositeOperation = "destination-in";
          context.globalAlpha = 0.6;
          context.fillStyle = "rgba(0, 0, 0, 0.97)";
          context.fillRect(0, 0, size.x, size.y);
          context.globalCompositeOperation = "source-over";
          context.globalAlpha = 0.97 * 0.9;
          context.lineWidth = PARTICLE_LINE_WIDTH;
          buckets.forEach((bucket, index) => {
            if (!bucket.length) return;
            context.beginPath();
            context.strokeStyle = PARTICLE_COLORS[index];
            bucket.forEach((particle) => {
              context.moveTo(particle.x, particle.y);
              context.lineTo(particle.xt, particle.yt);
              particle.x = particle.xt;
              particle.y = particle.yt;
            });
            context.stroke();
          });
        };
        frame = requestAnimationFrame(loop);
      };

      const onSample = (event) => {
        if (!props.displayValues || !windGrid) return;
        const wind = windGrid.sample(event.latlng.lng, event.latlng.lat);
        emit("sample", wind ? { u: wind[0], v: wind[1], speed: wind[2] } : null);
      };

      map.on("moveend zoomend resize", restart);
      map.on("mousemove", onSample);
      restart();
      const stop = watch(
        () => [props.grid, props.density],
        () => {
          windGrid = props.grid ? createWindGrid(props.grid) : null;
          restart();
        },
      );
      return () => {
        stop();
        stopLoop();
        map.off("moveend zoomend resize", restart);
        map.off("mousemove", onSample);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      };
    });
  },
};
</script>

<style>
.leice-map-anchor {
  display: none;
}
</style>
