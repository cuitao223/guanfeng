import { windColor } from "./colorScale.mjs";

export function windImageBounds(header) {
  return [
    [header.la1 - 0.04, header.lo1],
    [header.la2 - 0.04, header.lo2],
  ];
}

export function windHoverIndex(header, latitude, longitude) {
  const width = header.nx;
  const height = header.ny;
  const x = Math.floor(((longitude - header.lo1) / (header.lo2 - header.lo1)) * (width - 1));
  const y = Math.floor(((latitude - header.la1) / (header.la2 - header.la1)) * (height - 1));
  if (x < 0 || y < 0 || x >= width || y >= height) return -1;
  return y * width + x;
}

export function colorizeWind(speeds, width, height) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const value = speeds[i];
    const offset = i * 4;
    if (value == null || !Number.isFinite(Number(value))) continue;
    const [r, g, b] = windColor(Number(value));
    rgba[offset] = r;
    rgba[offset + 1] = g;
    rgba[offset + 2] = b;
    rgba[offset + 3] = 255;
  }
  return rgba;
}
