import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListScanResults, useRunMonitorScan } from "@workspace/api-client-react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Loader2, ShieldAlert, Eye, Globe, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusBadge = (status: string) => {
  const s = status.toLowerCase();
  if (s === "found" || s === "unreviewed") return "badge-blocked";
  if (s === "safe" || s === "dismissed") return "badge-open";
  return "badge-token";
};

export default function Monitor() {
  const { data: scanResults, isLoading } = useListScanResults();
  const { data: stats } = useGetDashboardStats();
  const runScan = useRunMonitorScan();
  const { toast } = useToast();

  const results = scanResults?.results ?? scanResults ?? [];

  const handleScan = () => {
    runScan.mutate(undefined, {
      onSuccess: () => toast({ title: "Scan started. Results will appear shortly." }),
      onError: () => toast({ title: "Scan failed", variant: "destructive" }),
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Monitor</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Scan for unauthorized use of your likeness across the web.
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={runScan.isPending}
            className="btn btn-primary gap-2 h-9 px-4 text-sm"
          >
            {runScan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Run scan
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Checks", value: stats?.totalChecks ?? "—", icon: Eye },
            { label: "Blocked Requests", value: stats?.blockedCount ?? "—", icon: ShieldAlert },
            { label: "Scan Findings", value: Array.isArray(results) ? results.length : "—", icon: Globe },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="surface p-5">
                <Icon className="h-4 w-4 text-muted-foreground mb-3" />
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </div>
            );
          })}
        </div>

        {/* Scan results */}
        <div className="surface p-6">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" /> Web Scan Results
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !Array.isArray(results) || results.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No scan results yet.</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Run a scan to search for your likeness across public websites and AI generation platforms.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {(results as Array<{
                id: string;
                sourceUrl: string;
                sourceDomain: string;
                pageTitle?: string | null;
                matchScore: number;
                status: string;
                createdAt: string;
              }>).map((result) => (
                <div key={result.id} className="flex items-start gap-4 py-3 border-b border-border/30 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{result.pageTitle ?? result.sourceDomain}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${statusBadge(result.status)}`}>
                        {result.status.toLowerCase().replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{result.sourceUrl}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground">
                        Match: {(result.matchScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <a
                    href={result.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost h-7 w-7 p-0 flex-shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
