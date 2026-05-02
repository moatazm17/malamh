import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListActivity } from "@workspace/api-client-react";
import { Loader2, Activity as ActivityIcon, ChevronDown } from "lucide-react";

const resultBadge = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("allow") || a.includes("open") || a.includes("granted")) return "badge-open";
  if (a.includes("block") || a.includes("denied") || a.includes("reject")) return "badge-blocked";
  return "badge-token";
};

const FILTERS = ["All", "Allowed", "Blocked", "Token"];

export default function Activity() {
  const { data, isLoading } = useListActivity({ limit: 200 });
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const allLogs = data?.logs ?? [];
  const filtered = allLogs.filter((l) => {
    if (filter === "All") return true;
    const cls = resultBadge(l.action);
    if (filter === "Allowed") return cls === "badge-open";
    if (filter === "Blocked") return cls === "badge-blocked";
    if (filter === "Token") return cls === "badge-token";
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageLogs = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <DashboardLayout>
      <div className="anim-fade-up">
        <div className="mb-8">
          <div className="section-label mb-2">Activity Log</div>
          <h1 className="headline-section text-3xl md:text-4xl">Every check, every face</h1>
          <p className="text-base mt-2" style={{ color: "var(--text-secondary)" }}>
            Complete log of consent checks against your registered faces.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            {FILTERS.map((f) => (
              <button
                key={f} onClick={() => { setFilter(f); setPage(0); }}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: filter === f ? "var(--accent-blue)" : "transparent",
                  color: filter === f ? "white" : "var(--text-secondary)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{filtered.length} entries</span>
        </div>

        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent-blue)" }} />
            </div>
          ) : pageLogs.length === 0 ? (
            <div className="text-center py-20">
              <ActivityIcon className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No activity yet. Once AI systems start checking your consent, entries will appear here.
              </p>
            </div>
          ) : (
            <table className="table-mh">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Requester</th>
                  <th>Face</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {pageLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: "var(--text-muted)" }}>
                      {new Date(log.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>{log.requesterName ?? "—"}</td>
                    <td className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{log.faceId ?? "—"}</td>
                    <td>
                      <span className={`badge-mh ${resultBadge(log.action)}`}>
                        {log.action.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="btn-mh btn-mh-ghost text-xs" style={{ padding: "6px 14px" }}
            >← Prev</button>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Page {page + 1} of {pageCount}</span>
            <button
              onClick={() => setPage(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1}
              className="btn-mh btn-mh-ghost text-xs" style={{ padding: "6px 14px" }}
            >Next →</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
