package com.example.jira.controller;

import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import org.bson.types.ObjectId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.jira.dto.ProjectResponse;
import com.example.jira.model.Project;
import com.example.jira.model.User;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.UserRepository;
import com.example.jira.service.AuditLogService;
import com.example.jira.service.ProjectAccessService;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.server.ResponseStatusException;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/projects")
public class Projectcontroller {

    private final Projectrepository projectrepository;
    private final UserRepository userRepository;
    private final ProjectAccessService projectAccessService;
    private final AuditLogService auditLogService;

    public Projectcontroller(
            Projectrepository projectrepository,
            UserRepository userRepository,
            ProjectAccessService projectAccessService,
            AuditLogService auditLogService) {
        this.projectrepository = projectrepository;
        this.userRepository = userRepository;
        this.projectAccessService = projectAccessService;
        this.auditLogService = auditLogService;
    }

    @PostMapping
    public ResponseEntity<?> createProject(
            @RequestBody Project project,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        String actor = firstNonBlank(actorUserId, project.getOwnerId());
        if (actor == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        try {
            String actorRole = projectAccessService.getRole(actor);
            if ("VIEWER".equals(actorRole)) {
                return ResponseEntity.status(403).body(Map.of("message", "Viewer role cannot create projects"));
            }

            if (project.getOwnerId() == null || project.getOwnerId().isBlank()) {
                project.setOwnerId(actor);
            } else if (!project.getOwnerId().equals(actor)
                    && !"ADMIN".equals(actorRole)
                    && !"PROJECT_MANAGER".equals(actorRole)) {
                return ResponseEntity.status(403).body(Map.of("message", "Only admin or project manager can assign another owner"));
            }

            Set<String> members = new LinkedHashSet<>();
            if (project.getMemberIds() != null) {
                members.addAll(project.getMemberIds());
            }
            members.add(project.getOwnerId());
            project.setMemberIds(new ArrayList<>(members));

            Project saved = projectrepository.save(project);
            auditLogService.log(
                    "PROJECT",
                    saved.getId(),
                    saved.getId(),
                    "CREATED",
                    actor,
                    "Created project " + saved.getName());
            return ResponseEntity.status(201).body(saved);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
    }

    @GetMapping
    public List<Project> getAllProjects(
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        List<Project> all = projectrepository.findAll();
        if (actorUserId == null || actorUserId.isBlank()) {
            return all;
        }
        return all.stream()
                .filter(project -> project.getOwnerId() != null && project.getOwnerId().equals(actorUserId)
                        || project.getMemberIds() != null && project.getMemberIds().contains(actorUserId))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProjectById(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Project not found"));
        if (actorUserId != null && !actorUserId.isBlank()) {
            try {
                projectAccessService.assertProjectReadable(project.getId(), actorUserId);
            } catch (ResponseStatusException exception) {
                return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
            }
        }

        // Fetch owner
        User owner = null;
        if (project.getOwnerId() != null && ObjectId.isValid(project.getOwnerId())) {
            owner = userRepository.findById(new ObjectId(project.getOwnerId()))
                    .orElse(null);
        }

        // Fetch members
        List<String> memberIds = project.getMemberIds() == null ? List.of() : project.getMemberIds();
        List<ObjectId> memberObjectIds = memberIds.stream()
                .filter(ObjectId::isValid)
                .map(ObjectId::new)
                .toList();

        List<User> members = userRepository.findByIdIn(memberObjectIds);

        return ResponseEntity.ok(new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                owner,
                members));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updaProject(
            @PathVariable String id,
            @RequestBody Project updated,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("project not found"));
        try {
            projectAccessService.assertProjectManager(project.getId(), actorUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }

        if (updated.getName() != null) {
            project.setName(updated.getName());
        }
        if (updated.getDescription() != null) {
            project.setDescription(updated.getDescription());
        }
        List<String> incomingMembers = updated.getMemberIds() == null
                ? new ArrayList<>()
                : new ArrayList<>(updated.getMemberIds());
        if (project.getOwnerId() != null && !incomingMembers.contains(project.getOwnerId())) {
            incomingMembers.add(project.getOwnerId());
        }
        project.setMemberIds(incomingMembers);
        Project saved = projectrepository.save(project);
        auditLogService.log(
                "PROJECT",
                saved.getId(),
                saved.getId(),
                "UPDATED",
                actorUserId,
                "Updated project settings and members");
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteproject(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "X-User-Id header is required"));
        }
        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("project not found"));
        try {
            projectAccessService.assertProjectManager(project.getId(), actorUserId);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
        projectrepository.deleteById(new ObjectId(id));
        auditLogService.log(
                "PROJECT",
                id,
                id,
                "DELETED",
                actorUserId,
                "Deleted project " + project.getName());
        return ResponseEntity.noContent().build();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

}
