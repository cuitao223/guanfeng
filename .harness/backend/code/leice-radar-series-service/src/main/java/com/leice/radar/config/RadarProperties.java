package com.leice.radar.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configuration of the radar series component. */
@ConfigurationProperties(prefix = "radar")
public class RadarProperties {

    /** Directory that measurement files are resolved against. */
    private String dataDir = "samples";

    /** Maximum accepted file size. */
    private long maxFileSizeMb = 64;

    public String getDataDir() {
        return dataDir;
    }

    public void setDataDir(String dataDir) {
        this.dataDir = dataDir;
    }

    public long getMaxFileSizeMb() {
        return maxFileSizeMb;
    }

    public void setMaxFileSizeMb(long maxFileSizeMb) {
        this.maxFileSizeMb = maxFileSizeMb;
    }
}
