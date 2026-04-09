"use client";

import {
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import CreateIssuemodel from "./CreateIssuemodel";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";

const Sidebar = () => {
  const router = useRouter();
  const { user, logout, selectedProject, setSelectedProject } = useAuth();
  const [project, setProject] = useState<any[]>([]);
  const [loading, setloading] = useState(false);
  const [showprojectmenu, setShowprojectmenu] = useState(false);
  const [showcreateissuemodel, setShowcreateissuemodel] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      setloading(true);
      try {
        const res = await axiosInstance.get("/api/projects");
        const userProjects = res.data.filter(
          (project: any) =>
            project.ownerId === user.id || project.memberIds?.includes(user.id),
        );
        setProject(userProjects);
        if (!selectedProject && userProjects.length > 0) {
          setSelectedProject(userProjects[0]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setloading(false);
      }
    };
    fetchProjects();
  }, [user, selectedProject, setSelectedProject]);

  if (loading) {
    return (
      <div className="flex h-screen w-64 items-center justify-center border-r bg-[#F4F5F7]">
        <span className="text-sm text-[#6B778C]">Loading projects...</span>
      </div>
    );
  }

  const redirectproject = () => {
    router.push("/create-project");
  };
  const HandleLogout = () => {
    logout();
    router.push("/login");
  };
  return (
    <div className="flex h-screen w-64 flex-col border-r bg-[#F4F5F7] text-[#42526E]">
      <div className="flex items-center gap-2 p-4 pt-6">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0052CC] text-white">
          <FolderKanban className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-[#172B4D]">
          Jira Clone
        </span>
      </div>

      {selectedProject && (
        <div className="border-b px-2 py-3">
          <div className="relative">
            <button
              onClick={() => setShowprojectmenu(!showprojectmenu)}
              className="w-full rounded border border-[#DFE1E6] bg-white px-3 py-2 text-sm transition-colors hover:border-[#0052CC]"
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="flex-1 truncate text-left font-medium text-[#172B4D]">
                  {selectedProject?.name}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showprojectmenu ? "rotate-180" : ""}`}
                />
              </div>
            </button>
            {showprojectmenu && (
              <div className="absolute left-2 right-2 top-10 z-50 rounded border border-[#DFE1E6] bg-white shadow-lg">
                {project.map((project: any) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      setShowprojectmenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#EBECF0] text-[#42526E]"
                  >
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    {project.name}
                  </button>
                ))}
                <div className="border-t px-3 py-2">
                  <button
                    onClick={redirectproject}
                    className="w-full py-1.5 px-1 text-left text-sm text-[#0052CC] hover:bg-[#EBECF0]"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create project
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="mb-6 px-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="h-9 bg-white pl-8 focus-visible:ring-[#0052CC]"
            />
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem
            href="/"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Kanban Board"
          />
          <NavItem
            href="/backlog"
            icon={<ListTodo className="h-4 w-4" />}
            label="Backlog"
          />
          <NavItem
            href="/projects"
            icon={<FolderKanban className="h-4 w-4" />}
            label="Projects"
          />
          <NavItem
            href="/team"
            icon={<Users className="h-4 w-4" />}
            label="Team"
          />
          <NavItem
            href="/profile"
            icon={<Settings className="h-4 w-4" />}
            label="Profile"
          />
        </nav>
      </div>
      <div className="space-y-3 border-t p-4">
        {user && (
          <div className="flex items-center gap-2 rounded bg-white px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {user?.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#172B4D]">
                {user?.name}
              </p>
              <p className="truncate text-xs text-[#6B778C]">{user?.email}</p>
            </div>
          </div>
        )}
        <Button
          className="w-full justify-start gap-2 bg-[#0052CC] text-white hover:bg-[#0747A6]"
          onClick={() => setShowcreateissuemodel(true)}
        >
          <Plus className="h-4 w-4" />
          Create Issue
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-[#42526E] hover:bg-[#EBECF0]"
          onClick={HandleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
      <CreateIssuemodel
        isOpen={showcreateissuemodel}
        onClose={() => setShowcreateissuemodel(false)}
      />
    </div>
  );
};

export default Sidebar;

function NavItem({ href, icon, label, active }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#DEEBFF] text-[#0052CC]"
          : "text-[#42526E] hover:bg-[#EBECF0]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
