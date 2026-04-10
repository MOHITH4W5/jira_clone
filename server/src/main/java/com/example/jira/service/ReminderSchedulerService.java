package com.example.jira.service;

import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReminderSchedulerService {

    private final IssueRepository issueRepository;
    private final NotificationService notificationService;

    public ReminderSchedulerService(IssueRepository issueRepository, NotificationService notificationService) {
        this.issueRepository = issueRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedDelayString = "${app.reminder.fixed-delay-ms:300000}")
    public void sendDueReminders() {
        List<Issue> issues = issueRepository.findAll();
        Instant now = Instant.now();
        Instant lowerBound = now.plus(Duration.ofHours(23));
        Instant upperBound = now.plus(Duration.ofHours(24)).plus(Duration.ofMinutes(30));

        for (Issue issue : issues) {
            if (issue.getDueDate() == null || issue.getAssigneeId() == null || issue.getProjectId() == null) {
                continue;
            }
            if (issue.getDueDate().isBefore(lowerBound) || issue.getDueDate().isAfter(upperBound)) {
                continue;
            }
            String dateBucket = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC).format(issue.getDueDate());
            String dedupeKey = "DUE_REMINDER|" + issue.getId() + "|" + dateBucket;
            notificationService.createNotification(
                    issue.getAssigneeId(),
                    issue.getProjectId(),
                    issue.getId(),
                    "DUE_DATE_REMINDER",
                    "Reminder: issue " + (issue.getKey() == null ? issue.getId() : issue.getKey()) + " is due within 24 hours.",
                    dedupeKey);
        }
    }
}
