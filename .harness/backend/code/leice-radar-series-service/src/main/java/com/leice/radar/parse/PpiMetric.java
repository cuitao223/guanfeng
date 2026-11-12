package com.leice.radar.parse;

import java.util.LinkedHashSet;
import java.util.Set;

/** Per distance gate columns of a PPI scan file. */
public enum PpiMetric {

    RADIAL_WIND("radialwind"),
    SNR("snr"),
    SPECTRAL_WIDTH("spectralwidth"),
    SPECTRAL_INTENSITY("spectralintensity");

    private final String key;

    PpiMetric(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }

    /** Normalized column name suffixes accepted by {@link LeveledColumns}. */
    public static Set<String> keys() {
        Set<String> keys = new LinkedHashSet<>();
        for (PpiMetric metric : values()) {
            keys.add(metric.key);
        }
        return keys;
    }
}
