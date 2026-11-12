package com.leice.radar.series;

import java.util.List;

/**
 * Shared shape of the obtain, abnormal, complete and height rate charts.
 *
 * @param name       chart title, already localized by the web layer
 * @param categories level labels such as {@code 100m}
 * @param values     percentages, or {@code 999} when missing
 */
public record RateSeries(
        String name,
        List<String> categories,
        double[] values) {
}
