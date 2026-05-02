import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { PublicLayout, MalamhMark } from "@/components/layout/PublicLayout";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import {
  ChevronDown, Radar, Bell, FileText, CheckCircle2,
  ScanLine, ToggleRight, Shield, ArrowRight,
} from "lucide-react";

/* ============================================================
   Reusable building blocks
   ============================================================ */

function Reveal({ children, delay = 0, as: Tag = "div", className = "" }: { children: React.ReactNode; delay?: number; as?: any; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <Tag
      ref={ref as any}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s ease-out ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

function MeshBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="mesh-blob" style={{ width: 600, height: 600, background: "rgba(77,124,255,0.18)", top: "-10%", left: "-15%", animation: "mh-orbit-1 22s ease-in-out infinite" }} />
      <div className="mesh-blob" style={{ width: 500, height: 500, background: "rgba(125,77,255,0.18)", bottom: "-15%", right: "-10%", animation: "mh-orbit-2 28s ease-in-out infinite" }} />
      <div className="mesh-blob" style={{ width: 450, height: 450, background: "rgba(255,77,94,0.10)", top: "30%", right: "20%", animation: "mh-orbit-3 32s ease-in-out infinite" }} />
    </div>
  );
}

function CountUp({ end, duration = 1800, prefix = "", suffix = "" }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const { ref, visible } = useScrollReveal();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(eased * end));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [visible, end, duration]);
  const formatted = val >= 1_000_000_000
    ? (val / 1_000_000_000).toFixed(1) + "B"
    : val >= 1_000_000
      ? (val / 1_000_000).toFixed(1) + "M"
      : val >= 1000
        ? (val / 1000).toFixed(1) + "K"
        : val.toString();
  return <span ref={ref as any}>{prefix}{formatted}{suffix}</span>;
}

/* ============================================================
   Section 1 — Hero
   ============================================================ */

function SectionHero() {
  const words = "Your face is being used right now. You just don't know it.".split(" ");
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden px-6">
      <MeshBlobs />
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h1 className="headline-display text-[clamp(2rem,6vw,4.25rem)]">
          {words.map((w, i) => (
            <span key={i} className="inline-block anim-fade-up" style={{ animationDelay: `${i * 80}ms`, marginRight: "0.35em" }}>
              {w}
            </span>
          ))}
        </h1>
        <p
          className="anim-fade-up mt-8 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--text-secondary)", animationDelay: `${words.length * 80 + 200}ms`, lineHeight: 1.7 }}
        >
          Anyone can take your photo from social media, feed it to any AI tool, and generate a fake image of you. Doing anything. Wearing anything. And you can't do anything about it.
        </p>
        <div className="anim-fade-up mt-10" style={{ animationDelay: `${words.length * 80 + 700}ms` }}>
          <Link href="/register" className="btn-mh btn-mh-primary btn-mh-large anim-pulse-glow">
            Take back control
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 anim-bounce-soft" style={{ color: "var(--text-muted)" }}>
        <ChevronDown className="w-6 h-6" />
      </div>
    </section>
  );
}

/* ============================================================
   Section 2 — Numbers
   ============================================================ */

