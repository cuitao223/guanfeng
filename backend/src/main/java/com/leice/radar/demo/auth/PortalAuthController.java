package com.leice.radar.demo.auth;

import com.leice.radar.web.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/wb/auth")
public class PortalAuthController {
    private final PortalAuthService service;

    public PortalAuthController(PortalAuthService service) { this.service = service; }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<PortalAuthService.Identity>> login(
            @RequestBody LoginRequest body, HttpServletRequest request) {
        PortalAuthService.requirePlatform(body.platform());
        var result = service.login(body.platform(), body.username(), body.password(), token(request, body.platform()));
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store")
            .header(HttpHeaders.SET_COOKIE, cookie(body.platform(), result.token(), PortalAuthService.SESSION_LIFETIME, request))
            .body(ApiResponse.ok(result.identity(), "ok"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<PortalAuthService.Identity>> me(
            @RequestParam("platform") String platform, HttpServletRequest request) {
        var identity = service.me(platform, token(request, platform));
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store").body(ApiResponse.ok(identity, "ok"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<PortalAuthService.Identity>> logout(
            @RequestBody LogoutRequest body, HttpServletRequest request) {
        var identity = service.logout(body.platform(), token(request, body.platform()));
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store")
            .header(HttpHeaders.SET_COOKIE, cookie(body.platform(), "", Duration.ZERO, request))
            .body(ApiResponse.ok(identity, "ok"));
    }

    // Controller-local handlers take precedence over the legacy HTTP-200 business advice.
    @ExceptionHandler(PortalAuthService.AuthException.class)
    public ResponseEntity<ApiResponse<Void>> authError(PortalAuthService.AuthException error) {
        return ResponseEntity.status(error.status()).header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(ApiResponse.error(error.status(), error.getMessage()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ApiResponse<Void>> malformedRequest(Exception ignored) {
        return ResponseEntity.badRequest().header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(ApiResponse.error(400, "Invalid authentication request"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> unexpectedError(Exception ignored) {
        return ResponseEntity.internalServerError().header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(ApiResponse.error(500, "Authentication unavailable"));
    }

    private static String token(HttpServletRequest request, String platform) {
        String name = PortalAuthService.cookieName(platform);
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) if (name.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }

    private static String cookie(String platform, String value, Duration age, HttpServletRequest request) {
        return ResponseCookie.from(PortalAuthService.cookieName(platform), value)
            .httpOnly(true).sameSite("Lax").path("/").maxAge(age).secure(request.isSecure()).build().toString();
    }

    public record LoginRequest(String platform, String username, String password) {
        @Override public String toString() { return "LoginRequest[redacted]"; }
    }
    public record LogoutRequest(String platform) {}
}
