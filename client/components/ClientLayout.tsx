"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const publicPages = ["/login", "/setup-project", "/verify-email"];
    const isPublic = publicPages.includes(pathname);

    if (!isAuthenticated && !isPublic) {
      router.push("/login");
    }

    if (isAuthenticated && pathname === "/login") {
      router.push("/");
    }

    setIsReady(true);
  }, [isAuthenticated, pathname, router]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.style.overflow = "hidden";
      return;
    }
    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileNavOpen]);

  if (!isReady) {
    return <div className="h-screen w-screen bg-white" />;
  }

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/setup-project" ||
    pathname === "/verify-email";

  return isAuthPage ? (
    children
  ) : (
    <div className="flex min-h-screen bg-white">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            className="rounded border border-[#DFE1E6] p-2 text-[#172B4D]"
            aria-label={isMobileNavOpen ? "Close navigation" : "Open navigation"}
          >
            {isMobileNavOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <h1 className="truncate text-sm font-semibold text-[#172B4D]">
            Jira Clone
          </h1>
        </header>

        {isMobileNavOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close mobile navigation overlay"
            />
            <div className="fixed left-0 top-0 z-50 h-screen lg:hidden">
              <Sidebar
                className="w-[85vw] max-w-80 shadow-xl"
                onNavigate={() => setIsMobileNavOpen(false)}
              />
            </div>
          </>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

export default ClientLayout;
