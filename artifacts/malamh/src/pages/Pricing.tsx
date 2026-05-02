import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Personal",
    price: "$0",
    period: "forever",
    description: "For individuals who want to protect their likeness.",
    highlight: false,
    features: [
      "1 face registration",
      "100 consent checks / month",
      "Activity log (30 days)",
      "Public profile page",
      "Consent: blocked or open",
    ],
    cta: "Get started free",
    href: "/register",
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "For power users who need fine-grained token control.",
    highlight: true,
    features: [
      "5 face registrations",
      "10,000 consent checks / month",
      "Unlimited activity log",
      "Consent tokens (approve per-request)",
      "Priority email support",
      "Analytics dashboard",
    ],
    cta: "Start Pro",
    href: "/register",
  },
  {
    name: "API Builder",
    price: "$49",
    period: "per month",
    description: "For AI companies integrating Malamh into their pipeline.",
    highlight: false,
    features: [
      "Unlimited face registrations",
      "100,000 consent checks / month",
      "Webhook events",
      "Team members (5 seats)",
      "SLA 99.9% uptime",
      "Dedicated support channel",
    ],
    cta: "Start building",
    href: "/register",
  },
];

const faqs = [
  { q: "Can I change my plan later?", a: "Yes, upgrade or downgrade at any time. Changes take effect at the next billing cycle." },
  { q: "What counts as a consent check?", a: "Each POST to /api/check or /api/check-image counts as one check, regardless of the result." },
  { q: "Is my face image stored?", a: "No. We store only a mathematical embedding (a vector of numbers). Your photo is never persisted." },
  { q: "Do I need a credit card for the free plan?", a: "No. Create an account and start using the free tier immediately." },
];

export default function Pricing() {
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

              <Link
                href={plan.href}
                className={`btn h-11 text-sm ${plan.highlight ? "btn-primary" : "btn-ghost border border-border/60"}`}
              >
                {plan.cta}
              </Link>
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
