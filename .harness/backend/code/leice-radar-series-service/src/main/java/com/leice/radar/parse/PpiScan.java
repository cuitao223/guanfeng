package com.leice.radar.parse;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * One PPI radial scan.
 *
 * @param time        observation time, local time without zone
 * @param azimuth     azimuth in degrees, north is 0, clockwise
 * @param pitch       elevation in degrees
 * @param temperature station temperature in Celsius, or {@link MissingValues#MISSING}
 * @param humidity    station humidity in percent, or {@link MissingValues#MISSING}
 * @param pressure    station pressure in hPa, or {@link MissingValues#MISSING}
 * @param gates       distance gate in metres to metric value
 */
public record PpiScan(
        LocalDateTime time,
        double azimuth,
        double pitch,
        double temperature,
        double humidity,
        double pressure,
        Map<Double, Map<PpiMetric, Double>> gates) {

    public PpiScan {
        gates = Map.copyOf(gates);
    }
}
