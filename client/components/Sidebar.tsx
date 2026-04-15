"use client";

import {
  Bell,
  BookOpenText,
  ChevronDown,
  FolderKanban,
  History,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Search,
  Settings,
  X,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Input } from "./ui/input";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import CreateIssuemodel from "./CreateIssuemodel";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { cn } from "@/lib/utils";

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

const Sidebar = ({ className, onNavigate }: SidebarProps) => {
  const router = useRouter();
  const { user, logout, selectedProject, setSelectedProject } = useAuth();
  const [project, setProject] = useState<any[]>([]);
  const [loading, setloading] = useState(false);
  const [showprojectmenu, setShowprojectmenu] = useState(false);
  const [showcreateissuemodel, setShowcreateissuemodel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement | null>(null);
  const notifButtonRef = useRef<HTMLButtonElement | null>(null);
  const [notifPanelStyle, setNotifPanelStyle] = useState<CSSProperties>({
    position: "fixed",
    top: 88,
    left: 12,
    width: 320,
    zIndex: 80,
  });

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

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      setNotifLoading(true);
      const [notifRes, countRes] = await Promise.all([
        axiosInstance.get(`/api/notifications/user/${user.id}`),
        axiosInstance.get(`/api/notifications/user/${user.id}/unread-count`),
      ]);
      setNotifications(notifRes.data || []);
      setUnreadCount(Number(countRes.data?.unreadCount || 0));
    } catch (error) {
      console.error(error);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 45000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  const updateNotifPanelPosition = () => {
    const anchor = notifButtonRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const panelWidth = Math.min(352, window.innerWidth - viewportPadding * 2);
    let left = rect.right - panelWidth;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - panelWidth - viewportPadding));

    const top = Math.min(
      rect.bottom + 10,
      window.innerHeight - 120,
    );

    setNotifPanelStyle({
      position: "fixed",
      top,
      left,
      width: panelWidth,
      zIndex: 80,
    });
  };

  useEffect(() => {
    if (!showNotifications) return;

    updateNotifPanelPosition();
    const handleViewportChange = () => updateNotifPanelPosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (!showNotifications) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifPanelRef.current?.contains(target)) return;
      if (notifButtonRef.current?.contains(target)) return;
      setShowNotifications(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showNotifications]);

  const markNotificationRead = async (notificationId: string) => {
    try {
      await axiosInstance.put(`/api/notifications/${notificationId}/read?read=true`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user?.id) return;
    try {
      await axiosInstance.put(`/api/notifications/user/${user.id}/read-all`);
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel skeuo-soft flex h-screen w-64 items-center justify-center border-r border-white/70 bg-[#F4F5F7]/85">
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
    onNavigate?.();
  };

  const formatRelativeTime = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div
      className={cn(
        "glass-panel skeuo-soft flex h-screen w-64 flex-col border-r border-white/70 bg-[#F4F5F7]/85 text-[#42526E]",
        className,
      )}
    >
      <div className="flex items-center gap-2 p-4 pt-6">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0052CC] text-white">
          <FolderKanban className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-[#172B4D]">
          Jira Clone
        </span>
        <div className="ml-auto relative">
          <button
            ref={notifButtonRef}
            type="button"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              if (!showNotifications) {
                fetchNotifications();
              }
            }}
            className="skeuo-soft relative rounded-xl border border-white/80 bg-white/70 p-1.5 text-[#42526E] backdrop-blur-sm transition hover:bg-[#EBECF0]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-[#DE350B] px-1.5 text-[10px] text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div
              ref={notifPanelRef}
              style={notifPanelStyle}
              className="glass-panel skeuo-soft overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#DFE1E6]/70 px-3 py-2">
                <p className="text-sm font-semibold text-[#172B4D]">
                  Notifications
                </p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#DEEBFF] px-2 py-0.5 text-[10px] font-semibold text-[#0052CC]">
                    {unreadCount} unread
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="rounded-lg p-1 text-[#6B778C] hover:bg-[#EBECF0]"
                    aria-label="Close notifications"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-xs text-[#0052CC] hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto px-2 pb-2">
                {notifLoading ? (
                  <p className="px-3 py-3 text-xs text-[#6B778C]">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-[#6B778C]">No notifications</p>
                ) : (
                  notifications.slice(0, 20).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => !item.read && markNotificationRead(item.id)}
                      className={`mb-2 w-full rounded-xl border px-3 py-2 text-left transition hover:bg-[#F4F5F7] ${
                        item.read
                          ? "border-[#DFE1E6] bg-white/80"
                          : "border-[#B3D4FF] bg-[#DEEBFF]/70"
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#172B4D]">
                        {item.type}
                      </p>
                      <p className="mt-1 text-xs text-[#42526E]">{item.message}</p>
                      <p className="mt-1 text-[11px] text-[#6B778C]">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedProject && (
        <div className="border-b px-2 py-3">
          <div className="relative">
            <button
              onClick={() => setShowprojectmenu(!showprojectmenu)}
              className="skeuo-soft w-full rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-sm transition-colors hover:border-[#0052CC]"
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
              <div className="glass-panel skeuo-soft absolute left-2 right-2 top-10 z-50 rounded-xl border border-white/70 bg-white/85 shadow-lg">
                {project.map((project: any) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      setShowprojectmenu(false);
                      onNavigate?.();
                    }}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#EBECF0] text-[#42526E]"
                  >
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    {project.name}
                  </button>
                ))}
                <div className="border-t px-3 py-2">
                  <button
                    onClick={() => {
                      redirectproject();
                      onNavigate?.();
                    }}
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
              className="skeuo-soft h-9 bg-white/75 pl-8 focus-visible:ring-[#0052CC]"
            />
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem
            href="/"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Kanban Board"
            onNavigate={onNavigate}
          />
          <NavItem
            href="/backlog"
            icon={<ListTodo className="h-4 w-4" />}
            label="Backlog"
            onNavigate={onNavigate}
          />
          <NavItem
            href="/projects"
            icon={<FolderKanban className="h-4 w-4" />}
            label="Projects"
            onNavigate={onNavigate}
          />
          <NavItem
            href="/team"
            icon={<Users className="h-4 w-4" />}
            label="Team"
            onNavigate={onNavigate}
          />
          <NavItem
            href="/profile"
            icon={<Settings className="h-4 w-4" />}
            label="Profile"
            onNavigate={onNavigate}
          />
          <NavItem
            href="/history"
            icon={<History className="h-4 w-4" />}
            label="History"
            onNavigate={onNavigate}
          />
          <NavItem
            href="/help"
            icon={<BookOpenText className="h-4 w-4" />}
            label="Help"
            onNavigate={onNavigate}
          />
        </nav>
      </div>
      <div className="space-y-3 border-t p-4">
        {user && (
          <div className="skeuo-soft flex items-center gap-2 rounded-xl bg-white/75 px-2 py-2">
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
          className="skeuo-soft w-full justify-start gap-2 bg-[#0052CC] text-white hover:bg-[#0747A6]"
          onClick={() => setShowcreateissuemodel(true)}
        >
          <Plus className="h-4 w-4" />
          Create Issue
        </Button>
        <Button
          variant="ghost"
          className="skeuo-soft w-full justify-start gap-2 text-[#42526E] hover:bg-[#EBECF0]"
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

function NavItem({ href, icon, label, active, onNavigate }: any) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
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
