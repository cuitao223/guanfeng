export const PARTICLE_CANVAS = 2048;

const SHARED = {
  trailFade: 0.96,
  strokeAlpha: 1,
  maxAge: 120,
  frame: 1,
  trailMinPx: 0.2,
  trailMaxPx: 4,
  trailPower: 1.35,
  shadowBlur: 2,
};

export const PARTICLE_FIELDS = {
  default: { ...SHARED, speed: 2, lineWidth: 12, countMult: 1 },
  km10: { ...SHARED, speed: 3, lineWidth: 20, countMult: 1.3 },
  km20: { ...SHARED, speed: 2, lineWidth: 12, countMult: 1 },
};

export function particleCount(windNum, multiplier) {
  const mult = Math.max(0.1, Math.min(5, Number(multiplier) || 1));
  const base = Math.ceil(Number(windNum) / 2000) * 5;
  return Math.max(1, Math.round(base * mult));
}

export function particleFieldKind(spanKm) {
  if (!Number.isFinite(spanKm)) return "km20";
  if (spanKm < 15) return "km10";
  if (spanKm < 25) return "km20";
  return "default";
}

export function estimateWindSpeedMax(header) {
  const maxAbsU = Math.max(Math.abs(header && header.minU), Math.abs(header && header.maxU));
  const maxAbsV = Math.max(Math.abs(header && header.minV), Math.abs(header && header.maxV));
  const magnitude = Math.sqrt(maxAbsU * maxAbsU + maxAbsV * maxAbsV);
  return magnitude > 0 ? magnitude : 1;
}

export function particleStepLength(windSpeed, windSpeedMax, canvasScale, field) {
  const max = windSpeedMax > 0 ? windSpeedMax : 1;
  const t = Math.min(1, Math.max(0, (windSpeed || 0) / max));
  const shaped = t ** (field.trailPower || 1.35);
  const pixels = (field.trailMinPx + (field.trailMaxPx - field.trailMinPx) * shaped) * (field.speed || 1);
  if (canvasScale > 0) return pixels / canvasScale;
  return (0.08 + (0.55 - 0.08) * shaped) * (field.speed || 1);
}

function sampleUv(uvs, nx, ny, x, y) {
  const col = Math.min(nx - 1, Math.max(0, Math.floor(x)));
  const row = Math.min(ny - 1, Math.max(0, Math.floor(y)));
  const index = (row * nx + col) * 2;
  const u = uvs[index];
  const v = uvs[index + 1];
  if (!Number.isFinite(u) || !Number.isFinite(v) || (u === 0 && v === 0)) return [0, 0];
  return [u, v];
}

function bilinearUv(uvs, nx, ny, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  if (x0 === x && y0 === y) return sampleUv(uvs, nx, ny, x, y);
  const dx = x - x0;
  const dy = y - y0;
  const g00 = sampleUv(uvs, nx, ny, x0, y0);
  const g10 = sampleUv(uvs, nx, ny, x0 + 1, y0);
  const g01 = sampleUv(uvs, nx, ny, x0, y0 + 1);
  const g11 = sampleUv(uvs, nx, ny, x0 + 1, y0 + 1);
  const rx = 1 - dx;
  const ry = 1 - dy;
  return [
    g00[0] * rx * ry + g10[0] * dx * ry + g01[0] * rx * dy + g11[0] * dx * dy,
    g00[1] * rx * ry + g10[1] * dx * ry + g01[1] * rx * dy + g11[1] * dx * dy,
  ];
}

export function createParticleSim(header, uvs, canvas, field) {
  const nx = header.nx;
  const ny = header.ny;
  const count = particleCount(nx * ny, field.countMult);
  const windSpeedMax = estimateWindSpeedMax(header);
  const canvasScale = ((canvas.width / nx) + (canvas.height / ny)) / 2;
  const particles = [];
  const spawn = () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const x = Math.random() * nx;
      const y = Math.random() * ny;
      const uv = bilinearUv(uvs, nx, ny, x, y);
      if (uv[0] === 0 && uv[1] === 0) continue;
      const speed = Math.sqrt(uv[0] * uv[0] + uv[1] * uv[1]) || 1;
      const step = particleStepLength(speed, windSpeedMax, canvasScale, field);
      return {
        x,
        y,
        tx: x + (uv[0] / speed) * step,
        ty: y + (uv[1] / speed) * step,
        age: Math.floor(Math.random() * field.maxAge),
      };
    }
    return { x: 0, y: 0, tx: 0, ty: 0, age: 0 };
  };
  for (let index = 0; index < count; index += 1) particles.push(spawn());
  const context = canvas.getContext("2d");
  context.lineJoin = "round";
  context.lineCap = "round";
  let frameCount = 0;
  return {
    render(color) {
      frameCount += 1;
      if (frameCount % field.frame !== 0) return;
      context.globalCompositeOperation = "destination-in";
      context.globalAlpha = field.trailFade;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = field.strokeAlpha;
      context.lineWidth = field.lineWidth;
      context.shadowBlur = field.shadowBlur;
      context.strokeStyle = color;
      context.beginPath();
      particles.forEach((particle) => {
        if (particle.age <= 0 || particle.x < 0 || particle.y < 0 || particle.x > nx - 1 || particle.y > ny - 1) {
          Object.assign(particle, spawn());
          return;
        }
        const uv = bilinearUv(uvs, nx, ny, particle.tx, particle.ty);
        if (uv[0] === 0 && uv[1] === 0) {
          Object.assign(particle, spawn());
          return;
        }
        const speed = Math.sqrt(uv[0] * uv[0] + uv[1] * uv[1]) || 1;
        const step = particleStepLength(speed, windSpeedMax, canvasScale, field);
        const nextX = particle.tx + (uv[0] / speed) * step;
        const nextY = particle.ty + (uv[1] / speed) * step;
        context.moveTo((particle.x / nx) * canvas.width, (particle.y / ny) * canvas.height);
        context.lineTo((particle.tx / nx) * canvas.width, (particle.ty / ny) * canvas.height);
        particle.x = particle.tx;
        particle.y = particle.ty;
        particle.tx = nextX;
        particle.ty = nextY;
        particle.age -= 1;
      });
      context.stroke();
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    },
  };
}
