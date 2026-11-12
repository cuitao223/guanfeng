package com.leice.radar.error;

/** A measurement file cannot be read or does not follow the expected layout. */
public class MeasurementParseException extends RadarException {

    public MeasurementParseException(String detail) {
        super(500, "radar.error.parse", detail);
    }
}
