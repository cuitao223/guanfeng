package com.leice.radar.series;

import com.leice.radar.error.MeasurementParseException;
import com.leice.radar.parse.MissingValues;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RadarSeriesServiceTest {

    private final RadarSeriesService service = new RadarSeriesService();
    private final Path dbs = Path.of("samples", "dbs-sample.csv");
    private final Path ppi = Path.of("samples", "ppi-sample.csv");

    @Test
    void alignsWindProfileToHeights() {
        WindProfileSeries series = service.windProfile(dbs);

        assertEquals(List.of("2026-07-01 00:00:00", "2026-07-01 00:01:00", "2026-07-01 00:02:00"), series.times());
        assertArrayEquals(new double[]{100.0, 200.0}, series.heightArr());
        assertEquals(5.2, series.values()[0][0]);
        assertEquals(MissingValues.MISSING, series.values()[1][1]);
        assertEquals(MissingValues.MISSING, series.dirs()[1][1]);
    }

    @Test
    void keepsVerticalWindMissingCells() {
        ThiSeries series = service.verticalWind(dbs);

        assertEquals(0.08, series.values()[0][1]);
        assertEquals(MissingValues.MISSING, series.values()[2][1]);
        assertEquals("m/s", series.unit());
    }

    @Test
    void averagesHeightObtainRate() {
        RateSeries series = service.heightObtainRate(dbs, "height obtain rate");

        assertEquals("height obtain rate", series.name());
        assertEquals(List.of("100m", "200m"), series.categories());
        assertArrayEquals(new double[]{99.67, 98.0}, series.values());
    }

    @Test
    void sortsScanAnglesAndKeepsPitchSeparate() {
        PpiSeries series = service.scan(ppi, ScanProduct.SNR);

        assertEquals("ppi", series.mode());
        assertArrayEquals(new double[]{0.0, 30.0, 60.0}, series.angles());
        assertArrayEquals(new double[]{2.0, 2.2, 2.5}, series.pitch());
        assertEquals(MissingValues.MISSING, series.values()[1][1]);
        assertEquals("dB", series.unit());
    }

    @Test
    void rejectsWindProfileOnScanEndpoint() {
        assertThrows(MeasurementParseException.class, () -> service.scan(dbs, ScanProduct.WIND));
    }
}
