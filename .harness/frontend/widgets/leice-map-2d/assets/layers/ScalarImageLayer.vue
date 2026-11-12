<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import L from "leaflet";
import { watch } from "vue";
import { colorizeWind, windHoverIndex, windImageBounds } from "../logic/scalar.mjs";
import { useLeiceMap } from "./useLeiceMap.js";

function paintSpeeds(speeds, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);
  image.data.set(colorizeWind(speeds, width, height));
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

export default {
  name: "ScalarImageLayer",
  props: {
    imageUrl: { type: String, default: "" },
    bounds: { type: Array, default: null },
    header: { type: Object, default: null },
    speeds: { type: Array, default: null },
    directions: { type: Array, default: null },
    opacity: { type: Number, default: 0.8 },
  },
  emits: ["sample"],
  setup(props, { emit }) {
    useLeiceMap((map) => {
      let overlay = null;

      const hover = (event) => {
        if (!props.header || !props.speeds) return;
        const index = windHoverIndex(props.header, event.latlng.lat, event.latlng.lng);
        const speed = index >= 0 ? props.speeds[index] : null;
        const direction = index >= 0 && props.directions ? props.directions[index] : null;
        if (speed == null || direction == null || !Number.isFinite(Number(speed))) {
          emit("sample", null);
          return;
        }
        emit("sample", {
          windSpeed: Number(speed),
          windDirection: Number(direction),
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      };

      const redraw = () => {
        if (overlay) {
          map.removeLayer(overlay);
          overlay = null;
        }
        let url = props.imageUrl;
        let bounds = props.bounds;
        if (!url && props.header && props.speeds) {
          url = paintSpeeds(props.speeds, props.header.nx, props.header.ny);
          bounds = windImageBounds(props.header);
        }
        if (!url || !bounds) return;
        overlay = L.imageOverlay(url, bounds, {
          interactive: true,
          opacity: props.opacity,
          zIndex: 1,
        });
        overlay.on("mousemove", hover);
        overlay.on("mouseout", () => emit("sample", null));
        overlay.addTo(map);
      };

      redraw();
      const stop = watch(
        () => [props.imageUrl, props.bounds, props.header, props.speeds, props.directions, props.opacity],
        redraw,
      );
      return () => {
        stop();
        if (overlay) map.removeLayer(overlay);
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
