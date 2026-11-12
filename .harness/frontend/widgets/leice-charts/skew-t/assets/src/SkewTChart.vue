<template>
  <div ref="wrap" class="skewt-chart" :class="{ 'is-light': theme === 'light' }">
    <svg ref="svg" class="chart-el"></svg>
    <div v-show="tooltip.visible" ref="tipEl" class="chart-tooltip" :style="tooltipStyle">
      <div>气压: {{ tooltip.p }} hPa</div>
      <div class="tip-row"><span class="tip-dot" :style="{ background: TEMP }" />温度曲线: {{ tooltip.temp }} °C</div>
      <div class="tip-row"><span class="tip-dot" :style="{ background: DEW }" />露点曲线: {{ tooltip.dew }} °C</div>
      <div class="tip-row"><span class="tip-dot" :style="{ background: STATE }" />状态曲线: {{ tooltip.state }} °C</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from "d3";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { buildBuoyancyAreas, buildProfilePoints, buildStatePoints, interpTempAtP, type ProfileInput } from "./skewTProfile";
import {
  MIXING_RATIO_GKG,
  P0,
  P_BOT,
  P_TICKS,
  P_TOP,
  T_GRID_TICKS,
  T_LABEL_TICKS,
  T_MAX,
  T_MIN,
  dryAdiabatTemp,
  dryThetasForPlot,
  mixingRatioTempC,
  moistAdiabatAnchored,
  moistBottomSeedTemps,
  pressurePath,
  type StateCurveInput,
  type ThermoPoint,
} from "./skewTThermo";

const TEMP = "#363AFE";
const DEW = "#1E8F1E";
const STATE = "#FF2929";
const AREA_CAPE = "#FF7A3C";
const AREA_CIN = "#2FBF55";
const AREA_UPPER = "#3D93FF";
const MARGIN = { top: 48, right: 50, bottom: 28, left: 48 };
const P_PATH = pressurePath(180);
const DRY_THETAS = dryThetasForPlot();
const MOIST_TBOT = moistBottomSeedTemps();

const props = withDefaults(
  defineProps<{
    temperature?: ProfileInput | null;
    dewPoint?: ProfileInput | null;
    stateCurve?: StateCurveInput | null;
    theme?: "dark" | "light";
  }>(),
  {
    temperature: null,
    dewPoint: null,
    stateCurve: null,
    theme: "dark",
  }
);

const wrap = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const tipEl = ref<HTMLDivElement | null>(null);
const clipId = `skewt-clip-${Math.random().toString(36).slice(2, 9)}`;
const tooltip = reactive({ visible: false, x: 0, y: 0, p: "", temp: "--", dew: "--", state: "--" });
const tooltipStyle = computed(() => ({
  left: `${tooltip.x}px`,
  top: `${tooltip.y}px`,
  background: props.theme === "light" ? "rgba(255, 255, 255, 0.96)" : "rgba(4, 20, 42, 0.94)",
  borderColor: props.theme === "light" ? "rgba(100, 130, 160, 0.45)" : "rgba(70, 150, 220, 0.55)",
  color: props.theme === "light" ? "#243447" : "#d7ecff",
}));

const palette = computed(() =>
  props.theme === "light"
    ? {
        plotBg: "#ffffff",
        axis: "rgba(70, 90, 110, 0.75)",
        grid: "rgba(90, 110, 130, 0.4)",
        label: "#334455",
        cross: "rgba(220, 100, 40, 0.85)",
        dry: "rgba(180, 100, 50, 0.5)",
        moist: "rgba(20, 140, 140, 0.5)",
        mixr: "rgba(120, 70, 170, 0.5)",
        halo: "#ffffff",
      }
    : {
        plotBg: "transparent",
        axis: "rgba(120, 170, 210, 0.75)",
        grid: "rgba(150, 175, 200, 0.4)",
        label: "#9ec9ef",
        cross: "rgba(232, 244, 255, 0.55)",
        dry: "rgba(196, 120, 72, 0.5)",
        moist: "rgba(48, 168, 168, 0.5)",
        mixr: "rgba(196, 150, 230, 0.5)",
        halo: "rgba(4, 18, 40, 0.92)",
      }
);

let raf = 0;
let observer: ResizeObserver | null = null;
let hover: {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLogarithmic<number, number>;
  innerW: number;
  innerH: number;
  tempPts: ThermoPoint[];
  dewPts: ThermoPoint[];
  statePts: ThermoPoint[];
} | null = null;

function schedule() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    raf = 0;
    draw();
  });
}

function fmtTemp(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return Number(value).toFixed(2);
}

