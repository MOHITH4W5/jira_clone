package com.example.jira.controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import com.example.jira.model.Issue;
import com.example.jira.model.Project;
import com.example.jira.model.Sprint;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.SprintRepository;
import com.example.jira.service.NotificationService;
import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;
    private final Projectrepository projectrepository;
    private final NotificationService notificationService;

    public SprintController(
            SprintRepository sprintRepository,
            IssueRepository issueRepository,
            Projectrepository projectrepository,
            NotificationService notificationService) {
        this.sprintRepository = sprintRepository;
        this.issueRepository = issueRepository;
        this.projectrepository = projectrepository;
        this.notificationService = notificationService;
    }

    // =========================
    // CREATE SPRINT
    // =========================
    @PostMapping
    public Sprint createSprint(@RequestBody Sprint sprint) {
        sprint.setStatus("PLANNED");
        return sprintRepository.save(sprint);
    }

    // =========================
    // GET SPRINTS BY PROJECT
    // =========================
    @GetMapping("/project/{projectId}")
    public List<Sprint> getSprintsByProject(@PathVariable String projectId) {
        return sprintRepository.findByProjectId(projectId);
    }

    // =========================
    // START SPRINT
    // =========================
    @PutMapping("/{id}/start")
    public Sprint startSprint(@PathVariable String id) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setStatus("ACTIVE");
        sprint.setStartDate(Instant.now());

        Sprint saved = sprintRepository.save(sprint);
        notifySprintMembers(saved, "SPRINT_STARTED", "Sprint started: " + saved.getName());
        return saved;
    }

    // =========================
    // COMPLETE SPRINT
    // =========================
    @PutMapping("/{id}/complete")
    public Sprint completeSprint(@PathVariable String id) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setStatus("COMPLETED");
        sprint.setEndDate(Instant.now());

        Sprint saved = sprintRepository.save(sprint);
        notifySprintMembers(saved, "SPRINT_ENDED", "Sprint completed: " + saved.getName());
        return saved;
    }

    // =========================
    // UPDATE SPRINT DETAILS
    // =========================
    @PutMapping("/{id}")
    public Sprint updateSprint(
            @PathVariable String id,
            @RequestBody Sprint updated) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setName(updated.getName());
        sprint.setGoal(updated.getGoal());
        sprint.setStartDate(updated.getStartDate());
        sprint.setEndDate(updated.getEndDate());

        return sprintRepository.save(sprint);
    }

    // =========================
    // DELETE SPRINT
    // =========================
    @DeleteMapping("/{id}")
    public void deleteSprint(@PathVariable String id) {
        sprintRepository.deleteById(new ObjectId(id));
    }

    // =========================
    // ASSIGN ISSUE TO SPRINT
    // =========================
    @PutMapping("/{sprintId}/issues/{issueId}")
    public Issue addIssueToSprint(
            @PathVariable String sprintId,
            @PathVariable String issueId) {

        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        issue.setUpdatedAt(Instant.now());
        issue.setSprintId(sprintId);

        return issueRepository.save(issue);
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
