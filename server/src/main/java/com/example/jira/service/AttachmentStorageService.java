package com.example.jira.service;

import com.example.jira.model.Attachment;
import com.example.jira.model.Issue;
import com.example.jira.repository.AttachmentRepository;
import com.example.jira.repository.IssueRepository;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AttachmentStorageService {

    private static final long MAX_FILE_SIZE = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "png", "jpg", "jpeg", "docx");

    private final AttachmentRepository attachmentRepository;
    private final IssueRepository issueRepository;
    private final ProjectAccessService projectAccessService;
    private final Path rootDir;

    public AttachmentStorageService(
            AttachmentRepository attachmentRepository,
            IssueRepository issueRepository,
            ProjectAccessService projectAccessService,
            @Value("${app.attachments.dir:uploads/attachments}") String rootDir) {
        this.attachmentRepository = attachmentRepository;
        this.issueRepository = issueRepository;
        this.projectAccessService = projectAccessService;
        this.rootDir = Paths.get(rootDir).toAbsolutePath().normalize();
        ensureDirectoryExists(this.rootDir);
    }

    public Attachment saveAttachment(String issueId, String userId, MultipartFile file) {
        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));
        projectAccessService.assertProjectMember(issue.getProjectId(), userId);

        validateFile(file);
        String originalName = file.getOriginalFilename() == null ? "attachment" : file.getOriginalFilename();
        String extension = getExtension(originalName);
        String storedName = UUID.randomUUID() + "." + extension;
        Path target = rootDir.resolve(storedName);

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        Attachment attachment = new Attachment();
        attachment.setIssueId(issueId);
        attachment.setProjectId(issue.getProjectId());
        attachment.setUploadedByUserId(userId);
        attachment.setOriginalFileName(originalName);
        attachment.setStoredFileName(storedName);
        attachment.setContentType(file.getContentType());
        attachment.setSizeBytes(file.getSize());
        return attachmentRepository.save(attachment);
    }

    public List<Attachment> listByIssue(String issueId, String userId) {
        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));
        projectAccessService.assertProjectMember(issue.getProjectId(), userId);
        return attachmentRepository.findByIssueId(issueId);
    }

    public Attachment getAttachment(String attachmentId, String userId) {
        Attachment attachment = attachmentRepository.findById(new ObjectId(attachmentId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        projectAccessService.assertProjectMember(attachment.getProjectId(), userId);
        return attachment;
    }

    public Resource loadAttachmentFile(Attachment attachment) {
        Path path = rootDir.resolve(attachment.getStoredFileName());
        if (!Files.exists(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        return new FileSystemResource(path.toFile());
    }

    public void deleteAttachment(String attachmentId, String userId) {
        Attachment attachment = attachmentRepository.findById(new ObjectId(attachmentId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        projectAccessService.assertProjectMember(attachment.getProjectId(), userId);
        deletePhysicalFile(attachment.getStoredFileName());
        attachmentRepository.deleteById(new ObjectId(attachmentId));
    }

    public void deleteByIssueId(String issueId) {
        List<Attachment> attachments = attachmentRepository.findByIssueId(issueId);
        for (Attachment attachment : attachments) {
            deletePhysicalFile(attachment.getStoredFileName());
        }
        attachmentRepository.deleteAll(attachments);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size exceeds 10MB");
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file type");
        }
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }

    private void ensureDirectoryExists(Path path) {
        try {
            Files.createDirectories(path);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to create attachment directory", exception);
        }
    }

    private void deletePhysicalFile(String storedName) {
        try {
            Files.deleteIfExists(rootDir.resolve(storedName));
        } catch (IOException ignored) {
            // ignore cleanup failures to avoid blocking primary entity delete
        }
    }
}
