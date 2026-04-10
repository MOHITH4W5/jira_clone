package com.example.jira.service;

import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class IssueRuleService {

    private final IssueRepository issueRepository;

    public IssueRuleService(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    public void validateForCreate(Issue issue) {
        enforceParentRules(issue, null);
        enforceDependencyRules(issue, null);
        enforceCreateStatusRules(issue);
    }

    public void validateForUpdate(Issue existing, Issue updated) {
        enforceExistingSubtaskIntegrity(existing, updated);
        enforceParentRules(updated, existing.getId());
        enforceDependencyRules(updated, existing.getId());
        enforceStatusRules(existing, updated);
    }

    private void enforceParentRules(Issue issue, String currentIssueId) {
        if ("SUBTASK".equalsIgnoreCase(issue.getType())
                && (issue.getParentIssueId() == null || issue.getParentIssueId().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subtask cannot exist without a parent task");
        }

        if (issue.getParentIssueId() == null || issue.getParentIssueId().isBlank()) {
            return;
        }

        if (!"SUBTASK".equalsIgnoreCase(issue.getType())) {
            issue.setType("SUBTASK");
        }

        if (currentIssueId != null && currentIssueId.equals(issue.getParentIssueId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Issue cannot be parent of itself");
        }

        Issue parent = getIssueByStringId(issue.getParentIssueId());
        issue.setProjectId(parent.getProjectId());
        issue.setSprintId(parent.getSprintId());
    }

    private void enforceDependencyRules(Issue issue, String currentIssueId) {
        List<String> blockedBy = issue.getBlockedByIssueIds();
        if (blockedBy == null) {
            return;
        }

        Set<String> unique = new HashSet<>();
        for (String blockedByIssueId : blockedBy) {
            if (blockedByIssueId == null || blockedByIssueId.isBlank()) {
                continue;
            }
            if (currentIssueId != null && currentIssueId.equals(blockedByIssueId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Issue cannot depend on itself");
            }
            Issue blockedByIssue = getIssueByStringId(blockedByIssueId);
            if (issue.getProjectId() != null
                    && blockedByIssue.getProjectId() != null
                    && !issue.getProjectId().equals(blockedByIssue.getProjectId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Dependencies must be within the same project");
            }
            if (!unique.add(blockedByIssueId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duplicate dependencies are not allowed");
            }
            if (currentIssueId != null && hasPath(blockedByIssueId, currentIssueId, new HashSet<>())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Circular dependency detected");
            }
        }
    }

    private void enforceStatusRules(Issue existing, Issue updated) {
        String nextStatus = updated.getStatus() == null ? existing.getStatus() : updated.getStatus();
        if ("IN_PROGRESS".equals(nextStatus) || "DONE".equals(nextStatus)) {
            ensureDependenciesDone(updated.getBlockedByIssueIds(), "Task cannot start until blocking tasks are done");
        }

        if ("DONE".equals(nextStatus) && issueRepository.existsByParentIssueId(existing.getId())) {
            List<Issue> subtasks = issueRepository.findByParentIssueId(existing.getId());
            boolean allDone = subtasks.stream().allMatch(subtask -> "DONE".equals(subtask.getStatus()));
            if (!allDone) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Parent task cannot be marked as Done until all subtasks are completed");
            }
        }
    }

    private void enforceCreateStatusRules(Issue issue) {
        String status = issue.getStatus();
        if (!"IN_PROGRESS".equals(status) && !"DONE".equals(status)) {
            return;
        }
        ensureDependenciesDone(issue.getBlockedByIssueIds(), "Task cannot start until blocking tasks are done");
    }

    private void enforceExistingSubtaskIntegrity(Issue existing, Issue updated) {
        if (existing.getParentIssueId() == null || existing.getParentIssueId().isBlank()) {
            return;
        }
        if (updated.getParentIssueId() == null || updated.getParentIssueId().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Subtask cannot exist independently and must keep a parent task");
        }
    }

    private void ensureDependenciesDone(List<String> dependencies, String message) {
        if (dependencies == null || dependencies.isEmpty()) {
            return;
        }
        for (String dependencyId : dependencies) {
            if (dependencyId == null || dependencyId.isBlank()) {
                continue;
            }
            Issue dependency = getIssueByStringId(dependencyId);
            if (!"DONE".equals(dependency.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
            }
        }
    }

    private boolean hasPath(String startIssueId, String targetIssueId, Set<String> visited) {
        if (!visited.add(startIssueId)) {
            return false;
        }
        Issue start = getIssueByStringId(startIssueId);
        if (start.getBlockedByIssueIds() == null) {
            return false;
        }
        for (String blockedById : start.getBlockedByIssueIds()) {
            if (Objects.equals(blockedById, targetIssueId)) {
                return true;
            }
            if (blockedById != null && !blockedById.isBlank() && hasPath(blockedById, targetIssueId, visited)) {
                return true;
            }
        }
        return false;
    }

    private Issue getIssueByStringId(String issueId) {
        try {
            return issueRepository.findById(new ObjectId(issueId))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found: " + issueId));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid issue id: " + issueId);
        }
    }
}
