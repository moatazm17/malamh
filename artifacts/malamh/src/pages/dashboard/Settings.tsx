import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMe, useUpdateProfile, useDeleteAccount } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2, User, Bell, Shield, ExternalLink, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

const PLAN_LABELS: Record<string, { name: string; color: string }> = {
  FREE: { name: "Personal (Free)", color: "text-muted-foreground" },
  MONITOR: { name: "Monitor", color: "text-blue-400" },
  MONITOR_PRO: { name: "Monitor Pro", color: "text-blue-400" },
  PRO: { name: "Pro", color: "text-primary" },
  API_BUILDER: { name: "API Builder", color: "text-purple-400" },
};

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

  // Handle ?upgraded=1 redirect from Stripe
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
      const res = await apiFetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        toast({ title: data.message ?? "Subscription managed", description: data.portalUrl === null ? "Demo mode — plan reset to free." : undefined });
      }
    } catch {
      toast({ title: "Could not open portal", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const plan = user?.subscription?.plan ?? "FREE";
  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS.FREE;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences.</p>
        </div>

        {/* Profile info */}
        <div className="surface p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-5">
            <User className="h-4 w-4 text-muted-foreground" /> Profile
          </h2>
          <form onSubmit={handleProfile} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Display name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input w-full" placeholder="yourhandle" />
              {username && <p className="text-xs text-muted-foreground mt-1">Public profile: /u/{username}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" value={user?.email ?? ""} disabled className="input w-full opacity-50 cursor-not-allowed" />
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" /> Notifications
              </h3>
              {[
                { label: "Notify me when my face is scanned", value: notifyOnScan, set: setNotifyOnScan },
                { label: "Notify me on consent token requests", value: notifyOnConsent, set: setNotifyOnConsent },
                { label: "Notify me on API checks", value: notifyOnApiCheck, set: setNotifyOnApiCheck },
              ].map((n) => (
                <label key={n.label} className="flex items-center gap-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={n.value} onChange={(e) => n.set(e.target.checked)} className="accent-primary" />
                  <span className="text-sm">{n.label}</span>
                </label>
              ))}
            </div>

            <button type="submit" disabled={updateProfile.isPending} className="btn btn-primary h-10 gap-2 self-start px-5 mt-1">
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save changes</>}
            </button>
          </form>
        </div>

        {/* Subscription */}
        <div className="surface p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-5">
            <Shield className="h-4 w-4 text-muted-foreground" /> Subscription
          </h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`font-semibold text-lg ${planInfo.color}`}>{planInfo.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {plan === "FREE" ? "Free forever · 3 faces, 100 checks/month" :
                 plan === "PRO" ? "Billed monthly · 10 faces, 10K checks/month" :
                 plan === "API_BUILDER" ? "Billed monthly · Unlimited faces & checks" :
                 "Billed monthly"}
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              {plan === "FREE" ? (
                <a href="/pricing" className="btn btn-primary h-9 px-4 text-sm gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Upgrade plan
                </a>
              ) : (
                <button onClick={openPortal} disabled={portalLoading} className="btn btn-ghost border border-border/50 h-9 px-4 text-sm gap-1.5">
                  {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Manage subscription
                </button>
              )}
            </div>
          </div>

          {/* Plan limits bar */}
          <div className="mt-5 pt-5 border-t border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-3">Plan limits</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Face registrations", value: plan === "FREE" ? "3" : plan === "PRO" ? "10" : "∞" },
                { label: "API checks/month", value: plan === "FREE" ? "100" : plan === "PRO" ? "10,000" : "∞" },
                { label: "Web scanning", value: plan === "API_BUILDER" ? "Daily" : plan === "PRO" ? "Weekly" : "—" },
                { label: "Webhooks", value: plan === "FREE" ? "—" : "✓" },
              ].map((item) => (
                <div key={item.label} className="surface p-3 rounded-lg">
                  <p className="text-muted-foreground">{item.label}</p>
                  <p className="font-semibold mt-0.5 text-sm">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="surface p-6 border-destructive/30">
          <h2 className="font-semibold text-destructive mb-4">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all registered faces.</p>
          <button onClick={handleDelete} disabled={deleteAccount.isPending} className="btn btn-danger h-9 px-4 gap-2 text-sm">
            {deleteAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete account
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
