import { useState } from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListScanResults, useRunMonitorScan, useGetDashboardStats, useGetMe } from "@workspace/api-client-react";
import { Loader2, Radar, ExternalLink, ShieldOff, Sparkles, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";

const PLANS_WITH_MONITOR = ["PRO", "FAMILY"];

type ScanPhase = "idle" | "google" | "ai" | "verifying" | "done";

const sourceMeta: Record<string, { label: string; cls: string }> = {
  google_lens: { label: "Google", cls: "badge-blue" },
  ai_platform: { label: "Lexica", cls: "badge-mh", },
  unknown: { label: "Source", cls: "badge-mh" },
};

const PHASE_LABEL: Record<Exclude<ScanPhase, "idle" | "done">, string> = {
  google: "Scanning Google…",
  ai: "Scanning Lexica…",
  verifying: "Verifying matches…",
};

export default function Monitor() {
  const { data: scanResults, isLoading } = useListScanResults();
  const { data: stats } = useGetDashboardStats();
  const { data: me } = useGetMe();
  const runScan = useRunMonitorScan();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");

  const plan = (((me as any)?.ownerSubscription?.plan ?? (me as any)?.subscription?.plan) as string | undefined)?.toUpperCase() ?? "FREE";
  const hasMonitor = PLANS_WITH_MONITOR.includes(plan);

  const results = (scanResults?.results ?? scanResults ?? []) as Array<{
    id: string; sourceUrl: string; sourceDomain: string; pageTitle?: string | null;
    matchScore: number; source?: string; status: string; createdAt: string;
  }>;

  const handleScan = async () => {
    setScanPhase("google");
    const phases: ScanPhase[] = ["google", "ai", "verifying"];
    let pi = 0;
    const interval = setInterval(() => {
      pi++;
      if (pi < phases.length) setScanPhase(phases[pi]);
      else clearInterval(interval);
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
      onError: (err: any) => {
        clearInterval(interval);
        setScanPhase("idle");
        const status = err?.response?.status ?? err?.status;
        const serverMsg = err?.response?.data?.message ?? err?.data?.message ?? err?.message;
        if (status === 403) {
          toast({
            title: "Web Monitor is a Pro feature",
            description: "Unlock continuous web scanning to find unauthorized use of your face on Google, Lexica, and more.",
            action: (
              <ToastAction altText="Upgrade plan" asChild>
                <Link href="/pricing">Upgrade</Link>
              </ToastAction>
            ),
          });
        } else {
          toast({
            title: "Scan failed",
            description: serverMsg ?? "Something went wrong. Please try again in a moment.",
            variant: "destructive",
          });
        }
      },
    });
  };

  const scanning = scanPhase !== "idle" && scanPhase !== "done";

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 anim-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-label mb-2">Monitor</div>
            <h1 className="headline-section text-3xl md:text-4xl">Web Monitor</h1>
            <p className="text-base mt-2" style={{ color: "var(--text-secondary)" }}>
              Hunt the web for unauthorized use of your likeness.
            </p>
          </div>
          {hasMonitor ? (
            <button
              onClick={handleScan} disabled={scanning}
              className="btn-mh btn-mh-primary group"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4 group-hover:animate-spin" />}
              {scanning ? "Scanning…" : "Scan Now"}
            </button>
          ) : (
            <Link href="/pricing" className="btn-mh btn-mh-primary group">
              <Sparkles className="w-4 h-4" /> Upgrade to scan
            </Link>
          )}
        </div>

        {!hasMonitor && (
          <div
            className="glass-card-elevated p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5"
            style={{
              border: "1px solid var(--accent-amber)",
              background: "linear-gradient(135deg, var(--accent-amber-glow), transparent)",
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-amber-glow)", border: "1px solid var(--accent-amber)" }}
            >
              <Lock className="w-6 h-6" style={{ color: "var(--accent-amber)" }} />
            </div>
            <div className="flex-1">
              <div className="section-label mb-1" style={{ color: "var(--accent-amber)" }}>Pro feature</div>
              <h3 className="headline-section text-lg md:text-xl mb-1.5">Web Monitor isn't included on your <span style={{ color: "var(--accent-amber)" }}>{plan}</span> plan</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Continuously scan Google Images, Lexica, and other AI platforms for unauthorized use of your likeness. Get takedown-ready evidence the moment your face appears somewhere it shouldn't.
              </p>
            </div>
            <Link href="/pricing" className="btn-mh btn-mh-primary flex-shrink-0">
              <Sparkles className="w-4 h-4" /> See plans
            </Link>
          </div>
        )}

        {/* Scanning radar */}
        {scanning && (
          <div className="glass-card-elevated p-10 text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full" style={{ border: "1px solid var(--accent-blue)", opacity: 0.4 }} />
              <div className="absolute inset-3 rounded-full" style={{ border: "1px solid var(--accent-blue)", opacity: 0.3 }} />
              <div className="absolute inset-6 rounded-full" style={{ border: "1px solid var(--accent-blue)", opacity: 0.2 }} />
              <div
                className="absolute inset-0 rounded-full anim-radar"
                style={{
                  background: "conic-gradient(from 0deg, transparent 0%, transparent 70%, var(--accent-blue) 95%, transparent 100%)",
                  filter: "blur(2px)",
                }}
              />
              <Radar className="absolute inset-0 m-auto w-10 h-10" style={{ color: "var(--accent-blue)" }} />
            </div>
            <p className="text-base font-medium" style={{ color: "var(--accent-blue)" }}>
              {scanPhase !== "done" && PHASE_LABEL[scanPhase as Exclude<ScanPhase, "idle" | "done">]}
            </p>
          </div>
        )}

        {/* Results grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-blue)" }} />
          </div>
        ) : !Array.isArray(results) || results.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Radar className="w-14 h-14 mx-auto mb-4 opacity-30" style={{ color: "var(--text-muted)" }} />
            <h3 className="headline-section text-xl mb-2">{hasMonitor ? "No matches found" : "Nothing to show yet"}</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {hasMonitor ? "Your face is safe — for now." : "Run your first scan after upgrading to start protecting your likeness."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => {
              const src = result.source ?? "unknown";
              const m = sourceMeta[src] ?? sourceMeta.unknown;
              const score = Math.round(result.matchScore * 100);
              const scoreColor = score >= 90 ? "var(--accent-red)" : score >= 70 ? "var(--accent-amber)" : "var(--accent-green)";
              return (
                <div key={result.id} className="glass-card glass-card-hover p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`badge-mh ${m.cls}`}>{m.label}</span>
                    <ScoreCircle pct={score} color={scoreColor} />
                  </div>
                  <p className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
                    {result.pageTitle ?? result.sourceDomain}
                  </p>
                  <p className="text-xs font-mono truncate" style={{ color: "var(--text-muted)" }}>{result.sourceUrl}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(result.createdAt).toLocaleDateString()}</p>
                  <div className="flex items-center gap-2 mt-2 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-mh btn-mh-ghost text-xs flex-1 justify-center" style={{ padding: "6px 10px" }}>
                      <ExternalLink className="w-3 h-3" /> Visit
                    </a>
                    <button className="btn-mh btn-mh-danger text-xs flex-1 justify-center" style={{ padding: "6px 10px" }}>
                      <ShieldOff className="w-3 h-3" /> Takedown
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ScoreCircle({ pct, color }: { pct: number; color: string }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative w-10 h-10">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} stroke="var(--border-subtle)" strokeWidth="3" fill="none" />
        <circle cx="20" cy="20" r={r} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold" style={{ color }}>{pct}</span>
    </div>
  );
}
