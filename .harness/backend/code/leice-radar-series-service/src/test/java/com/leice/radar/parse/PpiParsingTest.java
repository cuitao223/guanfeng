package com.leice.radar.parse;

import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PpiParsingTest {

    private final MeasurementParser parser = new MeasurementParser();
    private final Path file = Path.of("samples", "ppi-sample.csv");

    @Test
    void readsAzimuthPitchAndGates() {
        PpiMeasurement measurement = (PpiMeasurement) parser.parse(file);

        assertEquals(3, measurement.scans().size());
        assertEquals(60.0, measurement.scans().get(0).azimuth());
        assertEquals(2.0, measurement.scans().get(1).pitch());
        assertEquals(Set.of(100.0, 200.0), measurement.scans().get(0).gates().keySet());
    }

    @Test
    void convertsEmptySnrToMissing() {
        PpiMeasurement measurement = (PpiMeasurement) parser.parse(file);

        double snr = measurement.scans().get(2).gates().get(200.0).get(PpiMetric.SNR);

        assertEquals(MissingValues.MISSING, snr);
    }
}
