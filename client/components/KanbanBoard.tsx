"use client";

import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import KanbanColumn from "./KanbanColumn";
import { createPortal } from "react-dom";
import KanbanCard from "./KanbanCard";
import IssueModel from "./IssueModel";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { useProjectRealtime } from "@/lib/useProjectRealtime";

const STATUS_COLUMNS = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Done" },
];

type KanbanBoardProps = {
  onlyMyIssues?: boolean;
  recentlyUpdated?: boolean;
};

const KanbanBoard = ({
  onlyMyIssues = false,
  recentlyUpdated = false,
}: KanbanBoardProps) => {
  const { selectedProject, user } = useAuth();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  const [issues, setIssues] = useState<any[]>([]);
  const [activeIssue, setActiveIssue] = useState<any | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const columnsViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const fetchIssues = async () => {
    if (!selectedProject?.id) return;

    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/issues/project/${selectedProject.id}`,
      );
      setIssues(res.data || []);
    } catch (err) {
      console.error("Failed to load issues", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (loading) return;
    const root = columnsViewportRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        root,
        threshold: 0.18,
        rootMargin: "0px -4% 0px -4%",
      },
    );

    const columns = root.querySelectorAll<HTMLElement>("[data-column-reveal]");
    columns.forEach((column, index) => {
      column.style.setProperty("--reveal-delay", `${Math.min(index * 120, 280)}ms`);
      observer.observe(column);
    });

    return () => observer.disconnect();
  }, [loading, issues.length, onlyMyIssues, recentlyUpdated, searchQuery]);

  useProjectRealtime({
    projectId: selectedProject?.id,
    userId: user?.id,
    onProjectEvent: (event) => {
      const relevantEventTypes = new Set([
        "ISSUE_CREATED",
        "ISSUE_UPDATED",
        "ISSUE_DELETED",
      ]);
      if (event?.eventType && relevantEventTypes.has(event.eventType)) {
        fetchIssues();
      }
    },
    onPresenceEvent: (event) => {
      setActiveUsers(event.activeUsers ?? []);
    },
  });

  const onDragStart = (event: DragStartEvent) => {
    const issue = issues.find((i) => i.id === event.active.id);
    setActiveIssue(issue || null);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveIssue(null);

    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    const newStatus = over.id as string;

    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.status === newStatus) return;

    const updatedIssue = {
      ...issue,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      setIssues((prev) => prev.map((i) => (i.id === issueId ? updatedIssue : i)));

      await axiosInstance.put(`/api/issues/${issueId}`, {
        title: updatedIssue.title,
        description: updatedIssue.description,
        type: updatedIssue.type,
        priority: updatedIssue.priority,
        status: updatedIssue.status,
        projectId: updatedIssue.projectId,
        reporterId: updatedIssue.reporterId,
        assigneeId: updatedIssue.assigneeId,
        sprintId: updatedIssue.sprintId ?? null,
        order: updatedIssue.order ?? 0,
        comments: updatedIssue.comments ?? [],
        updatedAt: updatedIssue.updatedAt,
      });
    } catch (err) {
      console.error("Failed to update issue", err);
      setIssues((prev) => prev.map((i) => (i.id === issueId ? issue : i)));
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Select a project to view the board
      </div>
    );
  }

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue?.title?.toLowerCase().includes(searchQuery) ||
      issue?.key?.toLowerCase().includes(searchQuery);
    if (!matchesSearch) return false;

    if (!onlyMyIssues) return true;
    return issue.assigneeId === user?.id || issue.reporterId === user?.id;
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
          Loading board...
        </div>
      ) : (
        <div className="flex h-full flex-col gap-2 pb-4">
          <p className="text-xs text-[#6B778C]">
            {activeUsers.length} active user{activeUsers.length === 1 ? "" : "s"} in this project
          </p>
          <div ref={columnsViewportRef} className="flex h-full gap-4 overflow-x-auto">
            {STATUS_COLUMNS.map((column, index) => {
              const columnIssues = filteredIssues
                .filter((i) => i.status === column.id)
                .sort((a, b) => {
                  if (recentlyUpdated) {
                    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
                    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
                    return bTime - aTime;
                  }
                  return (a.order ?? 0) - (b.order ?? 0);
                });

              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  columnIndex={index}
                  issues={columnIssues}
                  onIssueClick={setSelectedIssue}
                />
              );
            })}
          </div>
        </div>
      )}

      <IssueModel
        issue={selectedIssue}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />

      {isMounted &&
        !loading &&
        createPortal(
          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: "0.5" } },
              }),
            }}
          >
            {activeIssue ? <KanbanCard issue={activeIssue} isOverlay /> : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
};

export default KanbanBoard;
