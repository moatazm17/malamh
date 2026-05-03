import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMe, useUpdateProfile, useDeleteAccount } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2, ExternalLink, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

const OWNER_PLAN_LABELS: Record<string, { name: string; badge: string; blurb: string; upgradeable: boolean }> = {
  FREE: { name: "Personal (Free)", badge: "badge-blue", blurb: "Free forever · 1 face · unlimited checks against your face", upgradeable: true },
  PRO: { name: "Pro", badge: "badge-open", blurb: "Billed monthly · 5 faces · consent tokens · weekly Monitor scans", upgradeable: false },
  FAMILY: { name: "Family", badge: "badge-open", blurb: "Billed monthly · 25 faces · everything in Pro · family billing", upgradeable: false },
};

const API_PLAN_LABELS: Record<string, { name: string; badge: string; blurb: string; upgradeable: boolean }> = {
  DEVELOPER: { name: "Developer (Free)", badge: "badge-blue", blurb: "Free · 1,000 API checks / month", upgradeable: true },
  API_BUILDER: { name: "API Builder", badge: "badge-open", blurb: "Billed monthly · 100,000 API checks / month · webhooks", upgradeable: false },
  ENTERPRISE: { name: "Enterprise", badge: "badge-open", blurb: "Custom · Unlimited checks · SLA · dedicated support", upgradeable: false },
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative inline-flex h-6 w-11 rounded-full transition-colors"
      style={{
        background: on ? "var(--accent-blue)" : "var(--bg-void)",
        border: `1px solid ${on ? "var(--accent-blue)" : "var(--border-subtle)"}`,
        boxShadow: on ? "0 0 16px var(--accent-blue-glow)" : undefined,
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: on ? "translateX(22px)" : "translateX(2px)", marginTop: 2 }}
      />
    </button>
  );
}

export default function Settings() {
  const { data: user, isLoading } = useGetMe();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [notifyOnScan, setNotifyOnScan] = useState(false);
  const [notifyOnConsent, setNotifyOnConsent] = useState(false);
  const [notifyOnApiCheck, setNotifyOnApiCheck] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setUsername(user.username ?? "");
      setNotifyOnScan(user.notifyOnScan);
      setNotifyOnConsent(user.notifyOnConsent);
      setNotifyOnApiCheck(user.notifyOnApiCheck);
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1") {
      toast({ title: "Subscription upgraded!", description: "Your plan has been updated." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  const handleProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { data: { name: name || null, username: username || null, notifyOnScan, notifyOnConsent, notifyOnApiCheck } },
      {
        onSuccess: () => toast({ title: "Profile updated" }),
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("Permanently delete your account and all registered faces? This cannot be undone.")) return;
    deleteAccount.mutate(undefined, {
      onSuccess: () => setLocation("/"),
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await apiFetch("/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.portalUrl) window.location.href = data.portalUrl;
      else toast({ title: data.message ?? "Subscription managed" });
    } catch {
      toast({ title: "Could not open portal", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const ownerPlan = (user as any)?.ownerSubscription?.plan ?? user?.subscription?.plan ?? "FREE";
  const apiPlan = (user as any)?.apiSubscription?.plan ?? "DEVELOPER";
  const ownerInfo = OWNER_PLAN_LABELS[ownerPlan] ?? OWNER_PLAN_LABELS.FREE;
  const apiInfo = API_PLAN_LABELS[apiPlan] ?? API_PLAN_LABELS.DEVELOPER;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent-blue)" }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl flex flex-col gap-6 anim-fade-up">
        <div className="mb-2">
          <div className="section-label mb-2">Settings</div>
          <h1 className="headline-section text-3xl md:text-4xl">Account & preferences</h1>
        </div>

        {/* Profile */}
        <div className="glass-card p-7">
          <h2 className="text-lg font-semibold mb-5" style={{ fontFamily: "var(--app-font-display)" }}>Profile</h2>
          <form onSubmit={handleProfile} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Display name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-mh" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-mh" placeholder="yourhandle" />
              {username && <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Public profile: /u/{username}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Email</label>
              <input type="email" value={user?.email ?? ""} disabled className="input-mh opacity-50 cursor-not-allowed" />
            </div>
            <button type="submit" disabled={updateProfile.isPending} className="btn-mh btn-mh-primary self-start mt-1">
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save changes</>}
            </button>
          </form>
        </div>

        {/* Notifications */}
        <div className="glass-card p-7">
          <h2 className="text-lg font-semibold mb-5" style={{ fontFamily: "var(--app-font-display)" }}>Notification Preferences</h2>
          <div className="flex flex-col gap-4">
            {[
              { label: "Notify on web scan matches", value: notifyOnScan, set: setNotifyOnScan },
              { label: "Notify on API checks against my face", value: notifyOnApiCheck, set: setNotifyOnApiCheck },
              { label: "Notify on consent token requests", value: notifyOnConsent, set: setNotifyOnConsent },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <span className="text-sm">{n.label}</span>
                <Toggle on={n.value} onChange={n.set} />
              </div>
            ))}
          </div>
          <button
            type="button" onClick={handleProfile as any} disabled={updateProfile.isPending}
            className="btn-mh btn-mh-ghost mt-6 text-xs" style={{ padding: "8px 16px" }}
          >Save preferences</button>
        </div>

        {/* Owner Subscription */}
        <div className="glass-card p-7">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--app-font-display)" }}>Face protection plan</h2>
            <span className="section-label">For you, the face owner</span>
          </div>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            Controls how many faces you can register and which consent modes are available. Checks against your face are always unlimited.
          </p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className={`badge-mh ${ownerInfo.badge}`}>{ownerInfo.name}</span>
              <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>{ownerInfo.blurb}</p>
            </div>
            {ownerInfo.upgradeable ? (
              <a href="/pricing" className="btn-mh btn-mh-primary">
                <CreditCard className="w-4 h-4" /> Upgrade
              </a>
            ) : (
              <button onClick={openPortal} disabled={portalLoading} className="btn-mh btn-mh-ghost">
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Manage subscription
              </button>
            )}
          </div>
        </div>

        {/* API Subscription */}
        <div className="glass-card p-7">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--app-font-display)" }}>API plan</h2>
            <span className="section-label">For querying the registry</span>
          </div>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            For AI products that call <code style={{ color: "var(--accent-blue)" }}>POST /api/v1/check-face</code>. Independent from your face protection plan.
          </p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className={`badge-mh ${apiInfo.badge}`}>{apiInfo.name}</span>
              <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>{apiInfo.blurb}</p>
            </div>
            {apiInfo.upgradeable ? (
              <a href="/pricing" className="btn-mh btn-mh-primary">
                <CreditCard className="w-4 h-4" /> Upgrade
              </a>
            ) : (
              <button onClick={openPortal} disabled={portalLoading} className="btn-mh btn-mh-ghost">
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Manage subscription
              </button>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-7" style={{ borderColor: "rgba(255,77,94,0.3)" }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--accent-red)", fontFamily: "var(--app-font-display)" }}>Danger Zone</h2>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>Permanently delete your account and all registered faces.</p>
          <button onClick={handleDelete} disabled={deleteAccount.isPending} className="btn-mh btn-mh-danger">
            {deleteAccount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete account
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
