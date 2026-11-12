package com.leice.radar.parse;

import java.util.Locale;

/** Normalizes measurement column names before they are matched. */
public final class ColumnNames {

    private static final String BOM = "\uFEFF";

    private ColumnNames() {
    }

    /**
     * Lower cases a header cell, drops the unit in parentheses and removes
     * spaces, underscores and dashes.
     *
     * <p>Examples: {@code Date_time} becomes {@code datetime},
     * {@code MeanSNR(dB)} becomes {@code meansnr},
     * {@code Max WindSpeed} becomes {@code maxwindspeed}.</p>
     */
    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        String value = raw.replace(BOM, "").trim().toLowerCase(Locale.ROOT);
        value = value.replaceAll("\\([^)]*\\)", " ");
        return value.replaceAll("[\\s_\\-]+", "");
    }
}
