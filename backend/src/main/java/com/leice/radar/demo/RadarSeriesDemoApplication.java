package com.leice.radar.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Runnable demo that wires the radar series component. */
@SpringBootApplication(scanBasePackages = "com.leice.radar")
public class RadarSeriesDemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(RadarSeriesDemoApplication.class, args);
    }
}
