export const PPI_MISSING = 999;
export const PPI_AZIMUTH_GAP = 15;

export function ppiValue(value, field) {
  if (value == PPI_MISSING || value === "NaN" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (field === "snr") return (Math.log(n) / Math.log(10)) * 10;
  return n;
}

export function splitAngleGroups(angles) {
  const groups = [];
  let current = [];
  (angles || []).forEach((angle) => {
    const value = Number(angle);
    if (current.length && value < current[current.length - 1]) {
      groups.push(current);
      current = [];
    }
    current.push(value);
  });
  if (current.length) groups.push(current);
  return groups;
}

export function sectorDegrees(angles, index) {
  if (index === 0) {
    const start = angles[0] - 1 < 0 ? 0 : angles[0] - 1;
    return [start, angles[0]];
  }
  return [angles[index - 1], angles[index]];
}

export function ppiRenderAngle(degrees) {
  return (Math.PI / 180) * -degrees + Math.PI / 2;
}

export function shouldDrawPpiGate(index, range, renderHeight, renderMaxHeight) {
  if (index === 0) return false;
  if (range == null || !Number.isFinite(Number(range))) return false;
  if (Number(range) >= renderHeight) return false;
  if (Number(range) > renderMaxHeight) return false;
  return true;
}

export function deviceRadius(zoom, originZoom, originRadius = 3) {
  return originRadius * Math.pow(2, zoom - originZoom);
}

export function visibleDevices(devices) {
  return (devices || []).filter((device) => {
    const longitude = Number(device.longitude);
    const latitude = Number(device.latitude);
    return Number.isFinite(longitude) && Number.isFinite(latitude) && device.deviceNo != null;
  });
}
