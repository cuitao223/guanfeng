package com.leice.radar.series;

import com.leice.radar.error.RadarException;
import com.leice.radar.parse.PpiMetric;

/** The PPI products a page may select. */
public enum ScanProduct {

    WIND("wind", PpiMetric.RADIAL_WIND, "m/s"),
    SNR("snr", PpiMetric.SNR, "dB"),
    SPECTRAL_WIDTH("spectralWidth", PpiMetric.SPECTRAL_WIDTH, "MHz"),
    SPECTRAL_INTENSITY("spectralIntensity", PpiMetric.SPECTRAL_INTENSITY, "dB");

    private final String id;
    private final PpiMetric metric;
    private final String unit;

    ScanProduct(String id, PpiMetric metric, String unit) {
        this.id = id;
        this.metric = metric;
        this.unit = unit;
    }

    public String id() {
        return id;
    }

    public PpiMetric metric() {
        return metric;
    }

    public String unit() {
        return unit;
    }

    /** Resolves the page parameter; an absent value selects radial wind. */
    public static ScanProduct from(String id) {
        if (id == null || id.isBlank()) {
            return WIND;
        }
        for (ScanProduct product : values()) {
            if (product.id.equalsIgnoreCase(id.trim())) {
                return product;
            }
        }
        throw RadarException.badRequest("radar.error.product", id);
    }
}
