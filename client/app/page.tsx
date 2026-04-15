"use client";

import KanbanBoard from "@/components/KanbanBoard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { ChevronRight, MoreHorizontal, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

export default function Home() {
  const router = useRouter();
  const { selectedProject } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return;

    const handleScroll = () => {
      setParallaxOffset(root.scrollTop);
    };

    handleScroll();
    root.addEventListener("scroll", handleScroll, { passive: true });
    return () => root.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        root,
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    targets.forEach((target, index) => {
      target.style.setProperty("--reveal-delay", `${Math.min(index * 80, 320)}ms`);
      observer.observe(target);
    });

    return () => observer.disconnect();
  }, [selectedProject?.id]);

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
    <div
      ref={scrollContainerRef}
      className="relative flex h-full flex-col overflow-y-auto p-4 md:p-6"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="parallax-orb parallax-orb-1"
          style={{ transform: `translate3d(0, ${parallaxOffset * 0.18}px, 0)` }}
        />
        <div
          className="parallax-orb parallax-orb-2"
          style={{ transform: `translate3d(0, ${parallaxOffset * -0.12}px, 0)` }}
        />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-6 flex flex-col gap-4">
          <div
            data-reveal
            className="reveal-on-scroll flex flex-wrap items-center gap-2 text-xs text-[#5E6C84] sm:text-sm"
          >
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

          <div
            data-reveal
            className="reveal-on-scroll flex flex-wrap items-center justify-between gap-3"
          >
            <h1 className="text-reveal-scroll text-xl font-semibold text-[#172B4D] sm:text-2xl">
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
                <div className="glass-panel skeuo-soft absolute right-0 top-10 z-20 min-w-40 rounded-xl border border-white/80 bg-white/80 p-1 shadow-lg">
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

          <div
            data-reveal
            className="reveal-on-scroll glass-panel skeuo-soft flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/65 p-2 sm:gap-4"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOnlyMyIssues((prev) => !prev)}
              className={`skeuo-pill-btn h-8 rounded-full border-dashed bg-transparent px-3 text-xs sm:text-sm ${
                onlyMyIssues ? "border-[#0052CC] text-[#0052CC]" : ""
              }`}
            >
              Only My Issues
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecentlyUpdated((prev) => !prev)}
              className={`skeuo-pill-btn h-8 rounded-full border-dashed bg-transparent px-3 text-xs sm:text-sm ${
                recentlyUpdated ? "border-[#0052CC] text-[#0052CC]" : ""
              }`}
            >
              Recently Updated
            </Button>
          </div>
        </div>

        <div data-reveal className="reveal-on-scroll min-h-0 flex-1 overflow-x-auto pb-2">
          <Suspense fallback={<div>Loading board...</div>}>
            <KanbanBoard
              onlyMyIssues={onlyMyIssues}
              recentlyUpdated={recentlyUpdated}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
