package com.leice.radar.series;

import java.util.List;

/**
 * Input of the {@code dual-axis-line} chart: station temperature and humidity.
 *
 * @param times       formatted observation times, ascending
 * @param temperature Celsius, or {@code 999} when missing
 * @param humidity    percent, or {@code 999} when missing
 */
public record TempHumiditySeries(
        List<String> times,
        double[] temperature,
        double[] humidity) {
}
