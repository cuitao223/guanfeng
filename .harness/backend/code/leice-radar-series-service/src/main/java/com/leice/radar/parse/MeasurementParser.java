package com.leice.radar.parse;

import com.leice.radar.error.MeasurementParseException;

import java.nio.file.Path;

/**
 * Picks the measurement layout from the header.
 *
 * <p>A file with an {@code Azimuth} column is a PPI scan. Otherwise the file is
 * a DBS wind profile when it has height prefixed columns. The file name is not
 * used, because the layout is stated by the header.</p>
 */
public final class MeasurementParser {

    public Measurement parse(Path file) {
        CsvTable table = CsvReader.read(file);
        if (table.indexOf("azimuth") >= 0) {
            return PpiParser.parse(table);
        }
        if (!LeveledColumns.parse(table.header(), DbsMetric.keys()).isEmpty()) {
            return DbsParser.parse(table);
        }
        throw new MeasurementParseException("unrecognized measurement file layout");
    }
}
