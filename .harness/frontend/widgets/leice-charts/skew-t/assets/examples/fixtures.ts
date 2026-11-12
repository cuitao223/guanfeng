import type { ProfileInput } from "../src/skewTProfile";
import type { StateCurveInput } from "../src/skewTThermo";

const pressure: number[] = [];
const temperature: number[] = [];
const dew: number[] = [];

for (let p = 1000; p >= 200; p -= 25) {
  pressure.push(p);
  const temp = Number((22 - (1000 - p) * 0.08).toFixed(1));
  temperature.push(temp);
  dew.push(Number((temp - 8).toFixed(1)));
}

temperature[4] = 999;
dew[6] = -999;

export const demoTemperature: ProfileInput = { pressure, value: temperature };
export const demoDewPoint: ProfileInput = { pressure: pressure.slice(), value: dew };
export const demoStateCurve: StateCurveInput = { pressure: [1000, 860], temperature: [22] };
export const emptyTemperature: ProfileInput = { pressure: [], value: [] };
export const emptyDewPoint: ProfileInput = { pressure: [1000], value: [999] };
export const emptyStateCurve: StateCurveInput = { pressure: [1000, -999], temperature: [999] };
