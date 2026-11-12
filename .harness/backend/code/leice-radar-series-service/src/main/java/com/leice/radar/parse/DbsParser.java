package com.leice.radar.parse;

import com.leice.radar.error.MeasurementParseException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Reads the DBS wind profile layout. */
final class DbsParser {

    private DbsParser() {
    }

    static DbsMeasurement parse(CsvTable table) {
        LeveledColumns levels = LeveledColumns.parse(table.header(), DbsMetric.keys());
        if (levels.isEmpty()) {
            throw new MeasurementParseException("no height columns found");
        }
        int timeIndex = requireColumn(table, "datetime", "Date_time");
        int temperatureIndex = table.indexOf("temperature");
        int humidityIndex = table.indexOf("humidity");
        int pressureIndex = table.indexOf("pressure");

        List<DbsProfile> profiles = new ArrayList<>();
        for (int rowIndex = 0; rowIndex < table.rows().size(); rowIndex++) {
            String[] row = table.rows().get(rowIndex);
            String timeText = table.cell(row, timeIndex);
            if (timeText.isBlank()) {
                continue;
            }
            LocalDateTime time = MeasurementTimes.parse(timeText, rowIndex + 2);
            Map<Double, Map<DbsMetric, Double>> values = new LinkedHashMap<>();
            for (double level : levels.levels()) {
                Map<DbsMetric, Double> metrics = new EnumMap<>(DbsMetric.class);
                for (DbsMetric metric : DbsMetric.values()) {
                    Integer column = levels.index(level, metric.key());
                    metrics.put(metric, column == null
                            ? MissingValues.MISSING
                            : MissingValues.parse(table.cell(row, column)));
                }
                values.put(level, metrics);
            }
            profiles.add(new DbsProfile(
                    time,
                    cellValue(table, row, temperatureIndex),
                    cellValue(table, row, humidityIndex),
                    cellValue(table, row, pressureIndex),
                    values));
        }
        if (profiles.isEmpty()) {
            throw new MeasurementParseException("no data rows");
        }
        return new DbsMeasurement(profiles);
    }

    static int requireColumn(CsvTable table, String normalizedName, String displayName) {
        int index = table.indexOf(normalizedName);
        if (index < 0) {
            throw new MeasurementParseException("missing column " + displayName);
        }
        return index;
    }

    static double cellValue(CsvTable table, String[] row, int index) {
        return MissingValues.parse(table.cell(row, index));
    }
}
