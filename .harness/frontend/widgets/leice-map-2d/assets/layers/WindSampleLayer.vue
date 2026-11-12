<template>
  <span class="leice-map-anchor" aria-hidden="true"></span>
</template>

<script>
import L from "leaflet";
import { watch } from "vue";
import { WIND_MARK_COLOR } from "../logic/beaufort.mjs";
import { arrowPolylines, barbPolylines } from "../logic/marks.mjs";
import { thinRows } from "../logic/thinning.mjs";
import { buildWindSamples } from "../logic/windSamples.mjs";
import { useLeiceMap } from "./useLeiceMap.js";

export default {
  name: "WindSampleLayer",
  props: {
    form: { type: String, required: true },
    rows: { type: Array, default: null },
    grid: { type: Object, default: null },
    density: { type: Number, default: 1 },
  },
  setup(props) {
    useLeiceMap((map) => {
      const state = { rows: [] };
      const readRows = () => {
        if (props.grid) return buildWindSamples(props.grid, props.density, props.form);
        return props.rows || [];
      };
      state.rows = readRows();

      const Layer = L.Layer.extend({
        onAdd(target) {
          this._map = target;
          this._canvas = L.DomUtil.create("canvas", "leaflet-layer leice-wind-sample");
          this._canvas.style.pointerEvents = "none";
          target.getPane("overlayPane").appendChild(this._canvas);
          target.on("moveend zoomend resize", this._render, this);
          this._render();
        },
        onRemove(target) {
          target.off("moveend zoomend resize", this._render, this);
          if (this._canvas && this._canvas.parentNode) this._canvas.parentNode.removeChild(this._canvas);
          this._canvas = null;
        },
        _render() {
          if (!this._map || !this._canvas) return;
          const size = this._map.getSize();
          this._canvas.width = size.x;
          this._canvas.height = size.y;
          const origin = this._map.containerPointToLayerPoint([0, 0]);
          L.DomUtil.setPosition(this._canvas, origin);
          const context = this._canvas.getContext("2d");
          context.clearRect(0, 0, size.x, size.y);
          context.strokeStyle = WIND_MARK_COLOR;
          context.lineWidth = 1;
          thinRows(state.rows, this._map.getZoom()).forEach((row) => {
            const point = this._map.latLngToContainerPoint([row[0], row[1]]);
            const lines = props.form === "arrow"
              ? arrowPolylines(point, row[3], row[2])
              : barbPolylines(point, row[3], row[2]);
            lines.forEach((line) => {
              context.beginPath();
              context.moveTo(line[0].x, line[0].y);
              for (let i = 1; i < line.length; i += 1) context.lineTo(line[i].x, line[i].y);
              context.stroke();
            });
          });
        },
      });

      const layer = new Layer();
      layer.addTo(map);
      const stop = watch(
        () => [props.form, props.rows, props.grid, props.density],
        () => {
          state.rows = readRows();
          layer._render();
        },
      );
      return () => {
        stop();
        map.removeLayer(layer);
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
