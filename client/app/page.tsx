"use client";

import KanbanBoard from "@/components/KanbanBoard";
import { AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import { ChevronRight, MoreHorizontal, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";

export default function Home() {
  const router = useRouter();
  const { selectedProject } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleShare = async () => {
    const boardUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(boardUrl);
      window.alert("Board link copied to clipboard.");
    } catch (error) {
      console.error(error);
      window.alert("Unable to copy link. Please copy from browser address bar.");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-[#5E6C84]">
          <button
            onClick={() => router.push("/projects")}
            className="hover:underline"
            type="button"
          >
            Projects
          </button>
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() => router.push("/projects")}
            className="hover:underline"
            type="button"
          >
            {selectedProject?.name || "No Project"}
          </button>
          <ChevronRight className="h-4 w-4" />
          <span>Kanban Board</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#172B4D]">
            Kanban Board
          </h1>
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
                    router.push("/backlog");
                  }}
                >
                  Open Backlog
                </button>
                <button
                  type="button"
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-[#F4F5F7]"
                  onClick={() => {
                    setShowMenu(false);
                    window.location.reload();
                  }}
                >
                  Refresh Board
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <Avatar
                key={i}
                className="h-8 w-8 rounded-full border-2 border-white"
              >
                <AvatarImage src={`https://i.pravatar.cc/150?u=${i}`} />
                <AvatarFallback>U{i}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-dashed bg-transparent"
          >
            Only My Issues
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-dashed bg-transparent"
          >
            Recently Updated
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto">
        <Suspense fallback={<div>Loading board...</div>}>
          <KanbanBoard />
        </Suspense>
      </div>
    </div>
  );
}
