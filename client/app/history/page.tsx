"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { Clock3, History } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  performedByUserId: string;
  createdAt: string;
};

const HistoryPage = () => {
  const { selectedProject } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!selectedProject?.id) return;
      try {
        setLoading(true);
        setError("");
        const response = await axiosInstance.get(
          `/api/audit/project/${selectedProject.id}`,
        );
        setItems(response.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedProject?.id]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, AuditItem[]>>((acc, item) => {
      const day = new Date(item.createdAt).toLocaleDateString();
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    }, {});
  }, [items]);

  if (!selectedProject?.id) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Select a project to view history
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#F4F5F7] p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-[#172B4D]">History</h1>
        <p className="text-[#5E6C84]">
          Detailed audit log for {selectedProject.name}
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-[#172B4D]">
            <History className="h-5 w-5" />
            Project Activity Trail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded bg-[#EBECF0]" />
              ))}
            </div>
          ) : error ? (
            <p className="p-4 text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-[#6B778C]">No history yet</p>
          ) : (
            <div className="divide-y">
              {Object.entries(grouped).map(([day, logs]) => (
                <div key={day} className="p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B778C]">
                    {day}
                  </p>
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded border border-[#DFE1E6] bg-white p-3"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#172B4D]">
                            {log.action} {log.entityType}
                          </p>
                          <span className="flex items-center gap-1 text-xs text-[#6B778C]">
                            <Clock3 className="h-3.5 w-3.5" />
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#42526E]">{log.details}</p>
                        <p className="mt-1 text-[11px] text-[#6B778C]">
                          by user: {log.performedByUserId}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoryPage;
