import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertCircle, Link2, ListTree } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import axios from "axios";

type TeamMember = {
  id: string;
  name: string;
};

type IssueOption = {
  id: string;
  key?: string;
  title: string;
  type?: string;
  status?: string;
};

type CreateIssueModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

type CreateIssueFormState = {
  title: string;
  description: string;
  type: string;
  priority: string;
  assigneeId: string;
  parentIssueId: string;
  blockedByIssueIds: string[];
};

const initialFormState: CreateIssueFormState = {
  title: "",
  description: "",
  type: "TASK",
  priority: "MEDIUM",
  assigneeId: "",
  parentIssueId: "",
  blockedByIssueIds: [],
};

const CreateIssuemodel = ({ isOpen, onClose, onCreated }: CreateIssueModalProps) => {
  const { user, selectedProject } = useAuth();
  const [isloading, setIsloading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [error, setError] = useState("");
  const [teamMembers, setteamMembers] = useState<TeamMember[]>([]);
  const [projectIssues, setProjectIssues] = useState<IssueOption[]>([]);
  const [formData, setFormData] = useState<CreateIssueFormState>(initialFormState);

  const resetForm = () => {
    setFormData(initialFormState);
    setError("");
  };

  useEffect(() => {
    if (!selectedProject?.id || !isOpen) return;
    const fetchContext = async () => {
      try {
        setLoadingContext(true);
        const [projectRes, issuesRes] = await Promise.all([
          axiosInstance.get(`/api/projects/${selectedProject?.id}`),
          axiosInstance.get(`/api/issues/project/${selectedProject?.id}`),
        ]);
        setteamMembers(projectRes.data?.members || []);
        setProjectIssues(issuesRes.data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingContext(false);
      }
    };
    fetchContext();
  }, [selectedProject?.id, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const parentIssueOptions = useMemo(
    () => projectIssues.filter((item) => item.type !== "SUBTASK"),
    [projectIssues],
  );

  const dependencyOptions = useMemo(
    () =>
      projectIssues.filter((item) => {
        if (!item.id) return false;
        return item.id !== formData.parentIssueId;
      }),
    [formData.parentIssueId, projectIssues],
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setError("");
  };

  const handleParentChange = (value: string) => {
    setFormData((prevData) => {
      const isSubtask = value.length > 0;
      return {
        ...prevData,
        parentIssueId: value,
        type: isSubtask ? "SUBTASK" : prevData.type === "SUBTASK" ? "TASK" : prevData.type,
      };
    });
    setError("");
  };

  const toggleDependency = (issueId: string) => {
    setFormData((prev) => {
      const alreadySelected = prev.blockedByIssueIds.includes(issueId);
      const blockedByIssueIds = alreadySelected
        ? prev.blockedByIssueIds.filter((id) => id !== issueId)
        : [...prev.blockedByIssueIds, issueId];
      return {
        ...prev,
        blockedByIssueIds,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProject) {
      setError("Select a project and login before creating an issue.");
      return;
    }

    try {
      setIsloading(true);
      await axiosInstance.post("/api/issues", {
        title: formData.title,
        description: formData.description,
        type: formData.parentIssueId ? "SUBTASK" : formData.type,
        priority: formData.priority,
        status: "TODO",
        projectId: selectedProject?.id,
        reporterId: user?.id,
        assigneeId: formData.assigneeId || null,
        parentIssueId: formData.parentIssueId || null,
        blockedByIssueIds: formData.blockedByIssueIds,
        order: 0,
      });
      onClose();
      onCreated?.();
      resetForm();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          (error.response?.data as { message?: string } | undefined)?.message ||
            "Unable to create issue",
        );
      } else {
        setError("Unable to create issue");
      }
    } finally {
      setIsloading(false);
    }
  };

  const closeDialog = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? closeDialog() : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#172B4D]">
              Issue Title *
            </label>
            <Input
              type="text"
              name="title"
              placeholder="e.g., Implement user authentication"
              required
              className="h-10 border-[#DFE1E6] focus-visible:ring-[#0052CC]"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#172B4D]">
              Description
            </label>
            <Textarea
              name="description"
              placeholder="Add a description (optional)"
              className="min-h-[100px] border-[#DFE1E6] focus-visible:ring-[#0052CC] resize-none"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#172B4D]">
                Type
              </label>
              <select
                name="type"
                className="w-full h-10 rounded border border-[#DFE1E6] bg-white px-3 text-sm text-[#172B4D] focus-visible:ring-2 focus-visible:ring-[#0052CC]"
                value={formData.type}
                onChange={handleChange}
                disabled={!!formData.parentIssueId}
              >
                <option value="TASK">Task</option>
                <option value="BUG">Bug</option>
                <option value="STORY">Story</option>
                <option value="SUBTASK">Subtask</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#172B4D]">
                Priority
              </label>
              <select
                name="priority"
                className="w-full h-10 rounded border border-[#DFE1E6] bg-white px-3 text-sm text-[#172B4D] focus-visible:ring-2 focus-visible:ring-[#0052CC]"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#172B4D]">
                Assignee
              </label>
              <select
                name="assigneeId"
                className="w-full h-10 rounded border border-[#DFE1E6] bg-white px-3 text-sm text-[#172B4D] focus-visible:ring-2 focus-visible:ring-[#0052CC]"
                value={formData.assigneeId || ""}
                onChange={handleChange}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#172B4D]">
                <span className="inline-flex items-center gap-1">
                  <ListTree className="h-4 w-4" />
                  Parent Task
                </span>
              </label>
              <select
                name="parentIssueId"
                className="w-full h-10 rounded border border-[#DFE1E6] bg-white px-3 text-sm text-[#172B4D] focus-visible:ring-2 focus-visible:ring-[#0052CC]"
                value={formData.parentIssueId}
                onChange={(event) => handleParentChange(event.target.value)}
                disabled={loadingContext}
              >
                <option value="">No parent (create regular issue)</option>
                {parentIssueOptions.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {(issue.key ? `${issue.key} - ` : "") + issue.title}
                  </option>
                ))}
              </select>
              {formData.parentIssueId && (
                <p className="text-xs text-[#5E6C84]">
                  Parent selected. This issue will be created as a subtask.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#172B4D]">
                <span className="inline-flex items-center gap-1">
                  <Link2 className="h-4 w-4" />
                  Blocking Dependencies
                </span>
              </label>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded border border-[#DFE1E6] p-2">
                {dependencyOptions.length === 0 && (
                  <p className="text-xs text-[#5E6C84]">
                    No issues available for dependencies.
                  </p>
                )}
                {dependencyOptions.map((dependencyIssue) => {
                  const checked = formData.blockedByIssueIds.includes(dependencyIssue.id);
                  return (
                    <label
                      key={dependencyIssue.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-[#F4F5F7]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDependency(dependencyIssue.id)}
                      />
                      <span className="text-[#172B4D]">
                        {(dependencyIssue.key ? `${dependencyIssue.key} - ` : "") +
                          dependencyIssue.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse justify-end gap-2 border-t pt-4 sm:flex-row">
            <Button variant="outline" onClick={closeDialog} disabled={isloading}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
              disabled={isloading}
            >
              {isloading ? "Creating..." : "Create Issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateIssuemodel;
