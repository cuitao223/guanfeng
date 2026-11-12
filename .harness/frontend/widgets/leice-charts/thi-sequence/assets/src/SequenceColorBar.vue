<template>
  <div
    class="value-color-bar"
    :class="[
      placement === 'right' ? 'is-vertical' : 'is-horizontal',
      tickSide === 'left' ? 'ticks-left' : 'ticks-right',
    ]"
    :style="barStyle"
    role="button"
    :aria-label="title ? `${title}色标` : '色标'"
    title="双击打开色标配置"
    @dblclick.stop="$emit('open-settings')"
  >
    <div v-if="title" class="value-color-bar__title">{{ title }}</div>
    <div class="value-color-bar__main">
      <div class="value-color-bar__strip" :style="{ background: stripBackground }"></div>
      <div class="value-color-bar__ticks" :class="{ 'is-dense': ticks.length >= 7 }">
        <span class="value-color-bar__sizer" aria-hidden="true">{{ longestLabel }}</span>
        <span
          v-for="tick in ticks"
          :key="tick.key"
          class="value-color-bar__tick"
          :style="tickStyle(tick)"
        >{{ tick.label }}</span>
      </div>
    </div>
    <div v-if="unit" class="value-color-bar__unit">{{ unit }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { colorStrip, colorTicks, type ColorTick } from "./sequenceLegend";
import type { SequenceColorMode } from "./sequenceColor";

const props = withDefaults(defineProps<{
  title?: string;
  colors?: string[];
  breakpoints?: number[];
  colorMode?: SequenceColorMode;
  unit?: string;
  placement?: "right" | "bottom";
  tickSide?: "left" | "right";
  tickGap?: number;
}>(), {
  title: "",
  colors: () => [],
  breakpoints: () => [],
  colorMode: "linear",
  unit: "",
  placement: "right",
  tickSide: "right",
  tickGap: 8,
});

const colors = computed(() => props.colors.filter((item) => typeof item === "string" && item));
const breakpoints = computed(() => props.breakpoints.map((item) => Number(item)).filter((item) => Number.isFinite(item)));
const direction = computed(() => (props.placement === "right" ? "to top" : "to right"));
const stripBackground = computed(() => colorStrip(colors.value, breakpoints.value, props.colorMode, direction.value));
const ticks = computed(() => colorTicks(colors.value, breakpoints.value, props.colorMode));
const longestLabel = computed(() => ticks.value.reduce((longest, tick) => (
  tick.label.length > longest.length ? tick.label : longest
), ""));
const barStyle = computed(() => ({
  "--tick-gap": `${props.tickGap}px`,
}));

defineEmits<{ (event: "open-settings"): void }>();

function tickStyle(tick: ColorTick): Record<string, string> {
  if (props.placement === "right") {
    const edge = tick.align === "start" ? "0%" : tick.align === "end" ? "100%" : `${tick.position}%`;
    const shift = tick.align === "end" ? "translateY(100%)" : tick.align === "start" ? "translateY(0)" : "translateY(50%)";
    const side = props.tickSide === "right"
      ? { left: "0", right: "auto", textAlign: "left" }
      : { left: "auto", right: "0", textAlign: "right" };
    return { bottom: edge, top: "auto", transform: shift, ...side };
  }
  if (tick.align === "start") return { left: "0%", transform: "translateX(0)" };
  if (tick.align === "end") return { left: "100%", transform: "translateX(-100%)" };
  return { left: `${tick.position}%`, transform: "translateX(-50%)" };
}
</script>

<style scoped>
.value-color-bar {
  --tick-gap: 8px;
  display: flex;
  box-sizing: border-box;
  max-width: 100%;
  padding: 6px 8px 4px;
  border: 1px solid var(--seq-bar-border, rgba(90, 170, 240, 0.45));
  border-radius: 5px;
  background: var(--seq-bar-bg, rgba(6, 24, 48, 0.94));
  color: var(--seq-bar-tick, #9ec9ef);
  font-size: 12px;
  line-height: 1.2;
  user-select: none;
  cursor: pointer;
}

.value-color-bar.is-vertical {
  flex: 0 0 auto;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: max-content;
  max-width: none;
  min-width: max-content;
  height: 100%;
  min-height: 0;
}

.value-color-bar.is-horizontal {
  flex: 0 0 auto;
  flex-direction: column;
  width: min(420px, 100%);
  max-width: min(420px, 100%);
  min-width: min(420px, 100%);
}

.value-color-bar__title {
  flex: none;
  height: 16px;
  color: var(--seq-bar-title, #d7ecff);
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}

.value-color-bar.is-horizontal .value-color-bar__title {
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
}

.value-color-bar__main {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
}

.value-color-bar.is-vertical .value-color-bar__main {
  flex: 1 1 auto;
  flex-direction: row;
  align-items: stretch;
  gap: var(--tick-gap);
  height: auto;
  min-height: 0;
}

.value-color-bar.is-horizontal .value-color-bar__main {
  flex-direction: column;
  width: 100%;
}

.value-color-bar__strip {
  flex: none;
  box-sizing: border-box;
  border: 1px solid var(--seq-bar-border, rgba(90, 170, 240, 0.45));
  border-radius: 2px;
}

.value-color-bar.is-vertical .value-color-bar__strip {
  width: 14px;
  height: 100%;
}

.value-color-bar.is-horizontal .value-color-bar__strip {
  width: 100%;
  height: 12px;
}

.value-color-bar__ticks {
  position: relative;
  flex: none;
}

.value-color-bar.is-vertical .value-color-bar__ticks {
  width: max-content;
  min-width: 0;
  height: 100%;
  margin: 0;
}

.value-color-bar.is-vertical.ticks-left .value-color-bar__main {
  flex-direction: row-reverse;
}

.value-color-bar.is-horizontal .value-color-bar__ticks {
  width: 100%;
  height: 16px;
  margin-top: var(--tick-gap);
}

.value-color-bar.is-horizontal.ticks-left .value-color-bar__main {
  flex-direction: column-reverse;
}

.value-color-bar.is-horizontal.ticks-left .value-color-bar__ticks {
  margin-top: 0;
  margin-bottom: var(--tick-gap);
}

.value-color-bar__tick {
  position: absolute;
  color: var(--seq-bar-tick, #9ec9ef);
  font-size: 11px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
}

.value-color-bar__ticks.is-dense .value-color-bar__tick,
.value-color-bar__ticks.is-dense .value-color-bar__sizer {
  font-size: 10px;
}

.value-color-bar.is-vertical .value-color-bar__tick {
  top: auto;
}

.value-color-bar.is-horizontal .value-color-bar__tick {
  top: 0;
}

.value-color-bar__sizer {
  display: block;
  visibility: hidden;
  height: 0;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
}

.value-color-bar__unit {
  flex: none;
  height: 16px;
  color: var(--seq-bar-unit, #9ec9ef);
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}

.value-color-bar.is-horizontal .value-color-bar__unit {
  margin-top: 4px;
  text-align: right;
}
</style>
