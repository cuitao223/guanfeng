package com.leice.radar.demo.generation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.net.InetSocketAddress;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

class ModelApiClientTest {
    @TempDir Path root;
    private final ObjectMapper mapper = new ObjectMapper();
    private static final String SYSTEM = "Return a JSON object containing source files.";
    private static final String PROMPT = "Build a wind profile page with provenance.";

    private Map<String,String> configuration(String endpoint) throws Exception {
        Path key = root.resolve("synthetic-key.txt");
        Files.writeString(key, "\uFEFFsynthetic_" + UUID.randomUUID(), StandardCharsets.UTF_8);
        Map<String,String> env = new HashMap<>();
        env.put("GUANFENG_KEY_FILE", key.toString());
        if (endpoint != null) env.put("GUANFENG_MODEL_ENDPOINT", endpoint);
        return env;
    }
    private JsonNode body(HttpRequest request) throws Exception {
        var subscriber = HttpResponse.BodySubscribers.ofString(StandardCharsets.UTF_8);
        request.bodyPublisher().orElseThrow().subscribe(new java.util.concurrent.Flow.Subscriber<java.nio.ByteBuffer>() {
            public void onSubscribe(java.util.concurrent.Flow.Subscription subscription) { subscriber.onSubscribe(subscription); }
            public void onNext(java.nio.ByteBuffer buffer) { subscriber.onNext(List.of(buffer)); }
            public void onError(Throwable error) { subscriber.onError(error); }
            public void onComplete() { subscriber.onComplete(); }
        });
        return mapper.readTree(subscriber.getBody().toCompletableFuture().get());
    }
    private HttpServer server(int status, String response, AtomicReference<JsonNode> payload,
                              AtomicReference<String> authorization) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            payload.set(mapper.readTree(exchange.getRequestBody()));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            if (!"POST".equals(exchange.getRequestMethod()) || !"application/json".equals(exchange.getRequestHeaders().getFirst("Content-Type"))) {
                exchange.sendResponseHeaders(400, -1);
            } else {
                byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(status, bytes.length);
                exchange.getResponseBody().write(bytes);
            }
            exchange.close();
        });
        server.start();
        return server;
    }
    private String endpoint(HttpServer server) {
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/v1/chat/completions";
    }
    private String completion(String content, String finish) throws Exception {
        return mapper.writeValueAsString(Map.of("id", "synthetic-call", "usage", Map.of("total_tokens", 12),
            "choices", List.of(Map.of("finish_reason", finish, "message", Map.of("content", content)))));
    }

    @ParameterizedTest @ValueSource(booleans = {true, false})
    void customEndpointSendsRealHttpPayloadWithoutThinking(boolean responseFormat) throws Exception {
        var payload = new AtomicReference<JsonNode>();
        var authorization = new AtomicReference<String>();
        String source = "{\"app\":\"synthetic source\"}";
        HttpServer server = server(200, completion(source, "stop"), payload, authorization);
        try {
            Map<String,String> env = configuration(endpoint(server));
            env.put("GUANFENG_MODEL_RESPONSE_FORMAT", String.valueOf(responseFormat));
            env.put("GUANFENG_THINKING", "true");
            var client = new DeepSeekClient(mapper, root, env);
            var audit = new AtomicReference<Map<String,Object>>();
            assertTrue(client.configured());
            assertEquals(source, client.generate("provider/model-v1:free", "ui", SYSTEM, PROMPT, 321, audit::set));
            JsonNode sent = payload.get();
            assertEquals("provider/model-v1:free", sent.path("model").asText());
            assertEquals(mapper.valueToTree(List.of(Map.of("role", "system", "content", SYSTEM),
                Map.of("role", "user", "content", PROMPT))), sent.path("messages"));
            assertEquals(321, sent.path("max_tokens").asInt());
            assertFalse(sent.path("stream").asBoolean());
            assertFalse(sent.has("thinking"));
            assertEquals(responseFormat, sent.has("response_format"));
            if (responseFormat) assertEquals("json_object", sent.path("response_format").path("type").asText());
            assertEquals("Bearer " + Files.readString(Path.of(env.get("GUANFENG_KEY_FILE"))).replace("\uFEFF", ""), authorization.get());
            assertEquals("succeeded", audit.get().get("status"));
            assertEquals(200, audit.get().get("httpStatus"));
            assertEquals("synthetic-call", audit.get().get("providerId"));
            assertEquals(12, ((Map<?,?>)audit.get().get("usage")).get("total_tokens"));
            assertFalse(audit.get().toString().contains("synthetic_"));
        } finally { server.stop(0); }
    }

    @Test void oldDefaultsAndExplicitDeepSeekThinkingArePreservedWithoutNetwork() throws Exception {
        Map<String,String> env = configuration(null);
        var request = new DeepSeekClient(mapper, root, env).request("deepseek-flash", SYSTEM, PROMPT, 100, "synthetic-only-token");
        assertEquals("https://api.deepseek.com/chat/completions", request.uri().toString());
        assertEquals("disabled", body(request).path("thinking").path("type").asText());
        assertEquals("json_object", body(request).path("response_format").path("type").asText());
        assertFalse(body(request).path("stream").asBoolean());
        env.put("GUANFENG_THINKING", "true");
        assertEquals("enabled", body(new DeepSeekClient(mapper, root, env).request("deepseek-flash", SYSTEM, PROMPT, 100, "synthetic-only-token")).path("thinking").path("type").asText());
        // Legacy fallback path is inspected only; no key file is opened.
        assertFalse(new DeepSeekClient(mapper, root.resolve("isolated-child"), Map.of()).configured());
    }

    @ParameterizedTest @ValueSource(strings = {
        "http://remote.example/v1/chat/completions", "http://127.0.0.2/chat/completions",
        "http://localhost.evil.example/chat/completions", "https://user:synthetic-password@example.org/chat/completions",
        "https://example.org/chat/completions?key=synthetic-secret", "https://example.org/chat/completions?",
        "https://example.org/chat/completions#synthetic-secret", "https://example.org/chat/completions#",
        "ftp://example.org/chat/completions", "/chat/completions", "https://example.org/v1",
        "https://example.org:0/chat/completions", "https://example.org:99999/chat/completions",
        "https://bad host/chat/completions", "https://api.deepseek.com@evil.example/chat/completions"
    })
    void rejectsUnsafeOrIncompleteUrlsWithoutLeakingInput(String endpoint) throws Exception {
        var env = configuration(endpoint);
        var error = assertThrows(IllegalArgumentException.class, () -> new DeepSeekClient(mapper, root, env));
        assertEquals("Model endpoint configuration is invalid", error.getMessage());
        assertNull(error.getCause());
    }

    @ParameterizedTest @ValueSource(strings = {
        "https://provider.example/v1/chat/completions", "http://localhost:1234/chat/completions",
        "http://[::1]:1234/v1/chat/completions", "https://api.deepseek.com.evil.example/chat/completions"
    })
    void acceptsSupportedUrlsWithoutSendingDeepSeekExtension(String endpoint) throws Exception {
        var client = new DeepSeekClient(mapper, root, configuration(endpoint));
        var request = client.request("provider/model", SYSTEM, PROMPT, 10, "synthetic-only-token");
        assertEquals(endpoint, request.uri().toString());
        assertFalse(body(request).has("thinking"));
    }

    @Test void httpFailuresDoNotExposeProviderBodyOrCredentials() throws Exception {
        var payload = new AtomicReference<JsonNode>();
        var authorization = new AtomicReference<String>();
        HttpServer server = server(401, "https://sensitive.example/?key=synthetic-secret Bearer synthetic-private-token", payload, authorization);
        try {
            var audit = new AtomicReference<Map<String,Object>>();
            var client = new DeepSeekClient(mapper, root, configuration(endpoint(server)));
            var error = assertThrows(IllegalStateException.class, () -> client.generate("provider/model", "ui", SYSTEM, PROMPT, 30, audit::set));
            assertEquals("Model request failed with HTTP 401", error.getMessage());
            assertEquals(error.getMessage(), audit.get().get("error"));
            assertEquals("failed", audit.get().get("status"));
            assertNull(error.getCause());
            assertFalse(audit.get().toString().contains("synthetic-"));
            assertFalse(audit.get().toString().contains("http://"));
        } finally { server.stop(0); }
    }

    @Test void malformedJsonFailureDoesNotExposeResponse() throws Exception {
        HttpServer server = server(200, "https://sensitive.example/?key=synthetic-secret", new AtomicReference<>(), new AtomicReference<>());
        try {
            var audit = new AtomicReference<Map<String,Object>>();
            var client = new DeepSeekClient(mapper, root, configuration(endpoint(server)));
            var error = assertThrows(IllegalStateException.class, () -> client.generate("provider/model", "ui", SYSTEM, PROMPT, 30, audit::set));
            assertEquals("Model connection or key-file read failed", error.getMessage());
            assertNull(error.getCause());
            assertFalse(audit.get().toString().contains("sensitive"));
        } finally { server.stop(0); }
    }

    @ParameterizedTest @ValueSource(strings = {"length", "empty"})
    void incompleteOrMissingSourceIsRejected(String failure) throws Exception {
        String response = "empty".equals(failure) ? completion("", "stop") : completion("{}", "length");
        HttpServer server = server(200, response, new AtomicReference<>(), new AtomicReference<>());
        try {
            var audit = new AtomicReference<Map<String,Object>>();
            var client = new DeepSeekClient(mapper, root, configuration(endpoint(server)));
            assertThrows(IllegalStateException.class, () -> client.generate("provider/model", "ui", SYSTEM, PROMPT, 30, audit::set));
            assertEquals("failed", audit.get().get("status"));
        } finally { server.stop(0); }
    }

    @Test void redirectIsNotFollowedWithAuthorization() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var leaked = new AtomicReference<String>();
        server.createContext("/v1/chat/completions", exchange -> {
            exchange.getResponseHeaders().set("Location", endpoint(server).replace("/v1/", "/other/"));
            exchange.sendResponseHeaders(307, -1); exchange.close();
        });
        server.createContext("/other/chat/completions", exchange -> {
            leaked.set(exchange.getRequestHeaders().getFirst("Authorization"));
            exchange.sendResponseHeaders(200, -1); exchange.close();
        });
        server.start();
        try {
            var client = new DeepSeekClient(mapper, root, configuration(endpoint(server)));
            var error = assertThrows(IllegalStateException.class, () -> client.generate("provider/model", "ui", SYSTEM, PROMPT, 30, call -> {}));
            assertEquals("Model request failed with HTTP 307", error.getMessage());
            assertNull(leaked.get());
        } finally { server.stop(0); }
    }

    @ParameterizedTest @ValueSource(strings = {"Model ", "Validation ", "Generated "})
    void unsafeExceptionMessagesAreNotPassedThrough(String prefix) {
        assertEquals("Generation operation failed (IllegalArgumentException)", DeepSeekClient.safeError(new IllegalArgumentException(prefix + "https://sensitive.example/?key=private-token")));
    }

    @Test void invalidSyntheticKeyIsRejectedBeforeSendingAnyHttp() throws Exception {
        var payload = new AtomicReference<JsonNode>();
        HttpServer server = server(200, completion("{}", "stop"), payload, new AtomicReference<>());
        try {
            Map<String,String> env = configuration(endpoint(server));
            Files.writeString(Path.of(env.get("GUANFENG_KEY_FILE")), "synthetic invalid token");
            var client = new DeepSeekClient(mapper, root, env);
            var audit = new AtomicReference<Map<String,Object>>();
            var error = assertThrows(IllegalStateException.class, () -> client.generate("provider/model", "ui", SYSTEM, PROMPT, 30, audit::set));
            assertEquals("Model key file does not contain a single token", error.getMessage());
            assertFalse(audit.get().toString().contains("synthetic invalid"));
            assertNull(payload.get());
        } finally { server.stop(0); }
    }

    @Test void modelValidationAcceptsNamespacedIdsAndRejectsInvalidInput() {
        for (String model : List.of("deepseek-flash", "provider/model-v1:free", "org/team/model_2.0")) assertTrue(GenerationService.validModelName(model));
        for (String model : List.of("", "provider/model with space", "provider/model\n", "x".repeat(101), "provider/model?key=x")) assertFalse(GenerationService.validModelName(model));
        assertFalse(GenerationService.validModelName(null));
    }
}
