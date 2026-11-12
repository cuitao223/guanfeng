package com.leice.radar.parse;

import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DbsParsingTest {

    private final MeasurementParser parser = new MeasurementParser();
    private final Path file = Path.of("samples", "dbs-sample.csv");

    @Test
    void readsHeightsFromColumnNames() {
        DbsMeasurement measurement = (DbsMeasurement) parser.parse(file);

        assertEquals(3, measurement.profiles().size());
        assertEquals(Set.of(100.0, 200.0), measurement.profiles().get(0).levels().keySet());
    }

    @Test
    void convertsEmptyCellsToMissing() {
        DbsMeasurement measurement = (DbsMeasurement) parser.parse(file);

        double speed = measurement.profiles().get(0).levels().get(100.0).get(DbsMetric.WIND_SPEED);
        double emptyDirection = measurement.profiles().get(1).levels().get(200.0).get(DbsMetric.WIND_DIRECTION);
        double emptyVerticalWind = measurement.profiles().get(2).levels().get(200.0).get(DbsMetric.VERTICAL_WIND);

        assertEquals(5.2, speed);
        assertEquals(MissingValues.MISSING, emptyDirection);
        assertEquals(MissingValues.MISSING, emptyVerticalWind);
    }

    @Test
    void readsStationValues() {
        DbsMeasurement measurement = (DbsMeasurement) parser.parse(file);

        assertEquals(12.5, measurement.profiles().get(0).temperature());
        assertEquals(62.0, measurement.profiles().get(0).humidity());
        assertEquals(1008.2, measurement.profiles().get(0).pressure());
    }
}
