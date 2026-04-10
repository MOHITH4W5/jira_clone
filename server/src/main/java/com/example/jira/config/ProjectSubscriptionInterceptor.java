package com.example.jira.config;

import com.example.jira.service.ProjectAccessService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class ProjectSubscriptionInterceptor implements ChannelInterceptor {

    private final ProjectAccessService projectAccessService;

    public ProjectSubscriptionInterceptor(ProjectAccessService projectAccessService) {
        this.projectAccessService = projectAccessService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/topic/project/")) {
                String userId = accessor.getFirstNativeHeader("userId");
                if (userId == null || userId.isBlank()) {
                    throw new IllegalStateException("userId header is required for project subscriptions");
                }
                String projectId = destination.substring("/topic/project/".length());
                if (projectId.contains("/")) {
                    projectId = projectId.substring(0, projectId.indexOf('/'));
                }
                if (!projectAccessService.isProjectMember(projectId, userId)) {
                    throw new IllegalStateException("User is not allowed to subscribe to this project");
                }
            }
        }
        return message;
    }
}
