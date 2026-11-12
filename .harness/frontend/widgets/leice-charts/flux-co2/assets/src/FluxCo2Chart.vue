<template>
  <div ref="wrap" class="chart-frame" :class="{ 'legend-bottom': active.placement === 'bottom' }" :style="frameStyle">
    <div class="plot-column">
      <div class="plot-toolbar">
        <span class="plot-title">{{ title }}</span>
        <div class="unit-switch" role="group" aria-label="通量单位">
          <button type="button" :class="{ 'is-active': displayUnit === 'mass' }" @click="setUnit('mass')">μg m-2 s-1</button>
          <button type="button" :class="{ 'is-active': displayUnit === 'mole' }" @click="setUnit('mole')">μmol m-2 s-1</button>
        </div>
      </div>
      <div ref="plot" class="plot-host">
        <svg ref="svg" class="chart-el"></svg>
        <div v-show="empty" class="chart-empty">无数据</div>
        <div v-show="tooltip.visible" class="chart-tooltip" :style="tooltipStyle">
          <div>{{ tooltip.time }}</div>
          <div>通量: {{ tooltip.value }} {{ unitLabel }}</div>
        </div>
      </div>
    </div>
    <FluxColorBar
      :title="title"
      :colors="active.colors"
      :breakpoints="active.breakpoints"
      :color-mode="active.colorMode"
      :unit="unitLabel"
      :placement="active.placement"
      :tick-side="active.tickSide"
      :tick-gap="active.tickGap"
      @open-settings="legendOpen = true"
    />
    <FluxLegendDialog
      :open="legendOpen"
      :name="title"
      :theme="theme"
      :color-mode="active.colorMode"
      :colors="active.colors"
      :breakpoints="active.breakpoints"
      :opacity="active.opacity"
      :placement="active.placement"
      :tick-side="active.tickSide"
      :tick-gap="active.tickGap"
      :factory-mode="factory.colorMode"
      :factory-colors="factory.colors"
      :factory-breakpoints="factory.breakpoints"
      @apply="applyLegend"
      @reset="applied = null"
      @close="legendOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import * as d3 from "d3";
import FluxColorBar from "./FluxColorBar.vue";
import FluxLegendDialog from "./FluxLegendDialog.vue";
import type { FluxLegendSettings } from "./FluxLegendDialog.vue";
import { buildFluxColorScale, type FluxColorMode } from "./fluxColor";
import { FLUX_COLORS, fluxBars, fluxBreaks, fluxPeak, fluxTitle, fluxUnitLabel, type FluxDirection, type FluxUnit } from "./fluxSeries";
import { resolvePalette, type ChartPalette, type ChartThemeName } from "./themes";

const MARGIN = { top: 12, right: 12, bottom: 42, left: 56 };

const props = withDefaults(defineProps<{
  timeArr?: unknown[];
  values?: unknown[];
  direction?: FluxDirection;
  inputUnit?: FluxUnit;
  unit?: FluxUnit;
  theme?: ChartThemeName;
  palette?: Partial<ChartPalette> | null;
}>(), {
  timeArr: () => [],
  values: () => [],
  direction: "vertical",
  inputUnit: "mass",
  unit: "mass",
  theme: "dark",
  palette: null,
});

const emit = defineEmits<{ (event: "update:unit", value: FluxUnit): void }>();

const wrap = ref<HTMLDivElement | null>(null);
const plot = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const empty = ref(true);
const legendOpen = ref(false);
const displayUnit = ref<FluxUnit>(props.unit);
const applied = ref<FluxLegendSettings | null>(null);
const tooltip = reactive({ visible: false, x: 0, y: 0, time: "", value: "" });
const colors = computed(() => resolvePalette(props.theme, props.palette));
const title = computed(() => fluxTitle(props.direction));
const unitLabel = computed(() => fluxUnitLabel(displayUnit.value));
const factory = computed(() => ({
  colorMode: "linear" as FluxColorMode,
  colors: FLUX_COLORS.slice(),
  breakpoints: fluxBreaks(props.direction).slice(),
}));
const active = computed<FluxLegendSettings>(() => applied.value || {
  colorMode: factory.value.colorMode,
  colors: factory.value.colors,
  breakpoints: factory.value.breakpoints,
  opacity: 1,
  placement: "right",
  tickSide: "right",
  tickGap: 8,
});
const frameStyle = computed(() => {
  const light = props.theme === "light";
  return {
    background: colors.value.frameBg,
    borderColor: colors.value.frameBorder,
    color: colors.value.label,
    "--flux-bar-bg": light ? "#ffffff" : "rgba(4, 20, 42, 0.72)",
    "--flux-bar-border": light ? "rgba(120, 140, 160, 0.5)" : "rgba(64, 140, 210, 0.5)",
    "--flux-bar-tick": colors.value.label,
    "--flux-bar-unit": colors.value.label,
  };
});
const tooltipStyle = computed(() => ({
  left: `${tooltip.x}px`,
  top: `${tooltip.y}px`,
  background: colors.value.tooltipBg,
  borderColor: colors.value.tooltipBorder,
  color: colors.value.tooltipText,
}));

let resizeObserver: ResizeObserver | null = null;
let updateRaf = 0;

