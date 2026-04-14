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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

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
      <div className="space-y-4 p-6">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-lg bg-[#EBECF0]" />
        ))}
      </div>
    );
  }

  const allIssues = Object.values(issuesByProject).flat();
  const statusOrder = ["TODO", "IN_PROGRESS", "DONE"];
  const statusChartData = statusOrder.map((status) => ({
    status: status.replace("_", " "),
    count: allIssues.filter((issue: any) => issue.status === status).length,
  }));

  const progressChartData = projects.map((project: any) => {
    const projectIssues = issuesByProject[project.id] || [];
    const done = projectIssues.filter((issue: any) => issue.status === "DONE").length;
    const total = projectIssues.length || 1;
    return {
      name: project.key || project.name,
      progress: Math.round((done / total) * 100),
    };
  });

  const pieColors = ["#0052CC", "#36B37E", "#FFAB00"];

  return (
    <div className="flex h-full flex-col overflow-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-[#172B4D] sm:text-3xl">Projects</h1>
        <p className="text-[#5E6C84]">Manage and view all your projects</p>
      </div>

      <Button
        className="mb-6 w-full bg-[#0052CC] text-white hover:bg-[#0747A6] sm:w-fit"
        onClick={() => router.push("/create-project")}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Project
      </Button>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#172B4D]">Issue Status Overview</CardTitle>
            <CardDescription>Live distribution of all project issues</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={entry.status} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#172B4D]">Project Progress</CardTitle>
            <CardDescription>Completion percentage by project</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="progress" fill="#0052CC" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project: any) => {
          const projectIssues = issuesByProject[project.id] || [];
          const memberCount = Array.isArray(project.memberIds)
            ? project.memberIds.length
            : 0;
          const doneCount = projectIssues.filter((issue: any) => issue.status === "DONE").length;
          const progress = projectIssues.length
            ? Math.round((doneCount / projectIssues.length) * 100)
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

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#6B778C]">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 rounded bg-[#EBECF0]">
                      <div
                        className="h-2 rounded bg-[#36B37E] transition-all"
                        style={{ width: `${progress}%` }}
                      />
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
