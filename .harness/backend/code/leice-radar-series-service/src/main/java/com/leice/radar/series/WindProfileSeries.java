package com.leice.radar.series;

import java.util.List;

/**
 * Input of the {@code barb-thi} chart: horizontal wind speed and direction.
 *
 * @param times     formatted observation times, ascending
 * @param heightArr heights in metres, ascending
 * @param values    wind speed, {@code values[time][height]}
 * @param dirs      wind direction of origin in degrees, same shape as {@code values}
 * @param unit      display unit
 */
public record WindProfileSeries(
        List<String> times,
        double[] heightArr,
        double[][] values,
        double[][] dirs,
        String unit) {
}
