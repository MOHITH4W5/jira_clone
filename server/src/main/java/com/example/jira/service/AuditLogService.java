package com.example.jira.service;

import com.example.jira.model.AuditLog;
import com.example.jira.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String entityType, String entityId, String action, String performedByUserId, String details) {
        AuditLog auditLog = new AuditLog();
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setAction(action);
        auditLog.setPerformedByUserId(performedByUserId);
        auditLog.setDetails(details);
        auditLogRepository.save(auditLog);
    }
}
