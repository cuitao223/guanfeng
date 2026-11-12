<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import L from "leaflet";
import { watch } from "vue";
import { listAlerts } from "../logic/alerts.mjs";
import { escapeHtml } from "../logic/text.mjs";
import { useLeiceMap } from "./useLeiceMap.js";

export default {
  name: "AlertMarkers",
  props: {
    alerts: { type: [Array, Object], default: () => ({}) },
    iconMap: { type: Object, default: () => ({}) },
    show: { type: Boolean, default: true },
  },
  emits: ["hover", "leave", "activate"],
  setup(props, { emit }) {
    useLeiceMap((map) => {
      let group = L.layerGroup().addTo(map);

      const redraw = () => {
        group.clearLayers();
        if (!props.show) return;
        listAlerts(props.alerts).forEach((alert) => {
          const iconUrl = props.iconMap[alert.iconKey];
          if (!iconUrl) return;
          const marker = L.marker([alert.latitude, alert.longitude], {
            zIndexOffset: 1000,
            icon: L.divIcon({
              className: "leice-map-alert-wrap",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
              html: '<div class="leice-map-alert"><img alt="" src="' + escapeHtml(iconUrl) + '" /></div>',
            }),
          });
          marker.on("mouseover", (event) => {
            const point = event.originalEvent || {};
            emit("hover", {
              stationNo: alert.stationNo,
              maxWindSpeed: alert.maxWindSpeed,
              windHeightLayer: alert.windHeightLayer,
              lljheightLayer: alert.lljheightLayer,
              clientX: point.clientX,
              clientY: point.clientY,
            });
          });
          marker.on("mouseout", () => emit("leave"));
          marker.on("dblclick", () => emit("activate", { stationNo: alert.stationNo }));
          group.addLayer(marker);
        });
      };

      redraw();
      const stop = watch(() => [props.alerts, props.iconMap, props.show], redraw);
      return () => {
        stop();
        group.remove();
        group = null;
      };
    });
  },
};
</script>

<style>
.leice-map-anchor {
  display: none;
}

.leice-map-alert-wrap {
  background: transparent;
  border: 0;
}

.leice-map-alert img {
  display: block;
  width: 16px;
  height: 16px;
}
</style>
