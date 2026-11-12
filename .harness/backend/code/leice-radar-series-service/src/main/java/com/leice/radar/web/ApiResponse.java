package com.leice.radar.web;

/**
 * Business envelope shared by every endpoint.
 *
 * <p>The platform frontend reads {@code code}, {@code msg} and {@code data}.
 * Business failures keep HTTP status {@code 200} and carry a non 200
 * {@code code}, so the interceptor can show one notification.</p>
 */
public record ApiResponse<T>(int code, String msg, T data) {

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(200, message, data);
    }

    public static ApiResponse<Void> error(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
