"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import axios from "axios";
import { AlertCircle, Download, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";

type IssueRecord = {
  id: string;
  key?: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  projectId: string;
  sprintId?: string | null;
  parentIssueId?: string | null;
  blockedByIssueIds?: string[];
  reporterId?: string;
  assigneeId?: string | null;
  order?: number;
  comments?: string[];
  updatedAt?: string;
  createdAt?: string;
};

type Member = { id: string; name: string; avatar?: string };
type WorkLogEntry = {
  id: string;
  userId: string;
  logDate: string;
  durationMinutes: number;
  description: string;
};
type AttachmentEntry = {
  id: string;
  originalFileName: string;
  sizeBytes: number;
  createdAt?: string;
};

type IssueModalProps = {
  issue: { id?: string } | null;
  isOpen: boolean;
  onClose: () => void;
};

const todayString = () => new Date().toISOString().split("T")[0];

const issuePayload = (issue: IssueRecord, overrides: Partial<IssueRecord> = {}) => ({
  title: overrides.title ?? issue.title,
  description: overrides.description ?? issue.description ?? "",
  type: overrides.type ?? issue.type,
  priority: overrides.priority ?? issue.priority,
  status: overrides.status ?? issue.status,
  projectId: overrides.projectId ?? issue.projectId,
  reporterId: overrides.reporterId ?? issue.reporterId,
  assigneeId: overrides.assigneeId ?? issue.assigneeId ?? null,
  sprintId: overrides.sprintId ?? issue.sprintId ?? null,
  parentIssueId: overrides.parentIssueId ?? issue.parentIssueId ?? null,
  blockedByIssueIds: overrides.blockedByIssueIds ?? issue.blockedByIssueIds ?? [],
  order: overrides.order ?? issue.order ?? 0,
  comments: overrides.comments ?? issue.comments ?? [],
  updatedAt: new Date().toISOString(),
});

const errorMessage = (err: unknown, fallback: string) =>
  axios.isAxiosError(err)
    ? ((err.response?.data as { message?: string } | undefined)?.message ?? fallback)
    : fallback;

const formatSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

const IssueModel = ({ issue, isOpen, onClose }: IssueModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [localIssue, setLocalIssue] = useState<IssueRecord | null>(null);
  const [projectIssues, setProjectIssues] = useState<IssueRecord[]>([]);
  const [projectMembers, setProjectMembers] = useState<Member[]>([]);
  const [subtasks, setSubtasks] = useState<IssueRecord[]>([]);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([]);
  const [workLogTotal, setWorkLogTotal] = useState(0);
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [commentText, setCommentText] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState("");
  const [workLogForm, setWorkLogForm] = useState({
    logDate: todayString(),
    durationMinutes: "",
    description: "",
  });
  const [editingWorkLogId, setEditingWorkLogId] = useState<string | null>(null);
  const [editingWorkLogForm, setEditingWorkLogForm] = useState({
    logDate: todayString(),
    durationMinutes: "",
    description: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const assignee = useMemo(
    () => projectMembers.find((member) => member.id === localIssue?.assigneeId) || null,
    [projectMembers, localIssue?.assigneeId],
  );
  const memberNames = useMemo(() => new Map(projectMembers.map((m) => [m.id, m.name])), [projectMembers]);
  const dependencyCandidates = useMemo(
    () => projectIssues.filter((candidate) => candidate.id !== localIssue?.id),
    [projectIssues, localIssue?.id],
  );

  const refreshSubtasks = async (issueId: string) => {
    const res = await axiosInstance.get(`/api/issues/${issueId}/subtasks`);
    setSubtasks(res.data || []);
  };
  const refreshWorkLogs = async (issueId: string) => {
    const [logsRes, totalRes] = await Promise.all([
      axiosInstance.get(`/api/issues/${issueId}/worklogs`),
      axiosInstance.get(`/api/issues/${issueId}/worklogs/total`),
    ]);
    setWorkLogs(logsRes.data || []);
    setWorkLogTotal(Number(totalRes.data?.totalMinutes || 0));
  };
  const refreshAttachments = async (issueId: string) => {
    const res = await axiosInstance.get(`/api/issues/${issueId}/attachments`);
    setAttachments(res.data || []);
  };
  const refreshProjectContext = async (projectId: string) => {
    const [issuesRes, projectRes] = await Promise.all([
      axiosInstance.get(`/api/issues/project/${projectId}`),
      axiosInstance.get(`/api/projects/${projectId}`),
    ]);
    setProjectIssues(issuesRes.data || []);
    setProjectMembers(projectRes.data?.members || []);
  };

  const loadIssue = async (issueId: string) => {
    setLoading(true);
    setError("");
    try {
      const issueRes = await axiosInstance.get(`/api/issues/${issueId}`);
      const loadedIssue = issueRes.data as IssueRecord;
      setLocalIssue(loadedIssue);
      setDependencies(loadedIssue.blockedByIssueIds || []);
      await Promise.all([
        refreshProjectContext(loadedIssue.projectId),
        refreshSubtasks(loadedIssue.id),
        refreshWorkLogs(loadedIssue.id),
        refreshAttachments(loadedIssue.id),
      ]);
    } catch (err) {
      setError(errorMessage(err, "Failed to load issue"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && issue?.id) loadIssue(issue.id);
  }, [isOpen, issue?.id]);

  useEffect(() => {
    if (isOpen) return;
    setLocalIssue(null);
    setError("");
    setCommentText("");
    setSubtaskTitle("");
    setSubtaskAssigneeId("");
    setWorkLogForm({ logDate: todayString(), durationMinutes: "", description: "" });
    setEditingWorkLogId(null);
    setEditingWorkLogForm({ logDate: todayString(), durationMinutes: "", description: "" });
    setUploadFile(null);
  }, [isOpen]);

  const saveComment = async () => {
    if (!localIssue || !commentText.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const nextComments = [...(localIssue.comments || []), commentText.trim()];
      const res = await axiosInstance.put(`/api/issues/${localIssue.id}`, issuePayload(localIssue, { comments: nextComments }));
      setLocalIssue(res.data);
      setCommentText("");
    } catch (err) {
      setError(errorMessage(err, "Failed to save comment"));
    } finally {
      setSubmitting(false);
    }
  };

  const createSubtask = async () => {
    if (!localIssue || !subtaskTitle.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await axiosInstance.post("/api/issues", {
        title: subtaskTitle.trim(),
        description: "",
        type: "SUBTASK",
        priority: "MEDIUM",
        status: "TODO",
        projectId: localIssue.projectId,
        sprintId: localIssue.sprintId ?? null,
        parentIssueId: localIssue.id,
        reporterId: user?.id ?? localIssue.reporterId,
        assigneeId: subtaskAssigneeId || null,
        blockedByIssueIds: [],
        order: 0,
      });
      setSubtaskTitle("");
      setSubtaskAssigneeId("");
      await Promise.all([refreshSubtasks(localIssue.id), refreshProjectContext(localIssue.projectId)]);
    } catch (err) {
      setError(errorMessage(err, "Failed to create subtask"));
    } finally {
      setSubmitting(false);
    }
  };

  const saveDependencies = async () => {
    if (!localIssue) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await axiosInstance.put(
        `/api/issues/${localIssue.id}`,
        issuePayload(localIssue, { blockedByIssueIds: dependencies }),
      );
      setLocalIssue(res.data);
      setDependencies(res.data?.blockedByIssueIds || []);
    } catch (err) {
      setError(errorMessage(err, "Failed to save dependencies"));
    } finally {
      setSubmitting(false);
    }
  };

  const addWorkLog = async () => {
    if (!localIssue) return;
    setSubmitting(true);
    setError("");
    try {
      await axiosInstance.post(`/api/issues/${localIssue.id}/worklogs`, {
        userId: user?.id,
        logDate: workLogForm.logDate,
        durationMinutes: Number(workLogForm.durationMinutes),
        description: workLogForm.description.trim(),
      });
      setWorkLogForm({ logDate: todayString(), durationMinutes: "", description: "" });
      await refreshWorkLogs(localIssue.id);
    } catch (err) {
      setError(errorMessage(err, "Failed to add work log"));
    } finally {
      setSubmitting(false);
    }
  };

  const startEditWorkLog = (item: WorkLogEntry) => {
    setEditingWorkLogId(item.id);
    setEditingWorkLogForm({
      logDate: item.logDate,
      durationMinutes: String(item.durationMinutes),
      description: item.description || "",
    });
  };

  const saveWorkLogEdit = async () => {
    if (!editingWorkLogId || !localIssue) return;
    if (!window.confirm("Confirm edit of this work log?")) return;
    setSubmitting(true);
    setError("");
    try {
      await axiosInstance.put(`/api/worklogs/${editingWorkLogId}?confirm=true`, {
        userId: user?.id,
        logDate: editingWorkLogForm.logDate,
        durationMinutes: Number(editingWorkLogForm.durationMinutes),
        description: editingWorkLogForm.description.trim(),
      });
      setEditingWorkLogId(null);
      setEditingWorkLogForm({ logDate: todayString(), durationMinutes: "", description: "" });
      await refreshWorkLogs(localIssue.id);
    } catch (err) {
      setError(errorMessage(err, "Failed to edit work log"));
    } finally {
      setSubmitting(false);
    }
  };

  const removeWorkLog = async (workLogId: string) => {
    if (!localIssue) return;
    if (!window.confirm("Confirm delete of this work log?")) return;
    setSubmitting(true);
    setError("");
    try {
      await axiosInstance.delete(`/api/worklogs/${workLogId}?confirm=true`);
      await refreshWorkLogs(localIssue.id);
    } catch (err) {
      setError(errorMessage(err, "Failed to delete work log"));
    } finally {
      setSubmitting(false);
    }
  };

  const uploadAttachment = async () => {
    if (!localIssue || !uploadFile) return;
    setSubmitting(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", uploadFile);
      await axiosInstance.post(`/api/issues/${localIssue.id}/attachments`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadFile(null);
      await refreshAttachments(localIssue.id);
    } catch (err) {
      setError(errorMessage(err, "Failed to upload attachment"));
    } finally {
      setSubmitting(false);
    }
  };

  const downloadAttachment = async (item: AttachmentEntry) => {
    try {
      const res = await axiosInstance.get(`/api/attachments/${item.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.originalFileName || "attachment";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err, "Failed to download attachment"));
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    if (!localIssue) return;
    if (!window.confirm("Delete this attachment?")) return;
    setSubmitting(true);
    setError("");
    try {
      await axiosInstance.delete(`/api/attachments/${attachmentId}`);
      await refreshAttachments(localIssue.id);
    } catch (err) {
      setError(errorMessage(err, "Failed to delete attachment"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-sm font-semibold text-[#5E6C84]">
            {localIssue?.key ? `${localIssue.key} - ` : ""}{localIssue?.title || "Issue details"}
          </DialogTitle>
        </DialogHeader>
        {loading ? <div className="p-8 text-sm text-[#6B778C]">Loading issue details...</div> : null}
        {!loading && !localIssue ? <div className="p-8 text-sm text-[#6B778C]">Unable to load issue.</div> : null}
        {!loading && localIssue ? (
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 space-y-5 p-5 md:p-6">
              {error ? (
                <div className="flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
              <section className="space-y-1">
                <h2 className="text-2xl font-semibold text-[#172B4D]">{localIssue.title}</h2>
                <p className="text-sm text-[#42526E] whitespace-pre-wrap">{localIssue.description || "No description provided."}</p>
              </section>
              <section className="space-y-3 rounded-lg border border-[#DFE1E6] p-4">
                <h3 className="text-sm font-semibold text-[#172B4D]">Subtasks ({subtasks.length})</h3>
                <div className="space-y-2">
                  {subtasks.map((item) => (
                    <div key={item.id} className="rounded border bg-[#F8F9FB] p-2 text-sm">
                      <div className="font-medium text-[#172B4D]">{(item.key ? `${item.key} - ` : "") + item.title}</div>
                      <div className="text-xs text-[#6B778C]">{item.status}</div>
                    </div>
                  ))}
                  {subtasks.length === 0 ? <p className="text-xs text-[#6B778C]">No subtasks yet.</p> : null}
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <Input placeholder="New subtask title" value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} className="md:col-span-2" />
                  <select className="h-10 rounded border border-[#DFE1E6] px-3 text-sm" value={subtaskAssigneeId} onChange={(e) => setSubtaskAssigneeId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {projectMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-[#0052CC] text-white" onClick={createSubtask} disabled={submitting || !subtaskTitle.trim()}>
                    <Plus className="h-4 w-4 mr-1" />Add subtask
                  </Button>
                </div>
              </section>
              <section className="space-y-3 rounded-lg border border-[#DFE1E6] p-4">
                <h3 className="text-sm font-semibold text-[#172B4D]">Dependencies ({dependencies.length})</h3>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded border border-[#DFE1E6] p-2">
                  {dependencyCandidates.map((candidate) => (
                    <label key={candidate.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={dependencies.includes(candidate.id)}
                        onChange={() =>
                          setDependencies((prev) =>
                            prev.includes(candidate.id)
                              ? prev.filter((id) => id !== candidate.id)
                              : [...prev, candidate.id],
                          )
                        }
                      />
                      <span>{(candidate.key ? `${candidate.key} - ` : "") + candidate.title}</span>
                    </label>
                  ))}
                  {dependencyCandidates.length === 0 ? (
                    <p className="text-xs text-[#6B778C]">No issues available.</p>
                  ) : null}
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={saveDependencies} disabled={submitting}>
                    Save dependencies
                  </Button>
                </div>
              </section>

              <section className="space-y-3 rounded-lg border border-[#DFE1E6] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#172B4D]">Work logs</h3>
                  <Badge>{workLogTotal} min</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <Input
                    type="date"
                    value={workLogForm.logDate}
                    onChange={(e) => setWorkLogForm((prev) => ({ ...prev, logDate: e.target.value }))}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Minutes"
                    value={workLogForm.durationMinutes}
                    onChange={(e) =>
                      setWorkLogForm((prev) => ({ ...prev, durationMinutes: e.target.value }))
                    }
                  />
                  <Button
                    className="bg-[#0052CC] text-white"
                    onClick={addWorkLog}
                    disabled={
                      submitting ||
                      !workLogForm.logDate ||
                      !workLogForm.durationMinutes ||
                      Number(workLogForm.durationMinutes) <= 0
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />Add log
                  </Button>
                </div>
                <Textarea
                  placeholder="Work description"
                  value={workLogForm.description}
                  onChange={(e) =>
                    setWorkLogForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
                <div className="space-y-2">
                  {workLogs.map((item) => {
                    const editing = editingWorkLogId === item.id;
                    return (
                      <div key={item.id} className="rounded border bg-[#F8F9FB] p-3 text-sm">
                        {editing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <Input
                                type="date"
                                value={editingWorkLogForm.logDate}
                                onChange={(e) =>
                                  setEditingWorkLogForm((prev) => ({
                                    ...prev,
                                    logDate: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                type="number"
                                min={1}
                                value={editingWorkLogForm.durationMinutes}
                                onChange={(e) =>
                                  setEditingWorkLogForm((prev) => ({
                                    ...prev,
                                    durationMinutes: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <Textarea
                              value={editingWorkLogForm.description}
                              onChange={(e) =>
                                setEditingWorkLogForm((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setEditingWorkLogId(null)}>
                                Cancel
                              </Button>
                              <Button className="bg-[#0052CC] text-white" onClick={saveWorkLogEdit} disabled={submitting}>
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-medium text-[#172B4D]">
                                {memberNames.get(item.userId) || "Unknown user"} • {item.durationMinutes} min
                              </p>
                              <p className="text-xs text-[#6B778C]">
                                {item.logDate} • {item.description || "No description"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => startEditWorkLog(item)}>
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => removeWorkLog(item.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {workLogs.length === 0 ? (
                    <p className="text-xs text-[#6B778C]">No work logs yet.</p>
                  ) : null}
                </div>
              </section>

              <section className="space-y-3 rounded-lg border border-[#DFE1E6] p-4">
                <h3 className="text-sm font-semibold text-[#172B4D] flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({attachments.length})
                </h3>
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="md:flex-1" />
                  <Button className="bg-[#0052CC] text-white" onClick={uploadAttachment} disabled={submitting || !uploadFile}>
                    Upload
                  </Button>
                </div>
                <p className="text-xs text-[#6B778C]">Allowed: PDF/PNG/JPG/JPEG/DOCX up to 10MB</p>
                <div className="space-y-2">
                  {attachments.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 rounded border bg-[#F8F9FB] p-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#172B4D]">{item.originalFileName}</p>
                        <p className="text-xs text-[#6B778C]">{formatSize(item.sizeBytes)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => downloadAttachment(item)}>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => removeAttachment(item.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {attachments.length === 0 ? (
                    <p className="text-xs text-[#6B778C]">No attachments yet.</p>
                  ) : null}
                </div>
              </section>

              <section className="space-y-3 rounded-lg border border-[#DFE1E6] p-4">
                <h3 className="text-sm font-semibold text-[#172B4D]">
                  Comments ({localIssue.comments?.length || 0})
                </h3>
                <div className="space-y-2">
                  {(localIssue.comments || []).map((comment, index) => (
                    <div key={`${comment}-${index}`} className="rounded border bg-[#F8F9FB] p-3 text-sm whitespace-pre-wrap">
                      {comment}
                    </div>
                  ))}
                  {(localIssue.comments || []).length === 0 ? (
                    <p className="text-xs text-[#6B778C]">No comments yet.</p>
                  ) : null}
                </div>
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." />
                    <div className="flex justify-end">
                      <Button className="bg-[#0052CC] text-white" onClick={saveComment} disabled={submitting || !commentText.trim()}>
                        Save comment
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="w-full border-t bg-[#FAFBFC] p-6 md:w-[280px] md:border-l md:border-t-0">
              <div className="space-y-5 text-sm">
                <div>
                  <p className="text-xs font-bold uppercase text-[#5E6C84]">Status</p>
                  <Badge className="mt-1">{localIssue.status}</Badge>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[#5E6C84]">Type</p>
                  <p className="mt-1 text-[#172B4D]">{localIssue.type}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[#5E6C84]">Priority</p>
                  <p className="mt-1 text-[#172B4D]">{localIssue.priority}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[#5E6C84]">Assignee</p>
                  {assignee ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback>{assignee.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <span>{assignee.name}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-[#6B778C]">Unassigned</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[#5E6C84]">Parent task</p>
                  <p className="mt-1 break-all text-[#172B4D]">{localIssue.parentIssueId || "None"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[#5E6C84]">Last updated</p>
                  <p className="mt-1 text-[#172B4D]">{localIssue.updatedAt ? new Date(localIssue.updatedAt).toLocaleString() : "N/A"}</p>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default IssueModel;
