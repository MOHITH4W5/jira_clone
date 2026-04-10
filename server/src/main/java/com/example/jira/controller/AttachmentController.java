package com.example.jira.controller;

import com.example.jira.model.Attachment;
import com.example.jira.service.AttachmentStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api")
public class AttachmentController {

    private final AttachmentStorageService attachmentStorageService;

    public AttachmentController(AttachmentStorageService attachmentStorageService) {
        this.attachmentStorageService = attachmentStorageService;
    }

    @PostMapping(value = "/issues/{issueId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAttachment(
            @PathVariable String issueId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String actorUserId = resolveUserId(userId, headerUserId);
            Attachment saved = attachmentStorageService.saveAttachment(issueId, actorUserId, file);
            return ResponseEntity.ok(saved);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
    }

    @GetMapping("/issues/{issueId}/attachments")
    public ResponseEntity<?> listAttachments(
            @PathVariable String issueId,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String actorUserId = resolveUserId(userId, headerUserId);
            List<Attachment> attachments = attachmentStorageService.listByIssue(issueId, actorUserId);
            return ResponseEntity.ok(attachments);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<?> downloadAttachment(
            @PathVariable String attachmentId,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String actorUserId = resolveUserId(userId, headerUserId);
            Attachment attachment = attachmentStorageService.getAttachment(attachmentId, actorUserId);
            Resource resource = attachmentStorageService.loadAttachmentFile(attachment);
            String originalName = attachment.getOriginalFileName() == null ? "attachment" : attachment.getOriginalFileName();
            String encodedName = java.net.URLEncoder.encode(originalName, StandardCharsets.UTF_8).replace("+", "%20");
            String contentType = attachment.getContentType() == null
                    ? MediaType.APPLICATION_OCTET_STREAM_VALUE
                    : attachment.getContentType();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename*=UTF-8''" + encodedName)
                    .body(resource);
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
    }

    @DeleteMapping("/attachments/{attachmentId}")
    public ResponseEntity<?> deleteAttachment(
            @PathVariable String attachmentId,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String actorUserId = resolveUserId(userId, headerUserId);
            attachmentStorageService.deleteAttachment(attachmentId, actorUserId);
            return ResponseEntity.noContent().build();
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
        }
    }

    private String resolveUserId(String userId, String headerUserId) {
        if (userId != null && !userId.isBlank()) {
            return userId;
        }
        if (headerUserId != null && !headerUserId.isBlank()) {
            return headerUserId;
        }
        throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "userId is required");
    }
}
