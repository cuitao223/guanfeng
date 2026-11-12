package com.leice.radar.parse;

import java.util.LinkedHashSet;
import java.util.Set;

/** Per height columns of a DBS wind profile file. */
public enum DbsMetric {

    WIND_SPEED("windspeed"),
    WIND_DIRECTION("winddirection"),
    MEAN_SNR("meansnr"),
    DATA_OBTAIN_RATE("dataobtainrate"),
    STD_DEV("stddev"),
    MAX_WIND_SPEED("maxwindspeed"),
    MIN_WIND_SPEED("minwindspeed"),
    VERTICAL_WIND("zwind"),
    VERTICAL_WIND_STD_DEV("zwindstddev");

    private final String key;

    DbsMetric(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }

    /** Normalized column name suffixes accepted by {@link LeveledColumns}. */
    public static Set<String> keys() {
        Set<String> keys = new LinkedHashSet<>();
        for (DbsMetric metric : values()) {
            keys.add(metric.key);
        }
        return keys;
    }
}
