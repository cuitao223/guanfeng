package com.leice.radar.web;

import com.leice.radar.config.RadarProperties;
import com.leice.radar.error.RadarException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;

/** Resolves a caller supplied file name inside the configured data directory. */
@Component
public class RadarFileResolver {

    private final RadarProperties properties;

    public RadarFileResolver(RadarProperties properties) {
        this.properties = properties;
    }

    public Path resolve(String file) {
        if (file == null || file.isBlank()) {
            throw RadarException.badRequest("radar.error.fileRequired");
        }
        Path root = dataDir();
        Path target = root.resolve(file).normalize();
        if (!target.startsWith(root)) {
            throw RadarException.badRequest("radar.error.pathOutsideDataDir");
        }
        try {
            if (!Files.isRegularFile(target)) {
                throw RadarException.badRequest("radar.error.fileNotFound", file);
            }
            Path realRoot = root.toRealPath();
            Path realTarget = target.toRealPath();
            if (!realTarget.startsWith(realRoot)) {
                throw RadarException.badRequest("radar.error.pathOutsideDataDir");
            }
            long limit = properties.getMaxFileSizeMb() * 1024L * 1024L;
            if (Files.size(realTarget) > limit) {
                throw RadarException.badRequest("radar.error.fileTooLarge", properties.getMaxFileSizeMb());
            }
            return realTarget;
        } catch (IOException ex) {
            throw RadarException.badRequest("radar.error.fileNotFound", file);
        }
    }

    private Path dataDir() {
        String configured = properties.getDataDir();
        if (configured == null || configured.isBlank()) {
            throw RadarException.internal("radar.error.dataDirMissing");
        }
        try {
            return Path.of(configured).toAbsolutePath().normalize();
        } catch (InvalidPathException ex) {
            throw RadarException.internal("radar.error.dataDirMissing");
        }
    }
}
