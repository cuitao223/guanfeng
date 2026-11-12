import { gridBounds } from "./grid.mjs";
const EARTH_RADIUS_M = 6371000;

export function haversineMeters(lon1, lat1, lon2, lat2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function niceStepMeters(spanM) {
  if (!Number.isFinite(spanM) || spanM <= 0) return 1000;
  const raw = spanM / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  let nice = 10;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  return nice * mag;
}

export function formatDistanceLabel(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value)) return "-";
  if (value >= 1000) {
    const km = value / 1000;
    return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)}km`;
  }
  return `${Math.round(value)}m`;
}

export function volumeCorners(customCoords, header) {
  const { west, east, north, south } = gridBounds(header);
  return {
    bl: customCoords.lngLatsToCoords(header.displayCorners?.bl || [west, south])[0],
    br: customCoords.lngLatsToCoords(header.displayCorners?.br || [east, south])[0],
    tl: customCoords.lngLatsToCoords(header.displayCorners?.tl || [west, north])[0],
    tr: customCoords.lngLatsToCoords(header.displayCorners?.tr || [east, north])[0],
    distEwM: haversineMeters(west, south, east, south),
    distNsM: haversineMeters(west, south, west, north),
  };
}
