"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const page = () => {
  const router = useRouter();
  const { user, setSelectedProject } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [issuesByProject, setIssuesByProject] = useState<Record<string, any[]>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/projects");
      const userProjects = (res.data || []).filter(
        (p: any) =>
          p.ownerId === user?.id ||
          (Array.isArray(p.memberIds) && p.memberIds.includes(user?.id)),
      );
      setProjects(userProjects);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssuesForProject = async (projectId: string) => {
    try {
      const res = await axiosInstance.get(`/api/issues/project/${projectId}`);
      setIssuesByProject((prev) => ({
        ...prev,
        [projectId]: res.data || [],
      }));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchProjects();
  }, [user]);

  useEffect(() => {
    projects.forEach((project: any) => {
      fetchIssuesForProject(project.id);
    });
  }, [projects]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-[#172B4D]">Projects</h1>
        <p className="text-[#5E6C84]">Manage and view all your projects</p>
      </div>

      <Button
        className="mb-6 w-fit bg-[#0052CC] text-white hover:bg-[#0747A6]"
        onClick={() => router.push("/create-project")}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Project
      </Button>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project: any) => {
          const projectIssues = issuesByProject[project.id] || [];
          const memberCount = Array.isArray(project.memberIds)
            ? project.memberIds.length
            : 0;

          return (
            <Card
              key={project.id}
              className="cursor-pointer transition-shadow hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-[#172B4D]">
                      {project.name}
                    </CardTitle>
                    <CardDescription>Key: {project.key}</CardDescription>
                  </div>
                  <Badge variant="outline">{project.key}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-[#5E6C84]">
                    {project.description || "No description"}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-[#5E6C84]">
                      <Users className="h-4 w-4" />
                      <span>{memberCount} members</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#5E6C84]">
                      <span>{projectIssues.length} issues</span>
                    </div>
                  </div>

                  <Link href="/" onClick={() => setSelectedProject(project)}>
                    <Button
                      variant="outline"
                      className="mt-4 w-full border-[#0052CC] bg-transparent text-[#0052CC] hover:bg-[#DEEBFF]"
                    >
                      View Board
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center">
          <p className="mb-4 text-[#5E6C84]">No projects yet</p>
          <Button
            className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
            onClick={() => router.push("/create-project")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create your first project
          </Button>
        </div>
      )}
    </div>
  );
};

export default page;
