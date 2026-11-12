package com.leice.radar.parse;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * One DBS observation.
 *
 * @param time        observation time, local time without zone
 * @param temperature station temperature in Celsius, or {@link MissingValues#MISSING}
 * @param humidity    station humidity in percent, or {@link MissingValues#MISSING}
 * @param pressure    station pressure in hPa, or {@link MissingValues#MISSING}
 * @param levels      height in metres to metric value
 */
public record DbsProfile(
        LocalDateTime time,
        double temperature,
        double humidity,
        double pressure,
        Map<Double, Map<DbsMetric, Double>> levels) {

    public DbsProfile {
        levels = Map.copyOf(levels);
    }
}
