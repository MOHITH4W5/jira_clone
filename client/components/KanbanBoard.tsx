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
import React, { useEffect, useState } from "react";
import KanbanColumn from "./KanbanColumn";
import { createPortal } from "react-dom";
import KanbanCard from "./KanbanCard";
import IssueModel from "./IssueModel";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";

const STATUS_COLUMNS = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Done" },
];

const KanbanBoard = () => {
  const { selectedProject } = useAuth();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  const [issues, setIssues] = useState<any[]>([]);
  const [activeIssue, setActiveIssue] = useState<any | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ FIX: stable mount flag for portal
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  /* =====================
     Fetch issues
  ===================== */
  const fetchIssues = async () => {
    if (!selectedProject?.id) return;

    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/issues/project/${selectedProject.id}`
      );
      setIssues(res.data);
    } catch (err) {
      console.error("Failed to load issues", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [selectedProject?.id]);

  /* =====================
     Drag handlers
  ===================== */
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
      // Optimistic update
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? updatedIssue : i))
      );

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
          Loading board…
        </div>
      ) : (
        <div className="flex h-full gap-4 pb-4">
          {STATUS_COLUMNS.map((column) => {
            const columnIssues = issues
              .filter((i) => i.status === column.id)
              .filter(
                (issue) =>
                  issue?.title?.toLowerCase().includes(searchQuery) ||
                  issue?.key?.toLowerCase().includes(searchQuery)
              )
              .sort((a, b) => a.order - b.order);

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                issues={columnIssues}
                onIssueClick={setSelectedIssue}
              />
            );
          })}
        </div>
      )}

      {/* Issue Modal */}
      <IssueModel
        issue={selectedIssue}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />

      {/* ✅ FIXED: stable DragOverlay portal */}
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
            {activeIssue ? (
              <KanbanCard issue={activeIssue} isOverlay />
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
};

export default KanbanBoard;
