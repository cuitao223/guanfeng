<template>
  <div ref="wrap" class="chart-frame" :style="frameStyle">
    <svg ref="svg" class="chart-el"></svg>
    <div v-show="empty" class="chart-empty">无数据</div>
    <div v-show="tooltip.visible" class="chart-tooltip" :style="tooltipStyle">
      <div>方向: {{ tooltip.dir }}°</div>
      <div>值: {{ tooltip.value }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import * as d3 from "d3";
import { ROSE_DIRECTIONS, roseRadius, roseSamples } from "./roseSeries";
import { resolvePalette, type ChartPalette, type ChartThemeName } from "./themes";

const props = withDefaults(defineProps<{
  samples?: unknown[];
  maxValue?: number;
  heightM?: number;
  theme?: ChartThemeName;
  palette?: Partial<ChartPalette> | null;
}>(), {
  samples: () => [],
  maxValue: 1000,
  heightM: 0,
  theme: "dark",
  palette: null,
});

const wrap = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const empty = ref(true);
const tooltip = reactive({ visible: false, x: 0, y: 0, dir: "", value: "" });
const colors = computed(() => resolvePalette(props.theme, props.palette));
const frameStyle = computed(() => ({ background: colors.value.frameBg, borderColor: colors.value.frameBorder, color: colors.value.label }));
const tooltipStyle = computed(() => ({
  left: `${tooltip.x}px`, top: `${tooltip.y}px`, background: colors.value.tooltipBg, borderColor: colors.value.tooltipBorder, color: colors.value.tooltipText,
}));
let resizeObserver: ResizeObserver | null = null;
let updateRaf = 0;

function schedule(): void {
  if (updateRaf) return;
  updateRaf = requestAnimationFrame(() => { updateRaf = 0; draw(); });
}

function draw(): void {
  const host = wrap.value;
  const svgEl = svg.value;
  if (!host || !svgEl) return;
  const width = host.clientWidth || 0;
  const height = host.clientHeight || 0;
  if (width < 40 || height < 40) return;
  const samples = roseSamples(props.samples || []);
  empty.value = samples.length === 0;
  const root = d3.select(svgEl);
  root.selectAll("*").remove();
  root.attr("width", width).attr("height", height);
  const cx = width / 2;
  const cy = height / 2 + 8;
  const maxRadius = Math.max(20, Math.min(width, height) / 2 - 36);
  root.append("text").attr("x", cx).attr("y", 22).attr("text-anchor", "middle").attr("fill", colors.value.title).attr("font-size", 14)
    .text(`小时通量-${props.heightM}m`);
  root.append("text").attr("x", 12).attr("y", 40).attr("fill", colors.value.label).attr("font-size", 10).text("μg m-2 s-1");
  for (let index = 1; index <= 5; index += 1) {
    root.append("circle").attr("cx", cx).attr("cy", cy).attr("r", (maxRadius * index) / 5).attr("fill", "none").attr("stroke", colors.value.grid);
  }
  ROSE_DIRECTIONS.forEach((label, index) => {
    const angle = (index / ROSE_DIRECTIONS.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * maxRadius;
    const y = cy + Math.sin(angle) * maxRadius;
    root.append("line").attr("x1", cx).attr("y1", cy).attr("x2", x).attr("y2", y).attr("stroke", colors.value.axis);
    root.append("text").attr("x", cx + Math.cos(angle) * (maxRadius + 14)).attr("y", cy + Math.sin(angle) * (maxRadius + 14))
      .attr("text-anchor", "middle").attr("fill", colors.value.label).attr("font-size", 11).text(label);
  });
  const wedge = (5 * Math.PI) / 180;
  for (const sample of samples) {
    const radius = roseRadius(sample.value, props.maxValue, maxRadius);
    const dir = (sample.dir * Math.PI) / 180;
    const arc = d3.arc()({
      innerRadius: 0,
      outerRadius: radius,
      startAngle: dir - wedge,
      endAngle: dir + wedge,
    });
    if (!arc) continue;
    root.append("path").attr("d", arc).attr("transform", `translate(${cx},${cy})`).attr("fill", "rgb(255,230,155)").attr("stroke", "#222")
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event, host);
        tooltip.visible = true;
        tooltip.dir = sample.dir.toFixed(1);
        tooltip.value = String(Math.round(sample.value));
        tooltip.x = Math.min(width - 110, mx + 12);
        tooltip.y = Math.max(8, my + 12);
      })
      .on("mouseleave", () => { tooltip.visible = false; });
  }
}

watch(() => [props.samples, props.maxValue, props.heightM, props.theme, props.palette], () => schedule(), { deep: true });
onMounted(() => { schedule(); resizeObserver = new ResizeObserver(() => schedule()); if (wrap.value) resizeObserver.observe(wrap.value); });
onBeforeUnmount(() => { if (updateRaf) cancelAnimationFrame(updateRaf); resizeObserver?.disconnect(); });
</script>

<style scoped>
.chart-frame { position: relative; width: 100%; height: 100%; box-sizing: border-box; border: 1px solid; overflow: hidden; }
.chart-el { width: 100%; height: 100%; display: block; }
.chart-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.chart-tooltip { position: absolute; z-index: 2; pointer-events: none; padding: 6px 8px; border: 1px solid; border-radius: 2px; font-size: 12px; }
</style>
