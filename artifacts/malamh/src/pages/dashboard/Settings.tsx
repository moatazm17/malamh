import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMe, useUpdateProfile, useDeleteAccount } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2, User, Bell, Shield } from "lucide-react";
import { useLocation } from "wouter";

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

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setUsername(user.username ?? "");
      setNotifyOnScan(user.notifyOnScan);
      setNotifyOnConsent(user.notifyOnConsent);
      setNotifyOnApiCheck(user.notifyOnApiCheck);
    }
  }, [user]);

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
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input w-full"
                placeholder="yourhandle"
              />
              {username && (
                <p className="text-xs text-muted-foreground mt-1">
                  Public profile: /u/{username}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="input w-full opacity-50 cursor-not-allowed"
              />
            </div>

            {/* Notifications */}
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
                  <input
                    type="checkbox"
                    checked={n.value}
                    onChange={(e) => n.set(e.target.checked)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{n.label}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="btn btn-primary h-10 gap-2 self-start px-5 mt-1"
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Save className="h-4 w-4" /> Save changes</>
              )}
            </button>
          </form>
        </div>

        {/* Plan */}
        <div className="surface p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-muted-foreground" /> Subscription
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">
                {user?.subscription?.plan?.toLowerCase() ?? "personal"} plan
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {!user?.subscription || user.subscription.plan === "FREE" ? "Free forever" : "Billed monthly"}
              </p>
            </div>
            <a href="/pricing" className="btn btn-ghost border border-border/50 h-8 px-3 text-xs">
              Upgrade
            </a>
          </div>
        </div>

        {/* Danger zone */}
        <div className="surface p-6 border-destructive/30">
          <h2 className="font-semibold text-destructive mb-4">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all your registered faces. This action cannot be undone.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleteAccount.isPending}
            className="btn btn-danger h-9 px-4 gap-2 text-sm"
          >
            {deleteAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete account
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