function drawLineValue(
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  screenPts: Array<[number, number]>,
  innerW: number,
  innerH: number,
  text: string,
  color: string,
  halo: string
) {
  const inside = screenPts.filter((pt) => pt[0] >= 8 && pt[0] <= innerW - 8 && pt[1] >= 8 && pt[1] <= innerH - 8);
  if (inside.length < 2) return;
  let len = 0;
  for (let i = 1; i < inside.length; i += 1) {
    len += Math.hypot(inside[i][0] - inside[i - 1][0], inside[i][1] - inside[i - 1][1]);
  }
  if (len < 48) return;
  const mid = Math.floor(inside.length / 2);
  const i0 = Math.max(0, mid - 2);
  const i1 = Math.min(inside.length - 1, mid + 2);
  const dx = inside[i1][0] - inside[i0][0];
  const dy = inside[i1][1] - inside[i0][1];
  if (dx * dx + dy * dy < 4) return;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  else if (deg < -90) deg += 180;
  const x = inside[mid][0];
  const y = inside[mid][1];
  layer
    .append("text")
    .attr("x", x)
    .attr("y", y)
    .attr("fill", color)
    .attr("font-size", 11)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("stroke", halo)
    .attr("stroke-width", 3)
    .attr("paint-order", "stroke")
    .attr("transform", `rotate(${deg.toFixed(1)},${x},${y})`)
    .text(text);
}

function drawCurve(
  plot: d3.Selection<SVGGElement, unknown, null, undefined>,
  line: d3.Line<[number, number]>,
  pts: Array<[number, number]>,
  color: string,
  width: number
) {
  if (pts.length < 2) return;
  plot
    .append("path")
    .attr("d", line(pts))
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", width)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");
}

