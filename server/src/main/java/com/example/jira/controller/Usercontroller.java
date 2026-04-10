package com.example.jira.controller;

import com.example.jira.model.User;
import com.example.jira.repository.UserRepository;
import com.example.jira.service.GoogleTokenVerificationService;
import com.example.jira.service.RecaptchaVerificationService;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/users")
public class Usercontroller {
    private static final Logger logger = LoggerFactory.getLogger(Usercontroller.class);
    private static final int MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
    private static final Set<String> ALLOWED_PROFILE_IMAGE_TYPES = Set.of("image/png", "image/jpeg", "image/jpg");
    private static final Pattern STRONG_PASSWORD_PATTERN =
            Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$");
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final Pattern DATA_IMAGE_PATTERN =
            Pattern.compile("^data:(image/(png|jpeg|jpg));base64,(.+)$");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RecaptchaVerificationService recaptchaVerificationService;

    @Autowired
    private GoogleTokenVerificationService googleTokenVerificationService;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.verification.base-url:http://localhost:3000/verify-email}")
    private String verificationBaseUrl;

    // =========================
    // SIGNUP
    // =========================
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        String email = normalizeEmail(user.getEmail());
        String rawPassword = user.getPassword();

        if (isBlank(email) || isBlank(rawPassword)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email and password are required"));
        }

