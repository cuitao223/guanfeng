<template>
  <div
    class="value-color-bar"
    :class="{ 'is-vertical': placement === 'right', 'ticks-on-right': placement === 'right' && tickSide === 'right' }"
    :style="{ '--tick-gap': `${tickGap}px` }"
    title="双击打开色标配置"
    @dblclick="$emit('open-settings')"
  >
    <div class="value-color-bar__main">
      <div class="value-color-bar__strip" :style="stripStyle"></div>
      <div class="value-color-bar__ticks" :class="{ 'is-dense': tickItems.length >= 7 }">
        <span v-if="placement === 'right'" class="value-color-bar__sizer" aria-hidden="true">{{ longestLabel }}</span>
        <div class="value-color-bar__ruler" aria-hidden="true"></div>
        <span
          v-for="(item, index) in tickItems"
          :key="'t' + index"
          class="value-color-bar__tick"
          :style="tickStyle(item)"
        >{{ item.label }}</span>
      </div>
    </div>
    <div v-if="unit" class="value-color-bar__unit" :title="'单位：' + unit">{{ unit }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { BarbColorMode } from "./barbColor";

const props = withDefaults(defineProps<{
  colors?: string[];
  breakpoints?: number[];
  colorMode?: BarbColorMode;
  unit?: string;
  placement?: "right" | "bottom";
  tickSide?: "left" | "right";
  tickGap?: number;
}>(), {
  colors: () => [],
  breakpoints: () => [],
  colorMode: "linear",
  unit: "",
  placement: "bottom",
  tickSide: "right",
  tickGap: 8,
});

defineEmits<{ (event: "open-settings"): void }>();

const domain = computed(() => props.breakpoints.map((item) => Number(item)).filter((item) => Number.isFinite(item)));
const isoline = computed(() => props.colorMode === "threshold" && domain.value.length === props.colors.length + 1 && props.colors.length >= 2);

const stripStyle = computed(() => {
  const list = props.colors;
  const direction = props.placement === "right" ? "to top" : "to right";
  if (!list.length) return { background: "#666" };
  if (isoline.value) {
    const step = 100 / list.length;
    const stops = list.map((color, index) => `${color} ${index * step}%, ${color} ${(index + 1) * step}%`).join(", ");
    return { background: `linear-gradient(${direction}, ${stops})` };
  }
  const points = domain.value;
  if (points.length >= 2 && list.length >= 2) {
    const count = Math.min(list.length, points.length);
    const min = points[0];
    const span = points[points.length - 1] - min;
    const stops = [];
    for (let i = 0; i < count; i += 1) {
      const pct = span > 0 ? ((points[i] - min) / span) * 100 : 0;
      stops.push(`${list[i]} ${pct}%`);
    }
    return { background: `linear-gradient(${direction}, ${stops.join(", ")})` };
  }
  return { background: `linear-gradient(${direction}, ${list.join(", ")})` };
});

const tickItems = computed(() => {
  const points = domain.value;
  if (points.length >= 2) {
    const decimals = inferDecimals(points);
    return points.map((value, index) => ({
      label: formatTick(value, decimals),
      position: isoline.value ? (index / props.colors.length) * 100 : (index / (points.length - 1)) * 100,
      align: index === 0 ? "left" : index === points.length - 1 ? "right" : "center",
    }));
  }
  return [];
});

const longestLabel = computed(() => tickItems.value.reduce((longest, item) => item.label.length > longest.length ? item.label : longest, ""));

function tickStyle(item: { position: number; align: string }): Record<string, string> {
  if (props.placement === "right") {
    const edge = item.align === "left" ? "0%" : item.align === "right" ? "100%" : `${item.position}%`;
    const shift = item.align === "right" ? "translateY(100%)" : item.align === "left" ? "translateY(0)" : "translateY(50%)";
    const side = props.tickSide === "right" ? { left: "0", right: "auto" } : { left: "auto", right: "0" };
    return { bottom: edge, transform: shift, ...side };
  }
  if (item.align === "left") return { left: "0%", transform: "translateX(0)" };
  if (item.align === "right") return { left: "100%", transform: "translateX(-100%)" };
  return { left: `${item.position}%`, transform: "translateX(-50%)" };
}

function inferDecimals(points: number[]): number {
  let gap = Infinity;
  for (let i = 1; i < points.length; i += 1) gap = Math.min(gap, Math.abs(points[i] - points[i - 1]));
  if (!Number.isFinite(gap) || gap === 0) return 0;
  if (Math.abs(gap - Math.round(gap)) < 1e-9) return 0;
  return gap >= 0.1 ? 1 : 2;
}

function formatTick(value: number, decimals: number): string {
  if (decimals === 0) return String(Math.round(value));
  return value.toFixed(decimals).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
</script>

<style scoped>
.value-color-bar {
  display: flex;
  align-items: stretch;
  gap: 10px;
  box-sizing: border-box;
  padding: 6px 8px 4px;
  border-radius: 5px;
  background: var(--thi-bar-bg, rgba(4, 20, 42, 0.72));
  border: 1px solid var(--thi-bar-border, rgba(64, 140, 210, 0.5));
  cursor: pointer;
}

.value-color-bar__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.value-color-bar__strip {
  height: 14px;
  border-radius: 2px;
}

.value-color-bar__ticks {
  position: relative;
  min-height: 14px;
}

.value-color-bar__ruler {
  width: 100%;
  height: 1px;
  visibility: hidden;
}

.value-color-bar__tick {
  position: absolute;
  top: 0;
  font-size: 11px;
  line-height: 1.2;
  color: var(--thi-bar-tick, #cfe6ff);
  white-space: nowrap;
  pointer-events: none;
}

.is-dense .value-color-bar__tick {
  font-size: 10px;
}

.value-color-bar__unit {
  flex-shrink: 0;
  align-self: center;
  max-width: 72px;
  overflow: hidden;
  font-size: 12px;
  color: var(--thi-bar-unit, #9ec9ef);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-vertical {
  flex-direction: column;
  width: max-content;
  min-width: 0;
  height: 100%;
  flex-shrink: 0;
  gap: 2px;
  padding: 4px 4px 2px;
}

.is-vertical .value-color-bar__main {
  flex-direction: row-reverse;
  flex: 1;
  min-height: 0;
  gap: var(--tick-gap, 8px);
}

.is-vertical.ticks-on-right .value-color-bar__main {
  flex-direction: row;
}

.is-vertical .value-color-bar__strip {
  width: 14px;
  height: 100%;
}

.is-vertical .value-color-bar__ticks {
  flex: none;
  width: max-content;
  height: 100%;
  min-height: 0;
}

.is-vertical .value-color-bar__sizer {
  visibility: hidden;
  display: block;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.is-vertical .is-dense .value-color-bar__sizer {
  font-size: 10px;
}

.is-vertical .value-color-bar__tick {
  left: auto;
  right: 0;
  top: auto;
  text-align: right;
}

.is-vertical.ticks-on-right .value-color-bar__tick {
  left: 0;
  right: auto;
  text-align: left;
}
</style>
