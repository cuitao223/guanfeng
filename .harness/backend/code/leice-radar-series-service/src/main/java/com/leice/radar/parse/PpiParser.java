package com.leice.radar.parse;

import com.leice.radar.error.MeasurementParseException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Reads the PPI scan layout. */
final class PpiParser {

    private PpiParser() {
    }

    static PpiMeasurement parse(CsvTable table) {
        LeveledColumns gates = LeveledColumns.parse(table.header(), PpiMetric.keys());
        if (gates.isEmpty()) {
            throw new MeasurementParseException("no distance columns found");
        }
        int timeIndex = DbsParser.requireColumn(table, "datetime", "Date_time");
        int azimuthIndex = DbsParser.requireColumn(table, "azimuth", "Azimuth");
        int pitchIndex = DbsParser.requireColumn(table, "pitch", "Pitch");
        int temperatureIndex = table.indexOf("temperature");
        int humidityIndex = table.indexOf("humidity");
        int pressureIndex = table.indexOf("pressure");

        List<PpiScan> scans = new ArrayList<>();
        for (int rowIndex = 0; rowIndex < table.rows().size(); rowIndex++) {
            String[] row = table.rows().get(rowIndex);
            String timeText = table.cell(row, timeIndex);
            if (timeText.isBlank()) {
                continue;
            }
            LocalDateTime time = MeasurementTimes.parse(timeText, rowIndex + 2);
            String azimuthText = table.cell(row, azimuthIndex);
            if (azimuthText.isBlank()) {
                continue;
            }
            Map<Double, Map<PpiMetric, Double>> values = new LinkedHashMap<>();
            for (double gate : gates.levels()) {
                Map<PpiMetric, Double> metrics = new EnumMap<>(PpiMetric.class);
                for (PpiMetric metric : PpiMetric.values()) {
                    Integer column = gates.index(gate, metric.key());
                    metrics.put(metric, column == null
                            ? MissingValues.MISSING
                            : MissingValues.parse(table.cell(row, column)));
                }
                values.put(gate, metrics);
            }
            scans.add(new PpiScan(
                    time,
                    MissingValues.parse(azimuthText),
                    DbsParser.cellValue(table, row, pitchIndex),
                    DbsParser.cellValue(table, row, temperatureIndex),
                    DbsParser.cellValue(table, row, humidityIndex),
                    DbsParser.cellValue(table, row, pressureIndex),
                    values));
        }
        if (scans.isEmpty()) {
            throw new MeasurementParseException("no data rows");
        }
        return new PpiMeasurement(scans);
    }
}
