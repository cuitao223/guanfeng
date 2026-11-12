package com.leice.radar.demo.generation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.Semaphore;
import java.util.function.Consumer;

/** Configurable Chat Completions transport; credentials exist only during a request. */
public final class DeepSeekClient {
    private final ObjectMapper mapper;
    private final Path keyFile;
    private static final String DEFAULT_ENDPOINT = "https://api.deepseek.com/chat/completions";
    private final URI endpoint;
    private final boolean responseFormat;
    private final boolean thinking;
    private final Semaphore limit = new Semaphore(2, true);
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).followRedirects(HttpClient.Redirect.NEVER).build();
    public DeepSeekClient(ObjectMapper mapper, Path root) {
        this(mapper, root, System.getenv());
    }
    // Explicit configuration keeps protocol tests independent of real credentials and environment.
    DeepSeekClient(ObjectMapper mapper, Path root, Map<String,String> environment) {
        this.mapper = mapper;
        this.endpoint = validateEndpoint(environment.get("GUANFENG_MODEL_ENDPOINT"));
        this.responseFormat = !"false".equalsIgnoreCase(environment.get("GUANFENG_MODEL_RESPONSE_FORMAT"));
        this.thinking = "true".equalsIgnoreCase(environment.get("GUANFENG_THINKING"));
        String configured = environment.get("GUANFENG_KEY_FILE");
        this.keyFile = configured == null || configured.isBlank() ? root.resolve("config/model-api.key") : Path.of(configured).toAbsolutePath();
    }
    public boolean configured() { return Files.isRegularFile(keyFile); }
    public String generate(String model, String role, String system, String prompt, int maxTokens,
                           Consumer<Map<String,Object>> observer) throws Exception {
        limit.acquire();
        Map<String,Object> call = new LinkedHashMap<>();
        call.put("role", role); call.put("model",model); call.put("startedAt", Instant.now().toString());
        call.put("maxTokens", maxTokens);
        try {
            String key = Files.readString(keyFile, StandardCharsets.UTF_8).replace("\uFEFF", "").trim();
            if (!key.matches("[A-Za-z0-9_-]{16,512}")) throw new IllegalStateException("Model key file does not contain a single token");
            HttpRequest request = request(model, system, prompt, maxTokens, key);
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            call.put("httpStatus",response.statusCode());
            if(response.statusCode()!=200) throw new IllegalStateException("Model request failed with HTTP " + response.statusCode());
            if(response.body().length()>1_000_000) throw new IllegalStateException("Model response exceeds limit");
            JsonNode json = mapper.readTree(response.body());
            if(json.has("usage")) call.put("usage",mapper.convertValue(json.get("usage"),Map.class));
            call.put("providerId",json.path("id").asText());
            String finish=json.path("choices").path(0).path("finish_reason").asText();
            call.put("finishReason",finish);
            if("length".equals(finish)) throw new IllegalStateException("Model response reached the configured token limit; incomplete JSON was not accepted");
            String content=json.path("choices").path(0).path("message").path("content").asText();
            if(content.isBlank()) throw new IllegalStateException("Model returned no source content");
            call.put("status","succeeded");
            return content;
        } catch(Exception e) {
            call.put("status","failed");
            call.put("error", safeError(e));
            throw new IllegalStateException(safeError(e));
        } finally {
            call.put("finishedAt",Instant.now().toString());
            try { observer.accept(call); } finally { limit.release(); }
        }
    }
    private static URI validateEndpoint(String value) {
        try {
            URI uri = URI.create(value == null || value.isBlank() ? DEFAULT_ENDPOINT : value);
            String host = uri.getHost();
            boolean local = host != null && Set.of("localhost", "127.0.0.1", "[::1]").contains(host.toLowerCase(Locale.ROOT));
            boolean scheme = "https".equalsIgnoreCase(uri.getScheme()) || ("http".equalsIgnoreCase(uri.getScheme()) && local);
            if (!scheme || host == null || uri.getRawUserInfo() != null || uri.getRawQuery() != null
                    || uri.getRawFragment() != null || uri.getPort() == 0 || uri.getPort() > 65535
                    || uri.getPath() == null || !uri.getPath().endsWith("/chat/completions")) {
                throw new IllegalArgumentException();
            }
            return uri;
        } catch (IllegalArgumentException e) {
            // Never retain the rejected URL or its parsing exception as a cause.
            throw new IllegalArgumentException("Model endpoint configuration is invalid");
        }
    }
    HttpRequest request(String model, String system, String prompt, int maxTokens, String key) throws Exception {
        Map<String,Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(Map.of("role", "system", "content", system), Map.of("role", "user", "content", prompt)));
        body.put("stream", false);
        body.put("max_tokens", maxTokens);
        if (responseFormat) body.put("response_format", Map.of("type", "json_object"));
        // This extension belongs to DeepSeek, not to the Chat Completions contract.
        if ("https".equalsIgnoreCase(endpoint.getScheme()) && "api.deepseek.com".equalsIgnoreCase(endpoint.getHost())
                && (endpoint.getPort() == -1 || endpoint.getPort() == 443)) {
            body.put("thinking", Map.of("type", thinking ? "enabled" : "disabled"));
        }
        return HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(150))
            .header("Content-Type", "application/json").header("Authorization", "Bearer " + key)
            .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body), StandardCharsets.UTF_8)).build();
    }
    static String safeError(Throwable e) {
        if(e instanceof HttpTimeoutException) return "Model request timed out";
        if(e instanceof java.io.IOException) return "Model connection or key-file read failed";
        if(e instanceof InterruptedException) {Thread.currentThread().interrupt();return "Model request interrupted";}
        String text=e.getMessage();
        if(text!=null && (Set.of("Model key file does not contain a single token", "Model response exceeds limit",
                "Model response reached the configured token limit; incomplete JSON was not accepted",
                "Model returned no source content").contains(text) || text.matches("Model request failed with HTTP [1-5][0-9]{2}"))) return text;
        return "Generation operation failed ("+e.getClass().getSimpleName()+")";
    }
}
