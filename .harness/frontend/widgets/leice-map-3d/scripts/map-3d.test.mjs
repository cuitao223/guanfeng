import assert from "assert";
import { layerDisplayZ, fieldOpacity, windFieldWritesDepth, windFieldOrder, warnOrder, particleOrder, barbOrder, markColor } from "../assets/logic/stack.mjs";
import { toggleWindForm, selectColorStyle, toggleWarnType } from "../assets/logic/selection.mjs";
import { colorForSpeed, uniformStops } from "../assets/logic/legend.mjs";
import { bilinearGrid, contourGridScale, effectiveGridScale, softBilinearGrid, speedTexel, gridBounds } from "../assets/logic/grid.mjs";
import { barbStride, barbSize, keepBarb, barbFeathers, barbLocalSegments, barbSamples, arrowLocalSegments } from "../assets/logic/barbs.mjs";
import { haversineMeters, niceStepMeters, formatDistanceLabel, volumeCorners } from "../assets/logic/volumeScale.mjs";
import { particleCount, particleFieldKind, particleStepLength, PARTICLE_FIELDS } from "../assets/logic/particles.mjs";
import { formatWarnValue, warnBoundaryEdges, warnLevelKey, warnSeverity, resolveThreshold, warnTexel, warnZoomLevel, warnClusterSize } from "../assets/logic/warn.mjs";
import { ppiValue, splitAngleGroups, sectorDegrees, shouldDrawPpiGate, deviceRadius, visibleDevices } from "../assets/logic/ppi.mjs";
import { decodeShearImage, decodeWindFieldImage, mapByte, readAsciiRange, uvToWindDirection } from "../assets/logic/windImage.mjs";

assert.strictEqual(layerDisplayZ(100, "single"), 0);
assert.strictEqual(layerDisplayZ(100, "multi", 1, 2), 200);
assert.strictEqual(layerDisplayZ(-1, "multi"), 0);
assert.strictEqual(fieldOpacity(0.01), 0.1);
assert.strictEqual(fieldOpacity(undefined), 0.8);
assert.strictEqual(windFieldWritesDepth(1), true);
assert.strictEqual(windFieldWritesDepth(0.8), false);
assert.strictEqual(windFieldOrder(30), 300);
assert.strictEqual(warnOrder(30), 301);
assert.strictEqual(particleOrder(30), 302);
assert.strictEqual(barbOrder(30), 303);
assert.strictEqual(markColor("vector"), "#000000");
assert.strictEqual(markColor("satellite"), "#ffffff");

assert.deepStrictEqual(toggleWindForm(["field"], "field"), []);
assert.deepStrictEqual(toggleWindForm(["field"], "barb"), ["field", "barb"]);
assert.strictEqual(selectColorStyle("contour"), "contour");
assert.strictEqual(selectColorStyle("other"), "smooth");
assert.strictEqual(toggleWarnType("gale", "gale"), null);
assert.strictEqual(toggleWarnType("gale", "horizontal"), "horizontal");

