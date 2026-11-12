export const WIND_SPEED_STOPS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 27, 29];

export const WIND_COLOR_STOPS = [
  [37, 74, 255],
  [0, 150, 254],
  [18, 196, 200],
  [18, 211, 73],
  [0, 240, 0],
  [127, 237, 0],
  [254, 199, 0],
  [237, 124, 14],
  [200, 37, 39],
  [217, 0, 100],
  [202, 25, 186],
  [86, 54, 222],
  [42, 132, 222],
  [64, 199, 222],
];

export function windColor(speed) {
  const domain = WIND_SPEED_STOPS;
  const colors = WIND_COLOR_STOPS;
  if (speed <= domain[0]) return colors[0].slice();
  const last = domain.length - 1;
  if (speed >= domain[last]) return colors[last].slice();
  let index = 1;
  while (index < domain.length && domain[index] < speed) index += 1;
  const t = (speed - domain[index - 1]) / (domain[index] - domain[index - 1]);
  const left = colors[index - 1];
  const right = colors[index];
  return left.map((channel, i) => Math.round(channel + (right[i] - channel) * t));
}

export function channelToValue(channel, min, max) {
  if (channel === 0) return null;
  return min + ((channel - 0) * (max - min)) / 255;
}
