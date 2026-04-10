"use client";

import { Client } from "@stomp/stompjs";
import { useEffect, useRef } from "react";

type RealtimeEvent = {
  eventType?: string;
  projectId?: string;
  entityId?: string;
  createdAt?: string;
  payload?: Record<string, unknown>;
};

type PresenceEvent = {
  activeUsers?: string[];
};

type UseProjectRealtimeOptions = {
  projectId?: string;
  userId?: string;
  onProjectEvent?: (event: RealtimeEvent) => void;
  onPresenceEvent?: (event: PresenceEvent) => void;
};

const toWebSocketUrl = (apiBaseUrl: string) => {
  const normalized = apiBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  if (normalized.startsWith("https://")) {
    return `wss://${normalized.slice("https://".length)}/ws`;
  }
  if (normalized.startsWith("http://")) {
    return `ws://${normalized.slice("http://".length)}/ws`;
  }
  return `${normalized}/ws`;
};

const getApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:8080";

export const useProjectRealtime = ({
  projectId,
  userId,
  onProjectEvent,
  onPresenceEvent,
}: UseProjectRealtimeOptions) => {
  const onProjectEventRef = useRef(onProjectEvent);
  const onPresenceEventRef = useRef(onPresenceEvent);

  useEffect(() => {
    onProjectEventRef.current = onProjectEvent;
  }, [onProjectEvent]);

  useEffect(() => {
    onPresenceEventRef.current = onPresenceEvent;
  }, [onPresenceEvent]);

  useEffect(() => {
    if (!projectId || !userId) {
      return;
    }

    const client = new Client({
      brokerURL: toWebSocketUrl(getApiBaseUrl()),
      reconnectDelay: 5000,
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000,
    });

    client.onConnect = () => {
      client.subscribe(
        `/topic/project/${projectId}`,
        (message) => {
          try {
            const parsed = JSON.parse(message.body) as RealtimeEvent;
            onProjectEventRef.current?.(parsed);
          } catch {
            // ignore malformed event payloads
          }
        },
        { userId },
      );

      client.subscribe(
        `/topic/project/${projectId}/presence`,
        (message) => {
          try {
            const parsed = JSON.parse(message.body) as PresenceEvent;
            onPresenceEventRef.current?.(parsed);
          } catch {
            // ignore malformed presence payloads
          }
        },
        { userId },
      );

      client.publish({
        destination: "/app/presence/join",
        body: JSON.stringify({ projectId, userId }),
      });
    };

    client.activate();

    return () => {
      if (client.connected) {
        client.publish({
          destination: "/app/presence/leave",
          body: JSON.stringify({ projectId, userId }),
        });
      }
      client.deactivate();
    };
  }, [projectId, userId]);
};
