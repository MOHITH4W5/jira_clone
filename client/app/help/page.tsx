"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpenText, ShieldCheck, BellRing, LayoutDashboard } from "lucide-react";

const HelpPage = () => {
  return (
    <div className="flex h-full flex-col overflow-auto bg-[#F4F5F7] p-4 md:p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-[#172B4D] sm:text-3xl">Help Center</h1>
        <p className="text-[#5E6C84]">
          Quick guide for security, collaboration, and project workflows
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#172B4D]">
              <ShieldCheck className="h-5 w-5" />
              Access & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#42526E]">
            <p>
              <Badge variant="outline" className="mr-2">Admin</Badge>
              Full control across projects and members.
            </p>
            <p>
              <Badge variant="outline" className="mr-2">Member</Badge>
              Can create/update work inside assigned projects.
            </p>
            <p>
              <Badge variant="outline" className="mr-2">Viewer</Badge>
              Read-only access to project data and history.
            </p>
            <p>Password reset and verification links are delivered by email.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#172B4D]">
              <BellRing className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#42526E]">
            <p>Use the bell icon in the sidebar to track unread alerts.</p>
            <p>Get updates for assignments, status changes, sprint events, and reminders.</p>
            <p>Enable/disable email notifications from Profile settings.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#172B4D]">
              <LayoutDashboard className="h-5 w-5" />
              Boards & Dashboards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#42526E]">
            <p>Kanban and Backlog pages support live updates through WebSocket events.</p>
            <p>Projects dashboard includes progress charts and issue status summaries.</p>
            <p>Use filters like “Only My Issues” and “Recently Updated” to focus work.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#172B4D]">
              <BookOpenText className="h-5 w-5" />
              Project History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#42526E]">
            <p>Open the History tab to see who changed what and when.</p>
            <p>Audit logs include issue changes, sprint actions, project updates, and attachments.</p>
            <p>This log is project-scoped and permission protected.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HelpPage;
