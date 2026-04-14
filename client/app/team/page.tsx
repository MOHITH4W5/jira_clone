"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { Mail, Trash2, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";

const page = () => {
  const { user, selectedProject, setSelectedProject } = useAuth();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMembers = async (projectId: string) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/projects/${projectId}`);
      setTeamMembers(res.data.members || []);
    } catch (error) {
      console.error(error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const ensureSelectedProject = async () => {
    if (!user) return;
    if (selectedProject?.id) {
      fetchMembers(selectedProject.id);
      return;
    }

    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/projects");
      const userProjects = (res.data || []).filter(
        (project: any) =>
          project.ownerId === user.id ||
          (Array.isArray(project.memberIds) &&
            project.memberIds.includes(user.id)),
      );

      if (userProjects.length > 0) {
        setSelectedProject(userProjects[0]);
        await fetchMembers(userProjects[0].id);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error(error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ensureSelectedProject();
  }, [user, selectedProject?.id]);

  const handleAddmember = async () => {
    if (!selectedProject?.id) {
      alert("Please create/select a project first.");
      return;
    }

    const name = window.prompt("Enter member name:");
    if (!name) return;

    const email =
      window.prompt("Enter member email:") ||
      `${name.toLowerCase().replaceAll(" ", ".")}@example.com`;
    const group =
      window.prompt("Enter group (Engineering / Design / Admin):") ||
      "Engineering";
    const roleInput =
      window.prompt("Enter role (ADMIN / PROJECT_MANAGER / MEMBER / VIEWER):") ||
      "MEMBER";
    const role = roleInput.trim().toUpperCase();
    const allowedRoles = ["ADMIN", "PROJECT_MANAGER", "MEMBER", "VIEWER"];
    if (!allowedRoles.includes(role)) {
      alert("Invalid role. Use ADMIN, PROJECT_MANAGER, MEMBER, or VIEWER.");
      return;
    }
    const password = `${email.split("@")[0]}@123`;
    const avatar = `https://i.pravatar.cc/150?u=${email}`;

    try {
      setLoading(true);
      const res = await axiosInstance.post("/api/users/signup", {
        name,
        email,
        password,
        role,
        group,
        avatar,
      });
      const newUser = res.data;
      const updatedMemberIds = Array.from(
        new Set([...(selectedProject.memberIds || []), newUser.id]),
      );

      await axiosInstance.put(`/api/projects/${selectedProject.id}`, {
        name: selectedProject.name,
        description: selectedProject.description,
        memberIds: updatedMemberIds,
      });

      setSelectedProject({ ...selectedProject, memberIds: updatedMemberIds });
      await fetchMembers(selectedProject.id);
    } catch (error) {
      console.log(error);
      alert("Unable to add member. Check if this email already exists.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (userId: string, name: string) => {
    if (!selectedProject?.id) return;
    if (!window.confirm(`Remove ${name} from project?`)) return;

    try {
      setLoading(true);
      const updatedMemberIds = (selectedProject.memberIds || []).filter(
        (id: string) => id !== userId,
      );

      await axiosInstance.put(`/api/projects/${selectedProject.id}`, {
        name: selectedProject.name,
        description: selectedProject.description,
        memberIds: updatedMemberIds,
      });

      setSelectedProject({ ...selectedProject, memberIds: updatedMemberIds });
      await fetchMembers(selectedProject.id);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const groupMap = new Map<string, any[]>();
  teamMembers.forEach((member: any) => {
    const group = member.group || "Ungrouped";
    if (!groupMap.has(group)) {
      groupMap.set(group, []);
    }
    groupMap.get(group)?.push(member);
  });

  const groups = Array.from(groupMap.keys());
  const filteredMembers = selectedGroup
    ? teamMembers.filter((member: any) => member.group === selectedGroup)
    : teamMembers;

  return (
    <div className="relative flex h-full flex-col bg-[#F4F5F7] p-4 md:p-8">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70">
          <p className="text-sm text-[#6B778C]">Updating team...</p>
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D] sm:text-3xl">Team Management</h1>
          <p className="mt-1 text-sm text-[#5E6C84]">
            {teamMembers.length} team members
          </p>
        </div>
        <Button
          className="w-full bg-[#0052CC] text-white hover:bg-[#0747A6] sm:w-auto"
          onClick={handleAddmember}
          disabled={!selectedProject?.id}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </header>

      {!selectedProject?.id && (
        <p className="mb-4 text-sm text-[#6B778C]">
          Select or create a project to manage members.
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={selectedGroup === null ? "default" : "outline"}
          onClick={() => setSelectedGroup(null)}
          className={selectedGroup === null ? "bg-[#0052CC] text-white" : ""}
        >
          All Members
        </Button>
        {groups.map((group) => (
          <Button
            key={group}
            variant={selectedGroup === group ? "default" : "outline"}
            onClick={() => setSelectedGroup(group)}
            className={selectedGroup === group ? "bg-[#0052CC] text-white" : ""}
          >
            {group}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border bg-white">
        <Table>
          <TableHeader className="sticky top-0 bg-[#F4F5F7]">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Group</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">{member.name}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {member.email}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={
                        member.role === "ADMIN"
                          ? "bg-red-100 text-red-800"
                          : member.role === "VIEWER"
                            ? "bg-slate-100 text-slate-700"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {member.role}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="bg-[#EBECF0]">
                      {member.group || "Ungrouped"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleDeleteMember(member.id, member.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default page;
