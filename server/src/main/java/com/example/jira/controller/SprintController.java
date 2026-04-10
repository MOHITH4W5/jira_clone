package com.example.jira.controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import com.example.jira.model.Issue;
import com.example.jira.model.Project;
import com.example.jira.model.Sprint;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.SprintRepository;
import com.example.jira.service.AuditLogService;
import com.example.jira.service.NotificationService;
import com.example.jira.service.ProjectAccessService;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;
    private final Projectrepository projectrepository;
    private final NotificationService notificationService;
    private final ProjectAccessService projectAccessService;
    private final AuditLogService auditLogService;

    public SprintController(
            SprintRepository sprintRepository,
            IssueRepository issueRepository,
            Projectrepository projectrepository,
            NotificationService notificationService,
            ProjectAccessService projectAccessService,
            AuditLogService auditLogService) {
        this.sprintRepository = sprintRepository;
        this.issueRepository = issueRepository;
        this.projectrepository = projectrepository;
        this.notificationService = notificationService;
        this.projectAccessService = projectAccessService;
        this.auditLogService = auditLogService;
    }

    // =========================
    // CREATE SPRINT
    // =========================
    @PostMapping
    public ResponseEntity<?> createSprint(
            @RequestBody Sprint sprint,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        try {
            projectAccessService.assertProjectManager(sprint.getProjectId(), actorUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
        sprint.setStatus("PLANNED");
        Sprint saved = sprintRepository.save(sprint);
        auditLogService.log(
                "SPRINT",
                saved.getId(),
                saved.getProjectId(),
                "CREATED",
                actorUserId,
                "Created sprint " + saved.getName());
        return ResponseEntity.status(201).body(saved);
    }

    // =========================
    // GET SPRINTS BY PROJECT
    // =========================
    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getSprintsByProject(
            @PathVariable String projectId,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId != null && !actorUserId.isBlank()) {
            try {
                projectAccessService.assertProjectReadable(projectId, actorUserId);
            } catch (ResponseStatusException exception) {
                return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
            }
        }
        return ResponseEntity.ok(sprintRepository.findByProjectId(projectId));
    }

    // =========================
    // START SPRINT
    // =========================
    @PutMapping("/{id}/start")
    public ResponseEntity<?> startSprint(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));
        try {
            projectAccessService.assertProjectManager(sprint.getProjectId(), actorUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }

        sprint.setStatus("ACTIVE");
        sprint.setStartDate(Instant.now());

        Sprint saved = sprintRepository.save(sprint);
        notifySprintMembers(saved, "SPRINT_STARTED", "Sprint started: " + saved.getName());
        auditLogService.log(
                "SPRINT",
                saved.getId(),
                saved.getProjectId(),
                "STARTED",
                actorUserId,
                "Started sprint " + saved.getName());
        return ResponseEntity.ok(saved);
    }

    // =========================
    // COMPLETE SPRINT
    // =========================
    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completeSprint(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));
        try {
            projectAccessService.assertProjectManager(sprint.getProjectId(), actorUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }

        sprint.setStatus("COMPLETED");
        sprint.setEndDate(Instant.now());

        Sprint saved = sprintRepository.save(sprint);
        notifySprintMembers(saved, "SPRINT_ENDED", "Sprint completed: " + saved.getName());
        auditLogService.log(
                "SPRINT",
                saved.getId(),
                saved.getProjectId(),
                "COMPLETED",
                actorUserId,
                "Completed sprint " + saved.getName());
        return ResponseEntity.ok(saved);
    }

    // =========================
    // UPDATE SPRINT DETAILS
    // =========================
    @PutMapping("/{id}")
    public ResponseEntity<?> updateSprint(
            @PathVariable String id,
            @RequestBody Sprint updated,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));
        try {
            projectAccessService.assertProjectManager(sprint.getProjectId(), actorUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }

        sprint.setName(updated.getName());
        sprint.setGoal(updated.getGoal());
        sprint.setStartDate(updated.getStartDate());
        sprint.setEndDate(updated.getEndDate());

        Sprint saved = sprintRepository.save(sprint);
        auditLogService.log(
                "SPRINT",
                saved.getId(),
                saved.getProjectId(),
                "UPDATED",
                actorUserId,
                "Updated sprint " + saved.getName());
        return ResponseEntity.ok(saved);
    }

    // =========================
    // DELETE SPRINT
    // =========================
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSprint(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));
        try {
            projectAccessService.assertProjectManager(sprint.getProjectId(), actorUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
        sprintRepository.deleteById(new ObjectId(id));
        auditLogService.log(
                "SPRINT",
                id,
                sprint.getProjectId(),
                "DELETED",
                actorUserId,
                "Deleted sprint " + sprint.getName());
        return ResponseEntity.noContent().build();
    }

    // =========================
    // ASSIGN ISSUE TO SPRINT
    // =========================
    @PutMapping("/{sprintId}/issues/{issueId}")
    public ResponseEntity<?> addIssueToSprint(
            @PathVariable String sprintId,
            @PathVariable String issueId,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }

        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new RuntimeException("Issue not found"));
        try {
            projectAccessService.assertProjectWritable(issue.getProjectId(), actorUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }

        issue.setUpdatedAt(Instant.now());
        issue.setSprintId(sprintId);

        Issue saved = issueRepository.save(issue);
        auditLogService.log(
                "ISSUE",
                saved.getId(),
                saved.getProjectId(),
                "SPRINT_ASSIGNED",
                actorUserId,
                "Assigned issue to sprint " + sprintId);
        return ResponseEntity.ok(saved);
    }

    private void notifySprintMembers(Sprint sprint, String type, String message) {
        if (sprint.getProjectId() == null || sprint.getProjectId().isBlank()) {
            return;
        }
        Project project;
        try {
            project = projectrepository.findById(new ObjectId(sprint.getProjectId())).orElse(null);
        } catch (IllegalArgumentException exception) {
            return;
        }
        if (project == null || project.getMemberIds() == null) {
            return;
        }

        for (String memberId : project.getMemberIds()) {
            if (memberId == null || memberId.isBlank()) {
                continue;
            }
            notificationService.createNotification(
                    memberId,
                    sprint.getProjectId(),
                    null,
                    type,
                    message,
                    type + "|" + sprint.getId() + "|" + memberId);
        }
    }
}
