package com.leice.radar.demo.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.demo.workbench.WorkbenchErrors;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PortalAuthControllerTest {
    @TempDir Path root;
    private final ObjectMapper json = new ObjectMapper();
    private final MutableClock clock = new MutableClock();
    private PortalAuthService service;
    private MockMvc mvc;

    @BeforeEach void setup() {
        service = new PortalAuthService(json, root, clock);
        mvc = controller(service);
    }

    private MockMvc controller(PortalAuthService auth) {
        return MockMvcBuilders.standaloneSetup(new PortalAuthController(auth))
            .setControllerAdvice(new WorkbenchErrors()).build();
    }

    private Cookie login(String platform, String username) throws Exception {
        MvcResult result = mvc.perform(post("/api/wb/auth/login").contentType("application/json")
                .content(json.writeValueAsString(new PortalAuthController.LoginRequest(platform, username, "Guanfeng2026!"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.msg").value("ok"))
            .andExpect(jsonPath("$.data.platform").value(platform))
            .andExpect(jsonPath("$.data.username").value(username))
            .andExpect(jsonPath("$.data.displayName").isNotEmpty())
            .andExpect(jsonPath("$.data.expiresAt").value(clock.millis() + PortalAuthService.SESSION_LIFETIME.toMillis()))
            .andExpect(jsonPath("$.data.token").doesNotExist())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
            .andExpect(header().string("Set-Cookie", containsString("SameSite=Lax")))
            .andExpect(header().string("Set-Cookie", containsString("Path=/")))
            .andExpect(header().string("Set-Cookie", containsString("Max-Age=28800")))
            .andReturn();
        Cookie cookie = result.getResponse().getCookie(PortalAuthService.cookieName(platform));
        assertNotNull(cookie);
        return cookie;
    }

    @Test void wrongCredentialsAndPortalCredentialsReturnActualUnauthorized() throws Exception {
        for (String body : new String[]{
                "{\"platform\":\"cloud\",\"username\":\"creator\",\"password\":\"wrong\"}",
                "{\"platform\":\"cloud\",\"username\":\"observer\",\"password\":\"Guanfeng2026!\"}",
                "{\"platform\":\"operations\",\"username\":\"creator\",\"password\":\"Guanfeng2026!\"}",
                "{\"platform\":\"cloud\",\"username\":\"creator\"}"}) {
            mvc.perform(post("/api/wb/auth/login").contentType("application/json").content(body))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401))
                .andExpect(header().doesNotExist("Set-Cookie"));
        }
    }

    @Test void independentCookiesAllowBothPortalsAndLogoutOnlyRevokesSelectedPortal() throws Exception {
        Cookie cloud = login("cloud", "creator");
        Cookie operations = login("operations", "observer");
        for (String platform : new String[]{"cloud", "operations"}) {
            mvc.perform(get("/api/wb/auth/me").param("platform", platform).cookie(cloud, operations))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.platform").value(platform));
        }
        mvc.perform(post("/api/wb/auth/logout").cookie(cloud, operations).contentType("application/json")
                .content("{\"platform\":\"cloud\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.username").value("creator"))
            .andExpect(header().string("Set-Cookie", containsString("GF_CLOUD_SESSION=")))
            .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")))
            .andExpect(header().string("Set-Cookie", not(containsString("GF_OPERATIONS_SESSION"))));
        mvc.perform(get("/api/wb/auth/me").param("platform", "cloud").cookie(cloud, operations))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
        mvc.perform(get("/api/wb/auth/me").param("platform", "operations").cookie(cloud, operations))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.username").value("observer"));
    }

    @Test void missingForgedAndCrossPortalCookiesCannotAuthenticate() throws Exception {
        Cookie cloud = login("cloud", "creator");
        mvc.perform(get("/api/wb/auth/me").param("platform", "cloud"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
        mvc.perform(get("/api/wb/auth/me").param("platform", "cloud").cookie(new Cookie("GF_CLOUD_SESSION", "forged")))
            .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/wb/auth/me").param("platform", "operations").cookie(cloud))
            .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/wb/auth/me").param("platform", "operations")
                .cookie(new Cookie("GF_OPERATIONS_SESSION", cloud.getValue())))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/wb/auth/logout").contentType("application/json").content("{\"platform\":\"operations\"}")
                .cookie(new Cookie("GF_OPERATIONS_SESSION", cloud.getValue())))
            .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/wb/auth/me").param("platform", "cloud").cookie(cloud)).andExpect(status().isOk());
    }

    @Test void invalidPlatformAndMalformedRequestsReturnActualBadRequest() throws Exception {
        mvc.perform(get("/api/wb/auth/me").param("platform", "other"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400));
        mvc.perform(get("/api/wb/auth/me")).andExpect(status().isBadRequest());
        for (String endpoint : new String[]{"login", "logout"}) {
            for (String body : new String[]{"{}", "{\"platform\":\"other\"}", "{"}) {
                mvc.perform(post("/api/wb/auth/" + endpoint).contentType("application/json").content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400));
            }
        }
    }

    @Test void sessionsExpireAtEightHoursWithoutSlidingOnMe() throws Exception {
        Cookie cloud = login("cloud", "creator");
        clock.now += PortalAuthService.SESSION_LIFETIME.toMillis() - 1;
        mvc.perform(get("/api/wb/auth/me").param("platform", "cloud").cookie(cloud)).andExpect(status().isOk());
        clock.now++;
        mvc.perform(get("/api/wb/auth/me").param("platform", "cloud").cookie(cloud))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
    }

    @Test void accountsPersistAsSaltedHashesAndReloadWithoutOverwriting() throws Exception {
        Path file = root.resolve("runtime/auth/accounts.json");
        byte[] before = Files.readAllBytes(file);
        String text = Files.readString(file);
        assertFalse(text.contains("Guanfeng2026!"));
        var accounts = json.readTree(before).get("accounts");
        assertEquals("PBKDF2WithHmacSHA256", accounts.get(0).get("algorithm").asText());
        assertNotEquals(accounts.get(0).get("salt").asText(), accounts.get(1).get("salt").asText());
        assertFalse(accounts.get(0).get("hash").asText().equals(accounts.get(1).get("hash").asText()));
        Cookie old = login("cloud", "creator");
        mvc = controller(new PortalAuthService(json, root, clock));
        assertArrayEquals(before, Files.readAllBytes(file));
        mvc.perform(get("/api/wb/auth/me").param("platform", "cloud").cookie(old)).andExpect(status().isUnauthorized());
        login("cloud", "creator");
        login("operations", "observer");
    }

    @Test void invalidAccountStoreIsPreservedAndFailsClosed() throws Exception {
        Path file = root.resolve("runtime/auth/accounts.json");
        byte[] corrupt = "{invalid-store".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        Files.write(file, corrupt);
        var error = assertThrows(IllegalStateException.class, () -> new PortalAuthService(json, root, clock));
        assertNull(error.getCause());
        assertArrayEquals(corrupt, Files.readAllBytes(file));
    }

    @Test void reloginRotatesOnlyThePresentedPortalSession() throws Exception {
        Cookie cloud = login("cloud", "creator");
        Cookie operations = login("operations", "observer");
        mvc.perform(post("/api/wb/auth/login").cookie(cloud, operations).contentType("application/json")
                .content("{\"platform\":\"cloud\",\"username\":\"creator\",\"password\":\"Guanfeng2026!\"}"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/wb/auth/me").param("platform", "cloud").cookie(cloud)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/wb/auth/me").param("platform", "operations").cookie(operations)).andExpect(status().isOk());
    }

    private static class MutableClock extends Clock {
        long now = Instant.parse("2026-11-12T00:00:00Z").toEpochMilli();
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return Instant.ofEpochMilli(now); }
        @Override public long millis() { return now; }
    }
}
