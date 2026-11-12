import { gridStrideForDensity } from "./windForm.mjs";

export function uvToFromDirection(u, v) {
  let dir = 270 - (Math.atan2(v, u) * 180) / Math.PI;
  if (dir >= 360) dir -= 360;
  if (dir < 0) dir += 360;
  return dir;
}

export function windSpeed(u, v) {
  return Math.sqrt(u * u + v * v);
}

function finitePair(u, v) {
  return Number.isFinite(u) && Number.isFinite(v);
}

export function buildWindSamples(grid, density, form) {
  const header = grid && grid.header;
  const uArr = grid && grid.u;
  const vArr = grid && grid.v;
  if (!header || !uArr || !vArr) return [];
  const stride = gridStrideForDensity(density);
  const rows = [];
  const nx = header.nx;
  const ny = header.ny;
  for (let i = 0; i < ny; i += stride) {
    for (let j = 0; j < nx; j += stride) {
      const index = i * nx + j;
      const u = uArr[index];
      const v = vArr[index];
      if (u == null || v == null || !finitePair(Number(u), Number(v))) continue;
      const speed = windSpeed(Number(u), Number(v));
      if (!Number.isFinite(speed)) continue;
      let dir = uvToFromDirection(Number(u), Number(v));
      if (form === "arrow") dir += 180;
      const latitude = header.la1 - i * header.dy;
      const longitude = header.lo1 + j * header.dx;
      rows.push([latitude, longitude, speed, dir]);
    }
  }
  return rows;
}
