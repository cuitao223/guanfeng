package com.leice.radar.series;

import java.util.List;

/**
 * Input of the {@code scan} chart in PPI mode.
 *
 * @param mode      always {@code ppi}
 * @param angles    azimuth in degrees, ascending
 * @param heightArr distance gates in metres, ascending
 * @param values    {@code values[angle][gate]}
 * @param pitch     elevation per angle, kept out of {@code values}
 * @param unit      display unit of the selected product
 */
public record PpiSeries(
        String mode,
        double[] angles,
        double[] heightArr,
        double[][] values,
        double[] pitch,
        String unit) {

    public PpiSeries {
        mode = mode == null ? "ppi" : mode;
    }
}
