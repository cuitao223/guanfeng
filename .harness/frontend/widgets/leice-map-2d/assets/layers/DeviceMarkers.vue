<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import L from "leaflet";
import { watch } from "vue";
import { deviceLabel, deviceLabelStyle, visibleDevices } from "../logic/devices.mjs";
import { escapeHtml } from "../logic/text.mjs";
import { useLeiceMap } from "./useLeiceMap.js";

export default {
  name: "DeviceMarkers",
  props: {
    devices: { type: Array, default: () => [] },
    markerTypes: { type: Array, default: () => ["1"] },
    typeAllowList: { type: Array, default: () => [] },
    activeIds: { type: Array, default: () => [] },
  },
  emits: ["toggle"],
  setup(props, { emit }) {
    useLeiceMap((map) => {
      let group = L.layerGroup().addTo(map);

      const restyle = () => {
        const style = deviceLabelStyle(map.getZoom());
        map.getContainer().querySelectorAll(".leice-map-device").forEach((node) => {
          node.classList.toggle("is-label-hidden", !style.label);
          node.style.transform = style.scale === 1 ? "" : "scale(" + style.scale + ")";
        });
      };

      const redraw = () => {
        group.clearLayers();
        const active = (props.activeIds || []).map(String);
        visibleDevices(props.devices, props.markerTypes, props.typeAllowList).forEach((device) => {
          const label = deviceLabel(device, props.markerTypes);
          const labelHtml = label
            ? '<div class="leice-map-device-label">' + escapeHtml(label) + "</div>"
            : "";
          const iconHtml = device.iconUrl
            ? '<img alt="" src="' + escapeHtml(device.iconUrl) + '" />'
            : "";
          const selected = active.includes(String(device.stationNo)) ? " is-active" : "";
          const marker = L.marker([Number(device.latitude), Number(device.longitude)], {
            icon: L.divIcon({
              className: "leice-map-device-wrap",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
              html: '<div class="leice-map-device' + selected + '">' + iconHtml + labelHtml + "</div>",
            }),
          });
          marker.on("dblclick", () => {
            emit("toggle", {
              stationNo: device.stationNo == null ? "" : String(device.stationNo),
              type: device.type,
              regionInfo: device.regionInfo,
              latitude: Number(device.latitude),
              longitude: Number(device.longitude),
            });
          });
          group.addLayer(marker);
        });
        restyle();
      };

      redraw();
      map.on("zoomend", restyle);
      const stop = watch(
        () => [props.devices, props.markerTypes, props.typeAllowList, props.activeIds],
        redraw,
      );
      return () => {
        stop();
        map.off("zoomend", restyle);
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

.leice-map-device-wrap {
  background: transparent;
  border: 0;
}

.leice-map-device {
  position: relative;
  width: 16px;
  height: 16px;
}

.leice-map-device img {
  display: block;
  width: 16px;
  height: 16px;
}

.leice-map-device-label {
  position: absolute;
  left: 20px;
  top: 0;
  font-size: 12px;
  line-height: 16px;
  font-weight: 400;
  white-space: nowrap;
}

.leice-map-device.is-label-hidden .leice-map-device-label {
  display: none;
}
</style>
