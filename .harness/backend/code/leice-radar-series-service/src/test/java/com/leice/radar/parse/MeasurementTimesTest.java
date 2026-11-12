package com.leice.radar.parse;

import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import com.leice.radar.error.MeasurementParseException;
import static org.junit.jupiter.api.Assertions.*;

class MeasurementTimesTest {
    @Test void organizerSingleDigitSecondsPreserveFraction() {
        assertEquals(LocalDateTime.of(2026,8,31,8,10,7,452000000), MeasurementTimes.parse("20260831 08:10:7.452",2));
    }
    @Test void supportsExistingFormatsAndRejectsInvalidTimes() {
        assertEquals(LocalDateTime.of(2026,8,31,8,10,7), MeasurementTimes.parse("2026-08-31 08:10:07",2));
        assertEquals(LocalDateTime.of(2026,8,31,8,10,7), MeasurementTimes.parse("2026-08-31T08:10:07",2));
        assertThrows(MeasurementParseException.class,()->MeasurementTimes.parse("20260831 08:10:70.452",2));
    }
}
