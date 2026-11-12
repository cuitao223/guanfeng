export const MISSING = 9999;
export const MAX_GRID = 2048;

export function alignCoords(ctx) {
  const center = ctx && ctx.viewCenter;
  if (!center || !ctx.customCoords || typeof ctx.customCoords.setCenter !== "function") return;
  ctx.customCoords.setCenter(center);
}

export function gridBounds(header) {
  return {
    west: header.lo1,
    east: header.lo1 + (header.nx - (header.pointGrid ? 1 : 0)) * header.dx,
    north: header.la1,
    south: header.la1 - (header.ny - (header.pointGrid ? 1 : 0)) * header.dy,
  };
}

export function effectiveGridScale(nx, ny, requested = 1, maxGrid = MAX_GRID) {
  const rawW = nx * requested;
  const rawH = ny * requested;
  if (Math.max(rawW, rawH) <= maxGrid) return requested;
  return (maxGrid / Math.max(rawW, rawH)) * requested;
}

export function contourGridScale(nx, ny, requested = 6, maxGrid = MAX_GRID) {
  let scale = Math.max(1, Math.floor(Number(requested) || 1));
  while (scale > 1 && (nx * scale > maxGrid || ny * scale > maxGrid)) scale -= 1;
  return scale;
}

export function bilinearGrid(data, width, height, scale) {
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);
  const out = [];
  for (let y = 0; y < newHeight; y += 1) {
    for (let x = 0; x < newWidth; x += 1) {
      const originalX = x / scale;
      const originalY = y / scale;
      const x1 = Math.floor(originalX);
      const x2 = Math.min(x1 + 1, width - 1);
      const y1 = Math.floor(originalY);
      const y2 = Math.min(y1 + 1, height - 1);
      const q11 = data[y1 * width + x1];
      const q12 = data[y2 * width + x1];
      const q21 = data[y1 * width + x2];
      const q22 = data[y2 * width + x2];
      if (q11 === MISSING || q12 === MISSING || q21 === MISSING || q22 === MISSING) {
        out.push(MISSING);
        continue;
      }
      const dx = originalX - x1;
      const dy = originalY - y1;
      out.push(
        q11 * (1 - dx) * (1 - dy) +
          q21 * dx * (1 - dy) +
          q12 * (1 - dx) * dy +
          q22 * dx * dy,
      );
    }
  }
  return out;
}

export function softBilinearGrid(data, width, height, scale) {
  const newWidth = Math.max(2, Math.floor(width * scale));
  const newHeight = Math.max(2, Math.floor(height * scale));
  const out = new Float32Array(newWidth * newHeight);
  const missing = (value) => value === MISSING || value == null || !Number.isFinite(Number(value));
  for (let y = 0; y < newHeight; y += 1) {
    for (let x = 0; x < newWidth; x += 1) {
      const originalX = (x + 0.5) / scale - 0.5;
      const originalY = (y + 0.5) / scale - 0.5;
      const x1 = Math.min(width - 1, Math.max(0, Math.floor(originalX)));
      const y1 = Math.min(height - 1, Math.max(0, Math.floor(originalY)));
      const x2 = Math.min(width - 1, x1 + 1);
      const y2 = Math.min(height - 1, y1 + 1);
      const dx = Math.min(1, Math.max(0, originalX - x1));
      const dy = Math.min(1, Math.max(0, originalY - y1));
      const corners = [
        { value: data[y1 * width + x1], weight: (1 - dx) * (1 - dy) },
        { value: data[y1 * width + x2], weight: dx * (1 - dy) },
        { value: data[y2 * width + x1], weight: (1 - dx) * dy },
        { value: data[y2 * width + x2], weight: dx * dy },
      ];
      let weightSum = 0;
      let valueSum = 0;
      corners.forEach((corner) => {
        if (missing(corner.value) || !(corner.weight > 0)) return;
        weightSum += corner.weight;
        valueSum += Number(corner.value) * corner.weight;
      });
      out[y * newWidth + x] = weightSum > 1e-6 ? valueSum / weightSum : MISSING;
    }
  }
  return out;
}

export function speedTexel(speed, min, max) {
  if (speed === MISSING || !Number.isFinite(Number(speed))) return [0, 0, 0, 0];
  const inv = max > min ? 1 / (max - min) : 1;
  const normalized = Math.min(1, Math.max(0, (Number(speed) - min) * inv));
  return [Math.round(normalized * 255), 0, 0, 255];
}

export function isMissingSpeed(speed) {
  return speed === MISSING || !Number.isFinite(Number(speed));
}
