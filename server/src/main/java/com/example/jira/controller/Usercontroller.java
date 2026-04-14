package com.example.jira.controller;

import com.example.jira.model.User;
import com.example.jira.repository.UserRepository;
import com.example.jira.service.GoogleTokenVerificationService;
import java.time.Instant;
import java.util.Hashtable;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import javax.naming.NamingEnumeration;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;

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
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+$");
    private static final Pattern DATA_IMAGE_PATTERN =
            Pattern.compile("^data:(image/(png|jpeg|jpg));base64,(.+)$");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private GoogleTokenVerificationService googleTokenVerificationService;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.verification.base-url:http://localhost:3000/verify-email}")
    private String verificationBaseUrl;

    @Value("${app.reset-password.base-url:http://localhost:3000/login?resetToken=}")
    private String resetPasswordBaseUrl;

    @Value("${app.email.require-deliverable-domain:true}")
    private boolean requireDeliverableEmailDomain;

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
        if (!isValidEmailAddress(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Please enter a valid email address"));
        }

        user.setEmail(email);

        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Email already exists"));
        }

        try {
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole(normalizeRole(user.getRole()));
            user.setLastLoginAt(Instant.now());
            User savedUser = userRepository.save(user);
            sendWelcomeEmail(savedUser.getEmail(), savedUser.getName());
            return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
        } catch (Exception exception) {
            logger.error("Failed to sign up user {}", email, exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to create account"));
        }
    }

    @PostMapping("/public-signup")
    public ResponseEntity<?> publicSignup(@RequestBody PublicSignupRequest request) {
        String email = normalizeEmail(request.email());
        String rawPassword = request.password();

        if (isBlank(request.name()) || isBlank(email) || isBlank(rawPassword)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Name, email, and password are required"));
        }
        if (!isValidEmailAddress(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Please enter a valid email address"));
        }
        if (!hasDeliverableEmailDomain(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email domain cannot receive mail. Use a real email address"));
        }
        if (!isMailConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Signup verification email is not configured. Contact admin."));
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Email already exists"));
        }

        try {
            User user = new User();
            user.setName(request.name().trim());
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole("MEMBER");
            user.setGroup(request.group());
            user.setAvatar(request.avatar());
            user.setAuthProvider("LOCAL");
            user.setActive(false);
            user.setEmailVerificationToken(UUID.randomUUID().toString());
            user.setEmailVerificationExpiresAt(Instant.now().plusSeconds(24 * 60 * 60));
            user.setLastLoginAt(null);

            User saved = userRepository.save(user);
            if (!sendVerificationEmail(
                    saved.getEmail(),
                    saved.getEmailVerificationToken(),
                    "Verify your Jira Clone account",
                    "Click this link to verify your account email: ")) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("message", "Unable to send verification email. Please try again later."));
            }
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "requiresEmailVerification", true,
                    "message", "Verification link sent. Please verify your email before logging in."));
        } catch (Exception exception) {
            logger.error("Failed to create public signup account for {}", email, exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to create account"));
        }
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
        if (!isValidEmailAddress(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Please enter a valid email address"));
        }

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }

        if (!user.isActive()) {
            if (!isBlank(user.getEmailVerificationToken())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Please verify your email before logging in"));
            }
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
        User loginRequest = new User();
        loginRequest.setEmail(request.email());
        loginRequest.setPassword(request.password());
        return login(loginRequest);
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        GoogleTokenVerificationService.GoogleUserInfo info =
                googleTokenVerificationService.verifyIdToken(request.idToken());
        String email = normalizeEmail(info.email());
        if (isBlank(email) || !isValidEmailAddress(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Google account email is invalid"));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = new User();
            user.setName(info.name() == null || info.name().isBlank() ? "Google User" : info.name());
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setRole("MEMBER");
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
            if (!isValidEmailAddress(newEmail)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Valid newEmail is required"));
            }
            if (!hasDeliverableEmailDomain(newEmail)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Email domain cannot receive mail. Use a real email address"));
            }
            if (!isMailConfigured()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of("message", "Email verification is not configured. Contact admin."));
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

            if (!sendVerificationEmail(
                    newEmail,
                    token,
                    "Confirm your email change",
                    "Click this link to verify your new email: ")) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("message", "Unable to send verification email. Please try again later."));
            }
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
            user.setActive(true);
            user.setEmailVerificationToken(null);
            user.setEmailVerificationExpiresAt(null);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
        }

        user.setEmail(user.getPendingEmail());
        user.setPendingEmail(null);
        user.setActive(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
    }

    @PostMapping("/request-password-reset")
    public ResponseEntity<?> requestPasswordReset(@RequestBody Map<String, String> payload) {
        String email = normalizeEmail(payload.get("email"));
        if (!isValidEmailAddress(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "A valid email is required"));
        }
        if (!isMailConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Password reset email is not configured. Contact admin."));
        }
        if (!hasDeliverableEmailDomain(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email domain cannot receive mail. Use a real email address"));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(Map.of("message", "If this email exists, a reset link has been sent."));
        }

        String token = UUID.randomUUID().toString();
        user.setPasswordResetToken(token);
        user.setPasswordResetExpiresAt(Instant.now().plusSeconds(60 * 60));
        userRepository.save(user);
        if (!sendPasswordResetEmail(user.getEmail(), token)) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Unable to send reset link. Please try again later."));
        }

        return ResponseEntity.ok(Map.of("message", "If this email exists, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        String newPassword = payload.get("newPassword");

        if (isBlank(token) || isBlank(newPassword)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "token and newPassword are required"));
        }
        if (!STRONG_PASSWORD_PATTERN.matcher(newPassword).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "message",
                            "Password must be 8+ chars and include uppercase, lowercase, number, and special character"));
        }

        User user = userRepository.findByPasswordResetToken(token).orElse(null);
        if (user == null || user.getPasswordResetExpiresAt() == null || user.getPasswordResetExpiresAt().isBefore(Instant.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid or expired password reset token"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiresAt(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password reset successful"));
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
            String avatar) {
    }

    private record PublicLoginRequest(
            String email,
            String password) {
    }

    private record GoogleLoginRequest(
            String idToken) {
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

    private boolean isMailConfigured() {
        return mailEnabled && mailSender != null;
    }

    private boolean isValidEmailAddress(String email) {
        if (isBlank(email)) {
            return false;
        }
        if (email.length() > 254 || !EMAIL_PATTERN.matcher(email).matches()) {
            return false;
        }
        String[] parts = email.split("@", 2);
        if (parts.length != 2) {
            return false;
        }
        String local = parts[0];
        String domain = parts[1];
        if (local.length() > 64 || domain.length() > 253) {
            return false;
        }
        if (local.startsWith(".") || local.endsWith(".") || local.contains("..")) {
            return false;
        }
        if (domain.startsWith(".") || domain.endsWith(".") || domain.contains("..")) {
            return false;
        }
        String[] labels = domain.split("\\.");
        if (labels.length < 2) {
            return false;
        }
        String tld = labels[labels.length - 1];
        if (tld.length() < 2 || tld.length() > 24) {
            return false;
        }
        return tld.chars().allMatch(Character::isLetter);
    }

    private boolean hasDeliverableEmailDomain(String email) {
        if (!requireDeliverableEmailDomain) {
            return true;
        }
        String[] parts = email.split("@", 2);
        if (parts.length != 2) {
            return false;
        }
        return hasMxRecord(parts[1]);
    }

    private boolean hasMxRecord(String domain) {
        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("java.naming.provider.url", "dns:");
            DirContext context = new InitialDirContext(env);
            Attributes attributes = context.getAttributes(domain, new String[] {"MX"});
            Attribute mx = attributes.get("MX");
            if (mx == null || mx.size() == 0) {
                return false;
            }
            NamingEnumeration<?> all = mx.getAll();
            try {
                while (all.hasMore()) {
                    Object value = all.next();
                    if (value != null && !value.toString().isBlank()) {
                        return true;
                    }
                }
            } finally {
                all.close();
            }
            return false;
        } catch (Exception exception) {
            logger.warn("MX lookup failed for domain {}", domain, exception);
            return false;
        }
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "MEMBER";
        }
        return switch (role.trim().toUpperCase(Locale.ROOT)) {
            case "ADMIN", "PROJECT_MANAGER", "MEMBER", "VIEWER" -> role.trim().toUpperCase(Locale.ROOT);
            case "USER" -> "MEMBER";
            default -> "MEMBER";
        };
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

    private boolean sendVerificationEmail(String recipientEmail, String token, String subject, String bodyPrefix) {
        if (!mailEnabled || mailSender == null) {
            logger.info("Mail disabled or sender unavailable; skipped verification email send for {}", recipientEmail);
            return false;
        }
        String link = verificationBaseUrl
                + (verificationBaseUrl.contains("?") ? "&" : "?")
                + "token=" + token;
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(recipientEmail);
            mail.setSubject(subject);
            mail.setText(bodyPrefix + link);
            mailSender.send(mail);
            return true;
        } catch (Exception exception) {
            logger.error("Failed to send verification email to {}", recipientEmail, exception);
            return false;
        }
    }

    private boolean sendPasswordResetEmail(String email, String token) {
        if (!mailEnabled || mailSender == null) {
            logger.info("Mail disabled or sender unavailable; skipped password reset email for {}", email);
            return false;
        }
        String link = resetPasswordBaseUrl
                + (resetPasswordBaseUrl.contains("token=") ? "" : (resetPasswordBaseUrl.contains("?") ? "&token=" : "?token="))
                + token;
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(email);
            mail.setSubject("Reset your password");
            mail.setText("Click this link to reset your password: " + link);
            mailSender.send(mail);
            return true;
        } catch (Exception exception) {
            logger.error("Failed to send password reset email to {}", email, exception);
            return false;
        }
    }

    private void sendWelcomeEmail(String email, String name) {
        if (!mailEnabled || mailSender == null) {
            return;
        }
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(email);
            mail.setSubject("Welcome to Jira Clone");
            mail.setText("Hi " + (name == null ? "there" : name) + ", your account has been created successfully.");
            mailSender.send(mail);
        } catch (Exception exception) {
            logger.error("Failed to send welcome email to {}", email, exception);
        }
    }
}
