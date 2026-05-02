import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { MalamhMark } from "@/components/layout/PublicLayout";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    registerMutation.mutate(
      { data: { name, email, password } },
      {
        onSuccess: () => setLocation("/dashboard/overview"),
        onError: () => toast({ title: "Registration failed. Email may already be in use.", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <div className="mesh-blob" style={{ width: 600, height: 600, background: "rgba(77,124,255,0.18)", top: "-15%", right: "-10%", animation: "mh-orbit-1 28s ease-in-out infinite" }} />
      <div className="mesh-blob" style={{ width: 500, height: 500, background: "rgba(0,212,138,0.1)", bottom: "-15%", left: "-10%", animation: "mh-orbit-2 32s ease-in-out infinite" }} />

      <div className="w-full max-w-sm relative z-10 anim-fade-up">
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <MalamhMark size={36} />
            <span className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--app-font-display)" }}>Malamh</span>
            <span className="brand-arabic text-lg" style={{ color: "var(--text-secondary)" }}>ملامح</span>
          </Link>
        </div>

        <div className="glass-card-elevated p-8">
          <h1 className="headline-section text-2xl mb-1.5">Create your account</h1>
          <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>Free forever. No credit card required.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Full name</label>
              <input type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="input-mh" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Email</label>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-mh" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Password</label>
              <input type="password" required autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input-mh" placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 section-label">Confirm password</label>
              <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input-mh" placeholder="Repeat password" />
            </div>
            <button type="submit" disabled={registerMutation.isPending} className="btn-mh btn-mh-primary w-full justify-center mt-1" style={{ padding: "12px 22px" }}>
              {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--accent-blue)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
