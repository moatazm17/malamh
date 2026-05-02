import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  ScanFace, 
  Activity, 
  Key, 
  TerminalSquare, 
  Settings, 
  LogOut,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { useEffect } from "react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe();
  const logout = useLogout();

  useEffect(() => {
    if (error) {
      setLocation("/login");
    }
  }, [error, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/login")
    });
  };

  const navItems = [
    { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/register-face", label: "Register Face", icon: ScanFace },
    { href: "/dashboard/monitor", label: "Monitor", icon: ShieldAlert },
    { href: "/dashboard/activity", label: "Activity", icon: Activity },
    { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
    { href: "/dashboard/api-test", label: "API Tester", icon: TerminalSquare },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 border-r border-border/40 bg-card/30 flex flex-col sticky top-0 h-[100dvh]">
        <div className="h-16 flex items-center px-6 border-b border-border/40">
          <Link href="/dashboard/overview" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">Malamh</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Dashboard
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden text-sm">
              <p className="truncate font-medium">{user.name || "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
