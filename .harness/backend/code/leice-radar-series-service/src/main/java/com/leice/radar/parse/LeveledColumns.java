package com.leice.radar.parse;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.NavigableSet;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Columns whose name starts with a height or distance, for example
 * {@code 127m WindSpeed} or {@code 300m RadialWind(m/s)}.
 *
 * <p>The measurement file states the level in the column name, so the service
 * never hard codes a resolution.</p>
 */
public final class LeveledColumns {

    private static final Pattern LEVEL_PATTERN =
            Pattern.compile("^\\s*([0-9]+(?:\\.[0-9]+)?)\\s*m[\\s_]+(.+)$", Pattern.CASE_INSENSITIVE);

    private final NavigableMap<Double, Map<String, Integer>> columns;

    private LeveledColumns(NavigableMap<Double, Map<String, Integer>> columns) {
        this.columns = columns;
    }

    public static LeveledColumns parse(List<String> header, Set<String> metricKeys) {
        NavigableMap<Double, Map<String, Integer>> columns = new TreeMap<>();
        for (int index = 0; index < header.size(); index++) {
            Matcher matcher = LEVEL_PATTERN.matcher(header.get(index));
            if (!matcher.matches()) {
                continue;
            }
            double level = Double.parseDouble(matcher.group(1));
            String key = ColumnNames.normalize(matcher.group(2));
            if (metricKeys.contains(key)) {
                columns.computeIfAbsent(level, ignored -> new HashMap<>()).put(key, index);
            }
        }
        return new LeveledColumns(columns);
    }

    public boolean isEmpty() {
        return columns.isEmpty();
    }

    /** Heights or distance gates found in the header, ascending. */
    public NavigableSet<Double> levels() {
        return Collections.unmodifiableNavigableSet(columns.navigableKeySet());
    }

    /** Column index of one metric at one level, or {@code null}. */
    public Integer index(double level, String metricKey) {
        Map<String, Integer> row = columns.get(level);
        return row == null ? null : row.get(metricKey);
    }
}
