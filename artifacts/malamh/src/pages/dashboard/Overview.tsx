import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMe, useListFaces, useListActivity, useGetDashboardStats } from "@workspace/api-client-react";
import { Camera, Play, Radar, Activity as ActivityIcon, ChevronRight, ScanFace } from "lucide-react";

const consentBadge = (level: string) => {
  const l = level.toLowerCase();
  if (l === "open") return "badge-open";
  if (l === "blocked") return "badge-blocked";
  return "badge-token";
};

const resultBadge = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("allow") || a.includes("open")) return "badge-open";
  if (a.includes("block") || a.includes("deny")) return "badge-blocked";
  return "badge-token";
};

export default function DashboardOverview() {
  const { data: user } = useGetMe();
  const { data: faces } = useListFaces();
  const { data: activityData } = useListActivity({ limit: 6 });
  const { data: stats } = useGetDashboardStats();

  const faceList = faces ?? [];
  const logs = activityData?.logs ?? [];

  const blockRate =
    stats?.totalChecks && stats.totalChecks > 0
      ? Math.round(((stats.blockedCount ?? 0) / stats.totalChecks) * 100)
      : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10 anim-fade-up">
        <div>
          <div className="section-label mb-2">Dashboard</div>
          <h1 className="headline-section text-3xl md:text-4xl">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-base mt-2" style={{ color: "var(--text-secondary)" }}>
            Here's what's happening across your consent registry.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Faces Registered" value={stats?.facesRegistered ?? faceList.length} accent="var(--accent-blue)" />
          <StatCard label="API Checks" value={stats?.totalChecks ?? 0} sub="this month" />
          <StatCard label="Block Rate" value={`${blockRate}%`} chart={blockRate} />
          <StatCard
            label="Pending Tokens"
            value={stats?.pendingTokens ?? 0}
            badge={(stats?.pendingTokens ?? 0) > 0 ? "AMBER" : undefined}
          />
        </div>

        {/* Quick actions */}
        <div>
          <div className="section-label mb-4">Quick actions</div>
          <div className="grid sm:grid-cols-3 gap-4">
            <ActionCard href="/dashboard/register-face" label="Register a Face" Icon={Camera} desc="Add a new face to the registry" />
            <ActionCard href="/dashboard/api-test" label="Test API" Icon={Play} desc="Try the consent-check API" />
            <ActionCard href="/dashboard/monitor" label="Scan Web" Icon={Radar} desc="Hunt for unauthorized use" />
          </div>
        </div>

        {/* Faces */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--app-font-display)" }}>Registered Faces</h2>
            <Link href="/dashboard/register-face" className="text-xs font-semibold hover:underline" style={{ color: "var(--accent-blue)" }}>
              + Add face
            </Link>
          </div>
          {faceList.length === 0 ? (
            <div className="text-center py-12">
              <ScanFace className="h-12 w-12 mx-auto mb-4 opacity-30" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>No faces registered yet.</p>
              <Link href="/dashboard/register-face" className="btn-mh btn-mh-primary inline-flex">Register your face</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {faceList.map((face) => (
                <Link
                  key={face.id} href={`/dashboard/face/${face.id}`}
                  className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-white/[0.03]"
                  style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue)" }}
                    >
                      <ScanFace className="w-4 h-4" style={{ color: "var(--accent-blue)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{face.label ?? "Face"}</p>
                      <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{face.id}</p>
                    </div>
                  </div>
                  <span className={`badge-mh ${consentBadge(face.consentLevel)}`}>
                    {face.consentLevel.toLowerCase().replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--app-font-display)" }}>Recent Activity</h2>
            <Link href="/dashboard/activity" className="text-xs font-semibold hover:underline" style={{ color: "var(--accent-blue)" }}>
              View all →
            </Link>
          </div>
          {logs.length === 0 ? (
            <div className="text-center py-10">
              <ActivityIcon className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No activity yet.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {logs.map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm py-3"
                  style={{ borderBottom: i < logs.length - 1 ? "1px solid var(--border-subtle)" : undefined }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={`badge-mh ${resultBadge(log.action)}`}>
                      {log.action.toLowerCase().replace("_", " ")}
                    </span>
                    <span className="text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>{log.faceId ?? "—"}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, sub, accent, chart, badge }: { label: string; value: number | string; sub?: string; accent?: string; chart?: number; badge?: string }) {
  return (
    <div className="glass-card glass-card-hover p-5">
      <div className="section-label mb-3" style={{ fontSize: "0.65rem" }}>{label}</div>
      <div className="flex items-baseline gap-2">
        <p
          className="headline-display text-3xl md:text-4xl"
          style={{ color: accent ?? "var(--text-primary)" }}
        >{value}</p>
        {sub && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</span>}
        {badge && <span className="badge-mh badge-token text-[0.6rem]" style={{ padding: "2px 8px" }}>{badge}</span>}
      </div>
      {chart !== undefined && (
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-void)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, chart)}%`, background: chart > 50 ? "var(--accent-red)" : "var(--accent-blue)", boxShadow: `0 0 12px ${chart > 50 ? "var(--accent-red)" : "var(--accent-blue)"}` }} />
        </div>
      )}
    </div>
  );
}

function ActionCard({ href, label, desc, Icon }: { href: string; label: string; desc: string; Icon: any }) {
  return (
    <Link
      href={href}
      className="glass-card p-5 flex items-start gap-4 transition-all"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--accent-blue)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{label}</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0 mt-3" style={{ color: "var(--text-muted)" }} />
    </Link>
  );
}
