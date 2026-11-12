export const PARTICLE_COLORS = [
  "rgb(36,104,180)",
  "rgb(60,157,194)",
  "rgb(128,205,193)",
  "rgb(151,218,168)",
  "rgb(198,231,181)",
  "rgb(238,247,217)",
  "rgb(255,238,159)",
  "rgb(252,217,125)",
  "rgb(255,182,100)",
  "rgb(252,150,75)",
  "rgb(250,112,52)",
  "rgb(245,64,32)",
  "rgb(237,45,28)",
  "rgb(220,24,32)",
  "rgb(180,0,35)",
];

export const PARTICLE_MAX_AGE = 90;
export const PARTICLE_LINE_WIDTH = 2.5;
export const PARTICLE_FRAME_MS = 1000 / 15;
export const PARTICLE_VELOCITY_SCALE = 0.005;
export const PARTICLE_MAX_VELOCITY = 15;
export const PARTICLE_MIN_VELOCITY = 0;

function floorMod(a, n) {
  return a - n * Math.floor(a / n);
}

function bilinear(x, y, g00, g10, g01, g11) {
  const rx = 1 - x;
  const ry = 1 - y;
  const a = rx * ry;
  const b = x * ry;
  const c = rx * y;
  const d = x * y;
  const u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
  const v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
  return [u, v, Math.sqrt(u * u + v * v)];
}

export function createWindGrid(record) {
  const header = record.header;
  const uArr = record.u;
  const vArr = record.v;
  const ni = header.nx;
  const nj = header.ny;
  const rows = [];
  for (let j = 0; j < nj; j += 1) {
    const row = [];
    for (let i = 0; i < ni; i += 1) {
      const index = j * ni + i;
      const u = uArr[index];
      const v = vArr[index];
      if (u == null || v == null || !Number.isFinite(Number(u)) || !Number.isFinite(Number(v))) {
        row.push(null);
      } else {
        row.push([Number(u), Number(v)]);
      }
    }
    rows.push(row);
  }
  return {
    header,
    rows,
    sample(longitude, latitude) {
      const i = floorMod(longitude - header.lo1, 360) / header.dx;
      const j = (header.la1 - latitude) / header.dy;
      const fi = Math.floor(i);
      const ci = fi + 1;
      const fj = Math.floor(j);
      const cj = fj + 1;
      const row = rows[fj];
      const next = rows[cj];
      if (!row || !next) return null;
      const g00 = row[fi];
      const g10 = row[ci];
      const g01 = next[fi];
      const g11 = next[ci];
      if (!g00 || !g10 || !g01 || !g11) return null;
      return bilinear(i - fi, j - fj, g00, g10, g01, g11);
    },
  };
}

export function screenVelocityScale(westLng, southLat, eastLng, northLat, base = PARTICLE_VELOCITY_SCALE) {
  const deg2rad = (deg) => (deg / 180) * Math.PI;
  const south = deg2rad(southLat);
  const north = deg2rad(northLat);
  const east = deg2rad(eastLng);
  const west = deg2rad(westLng);
  const mapArea = (south - north) * (west - east);
  return base * Math.pow(mapArea, 0.4);
}

export function distort(project, longitude, latitude, x, y, scale, wind) {
  const u = wind[0] * scale;
  const v = wind[1] * scale;
  const tau = 2 * Math.PI;
  const h = 5;
  const hLon = longitude < 0 ? h : -h;
  const hLat = latitude < 0 ? h : -h;
  const pLon = project(latitude, longitude + hLon);
  const pLat = project(latitude + hLat, longitude);
  const k = Math.cos((latitude / 360) * tau);
  const d0 = (pLon[0] - x) / hLon / k;
  const d1 = (pLon[1] - y) / hLon / k;
  const d2 = (pLat[0] - x) / hLat;
  const d3 = (pLat[1] - y) / hLat;
  return [d0 * u + d2 * v, d1 * u + d3 * v, wind[2]];
}

export function buildScreenField({ grid, width, height, project, unproject, velocityScale }) {
  const columns = [];
  for (let x = 0; x < width; x += 2) {
    const column = [];
    for (let y = 0; y < height; y += 2) {
      const coord = unproject(x, y);
      if (!coord || !Number.isFinite(coord.lng) || !Number.isFinite(coord.lat)) continue;
      const wind = grid.sample(coord.lng, coord.lat);
      if (!wind) continue;
      const warped = distort(project, coord.lng, coord.lat, x, y, velocityScale, wind);
      column[y] = warped;
      column[y + 1] = warped;
    }
    columns[x] = column;
    columns[x + 1] = column;
  }
  return function field(x, y) {
    const column = columns[Math.round(x)];
    return (column && column[Math.round(y)]) || null;
  };
}

export function particleCount(width, height, multiplier, mobile = false, reduction = 1.6) {
  let count = Math.round(width * height * multiplier);
  if (mobile) count *= reduction;
  return count;
}

export function particleColorIndex(speed, min, max, count = PARTICLE_COLORS.length) {
  return Math.max(0, Math.min(count - 1, Math.round(((speed - min) / (max - min)) * (count - 1))));
}

export function stepParticle(particle, field, maxAge, randomize) {
  const next = { ...particle };
  if (next.age > maxAge) {
    const spawned = randomize(next);
    spawned.age = 0;
    Object.assign(next, spawned);
  }
  const vector = field(next.x, next.y);
  const magnitude = vector ? vector[2] : null;
  if (magnitude == null || !Number.isFinite(magnitude)) {
    next.age = maxAge;
    next.visible = false;
  } else {
    const xt = next.x + vector[0];
    const yt = next.y + vector[1];
    const ahead = field(xt, yt);
    if (ahead && ahead[2] != null && Number.isFinite(ahead[2])) {
      next.xt = xt;
      next.yt = yt;
      next.visible = true;
      next.magnitude = magnitude;
    } else {
      next.x = xt;
      next.y = yt;
      next.visible = false;
    }
  }
  next.age += 1;
  return next;
}
