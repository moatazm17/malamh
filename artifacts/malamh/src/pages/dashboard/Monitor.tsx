import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListScanResults, useRunMonitorScan, useGetDashboardStats } from "@workspace/api-client-react";
import { Loader2, ShieldAlert, Eye, Globe, RefreshCw, ExternalLink, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type ScanPhase = "idle" | "google" | "ai" | "verifying" | "done";

const sourceStyles: Record<string, { label: string; cls: string }> = {
  google_lens: { label: "Google", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ai_platform: { label: "AI Platform", cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  demo: { label: "Demo", cls: "bg-muted text-muted-foreground border-border/40" },
};

const statusBadge = (status: string) => {
  const s = status.toLowerCase();
  if (s === "new") return "badge-blocked";
  if (s === "resolved" || s === "ignored") return "badge-open";
  return "badge-token";
};

const PHASE_LABELS: Record<ScanPhase, string> = {
  idle: "",
  google: "Searching Google…",
  ai: "Scanning AI platforms…",
  verifying: "Verifying matches with AWS…",
  done: "Scan complete",
};

const PHASE_ORDER: ScanPhase[] = ["google", "ai", "verifying", "done"];

export default function Monitor() {
  const { data: scanResults, isLoading } = useListScanResults();
  const { data: stats } = useGetDashboardStats();
  const runScan = useRunMonitorScan();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");

  const results = (scanResults?.results ?? scanResults ?? []) as Array<{
    id: string;
    sourceUrl: string;
    sourceDomain: string;
    pageTitle?: string | null;
    matchScore: number;
    source?: string;
    status: string;
    createdAt: string;
  }>;

  const handleScan = async () => {
    setScanPhase("google");
    const phases: ScanPhase[] = ["google", "ai", "verifying"];
    let pi = 0;
    const interval = setInterval(() => {
      pi++;
      if (pi < phases.length) {
        setScanPhase(phases[pi]);
      } else {
        clearInterval(interval);
      }
    }, 3000);

    runScan.mutate(undefined, {
      onSuccess: (data: any) => {
        clearInterval(interval);
        setScanPhase("done");
        queryClient.invalidateQueries({ queryKey: ["listScanResults"] });
        const n = data?.newResults ?? 0;
        toast({ title: n > 0 ? `Scan complete — ${n} new finding${n === 1 ? "" : "s"}` : "Scan complete — no new findings" });
        setTimeout(() => setScanPhase("idle"), 3000);
      },
      onError: () => {
        clearInterval(interval);
        setScanPhase("idle");
        toast({ title: "Scan failed", variant: "destructive" });
      },
    });
  };

  const scanning = scanPhase !== "idle";

  return (
    <DashboardLayout>
      <div className="max-w-3xl flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Monitor</h1>
            <p className="text-sm text-muted-foreground mt-1">Scan for unauthorized use of your likeness across the web.</p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="btn btn-primary gap-2 h-9 px-4 text-sm"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {scanning ? "Scanning…" : "Run scan"}
          </button>
        </div>

        {/* Scan progress */}
        {scanning && (
          <div className="surface p-5">
            <p className="text-sm font-medium mb-4">{PHASE_LABELS[scanPhase]}</p>
            <div className="flex items-center gap-0">
              {PHASE_ORDER.map((phase, i) => {
                const phaseIndex = PHASE_ORDER.indexOf(scanPhase);
                const isDone = i < phaseIndex;
                const isActive = i === phaseIndex;
                return (
                  <div key={phase} className="flex items-center flex-1 last:flex-none">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone ? "border-green-500 bg-green-500/10" : isActive ? "border-primary bg-primary/10" : "border-border/40"
                    }`}>
                      {isDone ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                      ) : isActive ? (
                        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{i + 1}</span>
                      )}
                    </div>
                    {i < PHASE_ORDER.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 transition-all ${isDone ? "bg-green-500/40" : "bg-border/30"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              {["Google", "AI platforms", "AWS verify", "Complete"].map((label) => (
                <p key={label} className="text-xs text-muted-foreground" style={{ width: "25%" }}>{label}</p>
              ))}
            </div>
          </div>
        )}

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
              {results.map((result) => {
                const src = result.source ?? "demo";
                const style = sourceStyles[src] ?? sourceStyles.demo;
                return (
                  <div key={result.id} className="flex items-start gap-4 py-3 border-b border-border/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium truncate">{result.pageTitle ?? result.sourceDomain}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${statusBadge(result.status)}`}>
                          {result.status.toLowerCase().replace("_", " ")}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${style.cls}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{result.sourceUrl}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground">Match: {(result.matchScore * 100).toFixed(0)}%</span>
                        <span className="text-xs text-muted-foreground">{new Date(result.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost h-7 w-7 p-0 flex-shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
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
