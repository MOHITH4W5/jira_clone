package com.example.jira.service;

import com.example.jira.dto.PresenceMessage;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RealtimePresenceService {

    private final ConcurrentHashMap<String, Set<String>> activeUsersByProject = new ConcurrentHashMap<>();

    public Set<String> joinProject(PresenceMessage message) {
        activeUsersByProject.computeIfAbsent(message.getProjectId(), key -> ConcurrentHashMap.newKeySet())
                .add(message.getUserId());
        return getActiveUsers(message.getProjectId());
    }

    public Set<String> leaveProject(PresenceMessage message) {
        Set<String> users = activeUsersByProject.get(message.getProjectId());
        if (users != null) {
            users.remove(message.getUserId());
            if (users.isEmpty()) {
                activeUsersByProject.remove(message.getProjectId());
            }
        }
        return getActiveUsers(message.getProjectId());
    }

    public Set<String> getActiveUsers(String projectId) {
        return activeUsersByProject.getOrDefault(projectId, Collections.emptySet());
    }
}
