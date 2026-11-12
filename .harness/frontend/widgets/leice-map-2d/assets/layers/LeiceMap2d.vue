<template>
  <div class="leice-map-2d">
    <div ref="host" class="leice-map-2d-host"></div>
    <slot />
  </div>
</template>

<script>
import L from "leaflet";
import { markRaw, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from "vue";
import { REFERENCE_VIEW } from "../logic/view.mjs";
import { LEICE_MAP_KEY } from "./mapKey.js";

export default {
  name: "LeiceMap2d",
  props: {
    tileUrl: { type: String, required: true },
    labelUrl: { type: String, default: "" },
    attribution: { type: String, default: "" },
    center: { type: Array, default: () => REFERENCE_VIEW.center },
    zoom: { type: Number, default: REFERENCE_VIEW.zoom },
    minZoom: { type: Number, default: REFERENCE_VIEW.minZoom },
    maxZoom: { type: Number, default: REFERENCE_VIEW.maxZoom },
    zoomSnap: { type: Number, default: REFERENCE_VIEW.zoomSnap },
    maxBounds: { type: Array, default: () => REFERENCE_VIEW.maxBounds },
  },
  emits: ["ready", "tile-status"],
  setup(props, { emit }) {
    const host = ref(null);
    const map = shallowRef(null);
    let tiles = null;
    let labels = null;
    let loadTimer = null;
    provide(LEICE_MAP_KEY, map);

    function mountTiles(url) {
      if (!map.value) return;
      clearTimeout(loadTimer);
      if (tiles) { tiles.off("loading tileload tileerror load"); map.value.removeLayer(tiles); }
      if (labels) { map.value.removeLayer(labels); labels = null; }
      emit("tile-status", "loading");
      if (!url) { emit("tile-status", "error"); return; }
      let loaded = 0;
      let failed = 0;
      const settle = () => { clearTimeout(loadTimer); emit("tile-status", failed > 0 || loaded === 0 ? "error" : "ready"); };
      tiles = L.tileLayer(url, { attribution: props.attribution, maxZoom: props.maxZoom });
      tiles.on("loading", () => { loaded = 0; failed = 0; emit("tile-status", "loading"); clearTimeout(loadTimer); loadTimer = setTimeout(() => emit("tile-status", "error"), 15000); });
      tiles.on("tileload", () => { loaded++; });
      tiles.on("tileerror", () => { failed++; });
      tiles.on("load", settle);
      tiles.addTo(map.value);
      if (props.labelUrl) { labels = L.tileLayer(props.labelUrl, { maxZoom: props.maxZoom }); labels.addTo(map.value); }
    }

    onMounted(() => {
      const instance = L.map(host.value, {
        center: props.center,
        zoom: props.zoom,
        zoomControl: false,
        minZoom: props.minZoom,
        maxZoom: props.maxZoom,
        zoomSnap: props.zoomSnap,
        attributionControl: true,
        maxBounds: props.maxBounds,
      });
      map.value = markRaw(instance);
      mountTiles(props.tileUrl);
      emit("ready", instance);
    });

    watch(
      () => [props.tileUrl, props.labelUrl, props.attribution],
      () => mountTiles(props.tileUrl),
    );

    watch(() => props.center, (center) => { if (map.value) map.value.setView(center, props.zoom); }, { deep: true });
    watch(() => props.zoom, (zoom) => { if (map.value) map.value.setZoom(zoom); });

    onBeforeUnmount(() => {
      clearTimeout(loadTimer);
      if (map.value) {
        map.value.remove();
        map.value = null;
      }
      tiles = null;
    });

    return { host, retryTiles: () => mountTiles(props.tileUrl) };
  },
};
</script>

<style>
.leice-map-2d,
.leice-map-2d-host {
  width: 100%;
  height: 100%;
}

.leice-map-2d {
  position: relative;
}

/* Leaflet 1.9 uses 0.75rem. The platform root is clientWidth/24, so reset to design px. */
.leice-map-2d .leaflet-container {
  font-size: 12px;
  line-height: 1.5;
}

.leice-map-2d .leaflet-popup-content,
.leice-map-2d .leaflet-tooltip {
  font-size: 13px;
  line-height: 1.4;
}
</style>

<style>
.leice-map-2d .leaflet-control-attribution { font-size: 11px; line-height: 1.4; max-width: 100%; white-space: normal; }
</style>