function SectionNumbers() {
  return (
    <section className="py-32 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="section-label text-center mb-16">The problem in numbers</div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-12 md:gap-8">
          <Reveal delay={0}>
            <div className="text-center">
              <div className="headline-display text-6xl md:text-7xl" style={{ color: "var(--accent-red)" }}>
                <CountUp end={15.4} suffix="B" />
              </div>
              <div className="mt-4 text-base" style={{ color: "var(--text-secondary)" }}>
                images trained on without consent
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="text-center">
              <div className="headline-display text-6xl md:text-7xl" style={{ color: "var(--accent-red)" }}>0</div>
              <div className="mt-4 text-base" style={{ color: "var(--text-secondary)" }}>
                people asked for permission
              </div>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div className="text-center">
              <div className="headline-display text-6xl md:text-7xl" style={{ color: "var(--accent-red)" }}>$0</div>
              <div className="mt-4 text-base" style={{ color: "var(--text-secondary)" }}>
                compensation paid
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Section 3 — Failed solutions
   ============================================================ */

function FailCard({ title, body, delay }: { title: string; body: string; delay: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref as any}
      className="glass-card glass-card-hover p-7"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      <svg width={36} height={36} viewBox="0 0 36 36" className="mb-5">
        <line
          x1="8" y1="8" x2="28" y2="28"
          stroke="var(--accent-red)" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray="40" strokeDashoffset={visible ? 0 : 40}
          style={{ transition: `stroke-dashoffset 0.7s ease-out ${delay + 250}ms` }}
        />
        <line
          x1="28" y1="8" x2="8" y2="28"
          stroke="var(--accent-red)" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray="40" strokeDashoffset={visible ? 0 : 40}
          style={{ transition: `stroke-dashoffset 0.7s ease-out ${delay + 450}ms` }}
        />
      </svg>
      <h3 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{body}</p>
    </div>
  );
}

function SectionFailedSolutions() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="headline-section text-3xl md:text-5xl text-center mb-16">
            Everyone is solving the wrong problem
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          <FailCard
            delay={0}
            title="Watermarking tools"
            body="They mark your photos AFTER you post them. But AI already trained on your old photos. The damage is done."
          />
          <FailCard
            delay={150}
            title="Takedown requests"
            body="You find a fake image. You report it. Takes weeks. Meanwhile shared 10,000 times. Always one step behind."
          />
          <FailCard
            delay={300}
            title="Legal action"
            body="Sue who? An AI model trained on a dataset from the entire internet? Good luck."
          />
        </div>
        <Reveal delay={500}>
          <p
            className="text-center mt-16 text-xl md:text-2xl font-semibold max-w-3xl mx-auto leading-relaxed"
            style={{ color: "var(--accent-red)" }}
          >
            Every existing solution fixes damage AFTER it happens. No one prevents it. No one watches for you.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   Section 4 — The Pivot
   ============================================================ */

function SectionPivot() {
  const { ref, visible } = useScrollReveal(0.4);
  return (
    <section ref={ref as any} className="surface-void py-40 px-6 min-h-[80vh] flex flex-col items-center justify-center text-center gap-12">
      <h2
        className="headline-section text-3xl md:text-5xl max-w-3xl"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 1.5s ease-out",
        }}
      >
        What if AI had to ask <span style={{ color: "var(--accent-blue)" }}>YOU</span> first?
      </h2>
      <p
        className="text-lg md:text-2xl max-w-3xl leading-relaxed"
        style={{
          color: "var(--text-secondary)",
          opacity: visible ? 1 : 0,
          transition: "opacity 1.2s ease-out 2.2s",
        }}
      >
        And what if someone was watching the entire internet for your face — so you don't have to?
      </p>
    </section>
  );
}

/* ============================================================
   Section 5 — Introducing Malamh
   ============================================================ */

function SectionIntroducing() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div
        className="mesh-blob"
        style={{ width: 700, height: 700, background: "rgba(77,124,255,0.12)", top: "10%", left: "50%", marginLeft: -350, animation: "mh-orbit-1 30s ease-in-out infinite" }}
      />
      <div className="relative max-w-4xl mx-auto text-center">
        <Reveal>
          <div className="inline-flex flex-col items-center gap-4 anim-scale-in">
            <MalamhMark size={64} />
            <div className="brand-arabic text-5xl md:text-6xl" style={{ color: "var(--text-primary)", textShadow: "0 0 40px var(--accent-blue-glow)" }}>
              ملامح
            </div>
          </div>
        </Reveal>
        <Reveal delay={300}>
          <p className="mt-8 text-xl md:text-2xl font-medium" style={{ color: "var(--text-primary)" }}>
            Own your face in the age of AI
          </p>
        </Reveal>
        <Reveal delay={500}>
          <p className="mt-6 text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            The world's first facial consent registry and monitoring system. Register your face. Set your rules. We enforce them — and we hunt down violations for you.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   Section 6 — Three pillars
   ============================================================ */