assert.deepStrictEqual(uniformStops(0, 10, 11), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const legend = { min: 0, max: 10, colors: ["#000000", "#ffffff"] };
assert.deepStrictEqual(colorForSpeed(0, legend, "smooth"), [0, 0, 0]);
assert.deepStrictEqual(colorForSpeed(10, legend, "smooth"), [255, 255, 255]);
assert.deepStrictEqual(colorForSpeed(0, legend, "contour"), [0, 0, 0]);
assert.deepStrictEqual(colorForSpeed(10, legend, "contour"), [255, 255, 255]);

const header = { nx: 2, ny: 2, lo1: 10, la1: 20, dx: 1, dy: 1 };
assert.deepStrictEqual(gridBounds(header), { west: 10, east: 12, north: 20, south: 18 });
assert.deepStrictEqual(bilinearGrid([1, 3, 5, 7], 2, 2, 1), [1, 3, 5, 7]);
assert.strictEqual(bilinearGrid([1, 9999, 5, 7], 2, 2, 1)[0], 9999);
assert.strictEqual(contourGridScale(100, 100, 6), 6);
assert.strictEqual(contourGridScale(400, 400, 6), 5);
assert.strictEqual(softBilinearGrid([1, 9999, 5, 7], 2, 2, 1)[0], 1);
assert.strictEqual(effectiveGridScale(3000, 10, 1) < 1, true);
assert.deepStrictEqual(speedTexel(9999, 0, 10), [0, 0, 0, 0]);
assert.deepStrictEqual(speedTexel(10, 0, 10), [255, 0, 0, 255]);

assert.strictEqual(barbStride(12, 1), 21);
assert.strictEqual(barbStride(13, 1), 15);
assert.strictEqual(barbStride(15, 1), 9);
assert.strictEqual(barbStride(12, 0.1), Math.max(1, Math.round(21 / 0.25)));
assert.strictEqual(barbSize(12), 300);
assert.strictEqual(keepBarb(0), false);
assert.strictEqual(keepBarb(9999), false);
assert.strictEqual(keepBarb(4), true);
assert.deepStrictEqual(barbFeathers(4), { triangle: 0, lineLong: 1, lineShort: 0 });
assert.strictEqual(barbLocalSegments(4, 1).length, 2);
assert.strictEqual(barbSamples(header, [4, 0, 9999, 2], 15, 1).length, 1);

assert.strictEqual(particleCount(2000, 2), 10);
assert.strictEqual(particleCount(1, 1), 5);
assert.strictEqual(particleCount(2000, 9), 25);
assert.strictEqual(particleFieldKind(10), "km10");
assert.strictEqual(particleFieldKind(20), "km20");
assert.strictEqual(particleFieldKind(40), "default");
assert.ok(particleStepLength(0, 10, 10, PARTICLE_FIELDS.km20) > 0);

assert.strictEqual(warnSeverity(9999, resolveThreshold("gale")), -1);
assert.strictEqual(warnSeverity(3.85, resolveThreshold("gale")), 0);
assert.strictEqual(warnSeverity(3.95, resolveThreshold("gale")), 1);
assert.strictEqual(warnSeverity(5, resolveThreshold("gale")), 2);
assert.strictEqual(resolveThreshold("horizontal", { min: 1, unit: "1/s" }).min, 1);
assert.strictEqual(resolveThreshold("horizontal", { min: 1, unit: "1/s" }).unit, "1/s");
assert.deepStrictEqual(warnTexel(-1), [0, 0, 0, 0]);
assert.deepStrictEqual(warnTexel(2), [192, 0, 0, 255]);
assert.strictEqual(warnZoomLevel(11), 0);
assert.strictEqual(warnZoomLevel(16), 3);
assert.strictEqual(warnClusterSize(3), 0);
assert.strictEqual(warnLevelKey(0), "light");
assert.strictEqual(warnLevelKey(2), "severe");
assert.strictEqual(formatWarnValue(3.85, "gale"), "3.85");
assert.strictEqual(formatWarnValue(0.01234, "horizontal"), "0.0123");
assert.strictEqual(warnBoundaryEdges([-1, 0, -1, -1], 2, 2).length, 4);

assert.strictEqual(ppiValue(999, "speed"), null);
assert.strictEqual(ppiValue("NaN", "snr"), null);
assert.strictEqual(ppiValue(10, "snr"), 10);
assert.deepStrictEqual(splitAngleGroups([10, 20, 5]), [[10, 20], [5]]);
assert.deepStrictEqual(sectorDegrees([10, 20], 0), [9, 10]);
assert.deepStrictEqual(sectorDegrees([0, 20], 0), [0, 0]);
assert.strictEqual(shouldDrawPpiGate(0, 100, 1000, 5000), false);
assert.strictEqual(shouldDrawPpiGate(1, 100, 1000, 5000), true);
assert.strictEqual(shouldDrawPpiGate(1, 1000, 1000, 5000), false);
assert.strictEqual(deviceRadius(12, 11, 3), 6);
assert.strictEqual(visibleDevices([{ longitude: 1, latitude: 2, deviceNo: "A" }, { longitude: "x", latitude: 2, deviceNo: "B" }]).length, 1);

function putRange(pixels, width, row, channel, minText, maxText) {
  const codes = [...minText].map((ch) => ch.charCodeAt(0));
  codes.push(255);
  [...maxText].forEach((ch) => codes.push(ch.charCodeAt(0)));
  codes.push(0);
  codes.forEach((code, col) => {
    pixels[(row * width + col) * 4 + channel] = code;
  });
}

const imageWidth = 8;
const imageHeight = 4;
const pixels = new Uint8Array(imageWidth * imageHeight * 4);
putRange(pixels, imageWidth, 0, 0, "0", "10");
putRange(pixels, imageWidth, 0, 1, "0", "10");
putRange(pixels, imageWidth, 1, 0, "10", "12");
putRange(pixels, imageWidth, 1, 1, "18", "20");
pixels[(2 * imageWidth + 0) * 4] = 0;
pixels[(2 * imageWidth + 0) * 4 + 1] = 255;
pixels[(2 * imageWidth + 1) * 4] = 0;
pixels[(2 * imageWidth + 1) * 4 + 1] = 0;
assert.deepStrictEqual(readAsciiRange(pixels, imageWidth, 0, 0), { min: 0, max: 10 });
assert.strictEqual(mapByte(0, 10, 255), 10);
assert.strictEqual(uvToWindDirection(0, 1), 180);
const decoded = decodeWindFieldImage(pixels, imageWidth, imageHeight);
assert.strictEqual(decoded.header.nx, 8);
assert.strictEqual(decoded.header.ny, 2);
assert.strictEqual(decoded.header.lo1, 10);
assert.strictEqual(decoded.header.lo2, 12);
assert.strictEqual(decoded.header.la1, 20);
assert.strictEqual(decoded.header.la2, 18);
assert.strictEqual(decoded.header.dx, (12 - 10) / 7);
assert.strictEqual(decoded.speeds[0], 10);
assert.strictEqual(decoded.dirs[0], 180);
assert.strictEqual(decoded.speeds[1], 9999);
assert.strictEqual(decoded.dirs[1], 9999);
assert.strictEqual(decoded.uvs[0], 0);
assert.strictEqual(decoded.uvs[1], 10);
assert.strictEqual(decoded.uvs[2], 0);
assert.strictEqual(decoded.uvs[3], 0);
const shear = decodeShearImage(pixels, imageWidth, imageHeight);
assert.strictEqual(shear.horizontal[0], 0);
assert.strictEqual(shear.vertical[0], 10);
assert.strictEqual(shear.horizontal[1], 9999);
assert.strictEqual(shear.vertical[1], 9999);
assert.strictEqual(decodeWindFieldImage(pixels, imageWidth, 2), null);
assert.ok(Math.abs(haversineMeters(0, 0, 0, 1) - 111195) < 50);
assert.strictEqual(niceStepMeters(10000), 2000);
assert.strictEqual(formatDistanceLabel(2000), "2km");
assert.strictEqual(formatDistanceLabel(500), "500m");
assert.strictEqual(arrowLocalSegments(10, 30).length, 3);

// Optional point-grid coordinates must not change legacy cell-grid bounds.
const pointHeader = {nx:33,ny:33,lo1:112,la1:36,dx:0.25,dy:0.25,pointGrid:true};
assert.deepStrictEqual(gridBounds(pointHeader), {west:112,east:120,north:36,south:28});
assert.strictEqual(gridBounds({...pointHeader,pointGrid:false}).east,120.25);
const corners = {tl:[112.1,36.1],tr:[120.1,36.1],bl:[112.1,28.1],br:[120.1,28.1]};
const projectedVolume = volumeCorners({lngLatsToCoords:point=>[point]}, {...pointHeader,displayCorners:corners});
assert.deepStrictEqual(projectedVolume.tl,corners.tl);
assert.deepStrictEqual(projectedVolume.br,corners.br);
// Manual nonuniform stops must affect the shader LUT's color mapping.
const manualLegend = {min:0,max:10,colors:['#000000','#ff0000','#ffffff'],domainPoints:[0,2,10]};
assert.deepStrictEqual(colorForSpeed(2,manualLegend,'smooth'),[255,0,0]);
assert.deepStrictEqual(colorForSpeed(6,manualLegend,'smooth'),[255,128,128]);
assert.deepStrictEqual(colorForSpeed(3,manualLegend,'contour'),[255,0,0]);
console.log("map-3d checks passed");
