import { useState } from "react";
import { useLocation } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Check, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    id: null,
    name: "Personal",
    price: "$0",
    period: "forever",
    description: "For individuals who want to protect their likeness.",
    highlight: false,
    features: [
      "3 face registrations",
      "100 consent checks / month",
      "Activity log (30 days)",
      "Public profile page",
      "Blocked or open consent",
    ],
    cta: "Get started free",
    href: "/register",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "For power users who need fine-grained token control.",
    highlight: true,
    features: [
      "10 face registrations",
      "10,000 consent checks / month",
      "Unlimited activity log",
      "Consent tokens (approve per-request)",
      "Weekly web scanning",
      "Analytics dashboard",
    ],
    cta: "Start Pro",
    href: null,
  },
  {
    id: "API_BUILDER",
    name: "API Builder",
    price: "$49",
    period: "per month",
    description: "For AI companies integrating Malamh into their pipeline.",
    highlight: false,
    features: [
      "Unlimited face registrations",
      "Unlimited consent checks",
      "Webhook events",
      "Daily web scanning",
      "Team members (5 seats)",
      "Dedicated support channel",
    ],
    cta: "Start building",
    href: null,
  },
];

const faqs = [
  { q: "Can I change my plan later?", a: "Yes, upgrade or downgrade at any time through the Stripe Customer Portal in Settings." },
  { q: "What counts as a consent check?", a: "Each POST to /api/v1/check-face counts as one check, regardless of the result." },
  { q: "Is my face image stored?", a: "No. We store only a mathematical embedding (a vector of numbers). Your photo is never persisted — only a tiny 256×256 thumbnail for web scanning." },
  { q: "Do I need a credit card for the free plan?", a: "No. Create an account and start using the free tier immediately." },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await apiFetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      });

      if (res.status === 401) {
        setLocation("/register");
        return;
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.success) {
        toast({ title: data.message ?? "Plan upgraded!" });
        setLocation("/dashboard/settings");
      } else {
        toast({ title: data.message ?? "Could not start checkout", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto max-w-5xl px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-muted-foreground text-lg">Individual registration is always free. Scale as you grow.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`surface p-8 flex flex-col gap-6 ${plan.highlight ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : ""}`}
            >
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{plan.name}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-1">/{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.id ? (
                <button
                  onClick={() => handleSubscribe(plan.id!)}
                  disabled={loading === plan.id}
                  className={`btn h-11 text-sm gap-2 ${plan.highlight ? "btn-primary" : "btn-ghost border border-border/60"}`}
                >
                  {loading === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading === plan.id ? "Loading…" : plan.cta}
                </button>
              ) : (
                <a
                  href={plan.href!}
                  className={`btn h-11 text-sm ${plan.highlight ? "btn-primary" : "btn-ghost border border-border/60"}`}
                >
                  {plan.cta}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>
          <div className="flex flex-col gap-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="surface p-6">
                <p className="font-semibold mb-2">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
