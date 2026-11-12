package com.leice.radar.parse;

/**
 * Missing value handling shared by every parser.
 *
 * <p>The chart contract reserves the finite number {@code 999} and every value
 * less than or equal to {@code -999} for missing data. Empty cells, {@code NaN},
 * {@code null} and non finite numbers become {@code 999}.</p>
 */
public final class MissingValues {

    public static final double MISSING = 999d;

    private MissingValues() {
    }

    /** Parses a raw cell, mapping empty or unparsable values to {@link #MISSING}. */
    public static double parse(String token) {
        if (token == null) {
            return MISSING;
        }
        String value = token.trim();
        if (value.isEmpty()
                || value.equalsIgnoreCase("nan")
                || value.equalsIgnoreCase("null")
                || value.equals("-")) {
            return MISSING;
        }
        try {
            double number = Double.parseDouble(value);
            return Double.isFinite(number) ? number : MISSING;
        } catch (NumberFormatException ex) {
            return MISSING;
        }
    }

    /** True for the values the chart contract treats as missing. */
    public static boolean isMissing(double value) {
        return !Double.isFinite(value) || value == MISSING || value <= -999d;
    }
}
