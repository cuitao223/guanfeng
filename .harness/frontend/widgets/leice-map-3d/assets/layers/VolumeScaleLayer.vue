<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import * as THREE from "three";
import { watch } from "vue";
import { alignCoords } from "../logic/grid.mjs";
import { layerDisplayZ } from "../logic/stack.mjs";
import { formatDistanceLabel, niceStepMeters, volumeCorners } from "../logic/volumeScale.mjs";
import { useLeiceMap3d } from "./useLeiceMap3d.js";

const SCALE_ORDER = -1000;

function labelTexture(text, fill, title) {
  const pixelSize = title ? 16 : 18;
  const font = title
    ? `italic bold ${pixelSize}px Arial, "Microsoft YaHei", sans-serif`
    : `bold ${pixelSize}px Arial, "Microsoft YaHei", sans-serif`;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  const pad = 6;
  const logicalW = Math.max(Math.ceil(context.measureText(text).width) + pad * 2, 10);
  const logicalH = pixelSize + pad * 2;
  canvas.width = Math.ceil(logicalW * dpr);
  canvas.height = Math.ceil(logicalH * dpr);
  context.scale(dpr, dpr);
  context.font = font;
  context.fillStyle = fill;
  context.textAlign = "center";
  context.textBaseline = "middle";
  if (fill === "#ffffff") {
    context.shadowColor = "rgba(0,0,0,0.95)";
    context.shadowBlur = 5;
    context.shadowOffsetY = 1;
  }
  context.fillText(text, logicalW / 2, logicalH / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { texture, pixelSize, aspect: logicalW / logicalH };
}

export default {
  name: "VolumeScaleLayer",
  props: {
    levels: { type: Array, default: () => [] },
    heightMode: { type: String, default: "multi" },
    heightSize: { type: Number, default: 1 },
    exaggeration: { type: Number, default: 1 },
    mapStyle: { type: String, default: "satellite" },
    heightUnit: { type: String, default: "m" },
    heightLabel: { type: String, default: "Height (m)" },
    eastLabel: { type: String, default: "East-west (km)" },
    northLabel: { type: String, default: "North-south (km)" },
  },
  setup(props) {
    useLeiceMap3d((ctx) => {
      let group = null;
      let frame = 0;
      const world = new THREE.Vector3();
      const clear = () => {
        if (!group) return;
        ctx.scene.remove(group);
        group.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
        group = null;
      };
      const addLine = (points, material) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        group.add(new THREE.Line(geometry, material));
      };
      const addLabel = (text, x, y, z, title, fill) => {
        const drawn = labelTexture(text, fill, title);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: drawn.texture,
          transparent: true,
          depthTest: true,
          depthWrite: false,
        }));
        sprite.position.set(x, y, z);
        sprite.center.set(0.5, 0.5);
        sprite.userData.isVolumeScaleLabel = true;
        sprite.userData.labelPixelSize = drawn.pixelSize;
        sprite.userData.labelAspect = drawn.aspect;
        sprite.renderOrder = SCALE_ORDER;
        group.add(sprite);
      };
      const fitLabels = () => {
        if (!group || !ctx.camera) return;
        const viewH = Math.max(ctx.renderer && ctx.renderer.domElement ? ctx.renderer.domElement.clientHeight : 1, 1);
        const fov = (ctx.camera.fov * Math.PI) / 180;
        group.traverse((obj) => {
          if (!obj.userData || !obj.userData.isVolumeScaleLabel) return;
          obj.getWorldPosition(world);
          const dist = Math.max(ctx.camera.position.distanceTo(world), 1);
          const worldH = (obj.userData.labelPixelSize / viewH) * 2 * dist * Math.tan(fov / 2);
          obj.scale.set(worldH * obj.userData.labelAspect, worldH, 1);
        });
      };
      const redraw = () => {
        clear();
        const level = (props.levels || []).find((item) => item && item.header);
        if (!level || !ctx.customCoords) return;
        const heights = (props.levels || [])
          .map((item) => Number(item.height))
          .filter((item) => Number.isFinite(item))
          .sort((a, b) => a - b);
        if (!heights.length) return;
        alignCoords(ctx);
        const bounds = volumeCorners(ctx.customCoords, level.header);
        const { bl, br, tl, tr } = bounds;
        const zOf = (height) => layerDisplayZ(height, props.heightMode, props.heightSize, props.exaggeration);
        const z1 = Math.max(zOf(heights[heights.length - 1]), zOf(heights[0]), 0);
        const fill = props.mapStyle === "vector" ? "#000000" : "#ffffff";
        const color = new THREE.Color(fill);
        const boxMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false });
        const layerMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.78, depthWrite: false });
        const tickMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
        group = new THREE.Group();
        group.name = "volumeScaleGroup";
        group.renderOrder = SCALE_ORDER;
        const rect = (z, material) => {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(bl[0], bl[1], z),
            new THREE.Vector3(br[0], br[1], z),
            new THREE.Vector3(tr[0], tr[1], z),
            new THREE.Vector3(tl[0], tl[1], z),
          ]);
          const loop = new THREE.LineLoop(geometry, material);
          loop.renderOrder = SCALE_ORDER;
          group.add(loop);
        };
        rect(0, boxMat);
        heights.forEach((height) => {
          const z = zOf(height);
          if (Math.abs(z) < 1e-6) return;
          rect(z, layerMat);
        });
        [bl, br, tr, tl].forEach((pt) => {
          addLine([
            new THREE.Vector3(pt[0], pt[1], 0),
            new THREE.Vector3(pt[0], pt[1], z1),
          ], boxMat);
        });
        const span = Math.max(
          Math.hypot(br[0] - bl[0], br[1] - bl[1]),
          Math.hypot(tl[0] - bl[0], tl[1] - bl[1]),
          1,
        );
        const tickLen = span * 0.025;
        const labelOffset = tickLen * 1.8;
        const ew = new THREE.Vector3(br[0] - bl[0], br[1] - bl[1], 0).normalize().multiplyScalar(tickLen);
        const ns = new THREE.Vector3(tl[0] - bl[0], tl[1] - bl[1], 0).normalize().multiplyScalar(tickLen);
        const outward = new THREE.Vector3(-(br[0] - bl[0] + tl[0] - bl[0]), -(br[1] - bl[1] + tl[1] - bl[1]), 0);
        if (outward.lengthSq() < 1e-6) outward.set(-1, 0, 0);
        outward.normalize().multiplyScalar(labelOffset);
        heights.forEach((height) => {
          const z = zOf(height);
          const edge = new THREE.Vector3(bl[0], bl[1], z);
          addLine([edge, edge.clone().sub(ew)], tickMat);
          addLabel(`${Math.round(height)}${props.heightUnit}`, edge.x + outward.x, edge.y + outward.y, edge.z, false, fill);
        });
        addLabel(props.heightLabel, bl[0] + outward.x, bl[1] + outward.y, z1 + tickLen * 2, true, fill);
        const ewStep = niceStepMeters(bounds.distEwM);
        for (let distance = 0; distance <= bounds.distEwM + ewStep * 0.01; distance += ewStep) {
          const t = bounds.distEwM > 0 ? Math.min(1, distance / bounds.distEwM) : 0;
          const x = bl[0] + (br[0] - bl[0]) * t;
          const y = bl[1] + (br[1] - bl[1]) * t;
          const point = new THREE.Vector3(x, y, 0);
          addLine([point, point.clone().sub(ns)], tickMat);
          addLabel(formatDistanceLabel(distance), x, y - labelOffset * 0.6, 0, false, fill);
        }
        addLabel(props.eastLabel, (bl[0] + br[0]) / 2, (bl[1] + br[1]) / 2 - labelOffset * 1.4, 0, true, fill);
        const nsStep = niceStepMeters(bounds.distNsM);
        for (let distance = 0; distance <= bounds.distNsM + nsStep * 0.01; distance += nsStep) {
          const t = bounds.distNsM > 0 ? Math.min(1, distance / bounds.distNsM) : 0;
          const x = bl[0] + (tl[0] - bl[0]) * t;
          const y = bl[1] + (tl[1] - bl[1]) * t;
          const point = new THREE.Vector3(x, y, 0);
          addLine([point, point.clone().sub(ew)], tickMat);
          if (distance > 0) addLabel(formatDistanceLabel(distance), x - labelOffset * 0.9, y, 0, false, fill);
        }
        addLabel(props.northLabel, bl[0] - labelOffset * 1.6, (bl[1] + tl[1]) / 2, 0, true, fill);
        addLabel("0", bl[0] - labelOffset * 0.5, bl[1] - labelOffset * 0.5, 0, false, fill);
        group.traverse((child) => {
          child.renderOrder = SCALE_ORDER;
          if (child.material) child.material.depthWrite = false;
        });
        ctx.scene.add(group);
        fitLabels();
      };
      const loop = () => {
        frame = requestAnimationFrame(loop);
        fitLabels();
      };
      frame = requestAnimationFrame(loop);
      redraw();
      const stop = watch(() => [props.levels, props.heightMode, props.heightSize, props.exaggeration, props.mapStyle, props.heightLabel, props.heightUnit, props.eastLabel, props.northLabel], redraw);
      return () => {
        stop();
        if (frame) cancelAnimationFrame(frame);
        clear();
      };
    });
  },
};
</script>

<style>
.leice-map-anchor { display: none; }
</style>
