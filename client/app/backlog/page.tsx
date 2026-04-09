"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const page = () => {
  const router = useRouter();
  const { selectedProject, user } = useAuth();

  const [issues, setIssues] = useState<any[]>([]);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const fetchData = async () => {
    if (!selectedProject?.id) return;
    try {
      setLoading(true);
      const issuesRes = await axiosInstance.get(
        `/api/issues/project/${selectedProject.id}`,
      );
      const sprintRes = await axiosInstance.get(
        `/api/sprints/project/${selectedProject.id}`,
      );
      setIssues(issuesRes.data || []);
      setActiveSprint((sprintRes.data || [])[0] || null);
    } catch (err) {
      console.error("Failed to load backlog", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProject?.id]);

  const createIssue = async () => {
    if (!newTitle.trim() || !selectedProject || !user) return;

    try {
      await axiosInstance.post("/api/issues", {
        title: newTitle,
        projectId: selectedProject.id,
        status: "TODO",
        priority: "MEDIUM",
        type: "TASK",
        reporterId: user.id,
        sprintId: null,
      });

      setNewTitle("");
      setIsCreating(false);
      fetchData();
    } catch (err) {
      console.error("Failed to create issue", err);
    }
  };

  const backlogIssues = issues.filter((i) => !i.sprintId);
  const sprintIssues = issues.filter((i) => i.sprintId === activeSprint?.id);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      window.alert("Backlog link copied to clipboard.");
    } catch (error) {
      console.error(error);
      window.alert("Unable to copy link. Please copy from address bar.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Loading backlog...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-[#5E6C84]">
          <button
            type="button"
            className="hover:underline"
            onClick={() => router.push("/projects")}
          >
            Projects
          </button>
          <ChevronRight className="h-4 w-4" />
          <button
            type="button"
            className="hover:underline"
            onClick={() => router.push("/projects")}
          >
            {selectedProject?.name || "No Project"}
          </button>
          <ChevronRight className="h-4 w-4" />
          <span>Backlog</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#172B4D]">Backlog</h1>
          <div className="relative flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu((prev) => !prev)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-10 z-20 min-w-40 rounded-md border bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-[#F4F5F7]"
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/");
                  }}
                >
                  Open Board
                </button>
                <button
                  type="button"
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-[#F4F5F7]"
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/projects");
                  }}
                >
                  Go to Projects
                </button>
                <button
                  type="button"
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-[#F4F5F7]"
                  onClick={() => {
                    setShowMenu(false);
                    fetchData();
                  }}
                >
                  Refresh Backlog
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        {activeSprint && (
          <section>
            <SectionHeader title={activeSprint.name} count={sprintIssues.length} />
            <div className="divide-y rounded-b-md border border-t-0">
              {sprintIssues.map((issue: any) => (
                <BacklogItem key={issue.id} issue={issue} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="Backlog" count={backlogIssues.length} />
          <div className="divide-y rounded-b-md border border-t-0">
            {backlogIssues.map((issue: any) => (
              <BacklogItem key={issue.id} issue={issue} />
            ))}

            {isCreating ? (
              <form
                className="p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createIssue();
                }}
              >
                <input
                  autoFocus
                  className="w-full rounded border-2 border-[#0052CC] p-1 text-sm"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => !newTitle && setIsCreating(false)}
                />
              </form>
            ) : (
              <CreateIssueRow onClick={() => setIsCreating(true)} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, count }: any) => (
  <div className="rounded-t-md border-b bg-[#F4F5F7] p-3">
    <div className="flex items-center gap-2">
      <ChevronDown className="h-4 w-4" />
      <span className="font-semibold">{title}</span>
      <span className="ml-2 text-xs text-[#5E6C84]">{count} issues</span>
    </div>
  </div>
);

const CreateIssueRow = ({ onClick }: any) => (
  <div className="cursor-pointer p-2 hover:bg-[#F4F5F7]" onClick={onClick}>
    <div className="flex items-center gap-2 text-sm text-[#5E6C84]">
      <Plus className="h-4 w-4" />
      Create issue
    </div>
  </div>
);

const BacklogItem = ({ issue }: any) => {
  const priorityMap = {
    HIGH: "text-red-500",
    MEDIUM: "text-orange-500",
    LOW: "text-blue-500",
  } as const;

  const priorityColor =
    priorityMap[issue.priority as keyof typeof priorityMap] || "text-gray-500";

  return (
    <div className="group flex items-center justify-between p-3 hover:bg-[#F4F5F7]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-4 w-4 rounded bg-blue-500" />
        <span className="text-sm text-[#5E6C84]">{issue.key}</span>
        <span className="truncate">{issue.title}</span>
      </div>

      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100">
        <span className={`text-xs font-bold ${priorityColor}`}>
          {issue.priority}
        </span>
        <Avatar className="h-6 w-6">
          <AvatarImage src={issue.assignee?.avatar} />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};

export default page;
