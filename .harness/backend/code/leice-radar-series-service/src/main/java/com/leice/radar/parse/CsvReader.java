package com.leice.radar.parse;

import com.leice.radar.error.MeasurementParseException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/** Reads a UTF-8 comma separated measurement file. */
public final class CsvReader {

    private static final String BOM = "\uFEFF";

    private CsvReader() {
    }

    public static CsvTable read(Path file) {
        List<String> lines;
        try {
            lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new MeasurementParseException("cannot read file: " + ex.getMessage());
        }
        List<String> header = null;
        List<String[]> rows = new ArrayList<>();
        for (int lineIndex = 0; lineIndex < lines.size(); lineIndex++) {
            String line = lines.get(lineIndex);
            if (lineIndex == 0) {
                line = line.replace(BOM, "");
            }
            if (line.isBlank()) {
                continue;
            }
            List<String> cells = split(line);
            if (header == null) {
                header = cells.stream().map(String::trim).toList();
                continue;
            }
            rows.add(cells.toArray(new String[0]));
        }
        if (header == null || header.isEmpty()) {
            throw new MeasurementParseException("missing header row");
        }
        return new CsvTable(header, rows);
    }

    private static List<String> split(String line) {
        List<String> cells = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char ch = line.charAt(index);
            if (quoted) {
                if (ch == '"') {
                    if (index + 1 < line.length() && line.charAt(index + 1) == '"') {
                        cell.append('"');
                        index++;
                    } else {
                        quoted = false;
                    }
                } else {
                    cell.append(ch);
                }
            } else if (ch == '"') {
                quoted = true;
            } else if (ch == ',') {
                cells.add(cell.toString());
                cell.setLength(0);
            } else {
                cell.append(ch);
            }
        }
        cells.add(cell.toString());
        return cells;
    }
}
