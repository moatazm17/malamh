import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListActivity } from "@workspace/api-client-react";
import { Loader2, Activity as ActivityIcon, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const actionConfig = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("allow") || a.includes("open") || a.includes("granted")) {
    return { icon: CheckCircle, color: "text-green-400", badge: "badge-open" };
  }
  if (a.includes("block") || a.includes("denied") || a.includes("reject")) {
    return { icon: XCircle, color: "text-destructive", badge: "badge-blocked" };
  }
  return { icon: AlertCircle, color: "text-yellow-400", badge: "badge-token" };
};

export default function Activity() {
  const { data, isLoading } = useListActivity({ limit: 100 });
  const logs = data?.logs ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every consent check against your registered faces.
          </p>
        </div>

        <div className="surface p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <ActivityIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No activity yet. Once AI systems start checking your consent, entries will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {logs.map((log, i) => {
                const cfg = actionConfig(log.action);
                const Icon = cfg.icon;
                return (
                  <div
                    key={log.id}
                    className={`flex items-center gap-4 py-3 ${i < logs.length - 1 ? "border-b border-border/30" : ""}`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.faceId && (
                          <span className="font-mono text-xs text-muted-foreground">{log.faceId}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
                          {log.action.toLowerCase().replace(/_/g, " ")}
                        </span>
                        {log.requesterName && (
                          <span className="text-xs text-muted-foreground">by {log.requesterName}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
