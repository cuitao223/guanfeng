<template>
  <Teleport to="body">
    <div v-if="open" class="flux-legend-mask" :class="theme === 'light' ? 'is-light' : 'is-dark'">
      <div class="flux-legend-dialog" role="dialog" aria-modal="true" :aria-label="dialogTitle">
        <div class="flux-legend-dialog__head">
          <div class="flux-legend-dialog__title">{{ dialogTitle }}</div>
          <button type="button" class="flux-legend-dialog__close" aria-label="关闭" @click="close">×</button>
        </div>
        <div class="flux-legend-dialog__body">
          <section class="flux-legend-dialog__section">
            <div class="flux-legend-dialog__label">填色方式</div>
            <div class="flux-legend-dialog__choices">
              <button type="button" :class="{ 'is-active': draftMode === 'linear' }" @click="setMode('linear')">平滑（渐变）</button>
              <button type="button" :class="{ 'is-active': draftMode === 'threshold' }" @click="setMode('threshold')">等值线</button>
            </div>
          </section>
          <section class="flux-legend-dialog__section">
            <div class="flux-legend-dialog__label">色标位置</div>
            <div class="flux-legend-dialog__choices">
              <button type="button" :class="{ 'is-active': draftPlacement === 'right' }" @click="draftPlacement = 'right'">右侧</button>
              <button type="button" :class="{ 'is-active': draftPlacement === 'bottom' }" @click="draftPlacement = 'bottom'">底部</button>
            </div>
          </section>
          <section v-if="draftPlacement === 'right'" class="flux-legend-dialog__section">
            <div class="flux-legend-dialog__label">刻度位置</div>
            <div class="flux-legend-dialog__choices">
              <button type="button" :class="{ 'is-active': draftTickSide === 'left' }" @click="draftTickSide = 'left'">色带左侧</button>
              <button type="button" :class="{ 'is-active': draftTickSide === 'right' }" @click="draftTickSide = 'right'">色带右侧</button>
            </div>
          </section>
          <section v-if="draftPlacement === 'right'" class="flux-legend-dialog__section">
            <div class="flux-legend-dialog__label">色带间距</div>
            <div class="flux-legend-dialog__slider">
              <input v-model.number="draftTickGap" type="range" min="0" max="24" step="1" />
              <span>{{ draftTickGap }}px</span>
            </div>
          </section>
          <section class="flux-legend-dialog__section">
            <div class="flux-legend-dialog__label">图层透明度</div>
            <div class="flux-legend-dialog__slider">
              <input v-model.number="draftOpacity" type="range" min="0" max="100" step="1" />
              <span>{{ draftOpacity }}%</span>
            </div>
          </section>
          <section class="flux-legend-dialog__section">
            <div class="flux-legend-dialog__label">自定义配色（{{ draftColors.length }} 档）</div>
            <div class="flux-legend-dialog__bands">
              <label v-for="(color, index) in draftColors" :key="'color-' + index" class="flux-legend-dialog__band">
                <span>{{ index + 1 }}</span>
                <input class="flux-legend-dialog__number" type="number" step="0.1" :value="draftBreakpoints[index]" @change="setPoint(index, $event)" />
                <input class="flux-legend-dialog__color" type="color" :value="toColor(color)" @input="setColor(index, $event)" />
              </label>
              <label v-if="draftMode === 'threshold' && draftBreakpoints.length > draftColors.length" class="flux-legend-dialog__band">
                <span>最大</span>
                <input class="flux-legend-dialog__number" type="number" step="0.1" :value="draftBreakpoints[draftBreakpoints.length - 1]" @change="setPoint(draftBreakpoints.length - 1, $event)" />
              </label>
            </div>
          </section>
        </div>
        <div class="flux-legend-dialog__foot">
          <button type="button" @click="evenDraft">均分断档</button>
          <button type="button" @click="resetDraft">恢复出厂</button>
          <span class="flux-legend-dialog__spacer"></span>
          <button type="button" @click="close">取消</button>
          <button type="button" class="is-primary" @click="applyDraft">应用</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { evenFluxBreakpoints, fitFluxBreakpoints, type FluxColorMode } from "./fluxColor";
