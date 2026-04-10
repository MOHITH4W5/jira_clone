package com.example.jira.service;

import com.example.jira.model.Issue;
import com.example.jira.model.WorkLog;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.WorkLogRepository;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class WorkLogService {

    private final WorkLogRepository workLogRepository;
    private final IssueRepository issueRepository;
    private final ProjectAccessService projectAccessService;
    private final AuditLogService auditLogService;

    public WorkLogService(
            WorkLogRepository workLogRepository,
            IssueRepository issueRepository,
            ProjectAccessService projectAccessService,
            AuditLogService auditLogService) {
        this.workLogRepository = workLogRepository;
        this.issueRepository = issueRepository;
        this.projectAccessService = projectAccessService;
        this.auditLogService = auditLogService;
    }

    public WorkLog create(String issueId, String actorUserId, WorkLog payload) {
        Issue issue = getIssue(issueId);
        assertCanModify(issue, actorUserId);
        validate(payload.getLogDate(), payload.getDurationMinutes());

        WorkLog workLog = new WorkLog();
        workLog.setIssueId(issue.getId());
        workLog.setProjectId(issue.getProjectId());
        workLog.setSprintId(issue.getSprintId());
        workLog.setUserId(actorUserId);
        workLog.setLogDate(payload.getLogDate());
        workLog.setDurationMinutes(payload.getDurationMinutes());
        workLog.setDescription(payload.getDescription());
        return workLogRepository.save(workLog);
    }

    public WorkLog update(String workLogId, String actorUserId, WorkLog payload, boolean confirm) {
        if (!confirm) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confirmation is required to edit time logs");
        }

        WorkLog workLog = getWorkLog(workLogId);
        Issue issue = getIssue(workLog.getIssueId());
        assertCanModify(issue, actorUserId);
        validate(payload.getLogDate(), payload.getDurationMinutes());

        workLog.setLogDate(payload.getLogDate());
        workLog.setDurationMinutes(payload.getDurationMinutes());
        workLog.setDescription(payload.getDescription());
        workLog.setUpdatedAt(Instant.now());
        WorkLog saved = workLogRepository.save(workLog);

        auditLogService.log(
                "WORK_LOG",
                saved.getId(),
                "UPDATED",
                actorUserId,
                "Edited work log for issue " + saved.getIssueId());
        return saved;
    }

    public void delete(String workLogId, String actorUserId, boolean confirm) {
        if (!confirm) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confirmation is required to delete time logs");
        }
        WorkLog workLog = getWorkLog(workLogId);
        Issue issue = getIssue(workLog.getIssueId());
        assertCanModify(issue, actorUserId);
        workLogRepository.deleteById(new ObjectId(workLogId));
        auditLogService.log(
                "WORK_LOG",
                workLogId,
                "DELETED",
                actorUserId,
                "Deleted work log for issue " + workLog.getIssueId());
    }

    public List<WorkLog> getByIssue(String issueId) {
        return workLogRepository.findByIssueId(issueId);
    }

    public int totalByIssue(String issueId) {
        return workLogRepository.findByIssueId(issueId)
                .stream()
                .mapToInt(WorkLog::getDurationMinutes)
                .sum();
    }

    public int totalBySprint(String sprintId) {
        return workLogRepository.findBySprintId(sprintId)
                .stream()
                .mapToInt(WorkLog::getDurationMinutes)
                .sum();
    }

    private void assertCanModify(Issue issue, String actorUserId) {
        boolean assignee = actorUserId != null && actorUserId.equals(issue.getAssigneeId());
        boolean manager = projectAccessService.isProjectManager(issue.getProjectId(), actorUserId);
        if (!assignee && !manager) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only assignee or project manager can modify time logs");
        }
    }

    private void validate(LocalDate date, int durationMinutes) {
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "logDate is required");
        }
        if (durationMinutes <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "durationMinutes must be positive");
        }
        if (date.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Future work log dates are not allowed");
        }
    }

    private Issue getIssue(String issueId) {
        return issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));
    }

    private WorkLog getWorkLog(String workLogId) {
        return workLogRepository.findById(new ObjectId(workLogId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work log not found"));
    }
}