        user.setEmail(email);

        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Email already exists"));
        }

        try {
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole(user.getRole() == null ? "USER" : user.getRole());
            user.setLastLoginAt(Instant.now());
            User savedUser = userRepository.save(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
        } catch (Exception exception) {
            logger.error("Failed to sign up user {}", email, exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to create account"));
        }
    }

    @PostMapping("/public-signup")
    public ResponseEntity<?> publicSignup(@RequestBody PublicSignupRequest request) {
        recaptchaVerificationService.verifyOrThrow(request.recaptchaToken());

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(request.password());
        user.setRole("USER");
        user.setGroup(request.group());
        user.setAvatar(request.avatar());
        user.setAuthProvider("LOCAL");
        return signup(user);
    }

    // =========================
    // LOGIN
    // =========================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        String email = normalizeEmail(loginRequest.getEmail());
        String rawPassword = loginRequest.getPassword();

        if (isBlank(email) || isBlank(rawPassword)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email and password are required"));
        }

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }

        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Account is deactivated"));
        }

        if (!passwordEncoder.matches(
                rawPassword,
                user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid credentials"));
        }

        user.setLastLoginAt(Instant.now());
        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(savedUser); // later replace with JWT token
    }

    @PostMapping("/public-login")
    public ResponseEntity<?> publicLogin(@RequestBody PublicLoginRequest request) {
        recaptchaVerificationService.verifyOrThrow(request.recaptchaToken());

        User loginRequest = new User();
        loginRequest.setEmail(request.email());
        loginRequest.setPassword(request.password());
        return login(loginRequest);
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        recaptchaVerificationService.verifyOrThrow(request.recaptchaToken());

        GoogleTokenVerificationService.GoogleUserInfo info =
                googleTokenVerificationService.verifyIdToken(request.idToken());
        String email = normalizeEmail(info.email());
        if (isBlank(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Google account email is missing"));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = new User();
            user.setName(info.name() == null || info.name().isBlank() ? "Google User" : info.name());
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setRole("USER");
            user.setAvatar(info.picture());
            user.setAuthProvider("GOOGLE");
            user.setGoogleId(info.sub());
            user.setLastLoginAt(Instant.now());
            return ResponseEntity.ok(userRepository.save(user));
        }

        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Account is deactivated"));
        }
        user.setLastLoginAt(Instant.now());
        if (user.getName() == null || user.getName().isBlank()) {
            user.setName(info.name());
        }
        if (user.getAvatar() == null || user.getAvatar().isBlank()) {
            user.setAvatar(info.picture());
        }
        if (user.getGoogleId() == null || user.getGoogleId().isBlank()) {
            user.setGoogleId(info.sub());
        }
        if (user.getAuthProvider() == null || user.getAuthProvider().isBlank()) {
            user.setAuthProvider("GOOGLE");
        }
        return ResponseEntity.ok(userRepository.save(user));
    }

    // =========================
    // GET USER BY ID
    // =========================
    @GetMapping("/{id}")
    public User getUserById(@PathVariable String id) {

        ObjectId objectId;
        try {
            objectId = new ObjectId(id);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid user id");
        }

        return userRepository.findById(objectId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // =========================
    // EDIT PROFILE
    // =========================
    @PutMapping("/{id}")
    public ResponseEntity<?> editProfile(
            @PathVariable String id,
            @RequestBody User updatedUser) {

        try {
            User user = userRepository.findById(parseObjectId(id))
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (updatedUser.getName() != null) {
                user.setName(updatedUser.getName().trim());
            }
            if (updatedUser.getGroup() != null) {
                user.setGroup(updatedUser.getGroup().trim());
            }
            if (updatedUser.getPhone() != null) {
                user.setPhone(updatedUser.getPhone().trim());
            }
            if (updatedUser.getAvatar() != null) {
                validateAvatarPayload(updatedUser.getAvatar());
                user.setAvatar(updatedUser.getAvatar());
            }
            if (updatedUser.getEmail() != null
                    && !normalizeEmail(updatedUser.getEmail()).equals(user.getEmail())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Use /request-email-change to update email"));
            }
            if (updatedUser.isEmailNotificationsEnabled() != user.isEmailNotificationsEnabled()) {
                user.setEmailNotificationsEnabled(updatedUser.isEmailNotificationsEnabled());
            }

            return ResponseEntity.ok(userRepository.save(user));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAvatar(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file) {
        try {
            User user = userRepository.findById(parseObjectId(id))
                    .orElseThrow(() -> new RuntimeException("User not found"));
            validateAvatarFile(file);
            String base64 = java.util.Base64.getEncoder().encodeToString(file.getBytes());
            user.setAvatar("data:" + file.getContentType() + ";base64," + base64);
            return ResponseEntity.ok(userRepository.save(user));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", exception.getMessage()));
        } catch (Exception exception) {
            logger.error("Failed to upload avatar for user {}", id, exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload profile picture"));
        }
    }

    @PostMapping("/{id}/request-email-change")
    public ResponseEntity<?> requestEmailChange(
            @PathVariable String id,
            @RequestBody Map<String, String> payload) {
        try {
            User user = userRepository.findById(parseObjectId(id))
                    .orElseThrow(() -> new RuntimeException("User not found"));
            String newEmail = normalizeEmail(payload.get("newEmail"));
            if (isBlank(newEmail) || !EMAIL_PATTERN.matcher(newEmail).matches()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Valid newEmail is required"));
            }
            if (newEmail.equals(user.getEmail())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "New email must be different"));
            }
            if (userRepository.findByEmail(newEmail).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Email already exists"));
            }

            String token = UUID.randomUUID().toString();
            user.setPendingEmail(newEmail);
            user.setEmailVerificationToken(token);
            user.setEmailVerificationExpiresAt(Instant.now().plusSeconds(24 * 60 * 60));
            userRepository.save(user);

            sendVerificationEmail(newEmail, token);
            return ResponseEntity.ok(Map.of("message", "Verification link sent to new email"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        if (isBlank(token)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "token is required"));
        }

        User user = userRepository.findByEmailVerificationToken(token).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid verification token"));
        }
        if (user.getEmailVerificationExpiresAt() == null
                || user.getEmailVerificationExpiresAt().isBefore(Instant.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Verification token is expired"));
        }
        if (isBlank(user.getPendingEmail())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "No pending email change found"));
        }

        user.setEmail(user.getPendingEmail());
        user.setPendingEmail(null);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/{id}/change-password")
    public ResponseEntity<?> changePassword(
            @PathVariable String id,
            @RequestBody Map<String, String> payload) {
        try {
            User user = userRepository.findById(parseObjectId(id))
                    .orElseThrow(() -> new RuntimeException("User not found"));
            String currentPassword = payload.get("currentPassword");
            String newPassword = payload.get("newPassword");

            if (isBlank(currentPassword) || isBlank(newPassword)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "currentPassword and newPassword are required"));
            }
            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Current password is incorrect"));
            }
            if (!STRONG_PASSWORD_PATTERN.matcher(newPassword).matches()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                                "message",
                                "Password must be 8+ chars and include uppercase, lowercase, number, and special character"));
            }
            if (passwordEncoder.matches(newPassword, user.getPassword())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "New password must be different from current password"));
            }

            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<?> deactivateAccount(@PathVariable String id) {
        try {
            User user = userRepository.findById(parseObjectId(id))
                    .orElseThrow(() -> new RuntimeException("User not found"));
            user.setActive(false);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Account deactivated"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    @PutMapping("/{id}/preferences/email-notifications")
    public ResponseEntity<?> setEmailPreferences(
            @PathVariable String id,
            @RequestBody Map<String, Boolean> payload) {
        try {
            User user = userRepository.findById(parseObjectId(id))
                    .orElseThrow(() -> new RuntimeException("User not found"));
            Boolean enabled = payload.get("enabled");
            if (enabled == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "enabled is required"));
            }
            user.setEmailNotificationsEnabled(enabled);
            return ResponseEntity.ok(userRepository.save(user));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    private record PublicSignupRequest(
            String name,
            String email,
            String password,
            String group,
            String avatar,
            String recaptchaToken) {
    }

    private record PublicLoginRequest(
            String email,
            String password,
            String recaptchaToken) {
    }

    private record GoogleLoginRequest(
            String idToken,
            String recaptchaToken) {
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private ObjectId parseObjectId(String id) {
        try {
            return new ObjectId(id);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid user id");
        }
    }

    private void validateAvatarPayload(String avatar) {
        if (isBlank(avatar)) {
            throw new IllegalArgumentException("Avatar cannot be blank");
        }
        if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
            return;
        }
        java.util.regex.Matcher matcher = DATA_IMAGE_PATTERN.matcher(avatar);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Unsupported avatar format. Only PNG/JPG/JPEG are allowed");
        }
        try {
            byte[] bytes = java.util.Base64.getDecoder().decode(matcher.group(3));
            if (bytes.length > MAX_PROFILE_IMAGE_BYTES) {
                throw new IllegalArgumentException("Profile image must be 2MB or less");
            }
        } catch (IllegalArgumentException exception) {
            if (exception.getMessage() != null && exception.getMessage().contains("2MB")) {
                throw exception;
            }
            throw new IllegalArgumentException("Invalid avatar image payload");
        }
    }

    private void validateAvatarFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Profile image file is required");
        }
        if (file.getSize() > MAX_PROFILE_IMAGE_BYTES) {
            throw new IllegalArgumentException("Profile image must be 2MB or less");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_PROFILE_IMAGE_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Unsupported profile image type. Use PNG/JPG/JPEG");
        }
    }

    private void sendVerificationEmail(String newEmail, String token) {
        if (!mailEnabled || mailSender == null) {
            logger.info("Mail disabled or sender unavailable; skipped verification email send for {}", newEmail);
            return;
        }
        String link = verificationBaseUrl
                + (verificationBaseUrl.contains("?") ? "&" : "?")
                + "token=" + token;
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(newEmail);
            mail.setSubject("Confirm your email change");
            mail.setText("Click this link to verify your new email: " + link);
            mailSender.send(mail);
        } catch (Exception exception) {
            logger.error("Failed to send verification email to {}", newEmail, exception);
        }
    }
}
