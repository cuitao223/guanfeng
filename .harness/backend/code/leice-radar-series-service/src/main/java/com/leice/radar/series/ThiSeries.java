package com.leice.radar.series;

import java.util.List;

/**
 * Input of the {@code thi} chart: one value grid over time and height.
 *
 * @param times     formatted observation times, ascending
 * @param heightArr heights in metres, ascending
 * @param values    {@code values[time][height]}
 * @param unit      display unit
 */
public record ThiSeries(
        List<String> times,
        double[] heightArr,
        double[][] values,
        String unit) {
}
