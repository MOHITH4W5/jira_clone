package com.example.jira.controller;

import com.example.jira.model.WorkLog;
import com.example.jira.service.WorkLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api")
public class WorkLogController {

    private final WorkLogService workLogService;

    public WorkLogController(WorkLogService workLogService) {
        this.workLogService = workLogService;
    }

    @PostMapping("/issues/{issueId}/worklogs")
    public ResponseEntity<?> createWorkLog(
            @PathVariable String issueId,
            @RequestBody WorkLog payload,
            @RequestParam(value = "actorUserId", required = false) String actorUserId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String resolvedActor = resolveActorUserId(actorUserId, headerUserId, payload.getUserId());
            WorkLog saved = workLogService.create(issueId, resolvedActor, payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
    }

    @GetMapping("/issues/{issueId}/worklogs")
    public List<WorkLog> getIssueWorkLogs(@PathVariable String issueId) {
        return workLogService.getByIssue(issueId);
    }

    @GetMapping("/issues/{issueId}/worklogs/total")
    public Map<String, Integer> getIssueWorkLogTotal(@PathVariable String issueId) {
        return Map.of("totalMinutes", workLogService.totalByIssue(issueId));
    }

    @GetMapping("/sprints/{sprintId}/worklogs/total")
    public Map<String, Integer> getSprintWorkLogTotal(@PathVariable String sprintId) {
        return Map.of("totalMinutes", workLogService.totalBySprint(sprintId));
    }

    @PutMapping("/worklogs/{workLogId}")
    public ResponseEntity<?> updateWorkLog(
            @PathVariable String workLogId,
            @RequestBody WorkLog payload,
            @RequestParam(value = "confirm", defaultValue = "false") boolean confirm,
            @RequestParam(value = "actorUserId", required = false) String actorUserId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String resolvedActor = resolveActorUserId(actorUserId, headerUserId, payload.getUserId());
            WorkLog updated = workLogService.update(workLogId, resolvedActor, payload, confirm);
            return ResponseEntity.ok(updated);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
    }

    @DeleteMapping("/worklogs/{workLogId}")
    public ResponseEntity<?> deleteWorkLog(
            @PathVariable String workLogId,
            @RequestParam(value = "confirm", defaultValue = "false") boolean confirm,
            @RequestParam(value = "actorUserId", required = false) String actorUserId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String resolvedActor = resolveActorUserId(actorUserId, headerUserId, null);
            workLogService.delete(workLogId, resolvedActor, confirm);
            return ResponseEntity.noContent().build();
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
    }

    private String resolveActorUserId(String actorUserId, String headerUserId, String fallbackUserId) {
        String resolved = firstNonBlank(actorUserId, headerUserId, fallbackUserId);
        if (resolved == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "actorUserId is required");
        }
        return resolved;
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
