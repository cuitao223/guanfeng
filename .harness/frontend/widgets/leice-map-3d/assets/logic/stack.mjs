export function fieldOpacity(value) {
  return Math.max(0.1, Math.min(1, Number(value) || 0.8));
}

export function windFieldWritesDepth(opacity) {
  return fieldOpacity(opacity) >= 0.999;
}

export function visualHeightSize(heightSize = 1, exaggeration = 1) {
  const base = heightSize != null ? heightSize : 1;
  const level = Number(exaggeration);
  const factor = Number.isFinite(level) && level > 0 ? level : 1;
  return base * factor;
}

export function layerDisplayZ(height, mode, heightSize = 1, exaggeration = 1, offset = 0) {
  const off = Number(offset) || 0;
  if (mode === "single") return off;
  const h = Number(height);
  if (!Number.isFinite(h) || h < 0) return off;
  return h * visualHeightSize(heightSize, exaggeration) + off;
}

export function windFieldOrder(height) {
  return (Number(height) || 0) * 10;
}

export function warnOrder(height) {
  return windFieldOrder(height) + 1;
}

export function particleOrder(height) {
  return windFieldOrder(height) + 2;
}

export function barbOrder(height) {
  return windFieldOrder(height) + 3;
}

export function markColor(mapStyle) {
  return mapStyle === "vector" ? "#000000" : "#ffffff";
}

export const WARN_Z_OFFSET = 0.1;
export const PARTICLE_Z_OFFSET = 4;
export const BARB_Z_OFFSET = 5;
