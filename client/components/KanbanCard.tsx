"use client";

import React, { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axiosInstance from "@/lib/Axiosinstance";


interface KanbanCardProps {
  issue: any;
  isOverlay?: boolean;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-green-100 text-green-800",
};

const issueTypeColors: Record<string, string> = {
  BUG: "bg-red-500",
  TASK: "bg-blue-500",
  STORY: "bg-purple-500",
};

const KanbanCard = ({ issue, isOverlay = false, onClick }: KanbanCardProps) => {
  const [assignee, setAssignee] = useState<any>(null);

  // ❗ useSortable ONLY for real cards, not overlay
  const sortable = !isOverlay
    ? useSortable({ id: issue.id })
    : null;

  const style = sortable
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }
    : undefined;

  /* =====================
     Fetch assignee by ID
  ===================== */
  useEffect(() => {
    if (!issue?.assigneeId || isOverlay) return;

    const fetchAssignee = async () => {
      try {
        const res = await axiosInstance.get(
          `/api/users/${issue.assigneeId}`,
        );
        setAssignee(res.data);
      } catch (err) {
        console.error("Failed to load assignee", err);
      }
    };

    fetchAssignee();
  }, [issue?.assigneeId, isOverlay]);

  return (
    <div
      ref={sortable?.setNodeRef}
      style={style}
      {...sortable?.attributes}
      {...sortable?.listeners}
      onClick={(e) => {
        e.stopPropagation(); // prevents drag-click conflict
        onClick?.();
      }}
      className={`rounded border bg-white p-3 shadow-sm transition-colors ${
        isOverlay
          ? "shadow-lg border-[#0052CC]"
          : "hover:bg-[#F4F5F7] cursor-pointer"
      }`}
    >
      {/* Title */}
      <p className="text-sm font-medium text-[#172B4D] mb-3 leading-tight">
        {issue.title}
      </p>

      {/* Meta */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`h-4 w-4 rounded ${issueTypeColors[issue.type]}`}
          />
          <span className="text-[11px] font-bold text-[#5E6C84]">
            {issue.key}
          </span>
        </div>

        <Badge className={`text-xs ${priorityColors[issue.priority]}`}>
          {issue.priority}
        </Badge>
      </div>

      {/* Assignee */}
      {assignee && (
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={assignee.avatar} />
            <AvatarFallback>
              {assignee.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-[#626F86]">
            {assignee.name}
          </span>
        </div>
      )}
    </div>
  );
};

export default KanbanCard;
