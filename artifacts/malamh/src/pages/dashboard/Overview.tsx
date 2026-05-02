import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMe, useListFaces, useListActivity, useGetDashboardStats } from "@workspace/api-client-react";
import { ScanFace, Key, Activity, ShieldAlert, ChevronRight } from "lucide-react";

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
  const { data: activityData } = useListActivity({ limit: 5 });
  const { data: stats } = useGetDashboardStats();

  const faceList = faces ?? [];
  const logs = activityData?.logs ?? [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your consent registry overview.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Registered Faces", value: stats?.facesRegistered ?? faceList.length, icon: ScanFace, href: "/dashboard/register-face" },
            { label: "API Keys", value: "—", icon: Key, href: "/dashboard/api-keys" },
            { label: "Checks This Month", value: stats?.totalChecks ?? "—", icon: Activity, href: "/dashboard/activity" },
            { label: "Blocked Requests", value: stats?.blockedCount ?? "—", icon: ShieldAlert, href: "/dashboard/monitor" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.label} href={card.href} className="surface p-5 flex flex-col gap-2 hover:border-border transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </Link>
            );
          })}
        </div>

        {/* Faces */}
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold">Registered Faces</h2>
            <Link href="/dashboard/register-face" className="text-xs text-primary hover:underline">
              + Add face
            </Link>
          </div>
          {faceList.length === 0 ? (
            <div className="text-center py-10">
              <ScanFace className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No faces registered yet.</p>
              <Link href="/dashboard/register-face" className="btn btn-primary h-9 px-4 text-sm">
                Register your face
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {faceList.map((face) => (
                <Link
                  key={face.id}
                  href={`/dashboard/face/${face.id}`}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border border-border/50">
                      <ScanFace className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{face.label ?? "Face"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{face.id}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${consentBadge(face.consentLevel)}`}>
                    {face.consentLevel.toLowerCase().replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold">Recent Activity</h2>
            <Link href="/dashboard/activity" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{log.faceId ?? "—"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${resultBadge(log.action)}`}>
                      {log.action.toLowerCase().replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
