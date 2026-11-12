package com.leice.radar.parse;

import com.leice.radar.error.MeasurementParseException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoField;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Parses the Date_time column of measurement files. */
final class MeasurementTimes {
    private static final DateTimeFormatter COMPACT = formatter("yyyyMMdd HH:mm:ss");
    private static final DateTimeFormatter SEPARATED = formatter("yyyy-MM-dd HH:mm:ss");
    private static final Pattern VARIABLE_TIME = Pattern.compile("^(\\d{8}|\\d{4}-\\d{1,2}-\\d{1,2})\\s+(\\d{1,2}):(\\d{1,2}):(\\d{1,2})(\\.\\d+)?$");
    private MeasurementTimes() {}
    static LocalDateTime parse(String text, int lineNumber) {
        String value = normalizeVariableTime(text.trim());
        for (DateTimeFormatter formatter : new DateTimeFormatter[]{COMPACT, SEPARATED, DateTimeFormatter.ISO_LOCAL_DATE_TIME}) {
            try { return LocalDateTime.parse(value, formatter); }
            catch (DateTimeParseException ignored) { }
        }
        throw new MeasurementParseException("line " + lineNumber + ": invalid Date_time '" + text.trim() + "'");
    }
    /** Organizer samples contain occasional one-digit time fields such as 08:10:7.452. */
    private static String normalizeVariableTime(String value) {
        Matcher match = VARIABLE_TIME.matcher(value);
        if (!match.matches()) return value;
        String date = match.group(1);
        String fraction = match.group(5) == null ? "" : match.group(5);
        return date + " " + String.format("%02d:%02d:%02d", Integer.parseInt(match.group(2)), Integer.parseInt(match.group(3)), Integer.parseInt(match.group(4))) + fraction;
    }
    private static DateTimeFormatter formatter(String pattern) {
        return new DateTimeFormatterBuilder().appendPattern(pattern).optionalStart().appendFraction(ChronoField.NANO_OF_SECOND, 0, 9, true).optionalEnd().toFormatter();
    }
}
