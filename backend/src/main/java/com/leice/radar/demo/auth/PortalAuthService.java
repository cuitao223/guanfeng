package com.leice.radar.demo.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.demo.workbench.WorkbenchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PortalAuthService {
    static final Duration SESSION_LIFETIME = Duration.ofHours(8);
    private static final int ITERATIONS = 600_000;
    private static final SecureRandom RANDOM = new SecureRandom();
    private final List<Account> accounts;
    private final Map<String, Session> sessions = new HashMap<>();
    private final Clock clock;

    @Autowired
    public PortalAuthService(ObjectMapper json, WorkbenchService workbench) {
        this(json, workbench.root(), Clock.systemUTC());
    }

    PortalAuthService(ObjectMapper json, Path root, Clock clock) {
        this.clock = clock;
        Path file = root.resolve("runtime/auth/accounts.json");
        try {
            Files.createDirectories(file.getParent());
            if (!Files.exists(file)) {
                AccountStore seed = new AccountStore(1, List.of(
                    seed("cloud", "creator", "Creator"),
                    seed("operations", "observer", "Observer")));
                // CREATE_NEW preserves a store created by another process.
                try {
                    Files.write(file, json.writerWithDefaultPrettyPrinter().writeValueAsBytes(seed),
                        StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
                } catch (java.nio.file.FileAlreadyExistsException ignored) {
                    // Read and validate the existing store below.
                }
            }
            AccountStore store = json.readValue(file.toFile(), AccountStore.class);
            validate(store);
            this.accounts = List.copyOf(store.accounts());
        } catch (IOException | RuntimeException e) {
            // Do not attach parser exceptions: they may include credential contents.
            throw new IllegalStateException("Local authentication account store could not be loaded");
        }
    }

    public static String requirePlatform(String platform) {
        if (!"cloud".equals(platform) && !"operations".equals(platform)) {
            throw new AuthException(400, "Invalid platform");
        }
        return platform;
    }

    public static String cookieName(String platform) {
        return requirePlatform(platform).equals("cloud") ? "GF_CLOUD_SESSION" : "GF_OPERATIONS_SESSION";
    }

    public synchronized LoginResult login(String platform, String username, String password, String oldToken) {
        requirePlatform(platform);
        prune();
        Account account = accounts.stream()
            .filter(a -> a.platform().equals(platform) && a.username().equals(username))
            .findFirst().orElse(null);
        // Perform the same derivation for an unknown account.
        Account check = account == null ? accounts.get(0) : account;
        char[] secret = password == null ? new char[0] : password.toCharArray();
        byte[] candidate = derive(secret, Base64.getDecoder().decode(check.salt()), check.iterations());
        boolean matches = MessageDigest.isEqual(candidate, Base64.getDecoder().decode(check.hash()));
        Arrays.fill(candidate, (byte) 0);
        if (account == null || password == null || !matches) {
            throw new AuthException(401, "Invalid username or password");
        }
        if (oldToken != null) {
            Session old = sessions.get(oldToken);
            if (old != null && old.identity().platform().equals(platform)) sessions.remove(oldToken);
        }
        Identity identity = new Identity(platform, account.username(), account.displayName(),
            clock.millis() + SESSION_LIFETIME.toMillis());
        String token = randomToken(32);
        sessions.put(token, new Session(identity));
        return new LoginResult(identity, token);
    }

    public synchronized Identity me(String platform, String token) {
        requirePlatform(platform);
        prune();
        Session session = token == null ? null : sessions.get(token);
        if (session == null || !session.identity().platform().equals(platform)) {
            throw new AuthException(401, "Authentication required");
        }
        return session.identity();
    }

    public synchronized Identity logout(String platform, String token) {
        Identity identity = me(platform, token);
        sessions.remove(token);
        return identity;
    }

    private void prune() {
        long now = clock.millis();
        sessions.values().removeIf(s -> s.identity().expiresAt() <= now);
    }

    private static Account seed(String platform, String username, String displayName) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        byte[] hash = derive("Guanfeng2026!".toCharArray(), salt, ITERATIONS);
        Account account = new Account(platform, username, displayName, "PBKDF2WithHmacSHA256", ITERATIONS,
            Base64.getEncoder().encodeToString(salt), Base64.getEncoder().encodeToString(hash));
        Arrays.fill(hash, (byte) 0);
        return account;
    }

    private static byte[] derive(char[] password, byte[] salt, int iterations) {
        PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, 256);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Password verification unavailable");
        } finally {
            spec.clearPassword();
            Arrays.fill(password, '\0');
        }
    }

    private static void validate(AccountStore store) {
        if (store == null || store.version() != 1 || store.accounts() == null || store.accounts().isEmpty()) {
            throw new IllegalArgumentException();
        }
        var keys = new java.util.HashSet<String>();
        for (Account a : store.accounts()) {
            if (a == null || a.username() == null || a.username().isBlank()
                || a.displayName() == null || a.displayName().isBlank()
                || !"PBKDF2WithHmacSHA256".equals(a.algorithm())
                || a.iterations() < ITERATIONS || a.iterations() > 2_000_000
                || Base64.getDecoder().decode(a.salt()).length < 16
                || Base64.getDecoder().decode(a.hash()).length != 32
                || !keys.add(a.platform() + ":" + a.username())) {
                throw new IllegalArgumentException();
            }
            requirePlatform(a.platform());
        }
    }

    private static String randomToken(int bytes) {
        byte[] token = new byte[bytes];
        RANDOM.nextBytes(token);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(token);
    }

    public record Identity(String platform, String username, String displayName, long expiresAt) {}
    // Keep sensitive records out of automatic record toString output.
    public record LoginResult(Identity identity, String token) {
        @Override public String toString() { return "LoginResult[redacted]"; }
    }
    record AccountStore(int version, List<Account> accounts) {
        @Override public String toString() { return "AccountStore[redacted]"; }
    }
    record Account(String platform, String username, String displayName, String algorithm,
                   int iterations, String salt, String hash) {
        @Override public String toString() { return "Account[redacted]"; }
    }
    private record Session(Identity identity) {}

    public static final class AuthException extends RuntimeException {
        private final int status;
        AuthException(int status, String message) { super(message); this.status = status; }
        public int status() { return status; }
    }
}