function PillarIcon({ kind }: { kind: "face" | "switch" | "shield" }) {
  if (kind === "face") {
    return (
      <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="14" stroke="var(--accent-blue)" strokeWidth="1.6" />
        <circle cx="19" cy="22" r="1.5" fill="var(--accent-blue)" />
        <circle cx="29" cy="22" r="1.5" fill="var(--accent-blue)" />
        <path d="M19 30 Q24 33 29 30" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {[...Array(8)].map((_, i) => {
          const a = (i * Math.PI) / 4;
          return <circle key={i} cx={24 + Math.cos(a) * 20} cy={24 + Math.sin(a) * 20} r="1.2" fill="var(--accent-blue)" opacity={0.4} />;
        })}
      </svg>
    );
  }
  if (kind === "switch") {
    return (
      <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
        {[10, 22, 34].map((y, i) => (
          <g key={i}>
            <rect x="8" y={y - 4} width="32" height="8" rx="4" stroke="var(--accent-blue)" strokeWidth="1.5" fill="none" />
            <circle cx={i === 1 ? 14 : 34} cy={y} r="3" fill="var(--accent-blue)" />
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <path d="M24 6 L38 12 V22 C38 30 32 36 24 38 C16 36 10 30 10 22 V12 L24 6 Z" stroke="var(--accent-blue)" strokeWidth="1.6" fill="none" />
      <path d="M4 24 L18 24 M14 20 L18 24 L14 28" stroke="var(--accent-blue)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function SectionPillars() {
  const pillars = [
    { kind: "face" as const, title: "Register, don't upload", body: "We don't store your photo. We convert your face into a mathematical signature — 512 numbers. Protected by math, not a JPEG on a server." },
    { kind: "switch" as const, title: "You set the rules", body: "Full block. Token-based approval. Or open consent. Your face, your choice." },
    { kind: "shield" as const, title: "One API for all AI", body: "Any AI company, before generating a face, checks with Malamh. One call. One answer." },
  ];
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
        {pillars.map((p, i) => (
          <Reveal key={p.title} delay={i * 150}>
            <div className="text-center md:text-left">
              <div className="mb-5 flex justify-center md:justify-start"><PillarIcon kind={p.kind} /></div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
              <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   Section 7 — We hunt
   ============================================================ */

function HuntRow({ Icon, text, delay }: { Icon: any; text: string; delay: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref as any}
      className="flex items-start gap-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-20px)",
        transition: `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`,
      }}
    >
      <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: "var(--accent-blue)" }} />
      <span className="text-base" style={{ color: "var(--text-secondary)" }}>{text}</span>
    </div>
  );
}

function SectionWeHunt() {
  const rows = [
    { Icon: Radar, text: "Automated scanning — we search the entire web for you" },
    { Icon: Bell, text: "Instant alerts — the moment your face appears unauthorized" },
    { Icon: FileText, text: "One-click takedown — pre-filled GDPR and DMCA templates" },
    { Icon: CheckCircle2, text: "Track results — sent, responded, removed. Full visibility." },
  ];
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Scan line effect */}
      <div
        className="absolute inset-x-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(77,124,255,0.5), transparent)",
          animation: "mh-scan-line 6s linear infinite",
          top: 0,
        }}
      />
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <h2 className="headline-section text-3xl md:text-5xl mb-4" style={{ color: "var(--accent-blue)" }}>
            We don't wait. We hunt.
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
            Other tools wait for you to find the problem. We find it for you.
          </p>
        </Reveal>
        <Reveal delay={400}>
          <p className="mt-6 text-base max-w-3xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Malamh scans the internet 24/7. Every website. Every platform. Every AI-generated image. If your face shows up where it shouldn't — you know instantly.
          </p>
        </Reveal>
        <div className="mt-16 grid sm:grid-cols-2 gap-x-10 gap-y-6">
          {rows.map(({ Icon, text }, i) => (
            <HuntRow key={text} Icon={Icon} text={text} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Section 8 — How it works (timeline)
   ============================================================ */

function SectionHowItWorks() {
  const steps = [
    { n: 1, title: "Verify", body: "Look at the camera. Smile, blink, turn. We verify you're real." },
    { n: 2, title: "Register", body: "Your face becomes a 512-number signature. No photo stored." },
    { n: 3, title: "Protect", body: "Our API blocks unauthorized AI generation. Our scanner finds existing violations." },
    { n: 4, title: "Act", body: "Get alerts. Send takedowns. Track removal. One click." },
  ];
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="section-label text-center mb-14">How it works</div>
        </Reveal>
        <div className="relative">
          {/* horizontal connector on desktop */}
          <div className="hidden md:block absolute top-7 left-[12%] right-[12%] h-px" style={{ background: "rgba(77,124,255,0.3)" }} />
          <div className="grid md:grid-cols-4 gap-12 md:gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 150}>
                <div className="text-center">
                  <div
                    className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center font-bold relative z-10"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--accent-blue)",
                      color: "var(--accent-blue)",
                      boxShadow: "0 0 30px var(--accent-blue-glow)",
                      fontFamily: "var(--app-font-display)",
                      fontSize: "1.25rem",
                    }}
                  >
                    {s.n}
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed max-w-[18rem] mx-auto" style={{ color: "var(--text-secondary)" }}>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Section 9 — Vision
   ============================================================ */

function SectionVision() {
  const lines = [
    "Your face is yours.",
    "Not a data point.",
    "Not a training sample.",
    "Not raw material for someone else's product.",
  ];
  return (
    <section className="py-40 px-6 relative overflow-hidden surface-void">
      <div className="mesh-blob" style={{ width: 700, height: 700, background: "rgba(0,212,138,0.10)", top: "20%", left: "-10%", animation: "mh-orbit-1 28s ease-in-out infinite" }} />
      <div className="mesh-blob" style={{ width: 600, height: 600, background: "rgba(77,124,255,0.12)", bottom: "10%", right: "-10%", animation: "mh-orbit-2 24s ease-in-out infinite" }} />
      <div className="relative max-w-4xl mx-auto text-center space-y-3">
        {lines.map((l, i) => (
          <Reveal key={l} delay={i * 400}>
            <h3 className="headline-section text-2xl md:text-4xl">{l}</h3>
          </Reveal>
        ))}
        <Reveal delay={lines.length * 400 + 300}>
          <p className="mt-12 text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Imagine a world where AI asks before it generates. Where your grandmother's face can't be deepfaked. Where a child is protected before they're old enough to protect themselves.
          </p>
        </Reveal>
        <Reveal delay={lines.length * 400 + 600}>
          <p className="mt-6 text-lg md:text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            That's not a fantasy. That's Malamh.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   Section 10 — Pricing
   ============================================================ */

function PricingCard({ plan, price, suffix, body, features, cta, ctaHref, popular = false, delay = 0 }: {
  plan: string; price: string; suffix?: string; body: string; features: string[]; cta: string; ctaHref: string; popular?: boolean; delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div
        className="glass-card glass-card-hover p-8 h-full flex flex-col relative"
        style={popular ? { borderColor: "var(--accent-blue)", boxShadow: "0 0 60px var(--accent-blue-glow)" } : undefined}
      >
        {popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-mh badge-blue" style={{ background: "var(--accent-blue)", color: "white", borderColor: "var(--accent-blue)" }}>
            POPULAR
          </div>
        )}
        <div className="section-label mb-4">{plan}</div>
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="headline-display text-5xl">{price}</span>
          {suffix && <span className="text-sm" style={{ color: "var(--text-muted)" }}>{suffix}</span>}
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{body}</p>
        <ul className="space-y-3 mb-8 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--accent-blue)" }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link href={ctaHref} className={popular ? "btn-mh btn-mh-primary w-full justify-center" : "btn-mh btn-mh-ghost w-full justify-center"}>
          {cta}
        </Link>
      </div>
    </Reveal>
  );
}

function SectionPricing() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="headline-section text-3xl md:text-5xl text-center mb-4">Simple, honest pricing</h2>
        </Reveal>
        <Reveal delay={150}>
          <p className="text-center text-lg mb-16" style={{ color: "var(--text-secondary)" }}>
            Individual registration is always free.
          </p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          <PricingCard
            plan="Personal"
            price="$0"
            suffix="forever"
            body="Register up to 3 faces. Set consent. 100 checks/month."
            features={["3 face registrations", "100 consent checks / month", "Activity log (30 days)", "Public profile page"]}
            cta="Get started free"
            ctaHref="/register"
            delay={0}
          />
          <PricingCard
            plan="Pro"
            price="$12"
            suffix="/ month"
            body="10 faces. 10,000 checks. Web scanning. Takedown tools."
            features={["10 face registrations", "10,000 consent checks / month", "Web scanning + takedowns", "Consent tokens", "Analytics dashboard"]}
            cta="Start Pro"
            ctaHref="/pricing"
            popular
            delay={150}
          />
          <PricingCard
            plan="API Builder"
            price="$49"
            suffix="/ month"
            body="Unlimited everything. Webhooks. Priority support."
            features={["Unlimited face registrations", "Unlimited consent checks", "Webhook events", "Daily web scanning", "Team members (5 seats)", "Priority support"]}
            cta="Start building"
            ctaHref="/pricing"
            delay={300}
          />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Section 11 — For AI companies
   ============================================================ */

function SectionForAI() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div>
            <div className="section-label mb-4">For AI companies</div>
            <h2 className="headline-section text-3xl md:text-4xl mb-6">Compliance made simple</h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
              EU AI Act. Tightening regulations. One API. Integrate once. Stay compliant everywhere.
            </p>
            <Link href="/docs" className="btn-mh btn-mh-ghost">
              View API Documentation <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="code-block">
            <div><span className="code-token-method">POST</span> /api/v1/check-face</div>
            <div style={{ color: "var(--text-muted)" }}>↓</div>
            <div>
              {"{ "}
              <span className="code-token-key">"match"</span>: <span className="code-token-str">true</span>,{" "}
              <span className="code-token-key">"consent"</span>: <span className="code-token-str">"blocked"</span>
              {" }"}
            </div>
            <div className="mt-3 code-token-comment">// One call. Full compliance.</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   Section 12 — Live counter
   ============================================================ */

function SectionLiveCounter() {
  const counterRef = useRef<HTMLDivElement | null>(null);
  return (
    <section className="py-32 px-6 text-center">
      <Reveal>
        <div className="relative inline-block" ref={counterRef}>
          <div
            className="headline-display text-7xl md:text-[7rem]"
            style={{
              color: "var(--accent-blue)",
              textShadow: "0 0 80px var(--accent-blue-glow), 0 0 40px var(--accent-blue-glow)",
            }}
          >
            <CountUp end={12473} duration={2400} />
          </div>
          {/* pulse rings */}
          {[0, 1].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                border: "2px solid var(--accent-blue)",
                animation: `mh-pulse-ring 3s ease-out infinite`,
                animationDelay: `${i * 1.5}s`,
                pointerEvents: "none",
              }}
            />
          ))}
        </div>
      </Reveal>
      <Reveal delay={300}>
        <p className="mt-6 text-lg" style={{ color: "var(--text-secondary)" }}>faces protected and counting</p>
      </Reveal>
      <Reveal delay={500}>
        <Link href="/register" className="btn-mh btn-mh-primary btn-mh-large mt-10">
          Be one of them <ArrowRight className="w-5 h-5" />
        </Link>
      </Reveal>
    </section>
  );
}

