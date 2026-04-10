package com.example.jira.controller;

import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.WorkLogRepository;
import com.example.jira.service.AttachmentStorageService;
import com.example.jira.service.AuditLogService;
import com.example.jira.service.IssueRuleService;
import com.example.jira.service.NotificationService;
import com.example.jira.service.ProjectAccessService;
import com.example.jira.service.RealtimeEventService;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueRepository issueRepository;
    private final WorkLogRepository workLogRepository;
    private final IssueRuleService issueRuleService;
    private final NotificationService notificationService;
    private final RealtimeEventService realtimeEventService;
    private final AttachmentStorageService attachmentStorageService;
    private final ProjectAccessService projectAccessService;
    private final AuditLogService auditLogService;

    public IssueController(
            IssueRepository issueRepository,
            WorkLogRepository workLogRepository,
            IssueRuleService issueRuleService,
            NotificationService notificationService,
            RealtimeEventService realtimeEventService,
            AttachmentStorageService attachmentStorageService,
            ProjectAccessService projectAccessService,
            AuditLogService auditLogService) {
        this.issueRepository = issueRepository;
        this.workLogRepository = workLogRepository;
        this.issueRuleService = issueRuleService;
        this.notificationService = notificationService;
        this.realtimeEventService = realtimeEventService;
        this.attachmentStorageService = attachmentStorageService;
        this.projectAccessService = projectAccessService;
        this.auditLogService = auditLogService;
    }

    @PostMapping
    public ResponseEntity<?> createIssue(
            @RequestBody Issue issue,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        String actorUserId = firstNonBlank(headerUserId, issue.getReporterId(), issue.getAssigneeId());
        if (actorUserId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        try {
            if (issue.getStatus() == null || issue.getStatus().isBlank()) {
                issue.setStatus("TODO");
            }
            if (issue.getReporterId() == null || issue.getReporterId().isBlank()) {
                issue.setReporterId(actorUserId);
            }

            projectAccessService.assertProjectWritable(issue.getProjectId(), actorUserId);

            issue.setUpdatedAt(Instant.now());
            if (issue.getCreatedAt() == null) {
                issue.setCreatedAt(Instant.now());
            }

            issueRuleService.validateForCreate(issue);
            Issue saved = issueRepository.save(issue);

            realtimeEventService.publishProjectEvent(
                    saved.getProjectId(),
                    "ISSUE_CREATED",
                    saved.getId(),
                    Map.of("status", saved.getStatus(), "title", saved.getTitle()));

            if (saved.getAssigneeId() != null && !saved.getAssigneeId().isBlank()) {
                notificationService.createNotification(
                        saved.getAssigneeId(),
                        saved.getProjectId(),
                        saved.getId(),
                        "TASK_ASSIGNED",
                        "You have been assigned issue " + issueLabel(saved),
                        "ASSIGN|" + saved.getId() + "|" + saved.getAssigneeId());
            }
            auditLogService.log(
                    "ISSUE",
                    saved.getId(),
                    saved.getProjectId(),
                    "CREATED",
                    actorUserId,
                    "Created issue " + issueLabel(saved));
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode())
                    .body(Map.of("message", exception.getReason()));
        } catch (Exception exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to create issue"));
        }
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getIssuesByProject(
            @PathVariable String projectId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        if (headerUserId != null && !headerUserId.isBlank()) {
            try {
                projectAccessService.assertProjectReadable(projectId, headerUserId);
            } catch (ResponseStatusException exception) {
                return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
            }
        }
        return ResponseEntity.ok(issueRepository.findByProjectId(projectId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getIssueById(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        Issue issue = issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Issue not found"));
        if (headerUserId != null && !headerUserId.isBlank()) {
            try {
                projectAccessService.assertProjectReadable(issue.getProjectId(), headerUserId);
            } catch (ResponseStatusException exception) {
                return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
            }
        }
        return ResponseEntity.ok(issue);
    }

    @GetMapping("/{id}/subtasks")
    public ResponseEntity<?> getSubtasks(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        Issue issue = issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Issue not found"));
        if (headerUserId != null && !headerUserId.isBlank()) {
            try {
                projectAccessService.assertProjectReadable(issue.getProjectId(), headerUserId);
            } catch (ResponseStatusException exception) {
                return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
            }
        }
        return ResponseEntity.ok(issueRepository.findByParentIssueId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateIssue(
            @PathVariable String id,
            @RequestBody Issue updated,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        String actorUserId = firstNonBlank(headerUserId, updated.getReporterId(), updated.getAssigneeId());
        if (actorUserId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        Issue current = issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));

        try {
            projectAccessService.assertProjectWritable(current.getProjectId(), actorUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }

        if (updated.getUpdatedAt() != null
                && current.getUpdatedAt() != null
                && updated.getUpdatedAt().isBefore(current.getUpdatedAt())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Issue changed by another user. Refresh and retry."));
        }

        Issue before = copyIssue(current);
        applyPatch(current, updated);

        try {
            issueRuleService.validateForUpdate(before, current);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode())
                    .body(Map.of("message", exception.getReason()));
        }

        current.setUpdatedAt(Instant.now());
        Issue saved = issueRepository.save(current);

        handleNotifications(before, saved);
        realtimeEventService.publishProjectEvent(
                saved.getProjectId(),
                "ISSUE_UPDATED",
                saved.getId(),
                Map.of("status", saved.getStatus(), "assigneeId", String.valueOf(saved.getAssigneeId())));
        auditLogService.log(
                "ISSUE",
                saved.getId(),
                saved.getProjectId(),
                "UPDATED",
                actorUserId,
                "Updated issue " + issueLabel(saved));

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteIssue(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        if (headerUserId == null || headerUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        Issue issue = issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));

        try {
            projectAccessService.assertProjectWritable(issue.getProjectId(), headerUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }

        realtimeEventService.publishProjectEvent(
                issue.getProjectId(),
                "ISSUE_DELETED",
                issue.getId(),
                Map.of("status", issue.getStatus()));
        deleteIssueCascade(issue.getId());
        auditLogService.log(
                "ISSUE",
                issue.getId(),
                issue.getProjectId(),
                "DELETED",
                headerUserId,
                "Deleted issue " + issueLabel(issue));
        return ResponseEntity.noContent().build();
    }

    private void deleteIssueCascade(String issueId) {
        List<Issue> subtasks = issueRepository.findByParentIssueId(issueId);
        for (Issue subtask : subtasks) {
            deleteIssueCascade(subtask.getId());
        }
        attachmentStorageService.deleteByIssueId(issueId);
        workLogRepository.deleteByIssueId(issueId);
        issueRepository.deleteById(new ObjectId(issueId));
    }

    private void handleNotifications(Issue before, Issue after) {
        if (!Objects.equals(before.getAssigneeId(), after.getAssigneeId())
                && after.getAssigneeId() != null
                && !after.getAssigneeId().isBlank()) {
            notificationService.createNotification(
                    after.getAssigneeId(),
                    after.getProjectId(),
                    after.getId(),
                    "TASK_ASSIGNED",
                    "You have been assigned issue " + issueLabel(after),
                    "ASSIGN|" + after.getId() + "|" + after.getAssigneeId());
        }

        if (!Objects.equals(before.getStatus(), after.getStatus())) {
            if (after.getAssigneeId() != null && !after.getAssigneeId().isBlank()) {
                notificationService.createNotification(
                        after.getAssigneeId(),
                        after.getProjectId(),
                        after.getId(),
                        "TASK_STATUS_CHANGED",
                        issueLabel(after) + " moved to " + after.getStatus(),
                        "STATUS|" + after.getId() + "|" + after.getStatus() + "|" + after.getAssigneeId());
            }
            if (after.getReporterId() != null && !after.getReporterId().isBlank()) {
                notificationService.createNotification(
                        after.getReporterId(),
                        after.getProjectId(),
                        after.getId(),
                        "TASK_STATUS_CHANGED",
                        issueLabel(after) + " moved to " + after.getStatus(),
                        "STATUS|" + after.getId() + "|" + after.getStatus() + "|" + after.getReporterId());
            }
        }

        int beforeComments = before.getComments() == null ? 0 : before.getComments().size();
        int afterComments = after.getComments() == null ? 0 : after.getComments().size();
        if (afterComments > beforeComments && after.getAssigneeId() != null && !after.getAssigneeId().isBlank()) {
            notificationService.createNotification(
                    after.getAssigneeId(),
                    after.getProjectId(),
                    after.getId(),
                    "COMMENT_ADDED",
                    "New comment added to " + issueLabel(after),
                    "COMMENT|" + after.getId() + "|" + afterComments + "|" + after.getAssigneeId());
        }

        if ("DONE".equals(after.getStatus()) && !"DONE".equals(before.getStatus())) {
            List<Issue> dependents = issueRepository.findByBlockedByIssueIdsContaining(after.getId());
            for (Issue dependent : dependents) {
                if (dependent.getAssigneeId() == null || dependent.getAssigneeId().isBlank()) {
                    continue;
                }
                notificationService.createNotification(
                        dependent.getAssigneeId(),
                        dependent.getProjectId(),
                        dependent.getId(),
                        "BLOCKING_TASK_COMPLETED",
                        "Blocking issue " + issueLabel(after) + " is completed. You can start " + issueLabel(dependent),
                        "UNBLOCKED|" + dependent.getId() + "|" + after.getId() + "|" + dependent.getAssigneeId());
            }
        }
    }

    private String issueLabel(Issue issue) {
        return issue.getKey() != null && !issue.getKey().isBlank()
                ? issue.getKey()
                : issue.getTitle() != null ? issue.getTitle() : issue.getId();
    }

    private Issue copyIssue(Issue source) {
        Issue copy = new Issue();
        copy.setId(new ObjectId(source.getId()));
        copy.setKey(source.getKey());
        copy.setTitle(source.getTitle());
        copy.setDescription(source.getDescription());
        copy.setType(source.getType());
        copy.setStatus(source.getStatus());
        copy.setPriority(source.getPriority());
        copy.setProjectId(source.getProjectId());
        copy.setSprintId(source.getSprintId());
        copy.setParentIssueId(source.getParentIssueId());
        copy.setBlockedByIssueIds(source.getBlockedByIssueIds());
        copy.setReporterId(source.getReporterId());
        copy.setAssigneeId(source.getAssigneeId());
        copy.setOrder(source.getOrder());
        copy.setComments(source.getComments());
        copy.setCreatedAt(source.getCreatedAt());
        copy.setUpdatedAt(source.getUpdatedAt());
        copy.setDueDate(source.getDueDate());
        return copy;
    }

    private void applyPatch(Issue current, Issue updated) {
        if (updated.getTitle() != null) {
            current.setTitle(updated.getTitle());
        }
        if (updated.getDescription() != null) {
            current.setDescription(updated.getDescription());
        }
        if (updated.getType() != null) {
            current.setType(updated.getType());
        }
        if (updated.getStatus() != null) {
            current.setStatus(updated.getStatus());
        }
        if (updated.getPriority() != null) {
            current.setPriority(updated.getPriority());
        }
        if (updated.getProjectId() != null) {
            current.setProjectId(updated.getProjectId());
        }
        if (updated.getSprintId() != null || current.getSprintId() != null) {
            current.setSprintId(updated.getSprintId());
        }
        if (updated.getParentIssueId() != null) {
            current.setParentIssueId(updated.getParentIssueId().isBlank() ? null : updated.getParentIssueId());
        }
        if (updated.getBlockedByIssueIds() != null) {
            current.setBlockedByIssueIds(updated.getBlockedByIssueIds());
        }
        if (updated.getReporterId() != null) {
            current.setReporterId(updated.getReporterId());
        }
        if (updated.getAssigneeId() != null || current.getAssigneeId() != null) {
            current.setAssigneeId(updated.getAssigneeId());
        }
        current.setOrder(updated.getOrder());
        if (updated.getComments() != null) {
            current.setComments(updated.getComments());
        }
        if (updated.getDueDate() != null || current.getDueDate() != null) {
            current.setDueDate(updated.getDueDate());
        }
        if (updated.getKey() != null) {
            current.setKey(updated.getKey());
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
