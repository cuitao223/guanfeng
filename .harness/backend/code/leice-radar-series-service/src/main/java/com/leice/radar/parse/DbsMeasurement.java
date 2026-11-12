package com.leice.radar.parse;

import java.util.List;

/** DBS wind profile file: one row per observation time. */
public record DbsMeasurement(List<DbsProfile> profiles) implements Measurement {

    public DbsMeasurement {
        profiles = List.copyOf(profiles);
    }
}
