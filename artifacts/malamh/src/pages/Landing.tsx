import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Shield, Eye, Lock, Zap, Check, ChevronRight, ScanFace, Globe, BarChart3 } from "lucide-react";

const stats = [
  { label: "Faces Registered", value: "12,400+" },
  { label: "API Calls / Month", value: "2.1M+" },
  { label: "AI Companies Using Malamh", value: "38" },
  { label: "Consent Requests Honored", value: "99.98%" },
];

const features = [
  {
    icon: ScanFace,
    title: "Register Your Face",
    description: "Upload a photo and we generate a secure embedding. Your image is never stored — only the mathematical representation.",
  },
  {
    icon: Lock,
    title: "Set Consent Levels",
    description: "Choose: Blocked (no AI generation), Token-required (approve per request), or Open. Change anytime.",
  },
  {
    icon: Eye,
    title: "Monitor Usage",
    description: "See every API call that checked your face. Know exactly which AI systems queried your consent.",
  },
  {
    icon: Zap,
    title: "API for AI Builders",
    description: "A single API endpoint lets your image-gen pipeline check consent before generating. 50ms median response.",
  },
  {
    icon: Globe,
    title: "Public Profiles",
    description: "Share your consent status publicly via your Malamh profile URL. Let companies link directly.",
  },
  {
    icon: BarChart3,
    title: "Detailed Analytics",
    description: "Full activity logs, geographic breakdown, and trend reports. You own your data.",
  },
];

const howItWorks = [
  { step: "1", title: "Register", body: "Create an account and upload a clear photo of your face." },
  { step: "2", title: "Set Consent", body: "Choose your default consent level: blocked, token-gated, or open." },
  { step: "3", title: "Share Your ID", body: "AI companies embed your Malamh ID in their consent-check call." },
  { step: "4", title: "Stay in Control", body: "Approve or revoke consent at any time from your dashboard." },
];

export default function Landing() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative flex flex-col items-center text-center px-4 pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <Shield className="h-3.5 w-3.5 text-primary" />
          Facial Consent Registry — Control Your Likeness
        </span>

        <h1 className="max-w-3xl text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          Your face.{" "}
          <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Your consent.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
          Malamh lets you register your face and set legally-aware consent preferences for AI image generation.
          AI companies check the Malamh API before generating your likeness.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/register" className="btn btn-primary gap-2 h-12 px-8 text-base">
            Protect Your Face <ChevronRight className="h-4 w-4" />
          </Link>
          <Link href="/docs" className="btn btn-ghost gap-2 h-12 px-8 text-base border border-border/50">
            View API Docs
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">Free to register. No credit card required.</p>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 bg-card/20 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-foreground">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-3 text-muted-foreground">Get protected in four simple steps.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {howItWorks.map((item) => (
              <div key={item.step} className="relative">
                <div className="surface p-6 h-full flex flex-col gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                    {item.step}
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-card/10 border-y border-border/40">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Everything you need</h2>
            <p className="mt-3 text-muted-foreground">For people and AI builders alike.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="surface p-6 flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For AI builders CTA */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="surface p-10 text-center rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <h2 className="text-3xl font-bold mb-4">Building an AI image tool?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              One API call tells you if you're allowed to generate someone's likeness. Stay compliant, build trust.
            </p>
            <div className="bg-background/70 rounded-lg border border-border/50 p-4 font-mono text-sm text-left mb-8 overflow-x-auto">
              <span className="text-muted-foreground">POST </span>
              <span className="text-primary">/api/check</span>
              <br />
              <span className="text-muted-foreground">{"{"} face_id: </span>
              <span className="text-green-400">"face_abc123"</span>
              <span className="text-muted-foreground">{" }"}</span>
              <br /><br />
              <span className="text-muted-foreground">→ {"{"} allowed: </span>
              <span className="text-green-400">true</span>
              <span className="text-muted-foreground">, consent: </span>
              <span className="text-yellow-400">"token"</span>
              <span className="text-muted-foreground">{" }"}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs" className="btn btn-primary h-11 px-6">Read API Docs</Link>
              <Link href="/register" className="btn btn-ghost h-11 px-6 border border-border/50">Create Account</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-24 px-4 bg-card/10 border-t border-border/40">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-muted-foreground mb-12">Individual registration is always free.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Personal", price: "Free", features: ["1 face registration", "100 consent checks/mo", "Activity log", "Public profile"] },
              { name: "Pro", price: "$12/mo", highlight: true, features: ["5 face registrations", "10,000 checks/mo", "Consent tokens", "Priority support"] },
              { name: "API Builder", price: "$49/mo", features: ["Unlimited registrations", "100,000 checks/mo", "Webhook events", "Team access"] },
            ].map((plan) => (
              <div key={plan.name} className={`surface p-6 flex flex-col gap-4 ${plan.highlight ? "border-primary/40 bg-primary/5" : ""}`}>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{plan.name}</p>
                  <p className="text-3xl font-bold">{plan.price}</p>
                </div>
                <ul className="flex flex-col gap-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`btn h-9 text-sm ${plan.highlight ? "btn-primary" : "btn-ghost border border-border/50"}`}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
