import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { strideForZoom, groupByLatitude, thinRows } from "../assets/logic/thinning.mjs";
import { toggleWindForm, particleMultiplierForDensity, gridStrideForDensity } from "../assets/logic/windForm.mjs";
import { buildWindSamples, uvToFromDirection } from "../assets/logic/windSamples.mjs";
import { beaufortLevel, metersPerSecondToKnots } from "../assets/logic/beaufort.mjs";
import { barbPolylines, arrowPolylines, staffEnd } from "../assets/logic/marks.mjs";
import { channelToValue, windColor } from "../assets/logic/colorScale.mjs";
import { windHoverIndex, windImageBounds, colorizeWind } from "../assets/logic/scalar.mjs";
import { createWindGrid, particleCount, particleColorIndex, stepParticle, screenVelocityScale, distort } from "../assets/logic/field.mjs";
import { visibleDevices, deviceLabel, deviceLabelStyle, deviceStatusName } from "../assets/logic/devices.mjs";
import { alertIconKey, alertSpeedText, listAlerts } from "../assets/logic/alerts.mjs";

const header = { nx: 2, ny: 2, lo1: 0, la1: 10, lo2: 1, la2: 9, dx: 1, dy: 1 };

assert.strictEqual(strideForZoom(1), 16);
assert.strictEqual(strideForZoom(5), 4);
assert.strictEqual(strideForZoom(6), 16);
assert.strictEqual(strideForZoom(9), 8);
assert.strictEqual(strideForZoom(12), 4);

const grouped = groupByLatitude([
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [2, 0, 1, 0],
]);
assert.strictEqual(grouped.length, 2);
assert.strictEqual(grouped[1][0][0], 2);

const wide = [
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [1, 2, 1, 0],
  [1, 3, 1, 0],
  [1, 4, 1, 0],
];
assert.deepStrictEqual(thinRows(wide, 4).map((row) => row[1]), [0, 4]);

assert.strictEqual(toggleWindForm("particle", "particle"), null);
assert.strictEqual(toggleWindForm("particle", "barb"), "barb");
assert.strictEqual(toggleWindForm(null, "arrow"), "arrow");
assert.strictEqual(particleMultiplierForDensity(3), 1 / 600);
assert.strictEqual(particleMultiplierForDensity(9), 1 / 300);
assert.strictEqual(gridStrideForDensity(2), 2);

assert.strictEqual(uvToFromDirection(0, 1), 180);
assert.strictEqual(uvToFromDirection(1, 0), 270);

const samples = buildWindSamples({
  header: { nx: 4, ny: 2, lo1: 0, la1: 2, lo2: 3, la2: 1, dx: 1, dy: 1 },
  u: [null, 1, 1, 1, 1, 1, 1, 1],
  v: [0, 0, 0, 0, 0, 0, 0, 0],
}, 2, "barb");
assert.strictEqual(samples.length, 1);
assert.strictEqual(samples[0][1], 2);
assert.strictEqual(samples[0][3], 270);

const arrows = buildWindSamples({
  header: { nx: 1, ny: 1, lo1: 0, la1: 1, lo2: 0, la2: 1, dx: 1, dy: 1 },
  u: [1],
  v: [0],
}, 1, "arrow");
assert.strictEqual(arrows[0][3], 450);

assert.strictEqual(beaufortLevel(metersPerSecondToKnots(10)), 3);
assert.strictEqual(beaufortLevel(80), 17);
assert.deepStrictEqual(staffEnd(10, 20, 0, 16), { x: 10, y: 4 });
assert.strictEqual(barbPolylines({ x: 0, y: 0 }, 0, 0).length, 0);
assert.strictEqual(barbPolylines({ x: 0, y: 0 }, 0, 10).length > 1, true);
assert.strictEqual(arrowPolylines({ x: 10, y: 20 }, 0, 0).length, 0);
assert.deepStrictEqual(arrowPolylines({ x: 10, y: 20 }, 0, 3)[0][1], { x: 10, y: 8 });

assert.strictEqual(channelToValue(0, -5, 5), null);
assert.strictEqual(channelToValue(255, 0, 10), 10);
assert.deepStrictEqual(windColor(0), [37, 74, 255]);
assert.deepStrictEqual(windColor(29), [64, 199, 222]);
assert.deepStrictEqual(windColor(1), [19, 112, 255]);

