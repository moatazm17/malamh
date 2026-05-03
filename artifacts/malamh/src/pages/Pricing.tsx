import { useState } from "react";
import { Link, useLocation } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CheckCircle2, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const plans = [
  {
    id: null as string | null, name: "Personal", price: "$0", period: "forever",
    description: "For individuals who want to protect their likeness.",
    highlight: false,
    features: ["3 face registrations", "100 consent checks / month", "Activity log (30 days)", "Public profile page", "Blocked or open consent"],
    cta: "Get started free", href: "/register",
  },
  {
    id: "PRO", name: "Pro", price: "$12", period: "per month",
    description: "For power users who need fine-grained token control.",
    highlight: true,
    features: ["10 face registrations", "10,000 consent checks / month", "Unlimited activity log", "Consent tokens (approve per-request)", "Weekly web scanning", "Analytics dashboard"],
    cta: "Start Pro", href: null,
  },
  {
    id: "API_BUILDER", name: "API Builder", price: "$49", period: "per month",
    description: "For AI companies integrating Malamh into their pipeline.",
    highlight: false,
    features: ["Unlimited face registrations", "Unlimited consent checks", "Webhook events", "Daily web scanning", "Team members (5 seats)", "Dedicated support channel"],
    cta: "Start building", href: null,
  },
];

const faqs = [
  { q: "Can I change my plan later?", a: "Yes, upgrade or downgrade at any time through the Stripe Customer Portal in Settings." },
  { q: "What counts as a consent check?", a: "Each POST to /api/v1/check-face counts as one check, regardless of the result." },
  { q: "Is my face image stored?", a: "No. We store only a mathematical embedding (a vector of numbers). Your photo is never persisted — only a tiny 256×256 thumbnail for web scanning." },
  { q: "Do I need a credit card for the free plan?", a: "No. Create an account and start using the free tier immediately." },
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
        <div className="text-center mb-20 relative">
          <div className="section-label mb-4">Pricing</div>
          <h1 className="headline-display text-5xl md:text-6xl mb-5">Simple, honest pricing</h1>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>Individual registration is always free. Scale as you grow.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-24 relative">
          {plans.map((plan, i) => {
            const { ref, visible } = useScrollReveal();
            return (
              <div
                key={plan.name}
                ref={ref as any}
                className="glass-card glass-card-hover p-8 flex flex-col h-full relative"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(30px)",
                  transition: `opacity 0.6s ease-out ${i * 120}ms, transform 0.6s ease-out ${i * 120}ms`,
                  borderColor: plan.highlight ? "var(--accent-blue)" : undefined,
                  boxShadow: plan.highlight ? "0 0 60px var(--accent-blue-glow)" : undefined,
                }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-mh" style={{ background: "var(--accent-blue)", color: "white", borderColor: "var(--accent-blue)" }}>
                    POPULAR
                  </div>
                )}
                <div className="section-label mb-4">{plan.name}</div>
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="headline-display text-5xl">{plan.price}</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>/ {plan.period}</span>
                </div>
                <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>{plan.description}</p>

                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-primary)" }}>
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--accent-blue)" }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.id ? (
                  <button
                    onClick={() => handleSubscribe(plan.id!)}
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
          })}
        </div>

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