function setUnit(unit: FluxUnit): void {
  displayUnit.value = unit;
  emit("update:unit", unit);
}

function applyLegend(value: FluxLegendSettings): void {
  applied.value = {
    colorMode: value.colorMode,
    colors: value.colors.slice(),
    breakpoints: value.breakpoints.slice(),
    opacity: value.opacity,
    placement: value.placement,
    tickSide: value.tickSide,
    tickGap: value.tickGap,
  };
  legendOpen.value = false;
}

function schedule(): void {
  if (updateRaf) return;
  updateRaf = requestAnimationFrame(() => {
    updateRaf = 0;
    draw();
  });
}

function draw(): void {
  const host = plot.value;
  const svgEl = svg.value;
  if (!host || !svgEl) return;
  const width = host.clientWidth || 0;
  const height = host.clientHeight || 0;
  if (width < 40 || height < 40) return;
  const bars = fluxBars(props.timeArr || [], props.values || [], props.inputUnit, displayUnit.value);
  empty.value = bars.length === 0;
  const innerW = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(10, height - MARGIN.top - MARGIN.bottom);
  const legend = active.value;
  const paint = buildFluxColorScale(legend.breakpoints, legend.colors, legend.colorMode);
  const extent = d3.extent(bars, (bar) => bar.t) as [number, number];
  const xTime = d3.scaleTime().domain(bars.length ? extent : [new Date(), new Date(3600000)]).range([0, innerW]);
  const band = d3.scaleBand<number>().domain(bars.map((bar) => bar.t)).range([0, innerW]).padding(0.2);
  const peak = fluxPeak(bars);
  const y = d3.scaleLinear().domain([-peak, peak]).nice().range([innerH, 0]);
  const root = d3.select(svgEl);
  root.selectAll("*").remove();
  root.attr("width", width).attr("height", height);
  const g = root.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
  g.append("g").attr("class", "grid-y").call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(() => ""));
  g.append("g").attr("class", "grid-x").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xTime).ticks(6).tickSize(-innerH).tickFormat(() => ""));
  g.selectAll(".grid-y line, .grid-x line").attr("stroke", colors.value.grid).attr("stroke-opacity", 0.45);
  g.selectAll(".grid-y .domain, .grid-x .domain").attr("stroke", "none");
  g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(xTime).ticks(6).tickFormat((value) => {
    const date = value instanceof Date ? value : new Date(Number(value));
    return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }));
  g.append("g").call(d3.axisLeft(y).ticks(6));
  g.selectAll("text").attr("fill", colors.value.label);
  g.selectAll(".domain, .tick line").attr("stroke", colors.value.axis);
  g.selectAll(".grid-y line, .grid-x line").attr("stroke", colors.value.grid).attr("stroke-opacity", 0.45);
  g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", colors.value.label);
  const zero = y(0);
  for (const bar of bars) {
    const yValue = y(bar.value);
    g.append("rect")
      .attr("x", band(bar.t) || 0)
      .attr("y", Math.min(zero, yValue))
      .attr("width", band.bandwidth())
      .attr("height", Math.max(1, Math.abs(yValue - zero)))
      .attr("fill", paint(bar.value))
      .attr("fill-opacity", legend.opacity);
  }
  g.append("rect").attr("width", innerW).attr("height", innerH).attr("fill", "transparent")
    .on("mousemove", (event) => {
      if (!bars.length) return;
      const [mx, my] = d3.pointer(event);
      const step = band.step() || 1;
      let index = Math.floor(mx / step);
      if (index < 0) index = 0;
      if (index >= bars.length) index = bars.length - 1;
      const bar = bars[index];
      tooltip.visible = true;
      tooltip.time = new Date(bar.t).toLocaleString();
      tooltip.value = (Math.round(bar.value * 100) / 100).toFixed(2);
      tooltip.x = Math.min(width - 190, MARGIN.left + mx + 12);
      tooltip.y = Math.max(8, MARGIN.top + my - 28);
    })
    .on("mouseleave", () => {
      tooltip.visible = false;
    });
}

watch(() => props.unit, (value) => {
  displayUnit.value = value;
});
watch(
  () => [props.timeArr, props.values, props.direction, props.inputUnit, displayUnit.value, props.theme, props.palette, applied.value],
  () => schedule(),
  { deep: true },
);
onMounted(() => {
  schedule();
  resizeObserver = new ResizeObserver(() => schedule());
  if (plot.value) resizeObserver.observe(plot.value);
});
onBeforeUnmount(() => {
  if (updateRaf) cancelAnimationFrame(updateRaf);
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.chart-frame {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid;
  overflow: hidden;
}
.chart-frame.legend-bottom { flex-direction: column; }
.plot-column { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.plot-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-shrink: 0; min-height: 28px; }
.plot-title { font-size: 14px; font-weight: 600; color: inherit; }
.unit-switch { display: flex; gap: 4px; }
.unit-switch button {
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}
.unit-switch button.is-active { background: rgba(64, 181, 253, 0.28); }
.plot-host { position: relative; flex: 1; min-height: 0; }
.chart-el { width: 100%; height: 100%; display: block; }
.chart-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.chart-tooltip { position: absolute; z-index: 2; pointer-events: none; padding: 6px 8px; border: 1px solid; border-radius: 2px; font-size: 12px; }
</style>
