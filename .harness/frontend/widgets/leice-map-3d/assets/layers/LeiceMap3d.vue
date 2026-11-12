<template>
  <div class="leice-map-3d">
    <div ref="host" class="leice-map-3d-host"></div>
    <canvas ref="overlay" class="leice-map-3d-overlay"></canvas>
    <slot />
  </div>
</template>

<script>
import * as THREE from "three";
import { onBeforeUnmount, onMounted, provide, ref, shallowReactive, watch } from "vue";
import { REFERENCE_VIEW } from "../logic/view.mjs";
import { LEICE_MAP3D_KEY } from "./mapKey.js";

function tileSource(source) {
  if (typeof source === "function") return source;
  if (typeof source === "string" && source.indexOf("{z}") !== -1) {
    return (x, y, z) => source.replace(/\{x\}/g, x).replace(/\{y\}/g, y).replace(/\{z\}/g, z);
  }
  return source;
}

export default {
  name: "LeiceMap3d",
  props: {
    mapStyle: { type: String, default: "satellite" },
    satelliteTiles: { type: Object, required: true },
    vectorTiles: { type: Object, required: true },
    center: { type: Array, default: () => REFERENCE_VIEW.center.slice() },
    zoom: { type: Number, default: REFERENCE_VIEW.zoom },
    zooms: { type: Array, default: () => REFERENCE_VIEW.zooms.slice() },
    pitch: { type: Number, default: 56 },
    rotation: { type: Number, default: 25.5 },
  },
  emits: ["ready"],
  setup(props, { emit }) {
    const host = ref(null);
    const overlay = ref(null);
    // Shallow so Three and AMap objects stay unproxied. A deep proxy breaks WebGLRenderer.
    const ctx = shallowReactive({
      map: null,
      scene: null,
      overlayScene: null,
      customCoords: null,
      camera: null,
      renderer: null,
      ready: false,
    });
    provide(LEICE_MAP3D_KEY, ctx);
    let frame = 0;
    let baseLayer = null;
    let labelLayer = null;
    let resizeObserver = null;

    function tileSet() {
      return props.mapStyle === "vector" ? props.vectorTiles : props.satelliteTiles;
    }

    function syncTiles() {
      if (!ctx.map || !window.AMap) return;
      if (baseLayer) ctx.map.remove(baseLayer);
      if (labelLayer) ctx.map.remove(labelLayer);
      const tiles = tileSet();
      const AMap = window.AMap;
      baseLayer = new AMap.TileLayer({
        getTileUrl: tileSource(tiles.base),
        zIndex: props.mapStyle === "vector" ? 3 : 1,
      });
      ctx.map.add(baseLayer);
      labelLayer = null;
      if (tiles.label) {
        labelLayer = new AMap.TileLayer({
          getTileUrl: tileSource(tiles.label),
          zIndex: 9,
        });
        ctx.map.add(labelLayer);
      }
    }

    function resizeOverlay() {
      if (!host.value || !ctx.renderer || !ctx.camera) return;
      const width = host.value.clientWidth || 1;
      const height = host.value.clientHeight || 1;
      ctx.renderer.setPixelRatio(window.devicePixelRatio || 1);
      ctx.renderer.setSize(width, height, false);
      ctx.camera.aspect = width / height;
      ctx.camera.updateProjectionMatrix();
    }

    function paint() {
      if (!ctx.renderer || !ctx.camera || !ctx.customCoords) return;
      ctx.viewCenter = props.center;
      ctx.customCoords.setCenter(props.center);
      const params = ctx.customCoords.getCameraParams();
      ctx.camera.near = params.near;
      ctx.camera.far = params.far;
      ctx.camera.fov = params.fov;
      ctx.camera.position.set(...params.position);
      ctx.camera.up.set(...params.up);
      ctx.camera.lookAt(...params.lookAt);
      ctx.camera.updateProjectionMatrix();
      ctx.renderer.autoClear = true;
      ctx.renderer.render(ctx.scene, ctx.camera);
      ctx.renderer.autoClear = false;
      if (ctx.overlayScene.children.length) ctx.renderer.render(ctx.overlayScene, ctx.camera);
    }

    onMounted(() => {
      const AMap = window.AMap;
      if (!AMap || !host.value || !overlay.value) return;
      const tiles = tileSet();
      baseLayer = new AMap.TileLayer({
        getTileUrl: tileSource(tiles.base),
        zIndex: props.mapStyle === "vector" ? 3 : 1,
      });
      const map = new AMap.Map(host.value, {
        center: props.center,
        zoom: props.zoom,
        zooms: props.zooms,
        viewMode: "3D",
        pitch: props.pitch,
        rotation: props.rotation,
        layers: [baseLayer],
      });
      if (tiles.label) {
        labelLayer = new AMap.TileLayer({ getTileUrl: tileSource(tiles.label), zIndex: 9 });
        map.add(labelLayer);
      }
      map.setStatus({ doubleClickZoom: false });
      ctx.map = map;
      ctx.customCoords = map.customCoords;
      ctx.viewCenter = props.center;
      ctx.customCoords.setCenter(props.center);

      const width = host.value.clientWidth || 1;
      const height = host.value.clientHeight || 1;
      ctx.camera = new THREE.PerspectiveCamera(60, width / height, 100, 1 << 30);
      ctx.renderer = new THREE.WebGLRenderer({
        canvas: overlay.value,
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
      });
      ctx.renderer.setClearColor(0x000000, 0);
      ctx.scene = new THREE.Scene();
      ctx.overlayScene = new THREE.Scene();
      ctx.scene.add(new THREE.AmbientLight(0xffffff, 1));
      const sun = new THREE.DirectionalLight(0xffffff, 1);
      sun.position.set(20000, 20000, 20000);
      ctx.scene.add(sun);
      resizeOverlay();
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(resizeOverlay);
        resizeObserver.observe(host.value);
      }
      ctx.ready = true;
      emit("ready", ctx);
      const loop = () => {
        frame = requestAnimationFrame(loop);
        paint();
      };
      frame = requestAnimationFrame(loop);
    });

    watch(() => [props.mapStyle, props.satelliteTiles, props.vectorTiles], syncTiles);
    watch(() => [props.pitch, props.rotation], () => {
      if (!ctx.map) return;
      if (ctx.map.setPitch) ctx.map.setPitch(props.pitch);
      if (ctx.map.setRotation) ctx.map.setRotation(props.rotation);
    });

    onBeforeUnmount(() => {
      if (frame) cancelAnimationFrame(frame);
      if (resizeObserver) resizeObserver.disconnect();
      ctx.ready = false;
      if (ctx.renderer) ctx.renderer.dispose();
      if (ctx.map) ctx.map.destroy();
      ctx.map = null;
      ctx.renderer = null;
    });

    return { host, overlay };
  },
};
</script>

<style>
.leice-map-3d,
.leice-map-3d-host {
  width: 100%;
  height: 100%;
}

.leice-map-3d {
  position: relative;
}

.leice-map-3d-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: transparent;
}
</style>
