package com.example.jira.controller;
import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueRepository issueRepository;

    public IssueController(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    // CREATE
    @PostMapping
    public Issue createIssue(@RequestBody Issue issue) {
        return issueRepository.save(issue);
    }

    // GET BY PROJECT
    @GetMapping("/project/{projectId}")
    public List<Issue> getIssuesByProject(@PathVariable String projectId) {
        return issueRepository.findByProjectId(projectId);
    }

    // GET BY ID
    @GetMapping("/{id}")
    public Issue getIssueById(@PathVariable String id) {
        return issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Issue not found"));
    }

    // UPDATE
    @PutMapping("/{id}")
    public Issue updateIssue(
            @PathVariable String id,
            @RequestBody Issue updated) {

        Issue issue = issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        issue.setTitle(updated.getTitle());
        issue.setDescription(updated.getDescription());
        issue.setStatus(updated.getStatus());
        issue.setPriority(updated.getPriority());
        issue.setAssigneeId(updated.getAssigneeId());
        issue.setOrder(updated.getOrder());
        issue.setUpdatedAt(Instant.now());
        issue.setComments(updated.getComments());
        return issueRepository.save(issue);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public void deleteIssue(@PathVariable String id) {
        issueRepository.deleteById(new ObjectId(id));
    }
}
