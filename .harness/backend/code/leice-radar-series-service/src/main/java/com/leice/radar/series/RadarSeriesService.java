package com.leice.radar.series;

import com.leice.radar.error.MeasurementParseException;
import com.leice.radar.parse.DbsMeasurement;
import com.leice.radar.parse.DbsMetric;
import com.leice.radar.parse.DbsProfile;
import com.leice.radar.parse.Measurement;
import com.leice.radar.parse.MeasurementParser;
import com.leice.radar.parse.MissingValues;
import com.leice.radar.parse.PpiMeasurement;
import com.leice.radar.parse.PpiMetric;
import com.leice.radar.parse.PpiScan;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Turns a measurement file into the arrays the chart packages consume.
 *
 * <p>The service never invents a value. Products without a documented formula,
 * such as the abnormal or complete rate, stay out of this class until the
 * definition is confirmed.</p>
 */
@Service
public class RadarSeriesService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final MeasurementParser parser = new MeasurementParser();

    /** Horizontal wind speed and direction for {@code barb-thi}. */
    public WindProfileSeries windProfile(Path file) {
        List<DbsProfile> profiles = dbsProfiles(file);
        double[] heights = heights(profiles);
        List<String> times = new ArrayList<>(profiles.size());
        double[][] values = new double[profiles.size()][heights.length];
        double[][] dirs = new double[profiles.size()][heights.length];
        for (int row = 0; row < profiles.size(); row++) {
            DbsProfile profile = profiles.get(row);
            times.add(TIME_FORMAT.format(profile.time()));
            for (int column = 0; column < heights.length; column++) {
                double speed = dbsValue(profile, heights[column], DbsMetric.WIND_SPEED);
                double direction = dbsValue(profile, heights[column], DbsMetric.WIND_DIRECTION);
                boolean paired = !MissingValues.isMissing(speed) && !MissingValues.isMissing(direction);
                values[row][column] = paired ? speed : MissingValues.MISSING;
                dirs[row][column] = paired ? direction : MissingValues.MISSING;
            }
        }
        return new WindProfileSeries(times, heights, values, dirs, "m/s");
    }

    /** Vertical wind for {@code thi}. */
    public ThiSeries verticalWind(Path file) {
        return thi(file, DbsMetric.VERTICAL_WIND, "m/s");
    }

    /** Mean SNR for {@code thi}. Values stay raw until a display formula is confirmed. */
    public ThiSeries snr(Path file) {
        return thi(file, DbsMetric.MEAN_SNR, "dB");
    }

    /** Station temperature and humidity for {@code dual-axis-line}. */
    public TempHumiditySeries temperatureHumidity(Path file) {
        List<DbsProfile> profiles = dbsProfiles(file);
        List<String> times = new ArrayList<>(profiles.size());
        double[] temperature = new double[profiles.size()];
        double[] humidity = new double[profiles.size()];
        for (int row = 0; row < profiles.size(); row++) {
            DbsProfile profile = profiles.get(row);
            times.add(TIME_FORMAT.format(profile.time()));
            temperature[row] = profile.temperature();
            humidity[row] = profile.humidity();
        }
        return new TempHumiditySeries(times, temperature, humidity);
    }

    /** One PPI product for {@code scan}. */
    public PpiSeries scan(Path file, ScanProduct product) {
        Measurement measurement = parser.parse(file);
        if (!(measurement instanceof PpiMeasurement ppi)) {
            throw new MeasurementParseException("file is not a PPI scan");
        }
        List<PpiScan> scans = orderedScans(ppi.scans());
        double[] gates = gates(scans);
        double[] angles = new double[scans.size()];
        double[] pitch = new double[scans.size()];
        double[][] values = new double[scans.size()][gates.length];
        for (int row = 0; row < scans.size(); row++) {
            PpiScan scan = scans.get(row);
            angles[row] = scan.azimuth();
            pitch[row] = scan.pitch();
            for (int column = 0; column < gates.length; column++) {
                values[row][column] = gateValue(scan, gates[column], product.metric());
            }
        }
        return new PpiSeries("ppi", angles, gates, values, pitch, product.unit());
    }

    /**
     * Height data obtain rate, the only rate the measurement file states.
     * The value is the mean of the per height {@code DataObtainRate} column.
     */
    public RateSeries heightObtainRate(Path file, String name) {
        List<DbsProfile> profiles = dbsProfiles(file);
        double[] heights = heights(profiles);
        List<String> categories = new ArrayList<>(heights.length);
        double[] values = new double[heights.length];
        for (int column = 0; column < heights.length; column++) {
            double sum = 0;
            int count = 0;
            for (DbsProfile profile : profiles) {
                double rate = dbsValue(profile, heights[column], DbsMetric.DATA_OBTAIN_RATE);
                if (!MissingValues.isMissing(rate)) {
                    sum += rate;
                    count++;
                }
            }
            categories.add(category(heights[column]));
            values[column] = count == 0 ? MissingValues.MISSING : round(sum / count);
        }
        return new RateSeries(name, categories, values);
    }

    private ThiSeries thi(Path file, DbsMetric metric, String unit) {
        List<DbsProfile> profiles = dbsProfiles(file);
        double[] heights = heights(profiles);
        List<String> times = new ArrayList<>(profiles.size());
        double[][] values = new double[profiles.size()][heights.length];
        for (int row = 0; row < profiles.size(); row++) {
            DbsProfile profile = profiles.get(row);
            times.add(TIME_FORMAT.format(profile.time()));
            for (int column = 0; column < heights.length; column++) {
                values[row][column] = dbsValue(profile, heights[column], metric);
            }
        }
        return new ThiSeries(times, heights, values, unit);
    }

    private List<DbsProfile> dbsProfiles(Path file) {
        Measurement measurement = parser.parse(file);
        if (!(measurement instanceof DbsMeasurement dbs)) {
            throw new MeasurementParseException("file is not a DBS wind profile");
        }
        return orderedProfiles(dbs.profiles());
    }

    private static List<DbsProfile> orderedProfiles(List<DbsProfile> profiles) {
        TreeMap<LocalDateTime, DbsProfile> byTime = new TreeMap<>();
        for (DbsProfile profile : profiles) {
            byTime.putIfAbsent(profile.time(), profile);
        }
        return new ArrayList<>(byTime.values());
    }

    private static List<PpiScan> orderedScans(List<PpiScan> scans) {
        TreeMap<Double, PpiScan> byAzimuth = new TreeMap<>();
        for (PpiScan scan : scans) {
            byAzimuth.putIfAbsent(scan.azimuth(), scan);
        }
        return new ArrayList<>(byAzimuth.values());
    }

    private static double[] heights(List<DbsProfile> profiles) {
        TreeSet<Double> heights = new TreeSet<>();
        for (DbsProfile profile : profiles) {
            heights.addAll(profile.levels().keySet());
        }
        return toArray(heights);
    }

    private static double[] gates(List<PpiScan> scans) {
        TreeSet<Double> gates = new TreeSet<>();
        for (PpiScan scan : scans) {
            gates.addAll(scan.gates().keySet());
        }
        return toArray(gates);
    }

    private static double[] toArray(TreeSet<Double> levels) {
        double[] result = new double[levels.size()];
        int index = 0;
        for (double level : levels) {
            result[index++] = level;
        }
        return result;
    }

    private static double dbsValue(DbsProfile profile, double height, DbsMetric metric) {
        Map<DbsMetric, Double> level = profile.levels().get(height);
        if (level == null) {
            return MissingValues.MISSING;
        }
        Double value = level.get(metric);
        return value == null ? MissingValues.MISSING : value;
    }

    private static double gateValue(PpiScan scan, double gate, PpiMetric metric) {
        Map<PpiMetric, Double> level = scan.gates().get(gate);
        if (level == null) {
            return MissingValues.MISSING;
        }
        Double value = level.get(metric);
        return value == null ? MissingValues.MISSING : value;
    }

    private static double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private static String category(double height) {
        if (height == Math.rint(height)) {
            return (long) height + "m";
        }
        return BigDecimal.valueOf(height).stripTrailingZeros().toPlainString() + "m";
    }
}
