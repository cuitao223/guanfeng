import * as d3 from "d3";

/** 刻度朝内。大刻度 1000 m，小刻度 200 m。 */

export const MAJOR_TICK = 6;
export const MINOR_TICK = 3;

export function buildYMajorTicks(yDomain: [number, number]): number[] {
  const yTicks = d3.range(Math.ceil(yDomain[0] / 1000) * 1000, yDomain[1] + 0.1, 1000);
  if (!yTicks.length || yTicks[0] !== yDomain[0]) yTicks.unshift(yDomain[0]);
  if (yTicks[yTicks.length - 1] !== yDomain[1]) yTicks.push(yDomain[1]);
  return yTicks;
}

export function buildYMinorTicks(yDomain: [number, number]): number[] {
  const majors = new Set(buildYMajorTicks(yDomain).map((value) => Number(value)));
  return d3.range(Math.ceil(yDomain[0] / 200) * 200, yDomain[1] + 0.1, 200)
    .filter((value) => !majors.has(Number(value)));
}

export interface InwardAxisOptions {
  x: d3.ScaleLinear<number, number>;
  y: d3.ScaleLinear<number, number>;
  innerW: number;
  innerH: number;
  yMajorTicks: number[];
  xTickValues?: number[] | null;
  xTickFormat?: (value: d3.NumberValue) => string;
  stroke?: string;
}

export function applyInwardAxes(root: d3.Selection<SVGGElement, unknown, null, undefined>, opts: InwardAxisOptions): void {
  const stroke = opts.stroke || "rgba(120,180,230,0.55)";
  const yDomain = opts.y.domain() as [number, number];
  const yMinorTicks = buildYMinorTicks(yDomain);

  root.select("rect.plot-frame")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", opts.innerW)
    .attr("height", opts.innerH)
    .attr("stroke", stroke)
    .attr("stroke-width", 1);

  const yMinorAxis = d3.axisLeft(opts.y)
    .tickValues(yMinorTicks)
    .tickSizeInner(-MINOR_TICK)
    .tickSizeOuter(0)
    .tickFormat(() => "");

  const yMajorAxis = d3.axisLeft(opts.y)
    .tickValues(opts.yMajorTicks)
    .tickSizeInner(-MAJOR_TICK)
    .tickSizeOuter(0)
    .tickPadding(7)
    .tickFormat((value) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return "";
      return Number.isInteger(n) ? String(n) : n.toFixed(0);
    });

  root.select<SVGGElement>(".axis-y-minor").call(yMinorAxis);
  root.select<SVGGElement>(".axis-y").call(yMajorAxis);

  let xAxis = d3.axisBottom(opts.x)
    .tickSizeInner(-MAJOR_TICK)
    .tickSizeOuter(0)
    .tickPadding(7);
  if (opts.xTickValues) xAxis = xAxis.tickValues(opts.xTickValues);
  else xAxis = xAxis.ticks(5);
  if (opts.xTickFormat) xAxis = xAxis.tickFormat(opts.xTickFormat);

  root.select<SVGGElement>(".axis-x")
    .attr("transform", `translate(0,${opts.innerH})`)
    .call(xAxis);

  root.selectAll(".axis-y-minor .domain, .axis-y .domain, .axis-x .domain").remove();
  root.selectAll(".axis-y-minor line").attr("stroke", stroke).attr("stroke-opacity", 0.75);
  root.selectAll(".axis-y path, .axis-y line, .axis-x path, .axis-x line").attr("stroke", stroke);
}