function draw() {
  const host = wrap.value;
  const node = svg.value;
  if (!host || !node) return;
  const colors = palette.value;
  const width = Math.max(120, host.clientWidth);
  const height = Math.max(120, host.clientHeight);
  const innerW = Math.max(40, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(40, height - MARGIN.top - MARGIN.bottom);
  const root = d3.select(node);
  root.selectAll("*").remove();
  root.attr("width", width).attr("height", height);
  const xScale = d3.scaleLinear().domain([T_MIN, T_MAX]).range([0, innerW]);
  const yScale = d3.scaleLog().domain([P_BOT, P_TOP]).range([innerH, 0]);
  const line = d3
    .line<[number, number]>()
    .defined((d) => d != null)
    .x((d) => d[0])
    .y((d) => d[1]);
  const toXY = (t: number, p: number): [number, number] => [xScale(t), yScale(p)];

  root.append("defs").append("clipPath").attr("id", clipId).append("rect").attr("width", innerW).attr("height", innerH);
  const g = root.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
  g.append("rect").attr("width", innerW).attr("height", innerH).attr("fill", colors.plotBg);
  const plot = g.append("g").attr("clip-path", `url(#${clipId})`);

  P_TICKS.forEach((p) => {
    plot
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", yScale(p))
      .attr("y2", yScale(p))
      .attr("stroke", colors.grid)
      .attr("stroke-width", 0.9);
  });
  T_GRID_TICKS.forEach((t) => {
    const tx = xScale(t);
    plot.append("line").attr("x1", tx).attr("x2", tx).attr("y1", 0).attr("y2", innerH).attr("stroke", colors.grid).attr("stroke-width", 0.9);
  });

  const lineLabels: Array<{ pts: Array<[number, number]>; text: string; color: string }> = [];
  DRY_THETAS.forEach((theta) => {
    if (((theta % 20) + 20) % 20 !== 0) return;
    const pts = P_PATH.map((p) => toXY(dryAdiabatTemp(theta, p), p));
    plot.append("path").attr("d", line(pts)).attr("fill", "none").attr("stroke", colors.dry).attr("stroke-width", 1).attr("stroke-dasharray", "5,2.5");
    lineLabels.push({ pts, text: String(theta), color: colors.dry });
  });
  MOIST_TBOT.forEach((t0) => {
    if (((t0 % 20) + 20) % 20 !== 10) return;
    const raw = moistAdiabatAnchored(t0, P0, P_TOP, P_BOT, -2);
    const pts = raw.map((d) => toXY(d.t, d.p));
    plot.append("path").attr("d", line(pts)).attr("fill", "none").attr("stroke", colors.moist).attr("stroke-width", 1.05).attr("stroke-dasharray", "5,2.5");
    lineLabels.push({ pts, text: String(t0), color: colors.moist });
  });
  const mixrPressures = P_PATH.filter((p) => p >= 400);
  if (!mixrPressures.length || mixrPressures[mixrPressures.length - 1] !== 400) mixrPressures.push(400);
  MIXING_RATIO_GKG.forEach((ws) => {
    const raw: ThermoPoint[] = [];
    mixrPressures.forEach((p) => {
      const t = mixingRatioTempC(ws, p);
      if (t == null) return;
      raw.push({ t, p });
    });
    if (raw.length < 2) return;
    const pts = raw.map((d) => toXY(d.t, d.p));
    plot.append("path").attr("d", line(pts)).attr("fill", "none").attr("stroke", colors.mixr).attr("stroke-width", 1).attr("stroke-dasharray", "4,2");
    const text = Math.abs(ws - Math.round(ws)) < 1e-6 ? String(Math.round(ws)) : String(ws);
    lineLabels.push({ pts, text, color: colors.mixr });
  });
  const labelLayer = plot.append("g").attr("class", "line-values").style("pointer-events", "none");
  lineLabels.forEach((item) => drawLineValue(labelLayer, item.pts, innerW, innerH, item.text, item.color, colors.halo));

  const tempProfile = buildProfilePoints(props.temperature);
  const dewProfile = buildProfilePoints(props.dewPoint);
  const stateProfile = buildStatePoints(props.stateCurve, P_TOP);
  const areas = buildBuoyancyAreas(tempProfile, stateProfile);
  const fill = { cape: AREA_CAPE, cin: AREA_CIN, upper: AREA_UPPER };
  const layer = plot.append("g").attr("class", "buoyancy-areas");
  areas.forEach((area) => {
    const ring = area.pts.map((d) => toXY(d.tState, d.p)).concat(area.pts.slice().reverse().map((d) => toXY(d.tEnv, d.p)));
    if (ring.length < 3) return;
    const d = line(ring);
    if (!d) return;
    layer
      .append("path")
      .attr("d", `${d}Z`)
      .attr("fill", fill[area.kind])
      .attr("fill-opacity", props.theme === "light" ? 0.45 : 0.72)
      .attr("stroke", "none")
      .style("pointer-events", "none");
  });
  drawCurve(plot, line, tempProfile.map((d) => toXY(d.t, d.p)), TEMP, 2);
  drawCurve(plot, line, dewProfile.map((d) => toXY(d.t, d.p)), DEW, 2);
  drawCurve(plot, line, stateProfile.map((d) => toXY(d.t, d.p)), STATE, 2.2);

  if (tempProfile.length < 2 && dewProfile.length < 2 && stateProfile.length < 2) {
    g.append("text").attr("x", innerW / 2).attr("y", innerH / 2).attr("text-anchor", "middle").attr("fill", colors.label).attr("font-size", 14).text("无数据");
  }

  g.append("rect").attr("width", innerW).attr("height", innerH).attr("fill", "none").attr("stroke", colors.axis).attr("stroke-width", 1.2);
  const yAxis = d3.axisLeft(yScale).tickValues(P_TICKS.slice()).tickFormat((d) => String(d)).tickSize(0);
  g.append("g").call(yAxis).call((ax) => ax.select(".domain").remove()).selectAll("text").attr("fill", colors.label).attr("font-size", 13).attr("font-weight", "bold").attr("dx", -4);
  const yAxisRight = d3.axisRight(yScale).tickValues(P_TICKS.slice()).tickFormat((d) => String(d)).tickSize(0);
  g.append("g")
    .attr("transform", `translate(${innerW},0)`)
    .call(yAxisRight)
    .call((ax) => ax.select(".domain").remove())
    .selectAll("text")
    .attr("fill", colors.label)
    .attr("font-size", 13)
    .attr("font-weight", "bold")
    .attr("dx", 4);
  g.append("text").attr("x", -36).attr("y", -10).attr("fill", colors.label).attr("font-size", 13).attr("font-weight", "bold").text("hPa");
  T_LABEL_TICKS.forEach((t) => {
    const tx = xScale(t);
    g.append("text").attr("x", tx).attr("y", -8).attr("text-anchor", "middle").attr("fill", colors.label).attr("font-size", 13).attr("font-weight", "bold").text(String(t));
    g.append("text").attr("x", tx).attr("y", innerH + 16).attr("text-anchor", "middle").attr("fill", colors.label).attr("font-size", 13).attr("font-weight", "bold").text(String(t));
  });
  g.append("text").attr("x", innerW + 14).attr("y", innerH + 16).attr("fill", colors.label).attr("font-size", 13).attr("font-weight", "bold").text("°C");

  const legend = [
    { name: "温度曲线", color: TEMP, dash: "" },
    { name: "露点曲线", color: DEW, dash: "" },
    { name: "状态曲线", color: STATE, dash: "" },
    { name: "干绝热线", color: colors.dry, dash: "5,2.5" },
    { name: "湿绝热线", color: colors.moist, dash: "5,2.5" },
    { name: "等饱和比湿线", color: colors.mixr, dash: "4,2" },
  ];
  const lg = root.append("g");
  const lineW = 22;
  const gap = 18;
  const textGap = 6;
  const fontSize = 12;
  const itemWidths = legend.map((item) => lineW + textGap + item.name.length * fontSize + gap);
  const totalW = itemWidths.reduce((a, b) => a + b, 0) - gap;
  let lx = Math.max(MARGIN.left, (width - totalW) / 2);
  legend.forEach((item, idx) => {
    const lineEl = lg.append("line").attr("x1", lx).attr("x2", lx + lineW).attr("y1", 12).attr("y2", 12).attr("stroke", item.color).attr("stroke-width", 1.6);
    if (item.dash) lineEl.attr("stroke-dasharray", item.dash);
    lg.append("text").attr("x", lx + lineW + textGap).attr("y", 16).attr("fill", colors.label).attr("font-size", fontSize).text(item.name);
    lx += itemWidths[idx];
  });

  const focus = g.append("g").attr("class", "focus").style("display", "none");
  focus.append("line").attr("class", "focus-p").attr("x1", 0).attr("x2", innerW).attr("stroke", colors.cross).attr("stroke-width", 1).attr("stroke-dasharray", "3,2");
  [
    { key: "temp", color: TEMP },
    { key: "dew", color: DEW },
    { key: "state", color: STATE },
  ].forEach((item) => {
    focus.append("circle").attr("class", `focus-${item.key}`).attr("r", 3.5).attr("fill", item.color).attr("stroke", "#fff").attr("stroke-width", 1).style("display", "none");
  });
  hover = { xScale, yScale, innerW, innerH, tempPts: tempProfile, dewPts: dewProfile, statePts: stateProfile };
  g.append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .on("mousemove", (event: MouseEvent) => onHover(event))
    .on("mouseleave", () => {
      d3.select(node).select(".focus").style("display", "none");
      tooltip.visible = false;
    });
}

function onHover(event: MouseEvent) {
  const host = wrap.value;
  const node = svg.value;
  const sc = hover;
  if (!host || !node || !sc) return;
  const rect = host.getBoundingClientRect();
  const my = event.clientY - rect.top - MARGIN.top;
  if (my < 0 || my > sc.innerH) {
    tooltip.visible = false;
    return;
  }
  const pHit = sc.yScale.invert(my);
  const tTemp = interpTempAtP(sc.tempPts, pHit);
  const tDew = interpTempAtP(sc.dewPts, pHit);
  const tState = interpTempAtP(sc.statePts, pHit);
  const py = sc.yScale(pHit);
  const focus = d3.select(node).select(".focus");
  focus.style("display", null);
  focus.select(".focus-p").attr("y1", py).attr("y2", py);
  const setDot = (key: string, tVal: number | null) => {
    const el = focus.select(`.focus-${key}`);
    if (tVal == null || !Number.isFinite(tVal)) {
      el.style("display", "none");
      return;
    }
    el.style("display", null).attr("cx", sc.xScale(tVal)).attr("cy", py);
  };
  setDot("temp", tTemp);
  setDot("dew", tDew);
  setDot("state", tState);
  tooltip.visible = true;
  tooltip.p = Number(pHit).toFixed(1);
  tooltip.temp = fmtTemp(tTemp);
  tooltip.dew = fmtTemp(tDew);
  tooltip.state = fmtTemp(tState);
  const tipW = tipEl.value?.offsetWidth || 160;
  const tipH = tipEl.value?.offsetHeight || 90;
  let x = MARGIN.left + sc.innerW * 0.55;
  let y = MARGIN.top + py - tipH / 2;
  if (x + tipW > host.clientWidth - 8) x = MARGIN.left + sc.innerW * 0.55 - tipW - 14;
  tooltip.x = Math.max(8, x);
  tooltip.y = Math.max(8, Math.min(y, host.clientHeight - tipH - 8));
}

onMounted(() => {
  draw();
  observer = new ResizeObserver(() => schedule());
  if (wrap.value) observer.observe(wrap.value);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  if (observer) observer.disconnect();
});

watch(() => [props.temperature, props.dewPoint, props.stateCurve, props.theme], schedule, { deep: true });
</script>

<style scoped>
.skewt-chart {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 520px;
  overflow: visible;
  background: #061426;
}
.skewt-chart.is-light {
  background: #ffffff;
}
.chart-el {
  display: block;
  width: 100%;
  height: 100%;
}
.chart-tooltip {
  position: absolute;
  z-index: 3;
  min-width: 160px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.45;
  pointer-events: none;
}
.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
