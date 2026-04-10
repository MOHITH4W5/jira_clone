package com.example.jira.service;

import com.example.jira.dto.RealtimeEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RealtimeEventService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ConcurrentHashMap<String, Instant> dedupeCache = new ConcurrentHashMap<>();

    public RealtimeEventService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishProjectEvent(String projectId, String eventType, String entityId, Map<String, Object> payload) {
        String dedupeKey = projectId + "|" + eventType + "|" + entityId + "|" + (payload == null ? "" : payload.hashCode());
        Instant now = Instant.now();
        Instant previous = dedupeCache.put(dedupeKey, now);
        if (previous != null && now.minusSeconds(2).isBefore(previous)) {
            return;
        }

        RealtimeEvent event = new RealtimeEvent(eventType, projectId, entityId, payload);
        messagingTemplate.convertAndSend("/topic/project/" + projectId, event);
    }
}
