export const DEVICE_STATUS_NAME = {
  0: "fix",
  1: "calibrate",
  2: "normal",
  3: "sleep",
  4: "error",
  5: "offline",
};

export function deviceStatusName(status) {
  const key = Number(status);
  return DEVICE_STATUS_NAME[key] || DEVICE_STATUS_NAME[2];
}

function validCoord(device) {
  return Number.isFinite(Number(device.latitude)) && Number.isFinite(Number(device.longitude));
}

export function visibleDevices(devices, markerTypes, typeAllowList) {
  const kinds = markerTypes || [];
  if (kinds.length === 0) return [];
  const allow = typeAllowList || [];
  return (devices || []).filter((device) => {
    if (!device || !validCoord(device)) return false;
    if (allow.length > 0 && !allow.map(String).includes(String(device.type))) return false;
    return true;
  });
}

export function deviceLabel(device, markerTypes) {
  const kinds = (markerTypes || []).map(String);
  if (kinds.includes("3")) return "";
  if (kinds.includes("1")) return device.regionInfo == null ? "" : String(device.regionInfo);
  return device.stationNo == null ? "" : String(device.stationNo);
}

export function deviceLabelStyle(zoom) {
  if (zoom < 7.5) return { label: false, scale: 1 };
  if (zoom < 8.5) return { label: true, scale: 0.8 };
  return { label: true, scale: 0.9 };
}
