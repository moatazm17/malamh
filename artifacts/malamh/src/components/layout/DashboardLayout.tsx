import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import {
  LayoutGrid, Camera, Activity as ActivityIcon, Key, Play, Settings as SettingsIcon,
  LogOut, Loader2, Webhook, Radar, Megaphone, Sparkles, Gamepad2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MalamhMark } from "./PublicLayout";

const navItems = [
  { href: "/dashboard/overview", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/register-face", label: "Register Face", icon: Camera },
  { href: "/ai-studio", label: "AI Studio", icon: Sparkles },
  { href: "/playground", label: "Playground", icon: Gamepad2 },
  { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
  { href: "/dashboard/api-test", label: "API Tester", icon: Play },
  { href: "/dashboard/monitor", label: "Monitor", icon: Radar },
  { href: "/dashboard/activity", label: "Activity Log", icon: ActivityIcon },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/dashboard/share", label: "Share", icon: Megaphone },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (error) setLocation("/sign-in");
  }, [error, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent-blue)" }} />
      </div>
    );
  }
  if (!user) return null;

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut({ redirectUrl: `${import.meta.env.BASE_URL.replace(/\/$/, "")}/` });
    } finally {
      setSigningOut(false);
    }
  };

  // Plan badge — show the OWNER plan (face-protection tier) on the sidebar.
  const plan =
    (((user as any).ownerSubscription?.plan ??
      (user as any).subscription?.plan) as string | undefined)?.toUpperCase() ?? "FREE";

  return (
    <div className="min-h-[100dvh] flex" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Sidebar */}
      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 left-0 z-40 w-[240px] flex-shrink-0 flex flex-col h-[100dvh] transition-transform`}
        style={{ background: "var(--bg-elevated)", borderRight: "1px solid var(--border-subtle)" }}
      >
        <div className="h-16 flex items-center px-6" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <Link href="/dashboard/overview" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <MalamhMark size={26} />
            <span className="font-semibold tracking-tight" style={{ fontFamily: "var(--app-font-display)" }}>Malamh</span>
            <span className="brand-arabic text-sm" style={{ color: "var(--text-secondary)" }}>ملامح</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href} href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: isActive ? "var(--accent-blue-glow)" : "transparent",
                  color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
                  borderLeft: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
                  paddingLeft: isActive ? 10 : 12,
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-3 px-2 mb-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
              style={{ background: "var(--accent-blue-glow)", color: "var(--accent-blue)", border: "1px solid var(--accent-blue)" }}
            >
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{user.name || "User"}</p>
              <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-2 mb-3">
            <span className={`badge-mh ${plan === "FREE" ? "badge-blue" : "badge-open"}`} style={{ padding: "3px 10px", fontSize: "0.65rem" }}>
              {plan}
            </span>
            {plan === "FREE" && (
              <Link href="/pricing" className="text-xs font-semibold hover:underline" style={{ color: "var(--accent-blue)" }}>
                Upgrade →
              </Link>
            )}
          </div>
          <button
            onClick={handleLogout} disabled={signingOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden h-14 flex items-center px-4" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md hover:bg-white/5">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round"/></svg>
          </button>
          <div className="ml-3 flex items-center gap-2">
            <MalamhMark size={20} />
            <span className="font-semibold" style={{ fontFamily: "var(--app-font-display)" }}>Malamh</span>
          </div>
        </div>
        <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[1400px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
