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
import React, { useEffect, useState } from "react";

const page = () => {
  // const issues = [
  //   {
  //     id: "1",
  //     key: "PS-124",
  //     title: "Implement user authentication flow",
  //     description: "Add OAuth and JWT token support",
  //     type: "TASK",
  //     status: "TODO",
  //     priority: "HIGH",
  //     projectId: "proj-1",
  //     reporterId: "user-1",
  //     assigneeId: "user-2",
  //     order: 0,
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //     comments: [],
  //   },
  //   {
  //     id: "2",
  //     key: "PS-125",
  //     title: "Fix critical bug in payment processing",
  //     description: "Payment gateway timeout issue",
  //     type: "BUG",
  //     status: "IN_PROGRESS",
  //     priority: "HIGH",
  //     projectId: "proj-1",
  //     reporterId: "user-1",
  //     assigneeId: "user-1",
  //     order: 0,
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //     comments: [],
  //   },
  //   {
  //     id: "3",
  //     key: "PS-126",
  //     title: "Design system audit and cleanup",
  //     type: "STORY",
  //     status: "TODO",
  //     priority: "MEDIUM",
  //     projectId: "proj-1",
  //     reporterId: "user-2",
  //     order: 1,
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //     comments: [],
  //   },
  // ];
  const { selectedProject, user } = useAuth();

  const [issues, setIssues] = useState<any[]>([]);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);

  /* =====================
     Fetch backlog data
  ===================== */
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
      setIssues(issuesRes.data);
      setActiveSprint(sprintRes.data || null);
    } catch (err) {
      console.error("Failed to load backlog", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProject?.id]);

  /* =====================
     Create backlog issue
  ===================== */
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
        sprintId: null, // BACKLOG
      });

      setNewTitle("");
      setIsCreating(false);
      fetchData();
    } catch (err) {
      console.error("Failed to create issue", err);
    }
  };

  const sprintIssues = issues.filter((i) => i.sprintId === activeSprint?.id);

  const backlogIssues = issues.filter((i) => !i.sprintId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Loading backlog…
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col p-6 overflow-hidden">
      {/* Breadcrumb */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-[#5E6C84]">
          <span>Projects</span>
          <ChevronRight className="h-4 w-4" />
          <span>{selectedProject?.name}</span>
          <ChevronRight className="h-4 w-4" />
          <span>Backlog</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#172B4D]">Backlog</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Sprint Section */}
        {/* {activeSprint && (
          <section>
            <SprintSection sprint={activeSprint} issues={sprintIssues} />
          </section>
        )} */}

        {/* Backlog Section */}
        <section>
          <SectionHeader title="Backlog" count={backlogIssues.length} />

          <div className="border border-t-0 rounded-b-md divide-y">
            {backlogIssues.map((issue) => (
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
                  className="w-full p-1 border-2 border-[#0052CC] rounded text-sm"
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
  <div className="flex items-center justify-between bg-[#F4F5F7] p-3 rounded-t-md border-b">
    <div className="flex items-center gap-2">
      <ChevronDown className="h-4 w-4" />
      <span className="font-semibold">{title}</span>
      <span className="text-xs ml-2 text-[#5E6C84]">{count} issues</span>
    </div>
  </div>
);

const SprintSection = ({ sprint, issues }: any) => (
  <>
    <SectionHeader title={sprint.name} count={issues.length} />
    <div className="border border-t-0 rounded-b-md divide-y">
      {issues.map((issue: any) => (
        <BacklogItem key={issue.id} issue={issue} />
      ))}
    </div>
  </>
);

const CreateIssueRow = ({ onClick }: any) => (
  <div className="p-2 hover:bg-[#F4F5F7] cursor-pointer" onClick={onClick}>
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
  };

  const priorityColor =
    priorityMap[issue.priority as keyof typeof priorityMap] || "text-gray-500";

  return (
    <div className="flex items-center justify-between p-3 hover:bg-[#F4F5F7] group">
      <div className="flex items-center gap-3 min-w-0">
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
