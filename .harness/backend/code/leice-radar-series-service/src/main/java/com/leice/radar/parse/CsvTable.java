package com.leice.radar.parse;

import java.util.List;

/** Header and data rows of a measurement file. */
public final class CsvTable {

    private final List<String> header;
    private final List<String[]> rows;

    CsvTable(List<String> header, List<String[]> rows) {
        this.header = List.copyOf(header);
        this.rows = List.copyOf(rows);
    }

    public List<String> header() {
        return header;
    }

    public List<String[]> rows() {
        return rows;
    }

    /** Returns the index of a column by normalized name, or {@code -1}. */
    public int indexOf(String normalizedName) {
        for (int index = 0; index < header.size(); index++) {
            if (ColumnNames.normalize(header.get(index)).equals(normalizedName)) {
                return index;
            }
        }
        return -1;
    }

    /** Reads a cell, returning an empty string when the row is shorter. */
    public String cell(String[] row, int index) {
        if (row == null || index < 0 || index >= row.length) {
            return "";
        }
        String value = row[index];
        return value == null ? "" : value.trim();
    }
}
