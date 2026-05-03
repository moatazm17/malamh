import { useState } from "react";
import { Link, useLocation } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CheckCircle2, Loader2, Shield, Code2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

type Plan = {
  id: string | null;
  name: string;
  price: string;
  period: string;
  description: string;
  highlight: boolean;
  features: string[];
  cta: string;
  href?: string;
};

const ownerPlans: Plan[] = [
  {
    id: null,
    name: "Personal",
    price: "$0",
    period: "forever",
    description: "Protect your face. Free, forever, no quota.",
    highlight: false,
    features: [
      "1 face registration",
      "Unlimited checks against your face",
      "BLOCKED or OPEN consent",
      "30-day activity log",
      "Public profile page",
    ],
    cta: "Get started free",
    href: "/register",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$9",
    period: "per month",
    description: "For creators who need fine-grained consent.",
    highlight: true,
    features: [
      "5 face registrations",
      "Unlimited checks against your face",
      "Per-request consent tokens",
      "Unlimited activity log",
      "Weekly web scanning (Monitor)",
      "Email + webhook notifications",
    ],
    cta: "Start Pro",
  },
  {
    id: "FAMILY",
    name: "Family",
    price: "$19",
    period: "per month",
    description: "Protect up to 25 faces — yours, your kids, your team.",
    highlight: false,
    features: [
      "25 face registrations",
      "Everything in Pro",
      "Manage faces on others' behalf",
      "Priority Monitor scanning",
      "Family billing in one invoice",
    ],
    cta: "Start Family",
  },
];

const apiPlans: Plan[] = [
  {
    id: null,
    name: "Developer",
    price: "$0",
    period: "forever",
    description: "Try the API. No credit card required.",
    highlight: false,
    features: [
      "1,000 consent checks / month",
      "1 API key",
      "Sandbox + production access",
      "Community support",
    ],
    cta: "Get an API key",
    href: "/register",
  },
  {
    id: "API_BUILDER",
    name: "API Builder",
    price: "$49",
    period: "per month",
    description: "For AI products integrating Malamh in their pipeline.",
    highlight: true,
    features: [
      "100,000 consent checks / month",
      "Webhook events on match",
      "Usage analytics dashboard",
      "Multiple API keys",
      "Email support",
    ],
    cta: "Start building",
  },
  {
    id: null,
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "High-volume, SLA-backed, dedicated support.",
    highlight: false,
    features: [
      "Unlimited consent checks",
      "99.9% uptime SLA",
      "Dedicated account manager",
      "DPA, SOC2, custom terms",
      "Volume pricing",
    ],
    cta: "Contact sales",
    href: "mailto:sales@malamh.app",
  },
];

const faqs = [
  {
    q: "Why are face owners free forever?",
    a: "Because the whole product is built around protecting your likeness. Quota-limiting your protection would defeat the point — every check against your face, on the 1st request and the millionth, is free for you. We charge the AI companies that consume the registry, not the people who populate it.",
  },
  {
    q: "What's the difference between the two plan trees?",
    a: "The left side is for individuals protecting themselves. The right side is for AI companies that need to query Malamh before generating images. They're independent — you can be on Personal AND have an API Builder subscription if you build AI products.",
  },
  { q: "What counts as a consent check?", a: "Each POST to /api/v1/check-face by an AI company counts as one check, regardless of result." },
  { q: "Is my face image stored?", a: "No. We store only a mathematical embedding (a vector). Your photo is never persisted — only a tiny 256×256 thumbnail used for web scanning if you turn Monitor on." },
  { q: "Can I change plans later?", a: "Yes, upgrade or downgrade at any time through the Stripe Customer Portal in Settings." },
];

function FaqItem({ q, a, delay }: { q: string; a: string; delay: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref as any}
      className="glass-card glass-card-hover p-6"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{q}</p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a}</p>
    </div>
  );
}

