package com.example.jira.service;

import com.example.jira.model.Notification;
import com.example.jira.model.User;
import com.example.jira.repository.NotificationRepository;
import com.example.jira.repository.UserRepository;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final RealtimeEventService realtimeEventService;
    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            RealtimeEventService realtimeEventService,
            @Nullable JavaMailSender mailSender) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.realtimeEventService = realtimeEventService;
        this.mailSender = mailSender;
    }

    public Notification createNotification(String userId, String projectId, String issueId, String type, String message, String dedupeKey) {
        if (dedupeKey != null && !dedupeKey.isBlank()) {
            Optional<Notification> existing = notificationRepository.findFirstByUserIdAndDedupeKeyOrderByCreatedAtDesc(userId, dedupeKey);
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setProjectId(projectId);
        notification.setIssueId(issueId);
        notification.setType(type);
        notification.setMessage(message);
        notification.setDedupeKey(dedupeKey);
        Notification saved = notificationRepository.save(notification);

        realtimeEventService.publishProjectEvent(
                projectId,
                "NOTIFICATION_CREATED",
                saved.getId(),
                Map.of("userId", userId, "message", message, "type", type));

        sendEmailIfEnabled(userId, message);
        return saved;
    }

    private void sendEmailIfEnabled(String userId, String message) {
        if (!mailEnabled || mailSender == null) {
            return;
        }
        User user;
        try {
            user = userRepository.findById(new ObjectId(userId)).orElse(null);
        } catch (IllegalArgumentException exception) {
            return;
        }
        if (user == null || user.getEmail() == null || !user.isEmailNotificationsEnabled()) {
            return;
        }

        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setTo(user.getEmail());
        mail.setSubject("Jira Clone Notification");
        mail.setText(message);
        mailSender.send(mail);
    }

    public List<Notification> getByUser(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Notification setRead(String notificationId, boolean read) {
        Notification notification = notificationRepository.findById(new ObjectId(notificationId))
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        notification.setRead(read);
        return notificationRepository.save(notification);
    }

    public long unreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public int markAllRead(String userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        int updated = 0;
        for (Notification notification : notifications) {
            if (!notification.isRead()) {
                notification.setRead(true);
                notificationRepository.save(notification);
                updated++;
            }
        }
        return updated;
    }
}
