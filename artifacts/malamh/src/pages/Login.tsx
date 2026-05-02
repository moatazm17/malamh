import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { MalamhMark } from "@/components/layout/PublicLayout";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: () => setLocation("/dashboard/overview"),
        onError: () => toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <div className="mesh-blob" style={{ width: 600, height: 600, background: "rgba(77,124,255,0.18)", top: "-15%", left: "-10%", animation: "mh-orbit-1 28s ease-in-out infinite" }} />
      <div className="mesh-blob" style={{ width: 500, height: 500, background: "rgba(125,77,255,0.14)", bottom: "-15%", right: "-10%", animation: "mh-orbit-2 32s ease-in-out infinite" }} />

      <div className="w-full max-w-sm relative z-10 anim-fade-up">
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <MalamhMark size={36} />
            <span className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--app-font-display)" }}>Malamh</span>
            <span className="brand-arabic text-lg" style={{ color: "var(--text-secondary)" }}>ملامح</span>
          </Link>
        </div>

        <div className="glass-card-elevated p-8">
          <h1 className="headline-section text-2xl mb-1.5">Welcome back</h1>
          <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>Sign in to manage your consent settings.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Email</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-mh" placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Password</label>
              <input
                type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-mh" placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={login.isPending} className="btn-mh btn-mh-primary w-full justify-center mt-1" style={{ padding: "12px 22px" }}>
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
          Don't have an account?{" "}
          <Link href="/register" className="font-medium hover:underline" style={{ color: "var(--accent-blue)" }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