assert.deepStrictEqual(windImageBounds(header)[0], [9.96, 0]);
assert.strictEqual(windHoverIndex(header, 10, 0), 0);
assert.strictEqual(windHoverIndex(header, 9, 1), 3);
assert.strictEqual(windHoverIndex(header, 20, 0), -1);
const pixels = colorizeWind([null, 0], 2, 1);
assert.strictEqual(pixels[3], 0);
assert.strictEqual(pixels[7], 255);

const grid = createWindGrid({
  header,
  u: [0, 2, 0, 2],
  v: [0, 0, 0, 0],
});
assert.strictEqual(grid.sample(0.5, 10)[0], 1);
assert.strictEqual(grid.sample(0.5, 10)[2], 1);
const holed = createWindGrid({ header, u: [0, null, 0, 2], v: [0, 0, 0, 0] });
assert.strictEqual(holed.sample(0.5, 10), null);

assert.strictEqual(particleCount(800, 600, 1 / 300), 1600);
assert.strictEqual(particleColorIndex(0, 0, 15, 15), 0);
assert.strictEqual(particleColorIndex(15, 0, 15, 15), 14);

const stepped = stepParticle({ x: 0, y: 0, age: 0 }, () => [1, 0, 1], 90, (item) => item);
assert.strictEqual(stepped.visible, true);
assert.strictEqual(stepped.xt, 1);
assert.strictEqual(stepped.age, 1);
const dead = stepParticle({ x: 0, y: 0, age: 0 }, () => null, 90, (item) => item);
assert.strictEqual(dead.age, 91);

const scale = screenVelocityScale(0, 0, 1, 1);
assert.strictEqual(Number.isFinite(scale), true);
const warped = distort((lat, lon) => [lon * 10, -lat * 10], 10, 10, 100, -100, 0.01, [1, 0, 1]);
assert.strictEqual(warped.length, 3);
assert.strictEqual(Number.isFinite(warped[0]), true);

assert.deepStrictEqual(
  visibleDevices(
    [
      { latitude: 1, longitude: 2, type: 1, stationNo: "A" },
      { latitude: 1, longitude: 2, type: 6, stationNo: "B" },
      { latitude: "x", longitude: 2, type: 1, stationNo: "C" },
    ],
    ["1"],
    ["1"],
  ).map((item) => item.stationNo),
  ["A"],
);
assert.strictEqual(visibleDevices([{ latitude: 1, longitude: 2, type: 1 }], [], []).length, 0);
assert.strictEqual(deviceLabel({ regionInfo: "north", stationNo: "A" }, ["1"]), "north");
assert.strictEqual(deviceLabel({ regionInfo: "north", stationNo: "A" }, ["3"]), "");
assert.strictEqual(deviceLabel({ stationNo: "A" }, ["2"]), "A");
assert.deepStrictEqual(deviceLabelStyle(7.4), { label: false, scale: 1 });
assert.deepStrictEqual(deviceLabelStyle(7.5), { label: true, scale: 0.8 });
assert.deepStrictEqual(deviceLabelStyle(8.5), { label: true, scale: 0.9 });
assert.strictEqual(deviceStatusName(5), "offline");
assert.strictEqual(deviceStatusName(9), "normal");

assert.strictEqual(alertIconKey([4, 1]), "14");
assert.strictEqual(alertSpeedText(0), "-");
assert.strictEqual(alertSpeedText(3.5), 3.5);
const alerts = listAlerts({
  S1: { alarmType: [4, 1], latitude: "1", longitude: "2", maxWindSpeed: 8, windHeightLayer: 100 },
  S2: { alarmType: [9], latitude: 1, longitude: 2 },
});
assert.strictEqual(alerts.length, 1);
assert.strictEqual(alerts[0].iconKey, "14");
assert.strictEqual(alerts[0].stationNo, "S1");
assert.strictEqual(alerts[0].maxWindSpeed, 8);

const layerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/layers");
const mapCss = fs.readFileSync(path.join(layerDir, "LeiceMap2d.vue"), "utf8");
const deviceCss = fs.readFileSync(path.join(layerDir, "DeviceMarkers.vue"), "utf8");
assert.ok(mapCss.includes(".leice-map-2d .leaflet-container"));
assert.ok(mapCss.includes(".leice-map-2d .leaflet-popup-content"));
assert.ok(deviceCss.includes("white-space: nowrap"));
assert.ok(deviceCss.includes("iconSize: [16, 16]"));
assert.ok(!deviceCss.includes("0.75rem"));

console.log("map-2d checks passed");
