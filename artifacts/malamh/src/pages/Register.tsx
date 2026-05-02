import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Shield, Loader2 } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold tracking-tight">Malamh</span>
          </Link>
        </div>

        <div className="surface p-8">
          <h1 className="text-xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Free forever. No credit card required.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full name</label>
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                placeholder="Jane Smith"
              />
            </div>
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
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm password</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input w-full"
                placeholder="Repeat password"
              />
            </div>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="btn btn-primary w-full mt-1 h-11"
            >
              {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