/* ============================================================
   Section 13 — Final CTA
   ============================================================ */

function SectionFinalCTA() {
  return (
    <section className="surface-void py-40 px-6 text-center relative overflow-hidden">
      <div className="mesh-blob" style={{ width: 700, height: 700, background: "rgba(77,124,255,0.10)", top: "10%", left: "50%", marginLeft: -350, animation: "mh-orbit-3 26s ease-in-out infinite" }} />
      <div className="relative max-w-3xl mx-auto">
        <Reveal>
          <p className="text-lg md:text-xl mb-4" style={{ color: "var(--text-secondary)" }}>
            Your face has been used without your permission for years.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <h2 className="headline-section text-3xl md:text-5xl mb-10">Today, you can change that.</h2>
        </Reveal>
        <Reveal delay={400}>
          <Link href="/register" className="btn-mh btn-mh-primary btn-mh-large anim-pulse-glow">
            Protect Your Face — It's Free
          </Link>
        </Reveal>
        <Reveal delay={600}>
          <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
            No credit card. No photos stored. 60 seconds.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function Landing() {
  return (
    <PublicLayout transparentHeader>
      <SectionHero />
      <SectionNumbers />
      <SectionFailedSolutions />
      <SectionPivot />
      <SectionIntroducing />
      <SectionPillars />
      <SectionWeHunt />
      <SectionHowItWorks />
      <SectionVision />
      <SectionPricing />
      <SectionForAI />
      <SectionLiveCounter />
      <SectionFinalCTA />
    </PublicLayout>
  );
}
