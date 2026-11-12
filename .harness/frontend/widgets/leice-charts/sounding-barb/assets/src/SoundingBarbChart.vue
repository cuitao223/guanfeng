<template>
  <div ref="wrap" class="chart-frame" :style="frameStyle">
    <canvas ref="canvas" class="chart-el"></canvas>
    <svg ref="svg" class="chart-el"></svg>
    <div v-show="empty" class="chart-empty">无数据</div>
    <div v-show="tooltip.visible" class="chart-tooltip" :style="tooltipStyle">
      <div>气压: {{ tooltip.pressure }} hPa</div>
      <div>高度: {{ tooltip.height }}</div>
      <div>风速: {{ tooltip.speed }} m/s</div>
      <div>风向: {{ tooltip.dir }}°</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import * as d3 from "d3";
import {
  drawWindBarbPath,
  P_BOT,
  P_TOP,
  pickSoundingLevels,
  soundingSamples,
  type SoundingLevel,
} from "./soundingSeries";
import { resolvePalette, type ChartPalette, type ChartThemeName } from "./themes";

const MARGIN = { top: 16, right: 12, bottom: 16, left: 46 };

const props = withDefaults(defineProps<{
  pressure?: unknown[];
  value?: unknown[];
  windDir?: unknown[];
  height?: unknown[];
  theme?: ChartThemeName;
  palette?: Partial<ChartPalette> | null;
}>(), {
  pressure: () => [],
  value: () => [],
  windDir: () => [],
  height: () => [],
  theme: "dark",
  palette: null,
});

const wrap = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const empty = ref(true);
const tooltip = reactive({ visible: false, x: 0, y: 0, pressure: "", height: "", speed: "", dir: "" });
const colors = computed(() => resolvePalette(props.theme, props.palette));
const frameStyle = computed(() => ({
  background: colors.value.frameBg,
  borderColor: colors.value.frameBorder,
  color: colors.value.label,
}));
const tooltipStyle = computed(() => ({
  left: `${tooltip.x}px`,
  top: `${tooltip.y}px`,
  background: colors.value.tooltipBg,
  borderColor: colors.value.tooltipBorder,
  color: colors.value.tooltipText,
}));

let resizeObserver: ResizeObserver | null = null;
let updateRaf = 0;
let levels: SoundingLevel[] = [];
let yScale: d3.ScaleLogarithmic<number, number> | null = null;

function schedule(): void {
  if (updateRaf) return;
  updateRaf = requestAnimationFrame(() => {
    updateRaf = 0;
    draw();
  });
}

function draw(): void {
  const host = wrap.value;
  const svgEl = svg.value;
  const canvasEl = canvas.value;
  if (!host || !svgEl || !canvasEl) return;
  const width = host.clientWidth || 0;
  const height = host.clientHeight || 0;
  if (width < 40 || height < 40) return;
  const innerH = Math.max(10, height - MARGIN.top - MARGIN.bottom);
  const xCenter = width / 2;
  const samples = soundingSamples(props.pressure || [], props.value || [], props.windDir || [], props.height || []);
  levels = pickSoundingLevels(samples);
  empty.value = levels.length === 0;
  yScale = d3.scaleLog().domain([P_BOT, P_TOP]).range([innerH, 0]);
  const root = d3.select(svgEl);
  root.selectAll("*").remove();
  root.attr("width", width).attr("height", height);
  root.append("line")
    .attr("x1", xCenter).attr("x2", xCenter)
    .attr("y1", MARGIN.top).attr("y2", MARGIN.top + innerH)
    .attr("stroke", colors.value.axis);
  const label = root.append("g");
  for (const level of [1000, 850, 700, 500, 300, 200]) {
    label.append("text")
      .attr("x", 8)
      .attr("y", MARGIN.top + yScale(level))
      .attr("fill", colors.value.label)
      .attr("font-size", 11)
      .attr("dominant-baseline", "middle")
      .text(String(level));
  }
  const dpr = window.devicePixelRatio || 1;
  canvasEl.width = Math.floor(width * dpr);
  canvasEl.height = Math.floor(height * dpr);
  canvasEl.style.width = `${width}px`;
  canvasEl.style.height = `${height}px`;
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = colors.value.barb;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const level of levels) {
    drawWindBarbPath(ctx, xCenter, MARGIN.top + yScale(level.level), level.speed, level.dir);
  }
  root.append("rect").attr("width", width).attr("height", height).attr("fill", "transparent")
    .on("mousemove", (event) => {
      if (!yScale || !levels.length) {
        tooltip.visible = false;
        return;
      }
      const [, my] = d3.pointer(event);
      const pressure = yScale.invert(my - MARGIN.top);
      let best = levels[0];
      let bestDist = Infinity;
      for (const level of levels) {
        const dist = Math.abs(Math.log(level.level) - Math.log(pressure));
        if (dist < bestDist) {
          best = level;
          bestDist = dist;
        }
      }
      tooltip.visible = bestDist < 0.08;
      tooltip.pressure = String(best.level);
      tooltip.height = best.height == null ? "--" : `${Math.round(best.height)} m`;
      tooltip.speed = String(Math.round(best.speed * 10) / 10);
      tooltip.dir = String(Math.round(best.dir));
      tooltip.x = Math.min(width - 140, xCenter + 16);
      tooltip.y = Math.max(8, my - 36);
    })
    .on("mouseleave", () => {
      tooltip.visible = false;
    });
}

watch(() => [props.pressure, props.value, props.windDir, props.height, props.theme, props.palette], () => schedule(), { deep: true });
onMounted(() => {
  schedule();
  resizeObserver = new ResizeObserver(() => schedule());
  if (wrap.value) resizeObserver.observe(wrap.value);
});
onBeforeUnmount(() => {
  if (updateRaf) cancelAnimationFrame(updateRaf);
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.chart-frame { position: relative; width: 100%; height: 100%; box-sizing: border-box; border: 1px solid; overflow: hidden; }
.chart-el { position: absolute; inset: 0; width: 100%; height: 100%; }
.chart-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; pointer-events: none; }
.chart-tooltip { position: absolute; z-index: 2; pointer-events: none; min-width: 120px; padding: 6px 8px; border: 1px solid; border-radius: 2px; font-size: 12px; line-height: 1.45; }
</style>