import type { ChartThemeName } from "./themes";

export interface FluxLegendSettings {
  colorMode: FluxColorMode;
  colors: string[];
  breakpoints: number[];
  opacity: number;
  placement: "right" | "bottom";
  tickSide: "left" | "right";
  tickGap: number;
}

const props = withDefaults(defineProps<{
  open?: boolean;
  name?: string;
  theme?: ChartThemeName;
  colorMode?: FluxColorMode;
  colors?: string[];
  breakpoints?: number[];
  opacity?: number;
  placement?: "right" | "bottom";
  tickSide?: "left" | "right";
  tickGap?: number;
  factoryMode?: FluxColorMode;
  factoryColors?: string[];
  factoryBreakpoints?: number[];
}>(), {
  open: false,
  name: "",
  theme: "dark",
  colorMode: "linear",
  colors: () => [],
  breakpoints: () => [],
  opacity: 1,
  placement: "right",
  tickSide: "right",
  tickGap: 8,
  factoryMode: "linear",
  factoryColors: () => [],
  factoryBreakpoints: () => [],
});

const emit = defineEmits<{
  (event: "apply", value: FluxLegendSettings): void;
  (event: "reset"): void;
  (event: "close"): void;
}>();

const draftMode = ref<FluxColorMode>("linear");
const draftColors = ref<string[]>([]);
const draftBreakpoints = ref<number[]>([]);
const draftOpacity = ref(100);
const draftPlacement = ref<"right" | "bottom">("right");
const draftTickSide = ref<"left" | "right">("right");
const draftTickGap = ref(8);
const dialogTitle = computed(() => (props.name ? `色标配置 · ${props.name}` : "色标配置"));

watch(() => props.open, (open) => {
  if (open) copyCurrent();
});

function copyCurrent(): void {
  draftMode.value = props.colorMode;
  draftColors.value = props.colors.slice();
  draftBreakpoints.value = props.breakpoints.map((item) => Number(item));
  fitDraft();
  draftOpacity.value = Math.round(props.opacity * 100);
  draftPlacement.value = props.placement;
  draftTickSide.value = props.tickSide;
  draftTickGap.value = props.tickGap;
}

function fitDraft(): void {
  draftBreakpoints.value = fitFluxBreakpoints(draftMode.value, draftColors.value, draftBreakpoints.value);
}

function setMode(mode: FluxColorMode): void {
  draftMode.value = mode;
  fitDraft();
}

function setPoint(index: number, event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  const next = draftBreakpoints.value.slice();
  next[index] = value;
  draftBreakpoints.value = next;
}

function setColor(index: number, event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  const next = draftColors.value.slice();
  next[index] = value;
  draftColors.value = next;
}

function toColor(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
}

function evenDraft(): void {
  draftBreakpoints.value = evenFluxBreakpoints(draftBreakpoints.value);
}

function resetDraft(): void {
  draftMode.value = props.factoryMode;
  draftColors.value = props.factoryColors.slice();
  draftBreakpoints.value = props.factoryBreakpoints.map((item) => Number(item));
  fitDraft();
  draftOpacity.value = 100;
  draftPlacement.value = "right";
  draftTickSide.value = "right";
  draftTickGap.value = 8;
  emit("reset");
}

function applyDraft(): void {
  fitDraft();
  if (!draftColors.value.length || draftBreakpoints.value.some((item) => !Number.isFinite(item))) return;
  emit("apply", {
    colorMode: draftMode.value,
    colors: draftColors.value.slice(),
    breakpoints: draftBreakpoints.value.slice(),
    opacity: Math.min(1, Math.max(0, draftOpacity.value / 100)),
    placement: draftPlacement.value,
    tickSide: draftTickSide.value,
    tickGap: draftTickGap.value,
  });
}

