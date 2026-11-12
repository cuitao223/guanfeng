package com.leice.radar.parse;

/** A parsed measurement file. */
public sealed interface Measurement permits DbsMeasurement, PpiMeasurement {
}
