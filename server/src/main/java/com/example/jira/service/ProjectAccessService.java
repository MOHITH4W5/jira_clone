package com.example.jira.service;

import com.example.jira.model.Project;
import com.example.jira.model.User;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.UserRepository;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectAccessService {

    private final Projectrepository projectRepository;
    private final UserRepository userRepository;

    public ProjectAccessService(Projectrepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    public Project getProjectOrThrow(String projectId) {
        return projectRepository.findById(new ObjectId(projectId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    public User getUserOrThrow(String userId) {
        return userRepository.findById(new ObjectId(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public boolean isProjectMember(String projectId, String userId) {
        Project project = getProjectOrThrow(projectId);
        return project.getOwnerId() != null && project.getOwnerId().equals(userId)
                || project.getMemberIds() != null && project.getMemberIds().contains(userId);
    }

    public boolean isProjectManager(String projectId, String userId) {
        Project project = getProjectOrThrow(projectId);
        if (project.getOwnerId() != null && project.getOwnerId().equals(userId)) {
            return true;
        }
        User user = getUserOrThrow(userId);
        String role = user.getRole() == null ? "" : user.getRole().toUpperCase();
        return "ADMIN".equals(role) || "PROJECT_MANAGER".equals(role);
    }

    public void assertProjectMember(String projectId, String userId) {
        if (!isProjectMember(projectId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not a project member");
        }
    }

    public void assertProjectManager(String projectId, String userId) {
        if (!isProjectManager(projectId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not a project manager");
        }
    }

    public String normalizeRole(String role) {
        if (role == null) {
            return "MEMBER";
        }
        return switch (role.trim().toUpperCase()) {
            case "ADMIN", "PROJECT_MANAGER", "MEMBER", "VIEWER" -> role.trim().toUpperCase();
            case "USER" -> "MEMBER";
            default -> "MEMBER";
        };
    }

    public String getRole(String userId) {
        return normalizeRole(getUserOrThrow(userId).getRole());
    }

    public boolean isViewer(String userId) {
        return "VIEWER".equals(getRole(userId));
    }

    public boolean canEditProject(String projectId, String userId) {
        if (userId == null || userId.isBlank()) {
            return false;
        }
        if (!isProjectMember(projectId, userId)) {
            return false;
        }
        return !isViewer(userId);
    }

    public void assertProjectReadable(String projectId, String userId) {
        assertProjectMember(projectId, userId);
    }

    public void assertProjectWritable(String projectId, String userId) {
        if (!canEditProject(projectId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User does not have write access to this project");
        }
    }
}
