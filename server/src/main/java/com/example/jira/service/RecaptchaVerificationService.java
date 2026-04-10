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
import java.util.List;
import java.util.Map;

@Service
public class RecaptchaVerificationService {

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.recaptcha.enabled:false}")
    private boolean recaptchaEnabled;

    @Value("${app.recaptcha.secret-key:}")
    private String recaptchaSecretKey;

    public void verifyOrThrow(String token) {
        if (!recaptchaEnabled) {
            return;
        }
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please complete reCAPTCHA verification");
        }
        if (recaptchaSecretKey == null || recaptchaSecretKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "reCAPTCHA secret key is not configured");
        }

        try {
            String form = "secret=" + URLEncoder.encode(recaptchaSecretKey, StandardCharsets.UTF_8)
                    + "&response=" + URLEncoder.encode(token, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.google.com/recaptcha/api/siteverify"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reCAPTCHA verification failed");
            }

            Map<?, ?> payload = objectMapper.readValue(response.body(), Map.class);
            boolean success = Boolean.TRUE.equals(payload.get("success"));
            if (!success) {
                Object errorCodes = payload.get("error-codes");
                String detail = errorCodes instanceof List<?> list && !list.isEmpty()
                        ? list.toString()
                        : "invalid-captcha";
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reCAPTCHA failed: " + detail);
            }
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to verify reCAPTCHA");
        }
    }
}
