<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import L from "leaflet";
import { watch } from "vue";
import { useLeiceMap } from "./useLeiceMap.js";

export default {
  name: "NorthMarker",
  props: {
    iconUrl: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  setup(props) {
    useLeiceMap((map) => {
      let marker = null;
      const draw = () => {
        if (marker) marker.remove();
        marker = L.marker([props.latitude, props.longitude], {
          interactive: false,
          icon: L.icon({
            iconUrl: props.iconUrl,
            className: "leice-north-icon",
          }),
        }).addTo(map);
      };
      draw();
      const stop = watch(() => [props.iconUrl, props.latitude, props.longitude], draw);
      return () => {
        stop();
        if (marker) marker.remove();
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
