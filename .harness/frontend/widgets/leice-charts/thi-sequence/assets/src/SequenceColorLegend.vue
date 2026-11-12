<template>
  <div class="seq-legend" :class="placement === 'right' ? 'is-right' : 'is-bottom'">
    <SequenceColorBar
      v-for="scale in scales"
      :key="scale.key"
      :title="scale.name"
      :unit="scale.unit"
      :colors="scale.colors"
      :breakpoints="scale.breakpoints"
      :color-mode="scale.colorMode"
      :placement="placement"
      :tick-side="scale.tickSide || tickSide"
      :tick-gap="scale.tickGap ?? tickGap"
      @open-settings="$emit('open-settings', scale.key)"
    />
  </div>
</template>

<script setup lang="ts">
import SequenceColorBar from "./SequenceColorBar.vue";
import type { ColorScaleSpec } from "./sequenceLegend";

defineEmits<{ (event: "open-settings", key: string): void }>();

withDefaults(defineProps<{
  scales?: (ColorScaleSpec & { tickSide?: "left" | "right"; tickGap?: number })[];
  placement?: "right" | "bottom";
  tickSide?: "left" | "right";
  tickGap?: number;
}>(), {
  scales: () => [],
  placement: "right",
  tickSide: "right",
  tickGap: 8,
});
</script>

<style scoped>
.seq-legend {
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
}

.seq-legend.is-right {
  display: flex;
  flex: 0 0 auto;
  flex-direction: row;
  align-items: stretch;
  gap: 10px;
  height: 100%;
  padding: 8px 8px 8px 0;
}

.seq-legend.is-bottom {
  display: flex;
  flex: none;
  flex-flow: row nowrap;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 12px 8px 52px;
}
</style>
