import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Shield, Loader2 } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold tracking-tight">Malamh</span>
          </Link>
        </div>

        <div className="surface p-8">
          <h1 className="text-xl font-bold mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to manage your consent settings.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={login.isPending}
              className="btn btn-primary w-full mt-1 h-11"
            >
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
