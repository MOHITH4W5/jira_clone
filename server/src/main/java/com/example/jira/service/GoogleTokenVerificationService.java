package com.example.jira.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class GoogleTokenVerificationService {

    public record GoogleUserInfo(String sub, String email, String name, String picture) {
    }

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.google.client-id:}")
    private String configuredClientId;

    public GoogleUserInfo verifyIdToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google idToken is required");
        }
        try {
            String encodedToken = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodedToken))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
            }

            Map<?, ?> payload = objectMapper.readValue(response.body(), Map.class);
            String audience = asString(payload.get("aud"));
            if (configuredClientId != null
                    && !configuredClientId.isBlank()
                    && (audience == null || !configuredClientId.equals(audience))) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token audience mismatch");
            }

            boolean emailVerified = "true".equalsIgnoreCase(asString(payload.get("email_verified")))
                    || Boolean.TRUE.equals(payload.get("email_verified"));
            if (!emailVerified) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google email is not verified");
            }

            String sub = asString(payload.get("sub"));
            String email = asString(payload.get("email"));
            String name = asString(payload.get("name"));
            String picture = asString(payload.get("picture"));

            if (sub == null || sub.isBlank() || email == null || email.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token missing required claims");
            }
            return new GoogleUserInfo(sub, email, name, picture);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Failed to verify Google token");
        }
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