function close(): void {
  emit("close");
}
</script>

<style scoped>
.flux-legend-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 6vh 16px 16px;
  background: rgba(0, 0, 0, 0.35);
  --flux-dialog-bg: rgba(6, 24, 48, 0.98);
  --flux-dialog-border: rgba(90, 170, 240, 0.45);
  --flux-dialog-title: #d7ecff;
  --flux-dialog-text: #d7ecff;
  --flux-dialog-muted: #9ec9ef;
  --flux-dialog-line: rgba(120, 180, 230, 0.28);
  --flux-field-bg: rgba(4, 22, 46, 0.9);
  --flux-field-border: rgba(90, 170, 240, 0.45);
  --flux-choice-bg: rgba(4, 22, 46, 0.55);
  --flux-choice-active: rgba(64, 181, 253, 0.28);
}
.flux-legend-mask.is-light {
  --flux-dialog-bg: #ffffff;
  --flux-dialog-border: rgba(120, 140, 160, 0.45);
  --flux-dialog-title: #1a2a3a;
  --flux-dialog-text: #243447;
  --flux-dialog-muted: #5c6b7a;
  --flux-dialog-line: rgba(36, 52, 71, 0.12);
  --flux-field-bg: #f4f7fb;
  --flux-field-border: rgba(120, 140, 160, 0.45);
  --flux-choice-bg: #f7f9fb;
  --flux-choice-active: rgba(42, 126, 181, 0.16);
}
.flux-legend-dialog {
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  max-height: 88vh;
  box-sizing: border-box;
  border: 1px solid var(--flux-dialog-border);
  border-radius: 6px;
  background: var(--flux-dialog-bg);
  color: var(--flux-dialog-text);
}
.flux-legend-dialog__head,
.flux-legend-dialog__foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--flux-dialog-line); }
.flux-legend-dialog__foot { border-bottom: 0; border-top: 1px solid var(--flux-dialog-line); }
.flux-legend-dialog__title { flex: 1; font-size: 16px; font-weight: 600; color: var(--flux-dialog-title); }
.flux-legend-dialog__close { width: 28px; height: 28px; padding: 0; font-size: 18px; line-height: 1; }
.flux-legend-dialog__body { overflow: auto; padding: 12px 16px 4px; }
.flux-legend-dialog__section { margin-bottom: 14px; }
.flux-legend-dialog__label { margin-bottom: 8px; color: var(--flux-dialog-muted); font-size: 13px; }
.flux-legend-dialog__choices,
.flux-legend-dialog__slider,
.flux-legend-dialog__band { display: flex; align-items: center; gap: 8px; }
.flux-legend-dialog__slider input[type="range"] { flex: 1; }
.flux-legend-dialog__slider span,
.flux-legend-dialog__band span { min-width: 36px; color: var(--flux-dialog-muted); font-size: 12px; }
.flux-legend-dialog__bands { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow: auto; }
.flux-legend-dialog__number {
  width: 120px;
  box-sizing: border-box;
  padding: 4px 6px;
  border: 1px solid var(--flux-field-border);
  border-radius: 4px;
  background: var(--flux-field-bg);
  color: var(--flux-dialog-text);
}
.flux-legend-dialog__color { width: 36px; height: 28px; padding: 0; border: 1px solid var(--flux-field-border); background: transparent; }
.flux-legend-dialog button {
  padding: 4px 10px;
  border: 1px solid var(--flux-field-border);
  border-radius: 4px;
  background: var(--flux-choice-bg);
  color: var(--flux-dialog-text);
  font-size: 12px;
  cursor: pointer;
}
.flux-legend-dialog button.is-active,
.flux-legend-dialog button.is-primary { border-color: var(--flux-dialog-border); background: var(--flux-choice-active); }
.flux-legend-dialog__spacer { flex: 1; }
</style>
