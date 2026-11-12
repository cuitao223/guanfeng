<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import { watch } from "vue";
import { deviceRadius, visibleDevices } from "../logic/ppi.mjs";
import { escapeHtml } from "../logic/text.mjs";
import { useLeiceMap3d } from "./useLeiceMap3d.js";

export default {
  name: "DeviceMarkers",
  props: {
    devices: { type: Array, default: () => [] },
    variant: { type: String, default: "circle" },
  },
  emits: ["hover", "leave"],
  setup(props, { emit }) {
    useLeiceMap3d((ctx) => {
      let group = null;
      let originZoom = ctx.map.getZoom();
      const clear = () => {
        if (group) {
          ctx.map.remove(group);
          group = null;
        }
      };
      const resize = () => {
        if (!group || props.variant !== "circle") return;
        const radius = deviceRadius(ctx.map.getZoom(), originZoom, 3);
        group.getOverlays().forEach((overlay) => {
          if (overlay.setRadius) overlay.setRadius(radius);
        });
      };
      const redraw = () => {
        clear();
        const AMap = window.AMap;
        group = new AMap.OverlayGroup();
        originZoom = ctx.map.getZoom();
        visibleDevices(props.devices).forEach((device) => {
          const position = [Number(device.longitude), Number(device.latitude)];
          const marker = props.variant === "icon"
            ? new AMap.Marker({
                position,
                anchor: "center",
                zIndex: 9,
                content: '<div class="leice-map-device"><img alt="" src="' + escapeHtml(device.iconUrl || "") + '" /></div>',
              })
            : new AMap.CircleMarker({
                center: position,
                radius: 3,
                strokeColor: "black",
                strokeWeight: 1,
                fillColor: "rgb(39,211,39)",
                fillOpacity: 1,
                zIndex: 3000,
              });
          marker.on("mouseover", () => emit("hover", { deviceNo: String(device.deviceNo), longitude: position[0], latitude: position[1] }));
          marker.on("mouseout", () => emit("leave"));
          group.addOverlay(marker);
        });
        ctx.map.add(group);
      };
      redraw();
      ctx.map.on("zoomchange", resize);
      const stop = watch(() => [props.devices, props.variant], redraw);
      return () => {
        stop();
        ctx.map.off("zoomchange", resize);
        clear();
      };
    });
  },
};
</script>

<style>
.leice-map-anchor { display: none; }
</style>