function PlanCard({ plan, delay, onSubscribe, loading }: {
  plan: Plan; delay: number; onSubscribe: (id: string) => void; loading: string | null;
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref as any}
      className="glass-card glass-card-hover p-7 flex flex-col h-full relative"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
        borderColor: plan.highlight ? "var(--accent-blue)" : undefined,
        boxShadow: plan.highlight ? "0 0 60px var(--accent-blue-glow)" : undefined,
      }}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-mh" style={{ background: "var(--accent-blue)", color: "white", borderColor: "var(--accent-blue)" }}>
          POPULAR
        </div>
      )}
      <div className="section-label mb-3">{plan.name}</div>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="headline-display text-4xl">{plan.price}</span>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>/ {plan.period}</span>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{plan.description}</p>

      <ul className="flex flex-col gap-2.5 mb-7 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-primary)" }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--accent-blue)" }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {plan.id ? (
        <button
          onClick={() => onSubscribe(plan.id!)}
          disabled={loading === plan.id}
          className={plan.highlight ? "btn-mh btn-mh-primary w-full justify-center" : "btn-mh btn-mh-ghost w-full justify-center"}
        >
          {loading === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : plan.cta}
        </button>
      ) : (
        <Link href={plan.href!} className="btn-mh btn-mh-ghost w-full justify-center">{plan.cta}</Link>
      )}
    </div>
  );
}

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await apiFetch("/billing/checkout", { method: "POST", body: JSON.stringify({ plan: planId }) });
      if (res.status === 401) { setLocation("/register"); return; }
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else if (data.success) { toast({ title: data.message ?? "Plan upgraded!" }); setLocation("/dashboard/settings"); }
      else toast({ title: data.message ?? "Could not start checkout", variant: "destructive" });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-24 relative">
        <div className="mesh-blob" style={{ width: 700, height: 700, background: "rgba(77,124,255,0.10)", top: "5%", left: "50%", marginLeft: -350, animation: "mh-orbit-1 30s ease-in-out infinite" }} />

        <div className="text-center mb-16 relative">
          <div className="section-label mb-4">Pricing</div>
          <h1 className="headline-display text-5xl md:text-6xl mb-5">Two plans. Two sides.</h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Face owners on the left, AI companies on the right. Subscribe to either, or both — they're independent.
          </p>
        </div>

        {/* Owner tree */}
        <section className="mb-20 relative">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-5 h-5" style={{ color: "var(--accent-blue)" }} />
            <h2 className="headline-section text-2xl md:text-3xl">For face owners</h2>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(77,124,255,0.1)", color: "var(--accent-blue)", border: "1px solid var(--accent-blue)" }}>
              Always free to be protected
            </span>
          </div>
          <p className="text-sm mb-8 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Protect yourself from AI image generation. We never quota-limit your protection — checks against your face are unlimited on every plan, including free.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {ownerPlans.map((p, i) => (
              <PlanCard key={p.name} plan={p} delay={i * 100} onSubscribe={handleSubscribe} loading={loading} />
            ))}
          </div>
        </section>

        {/* API tree */}
        <section className="mb-20 relative">
          <div className="flex items-center gap-3 mb-8">
            <Code2 className="w-5 h-5" style={{ color: "var(--accent-blue)" }} />
            <h2 className="headline-section text-2xl md:text-3xl">For AI companies</h2>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(77,124,255,0.1)", color: "var(--accent-blue)", border: "1px solid var(--accent-blue)" }}>
              Pay per check volume
            </span>
          </div>
          <p className="text-sm mb-8 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Query Malamh before generating face-bearing images. Stay on the right side of consent — and out of court.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {apiPlans.map((p, i) => (
              <PlanCard key={p.name} plan={p} delay={i * 100} onSubscribe={handleSubscribe} loading={loading} />
            ))}
          </div>
        </section>

        <div className="max-w-2xl mx-auto relative">
          <h2 className="headline-section text-3xl text-center mb-10">Frequently asked questions</h2>
          <div className="flex flex-col gap-4">
            {faqs.map((faq, i) => <FaqItem key={faq.q} q={faq.q} a={faq.a} delay={i * 100} />)}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
