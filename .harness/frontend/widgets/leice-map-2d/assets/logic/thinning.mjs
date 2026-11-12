// Zoom thinning from the reference canvas layers.
// Zoom 5 falls through to stride 4 because the source checks zoom < 5, then zoom >= 6.
export function strideForZoom(zoom) {
  const z = Number(zoom);
  if (z < 2) return 16;
  if (z >= 2 && z < 3) return 8;
  if (z >= 3 && z < 5) return 4;
  if (z >= 6 && z < 9) return 16;
  if (z >= 9 && z < 12) return 8;
  return 4;
}

export function groupByLatitude(rows) {
  const groups = [];
  let bucket = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    if (bucket.length === 0 || row[0] !== bucket[bucket.length - 1][0]) {
      if (bucket.length) groups.push(bucket);
      bucket = [row];
    } else {
      bucket.push(row);
    }
  }
  if (bucket.length) groups.push(bucket);
  return groups;
}

export function thinRows(rows, zoom) {
  const step = strideForZoom(zoom);
  const groups = groupByLatitude(rows || []);
  const kept = [];
  for (let i = 0; i < groups.length; i += step) {
    const latPts = groups[i];
    for (let j = 0; j < latPts.length; j += step) {
      kept.push(latPts[j]);
    }
  }
  return kept;
}
