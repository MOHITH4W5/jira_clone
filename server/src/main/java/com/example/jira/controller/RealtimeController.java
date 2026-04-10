package com.example.jira.controller;

import com.example.jira.dto.PresenceMessage;
import com.example.jira.service.ProjectAccessService;
import com.example.jira.service.RealtimePresenceService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.Set;

@Controller
public class RealtimeController {

    private final RealtimePresenceService presenceService;
    private final ProjectAccessService projectAccessService;
    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeController(
            RealtimePresenceService presenceService,
            ProjectAccessService projectAccessService,
            SimpMessagingTemplate messagingTemplate) {
        this.presenceService = presenceService;
        this.projectAccessService = projectAccessService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/presence/join")
    public void join(PresenceMessage message) {
        projectAccessService.assertProjectMember(message.getProjectId(), message.getUserId());
        Set<String> activeUsers = presenceService.joinProject(message);
        messagingTemplate.convertAndSend(
                (String) ("/topic/project/" + message.getProjectId() + "/presence"),
                (Object) Map.of("activeUsers", activeUsers));
    }

    @MessageMapping("/presence/leave")
    public void leave(PresenceMessage message) {
        Set<String> activeUsers = presenceService.leaveProject(message);
        messagingTemplate.convertAndSend(
                (String) ("/topic/project/" + message.getProjectId() + "/presence"),
                (Object) Map.of("activeUsers", activeUsers));
    }
}
