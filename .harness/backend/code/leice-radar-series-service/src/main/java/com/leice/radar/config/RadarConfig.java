package com.leice.radar.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Registers the component properties.
 *
 * <p>The component deliberately does not define a {@code MessageSource} or any
 * other application wide bean. A host project keeps control of its own
 * infrastructure and only opts into the radar packages it needs.</p>
 */
@Configuration
@EnableConfigurationProperties(RadarProperties.class)
public class RadarConfig {
}
