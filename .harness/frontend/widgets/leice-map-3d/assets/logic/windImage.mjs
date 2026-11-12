import { MISSING } from "./grid.mjs";

function channelAt(pixels, width, row, col, channel) {
  return pixels[(row * width + col) * 4 + channel];
}

export function readAsciiRange(pixels, width, row, channel) {
  const minCodes = [];
  const maxCodes = [];
  let seenSeparator = false;
  for (let col = 0; col < width; col += 1) {
    const value = channelAt(pixels, width, row, col, channel);
    if (!seenSeparator && value !== 255) {
      minCodes.push(value);
    } else if (value === 255) {
      seenSeparator = true;
    } else if (seenSeparator && value === 0) {
      break;
    } else if (seenSeparator) {
      maxCodes.push(value);
    }
  }
  const parseCodes = (codes) => parseFloat(String.fromCharCode(...codes).trim());
  return { min: parseCodes(minCodes), max: parseCodes(maxCodes) };
}

export function mapByte(min, max, value) {
  return min + ((value - 0) * (max - min)) / 255;
}

export function uvToWindDirection(u, v) {
  let dir = 270 - (Math.atan2(v, u) * 180) / Math.PI;
  if (dir >= 360) dir -= 360;
  if (dir < 0) dir += 360;
  return dir;
}

export function decodeWindFieldImage(pixels, width, height) {
  if (!pixels || width < 1 || height < 3) return null;
  const uRange = readAsciiRange(pixels, width, 0, 0);
  const vRange = readAsciiRange(pixels, width, 0, 1);
  const lon = readAsciiRange(pixels, width, 1, 0);
  const lat = readAsciiRange(pixels, width, 1, 1);
  const speeds = [];
  const dirs = [];
  const uvs = [];
  const ny = height - 2;
  for (let row = 2; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const uByte = channelAt(pixels, width, row, col, 0);
      const vByte = channelAt(pixels, width, row, col, 1);
      if (uByte === 0 && vByte === 0) {
        speeds.push(MISSING);
        dirs.push(MISSING);
        uvs.push(0, 0);
        continue;
      }
      const uValue = mapByte(uRange.min, uRange.max, uByte);
      const vValue = mapByte(vRange.min, vRange.max, vByte);
      speeds.push(Math.sqrt(uValue * uValue + vValue * vValue));
      dirs.push(uvToWindDirection(uValue, vValue));
      uvs.push(uValue, vValue);
    }
  }
  const nx = width;
  const header = {
    la1: lat.max,
    la2: lat.min,
    lo1: lon.min,
    lo2: lon.max,
    nx,
    ny,
    dx: nx > 1 ? (lon.max - lon.min) / (nx - 1) : 0,
    dy: ny > 1 ? (lat.max - lat.min) / (ny - 1) : 0,
    minU: uRange.min,
    maxU: uRange.max,
    minV: vRange.min,
    maxV: vRange.max,
  };
  return { header, speeds, dirs, uvs };
}

export function decodeShearImage(pixels, width, height) {
  if (!pixels || width < 1 || height < 3) return null;
  const horizontalRange = readAsciiRange(pixels, width, 0, 0);
  const verticalRange = readAsciiRange(pixels, width, 0, 1);
  const lon = readAsciiRange(pixels, width, 1, 0);
  const lat = readAsciiRange(pixels, width, 1, 1);
  const horizontal = [];
  const vertical = [];
  const ny = height - 2;
  for (let row = 2; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const horizontalByte = channelAt(pixels, width, row, col, 0);
      const verticalByte = channelAt(pixels, width, row, col, 1);
      if (horizontalByte === 0 && verticalByte === 0) {
        horizontal.push(MISSING);
        vertical.push(MISSING);
        continue;
      }
      horizontal.push(mapByte(horizontalRange.min, horizontalRange.max, horizontalByte));
      vertical.push(mapByte(verticalRange.min, verticalRange.max, verticalByte));
    }
  }
  const nx = width;
  const header = {
    la1: lat.max,
    la2: lat.min,
    lo1: lon.min,
    lo2: lon.max,
    nx,
    ny,
    dx: nx > 1 ? (lon.max - lon.min) / (nx - 1) : 0,
    dy: ny > 1 ? (lat.max - lat.min) / (ny - 1) : 0,
    minHorizontal: horizontalRange.min,
    maxHorizontal: horizontalRange.max,
    minVertical: verticalRange.min,
    maxVertical: verticalRange.max,
  };
  return { header, horizontal, vertical };
}
