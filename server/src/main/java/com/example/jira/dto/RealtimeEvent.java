package com.example.jira.dto;

import java.time.Instant;
import java.util.Map;

public class RealtimeEvent {
    private String eventType;
    private String projectId;
    private String entityId;
    private Instant createdAt = Instant.now();
    private Map<String, Object> payload;

    public RealtimeEvent() {
    }

    public RealtimeEvent(String eventType, String projectId, String entityId, Map<String, Object> payload) {
        this.eventType = eventType;
        this.projectId = projectId;
        this.entityId = entityId;
        this.payload = payload;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }

    public void setPayload(Map<String, Object> payload) {
        this.payload = payload;
    }
}
