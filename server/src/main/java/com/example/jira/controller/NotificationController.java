package com.example.jira.controller;

import com.example.jira.model.Notification;
import com.example.jira.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/user/{userId}")
    public List<Notification> getUserNotifications(@PathVariable String userId) {
        return notificationService.getByUser(userId);
    }

    @GetMapping("/user/{userId}/unread-count")
    public Map<String, Long> getUnreadCount(@PathVariable String userId) {
        return Map.of("unreadCount", notificationService.unreadCount(userId));
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> setReadState(
            @PathVariable String notificationId,
            @RequestParam(value = "read", defaultValue = "true") boolean read) {
        try {
            Notification notification = notificationService.setRead(notificationId, read);
            return ResponseEntity.ok(notification);
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    @PutMapping("/user/{userId}/read-all")
    public Map<String, Integer> markAllRead(@PathVariable String userId) {
        return Map.of("updated", notificationService.markAllRead(userId));
    }
}
