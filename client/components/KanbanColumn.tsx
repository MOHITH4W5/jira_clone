"use client";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import React from "react";
import KanbanCard from "./KanbanCard";

const KanbanColumn = ({ column, issues, onIssueClick, columnIndex = 0 }: any) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });
  return (
    <div
      data-column-reveal
      style={{ ["--reveal-delay" as any]: `${Math.min(columnIndex * 120, 280)}ms` }}
      className="reveal-on-scroll w-[280px] flex-shrink-0 rounded-lg bg-[#F4F5F7] p-2 flex flex-col h-full"
    >
      <h3 className="mb-3 px-2 text-xs font-semibold uppercase text-[#5E6C84]">
        {column.title} ({issues.length})
      </h3>
      <div ref={setNodeRef} className="flex-1 space-y-2">
        <SortableContext
          items={issues.map((i: any) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.map((issue: any) => (
            <KanbanCard
              key={issue.id}
              issue={issue}
              onClick={() => onIssueClick(issue)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;
