package com.leice.radar.parse;

import java.util.List;

/** PPI scan file: one row per azimuth radial scan. */
public record PpiMeasurement(List<PpiScan> scans) implements Measurement {

    public PpiMeasurement {
        scans = List.copyOf(scans);
    }
}
