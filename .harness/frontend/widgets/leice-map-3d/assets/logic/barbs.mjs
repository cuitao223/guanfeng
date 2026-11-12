export function barbLevel(zoom) {
  if (zoom <= 12.5) return 0;
  if (zoom >= 15) return 2;
  return 1;
}

export function barbStride(zoom, density) {
  const raw = { 0: 14, 1: 10, 2: 6 }[barbLevel(zoom)] * 1.5;
  const factor = Math.min(1.5, Math.max(0.25, Number(density) || 1));
  return Math.max(1, Math.round(raw / factor));
}

export function barbSize(zoom) {
  return { 0: 100, 1: 80, 2: 50 }[barbLevel(zoom)] * 3;
}

export function keepBarb(speed) {
  return Boolean(speed) && speed != 9999;
}

export function barbFeathers(speed) {
  const triangle = Math.floor(speed / 20);
  const lineLong = Math.floor((speed - triangle * 20) / 4);
  const lineShort = speed - triangle * 20 - lineLong * 4 > 0 ? 1 : 0;
  return { triangle, lineLong, lineShort };
}

export function barbSegmentCount(speed) {
  const parts = barbFeathers(speed);
  return 1 + parts.triangle * 2 + parts.lineLong + parts.lineShort;
}

export function arrowLocalSegments(speed, size) {
  const length = Math.max(size, size * (Number(speed) || 0) / 10);
  const head = length * 0.28;
  return [
    [[0, 0], [0, length]],
    [[0, length], [-head * 0.6, length - head]],
    [[0, length], [head * 0.6, length - head]],
  ];
}

export function barbLocalSegments(speed, size) {
  const parts = barbFeathers(speed);
  const vLen = 6 * size;
  const vInterval = size;
  const hLen = 3 * size;
  const hLen2 = 1.5 * size;
  const lines = [[[0, 0], [0, vLen]]];
  let pos = vLen;
  for (let i = 0; i < parts.triangle; i += 1) {
    lines.push([[0, pos], [hLen, pos]]);
    lines.push([[0, pos - vInterval], [hLen, pos]]);
    pos -= vInterval;
  }
  for (let i = 0; i < parts.lineLong; i += 1) {
    lines.push([[0, pos], [hLen, pos]]);
    pos -= vInterval;
  }
  for (let i = 0; i < parts.lineShort; i += 1) {
    lines.push([[0, pos], [hLen2, pos]]);
    pos -= vInterval;
  }
  return lines;
}

export function barbSamples(header, speeds, zoom, density) {
  const step = barbStride(zoom, density);
  const rows = [];
  for (let i = 0; i < header.ny; i += step) {
    for (let j = 0; j < header.nx; j += step) {
      const index = i * header.nx + j;
      const speed = speeds[index];
      if (!keepBarb(speed)) continue;
      rows.push({
        latitude: header.la1 - i * header.dy,
        longitude: header.lo1 + j * header.dx,
        speed,
        index,
      });
    }
  }
  return rows;
}
