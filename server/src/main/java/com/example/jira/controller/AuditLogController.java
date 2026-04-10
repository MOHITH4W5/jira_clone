package com.example.jira.controller;

import com.example.jira.model.AuditLog;
import com.example.jira.repository.AuditLogRepository;
import com.example.jira.service.ProjectAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/audit")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final ProjectAccessService projectAccessService;

    public AuditLogController(AuditLogRepository auditLogRepository, ProjectAccessService projectAccessService) {
        this.auditLogRepository = auditLogRepository;
        this.projectAccessService = projectAccessService;
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getProjectHistory(
            @PathVariable String projectId,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        try {
            projectAccessService.assertProjectReadable(projectId, actorUserId);
            List<AuditLog> logs = auditLogRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
            return ResponseEntity.ok(logs);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<?> getEntityHistory(
            @PathVariable String entityType,
            @PathVariable String entityId,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        String normalized = entityType.trim().toUpperCase(Locale.ROOT);
        List<AuditLog> logs = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(normalized, entityId);
        if (!logs.isEmpty() && logs.get(0).getProjectId() != null) {
            try {
                projectAccessService.assertProjectReadable(logs.get(0).getProjectId(), actorUserId);
            } catch (ResponseStatusException exception) {
                return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
            }
        }
        return ResponseEntity.ok(logs);
    }
}
