package com.leice.radar.web;

import com.leice.radar.error.RadarException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Locale;

/**
 * Maps failures to the platform envelope.
 *
 * <p>HTTP status stays {@code 200}; the business code carries the failure, as
 * the platform interceptor expects.</p>
 */
@RestControllerAdvice
public class RadarExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(RadarExceptionHandler.class);

    private final RadarMessages messages;

    public RadarExceptionHandler(RadarMessages messages) {
        this.messages = messages;
    }

    @ExceptionHandler(RadarException.class)
    public ApiResponse<Void> handleRadar(RadarException ex, HttpServletRequest request) {
        if (ex.getCode() >= 500) {
            log.error("radar request failed: {}", ex.getMessageKey(), ex);
        }
        Locale locale = messages.localeOf(request.getHeader("X-Lang"));
        return ApiResponse.error(ex.getCode(), messages.get(ex.getMessageKey(), locale, ex.getArguments()));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ApiResponse<Void> handleMissingParameter(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        Locale locale = messages.localeOf(request.getHeader("X-Lang"));
        return ApiResponse.error(400, messages.get("radar.error.fileRequired", locale));
    }

    @ExceptionHandler(Exception.class)
    public ApiResponse<Void> handleOther(Exception ex, HttpServletRequest request) {
        log.error("unexpected error", ex);
        Locale locale = messages.localeOf(request.getHeader("X-Lang"));
        return ApiResponse.error(500, messages.get("radar.error.internal", locale));
    }
}
