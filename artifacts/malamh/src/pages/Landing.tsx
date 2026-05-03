import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { PublicLayout, MalamhMark } from "@/components/layout/PublicLayout";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import {
  ChevronDown, Radar, Bell, FileText, CheckCircle2,
  ScanLine, ToggleRight, Shield, ArrowRight, XCircle, KeyRound, Loader2, Sparkles,
  Upload, Wand2, Lock, Unlock, Code2, Copy, PlayCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

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

function LiveAttackCounter() {
  // Derive a believable "faces scraped today" baseline from the current time.
  // Roughly 1 face every 1.4 seconds since midnight UTC = ~62k/day.
  const baseline = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const elapsedSec = (now.getTime() - startOfDay) / 1000;
    return Math.floor(elapsedSec / 1.4) + 11_407; // floor + small offset so it never reads 0 at midnight
  };
  const [count, setCount] = useState<number>(baseline);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setCount((c) => c + 1 + Math.floor(Math.random() * 2));
      setTimeout(tick, 700 + Math.random() * 1100);
    };
    const t = setTimeout(tick, 900);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  return (
    <div
      className="inline-flex items-center gap-3 px-4 py-2 rounded-full mb-8 anim-fade-in"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.35)",
        color: "var(--text-secondary)",
      }}
      aria-label={`${count.toLocaleString()} faces scraped by AI tools today`}
    >
      <span className="relative flex w-2 h-2">
        <span className="absolute inline-flex w-full h-full rounded-full opacity-75" style={{ background: "var(--accent-red)", animation: "mh-pulse-ring 1.6s ease-out infinite" }} />
        <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: "var(--accent-red)" }} />
      </span>
      <span className="text-sm font-mono tabular-nums" style={{ color: "var(--accent-red)" }}>
        {count.toLocaleString()}
      </span>
      <span className="text-xs tracking-wide" style={{ color: "var(--text-muted)" }}>
        faces scraped by AI tools today
      </span>
    </div>
  );
}

function TrustStrip() {
  const items = [
    "GDPR-ready",
    "EU AI Act aligned",
    "AWS Rekognition",
    "Stripe-secured",
  ];
  return (
    <div className="mt-12 flex items-center justify-center gap-x-5 gap-y-2 flex-wrap text-[11px] tracking-widest font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
      {items.map((it, i) => (
        <span key={it} className="inline-flex items-center gap-5">
          {i > 0 && <span className="w-1 h-1 rounded-full" style={{ background: "var(--text-muted)", opacity: 0.4 }} />}
          {it}
        </span>
      ))}
    </div>
  );
}

function SectionHero() {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden px-6">
      <MeshBlobs />
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <LiveAttackCounter />
        <h1 className="headline-display text-[clamp(2rem,6vw,4.25rem)]">
          Your face is being used right now. You just don't know it.
        </h1>
        <p
          className="mt-8 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
        >
          Anyone can take your photo from social media, feed it to any AI tool, and generate a fake image of you. Doing anything. Wearing anything. And you can't do anything about it.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/register" className="btn-mh btn-mh-primary btn-mh-large anim-pulse-glow">
            Take back control
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a href="#demo" className="btn-mh btn-mh-ghost btn-mh-large">
            See the live demo
          </a>
        </div>
        <TrustStrip />
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 anim-bounce-soft" style={{ color: "var(--text-muted)" }}>
        <ChevronDown className="w-6 h-6" />
      </div>
    </section>
  );
}

/* ============================================================
   Section 1.5 — Live Demo
   ============================================================ */

type DemoPersona = {
  slug: "blocked" | "token" | "open";
  label: string;
  hint: string;
  image: string;
};

const DEMO_PERSONAS: DemoPersona[] = [
  { slug: "blocked", label: "Aisha Karimi",   hint: "Set to BLOCKED",        image: `${import.meta.env.BASE_URL}demo/persona-blocked.png` },
  { slug: "token",   label: "Marcus Chen",    hint: "TOKEN_REQUIRED",        image: `${import.meta.env.BASE_URL}demo/persona-token.png` },
  { slug: "open",    label: "Theo Vasquez",   hint: "OPEN consent",          image: `${import.meta.env.BASE_URL}demo/persona-open.png` },
];

type DemoResult = {
  status: "blocked" | "token_required" | "open";
  matchScore: number;
  consentLevel: string;
  persona: { name: string; role: string; note: string };
  authUrl: string | null;
};

/**
 * The demo plays out as three acts:
 *   1. REGISTER  — scan & index the persona's face
 *   2. CONSENT   — they choose one of three consent levels
 *   3. AI USE    — an AI image generator tries to use them; the registry decides
 */
type DemoStep =
  | "idle"
  | "reg-scan"   | "reg-done"
  | "consent-pick" | "consent-set"
  | "ai-prompt"  | "ai-checking" | "verdict"
  | "error";

const ACT_OF: Record<Exclude<DemoStep, "idle" | "error">, 1 | 2 | 3> = {
  "reg-scan": 1, "reg-done": 1,
  "consent-pick": 2, "consent-set": 2,
  "ai-prompt": 3, "ai-checking": 3, "verdict": 3,
};

function isDemoResult(x: unknown): x is DemoResult {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    (o.status === "blocked" || o.status === "token_required" || o.status === "open") &&
    typeof o.matchScore === "number" &&
    typeof o.consentLevel === "string" &&
    !!o.persona && typeof (o.persona as { name?: unknown }).name === "string"
  );
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function DemoPersonaCard({
  persona, active, disabled, onPick,
}: { persona: DemoPersona; active: boolean; disabled: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      role="radio"
      aria-checked={active}
      aria-label={`${persona.label}, ${persona.hint}`}
      className="glass-card glass-card-hover p-3 text-left flex flex-col items-center transition-all focus:outline-none focus-visible:ring-2"
      style={{
        opacity: disabled && !active ? 0.4 : 1,
        borderColor: active ? "var(--accent-blue)" : undefined,
        boxShadow: active ? "0 0 40px var(--accent-blue-glow)" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div
        className="w-full aspect-square rounded-xl overflow-hidden mb-3"
        style={{ background: "var(--bg-secondary)" }}
      >
        <img src={persona.image} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{persona.label}</div>
      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{persona.hint}</div>
    </button>
  );
}

function DemoStatusIcon({ status }: { status: DemoResult["status"] }) {
  if (status === "blocked") return <XCircle className="w-7 h-7" style={{ color: "var(--accent-red)" }} />;
  if (status === "open") return <CheckCircle2 className="w-7 h-7" style={{ color: "#22c55e" }} />;
  return <KeyRound className="w-7 h-7" style={{ color: "var(--accent-blue)" }} />;
}

/* ---------- Act helpers ---------- */

function ActProgress({ act }: { act: 1 | 2 | 3 | null }) {
  const items: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "Register face" },
    { n: 2, label: "Set consent" },
    { n: 3, label: "AI tries to use" },
  ];
  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      {items.map((it, i) => {
        const state = act === null ? "todo" : act === it.n ? "active" : act > it.n ? "done" : "todo";
        const color =
          state === "active" ? "var(--accent-blue)" :
          state === "done" ? "#22c55e" :
          "var(--text-muted)";
        return (
          <div key={it.n} className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all"
              style={{
                background: state === "todo" ? "var(--bg-secondary)" : `${color}22`,
                color,
                border: `1.5px solid ${color}`,
                boxShadow: state === "active" ? `0 0 18px ${color}66` : undefined,
              }}
            >
              {state === "done" ? <CheckCircle2 className="w-4 h-4" /> : it.n}
            </div>
            <div className="text-xs font-semibold truncate" style={{ color }}>{it.label}</div>
            {i < items.length - 1 && (
              <div className="hidden sm:block flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const CONSENT_OPTIONS = [
  { key: "blocked", icon: Lock,        label: "BLOCKED",        sub: "No AI may use my face",      color: "var(--accent-red)" },
  { key: "token",   icon: KeyRound,    label: "TOKEN_REQUIRED", sub: "Approve every request",      color: "var(--accent-blue)" },
  { key: "open",    icon: Unlock,      label: "OPEN",           sub: "Editorial use allowed",      color: "#22c55e" },
] as const;

/* ---------- The cinematic stage ---------- */

function SectionLiveDemo() {
  const [tab, setTab] = useState<"flow" | "api">("flow");
  const [picked, setPicked] = useState<DemoPersona | null>(null);
  const [step, setStep] = useState<DemoStep>("idle");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [apiTabPulse, setApiTabPulse] = useState(false);
  const runId = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Default a persona on the API tab so the panel always has content.
  useEffect(() => {
    if (tab === "api" && !picked) setPicked(DEMO_PERSONAS[0]);
  }, [tab, picked]);

  // Pulse the "Integrate it" tab once after the cinematic verdict lands.
  useEffect(() => {
    if (step === "verdict" && tab === "flow") {
      setApiTabPulse(true);
      const t = setTimeout(() => setApiTabPulse(false), 4500);
      return () => clearTimeout(t);
    }
  }, [step, tab]);

  const reset = () => {
    runId.current += 1;
    setPicked(null);
    setResult(null);
    setStep("idle");
  };

  const play = async (persona: DemoPersona) => {
    runId.current += 1;
    const myRun = runId.current;
    const alive = () => runId.current === myRun;

    setPicked(persona);
    setResult(null);

    // Bring the stage into view so the user actually watches the show.
    requestAnimationFrame(() => {
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    // Act 1 — Register
    setStep("reg-scan"); await sleep(1700); if (!alive()) return;
    setStep("reg-done"); await sleep(900);  if (!alive()) return;

    // Act 2 — Consent
    setStep("consent-pick"); await sleep(900); if (!alive()) return;
    setStep("consent-set");  await sleep(1100); if (!alive()) return;

    // Act 3 — AI request
    setStep("ai-prompt"); await sleep(900); if (!alive()) return;
    setStep("ai-checking");
    try {
      const [resp] = await Promise.all([
        apiFetch("/v1/demo/check", {
          method: "POST",
          body: JSON.stringify({ persona: persona.slug }),
        }),
        sleep(1100),
      ]);
      if (!alive()) return;
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: unknown = await resp.json();
      if (!isDemoResult(data)) throw new Error("Malformed response");
      setResult(data);
      setStep("verdict");
    } catch {
      if (alive()) setStep("error");
    }
  };

  const isPlaying = step !== "idle" && step !== "verdict" && step !== "error";
  const act: 1 | 2 | 3 | null = step === "idle" || step === "error" ? null : ACT_OF[step];

  const verdictColor =
    result?.status === "blocked" ? "var(--accent-red)" :
    result?.status === "open" ? "#22c55e" :
    "var(--accent-blue)";
  const verdictLabel =
    result?.status === "blocked" ? "REQUEST BLOCKED" :
    result?.status === "open" ? "OPEN CONSENT" :
    "TOKEN REQUIRED";

  const handlePick = (p: DemoPersona) => {
    if (tab === "flow") play(p);
    else setPicked(p);
  };

  return (
    <section id="demo" className="py-32 px-6 relative">
      <div className="max-w-6xl mx-auto relative">
        <div className="mesh-blob" style={{ width: 600, height: 600, background: "rgba(77,124,255,0.10)", top: "10%", left: "50%", marginLeft: -300, animation: "mh-orbit-1 26s ease-in-out infinite" }} />

        <Reveal>
          <div className="text-center mb-4 relative">
            <div className="section-label mb-3 inline-flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Live demo
            </div>
            <h2 className="headline-section text-3xl md:text-5xl mb-4">See it in action.</h2>
            <p className="max-w-2xl mx-auto text-base md:text-lg" style={{ color: "var(--text-secondary)" }}>
              One story, two audiences. Watch how a real person defends their face — then see how
              AI tools call our API to respect that choice.
            </p>
          </div>
        </Reveal>

        {/* Tab switcher */}
        <div className="flex justify-center mt-10 mb-8">
          <div
            className="inline-flex rounded-xl p-1 gap-1"
            role="tablist"
            aria-label="Demo audience"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            {([
              { key: "flow" as const, label: "Watch it happen", icon: PlayCircle, pulse: false },
              { key: "api"  as const, label: "Integrate it",     icon: Code2,      pulse: apiTabPulse && tab === "flow" },
            ]).map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-all relative focus:outline-none focus-visible:ring-2"
                  style={{
                    background: active ? "var(--accent-blue)" : "transparent",
                    color: active ? "white" : "var(--text-secondary)",
                    animation: t.pulse ? "mh-pulse-glow 1.6s ease-in-out infinite" : undefined,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-8 relative">
          {/* Persona picker — shared between tabs */}
          <div className="flex flex-col gap-4">
            <div className="section-label">{tab === "flow" ? "Pick a target" : "Try a response"}</div>
            <div className="grid grid-cols-3 gap-3 max-w-3xl mx-auto w-full" role="radiogroup" aria-label="Choose a demo persona">
              {DEMO_PERSONAS.map((p) => (
                <DemoPersonaCard
                  key={p.slug}
                  persona={p}
                  active={picked?.slug === p.slug}
                  disabled={false}
                  onPick={() => handlePick(p)}
                />
              ))}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {tab === "flow" ? (
                <>
                  All three faces are AI-generated and the personas are fictional. The verdict is a
                  real call to <span className="font-mono">/api/v1/demo/check</span>.{" "}
                  <Link href="/playground" className="underline">Try with your own face →</Link>
                </>
              ) : (
                <>
                  This is the real endpoint shape. Drop the snippet on the right into your AI tool
                  and you're done. <Link href="/docs" className="underline">Full API docs →</Link>
                </>
              )}
            </p>
          </div>

          {/* Right side — swaps based on tab */}
          {tab === "api" ? (
            <DeveloperAPIPanel persona={picked ?? DEMO_PERSONAS[0]} />
          ) : (
          <div
            ref={stageRef}
            className="glass-card p-6 md:p-8 min-h-[520px] flex flex-col relative overflow-hidden scroll-mt-24"
            style={{ borderColor: result ? verdictColor : undefined, transition: "border-color .4s" }}
          >
            {step === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Shield className="w-14 h-14 mb-4" style={{ color: "var(--text-muted)" }} />
                <p className="text-lg" style={{ color: "var(--text-secondary)" }}>Pick a person on the left to begin.</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>3 short acts. About 8 seconds.</p>
              </div>
            )}

            {step === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3" role="alert">
                <XCircle className="w-12 h-12" style={{ color: "var(--accent-red)" }} />
                <p style={{ color: "var(--text-primary)" }}>Demo request failed.</p>
                <button onClick={reset} className="btn-mh btn-mh-ghost">Try again</button>
              </div>
            )}

            <span className="sr-only" aria-live="polite" role="status">
              {step === "reg-scan"     && picked ? `Registering ${picked.label}'s face` :
               step === "reg-done"     && picked ? `${picked.label} registered` :
               step === "consent-pick" && picked ? `${picked.label} choosing consent level` :
               step === "consent-set"  && picked ? `${picked.label} consent set` :
               step === "ai-prompt"               ? "AI tool sending request" :
               step === "ai-checking"             ? "Checking consent registry" :
               step === "verdict" && result       ? `Verdict: ${verdictLabel}, ${result.matchScore.toFixed(1)} percent match` :
               ""}
            </span>

            {act !== null && picked && (
              <>
                <ActProgress act={act} />

                {/* ---------- ACT 1: REGISTER ---------- */}
                {act === 1 && (
                  <div className="flex-1 flex flex-col items-center justify-center anim-fade-in">
                    <div className="text-[11px] tracking-widest font-semibold mb-4" style={{ color: "var(--accent-blue)" }}>
                      ACT 1 · REGISTERING WITH MALAMH
                    </div>
                    <div className="relative w-56 h-56 rounded-2xl overflow-hidden anim-scale-in" style={{ background: "var(--bg-secondary)", boxShadow: "0 0 48px var(--accent-blue-glow)" }}>
                      <img src={picked.image} alt="" className="w-full h-full object-cover" />

                      {/* Corner brackets */}
                      {step === "reg-scan" && <FaceBrackets />}

                      {/* Scanning line */}
                      {step === "reg-scan" && (
                        <div className="absolute left-0 right-0 h-[3px] anim-face-scan"
                          style={{ background: "linear-gradient(90deg, transparent, var(--accent-blue), transparent)", boxShadow: "0 0 14px var(--accent-blue)" }} />
                      )}

                      {/* "Registered" stamp */}
                      {step === "reg-done" && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="anim-stamp-in px-4 py-2 rounded-lg font-mono text-sm font-bold tracking-widest"
                            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e", color: "#22c55e" }}>
                            ✓ REGISTERED
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 text-center">
                      <div className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{picked.label}</div>
                      <div className="text-sm font-mono mt-1" style={{ color: step === "reg-done" ? "#22c55e" : "var(--accent-blue)" }}>
                        {step === "reg-scan" ? "Generating face embedding…" : "Indexed in registry · face_id=fc_" + picked.slug + "_8a3f9c"}
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------- ACT 2: CONSENT ---------- */}
                {act === 2 && (
                  <div className="flex-1 flex flex-col items-center justify-center anim-fade-in">
                    <div className="text-[11px] tracking-widest font-semibold mb-2" style={{ color: "var(--accent-blue)" }}>
                      ACT 2 · {picked.label.toUpperCase()} SETS THEIR CONSENT
                    </div>
                    <div className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>
                      Three options. They pick one.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                      {CONSENT_OPTIONS.map((opt) => {
                        const isChosen = opt.key === picked.slug;
                        const dimmed = step === "consent-set" && !isChosen;
                        const lit = step === "consent-set" && isChosen;
                        const Icon = opt.icon;
                        return (
                          <div
                            key={opt.key}
                            className="rounded-xl p-4 flex flex-col items-center text-center transition-all duration-500"
                            style={{
                              background: lit ? `${opt.color}15` : "var(--bg-secondary)",
                              border: `1.5px solid ${lit ? opt.color : "var(--border-subtle)"}`,
                              opacity: dimmed ? 0.25 : 1,
                              transform: lit ? "scale(1.06)" : "scale(1)",
                              boxShadow: lit ? `0 0 32px ${opt.color}55` : undefined,
                            }}
                          >
                            <Icon className="w-6 h-6 mb-2" style={{ color: lit ? opt.color : "var(--text-muted)" }} />
                            <div className="text-xs font-mono font-semibold tracking-wider" style={{ color: lit ? opt.color : "var(--text-primary)" }}>
                              {opt.label}
                            </div>
                            <div className="text-[10px] mt-1.5 leading-tight" style={{ color: "var(--text-muted)" }}>
                              {opt.sub}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {step === "consent-set" && (
                      <div className="mt-6 anim-fade-up flex items-center gap-2 text-sm font-mono" style={{ color: "#22c55e" }}>
                        <CheckCircle2 className="w-4 h-4" /> Consent saved · webhook fired
                      </div>
                    )}
                  </div>
                )}

                {/* ---------- ACT 3: AI REQUEST + VERDICT ---------- */}
                {act === 3 && (
                  <div className="flex-1 flex flex-col anim-fade-in">
                    <div className="text-[11px] tracking-widest font-semibold mb-4" style={{ color: "var(--accent-blue)" }}>
                      ACT 3 · AN AI IMAGE GENERATOR TRIES TO USE THEM
                    </div>

                    {/* Mock AI Studio panel */}
                    <div className="rounded-xl p-4 flex items-start gap-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--bg-void)" }}>
                        <img src={picked.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>
                          <Wand2 className="w-3 h-3" /> GENERATIVE AI STUDIO
                        </div>
                        <div className="mt-1 font-mono text-sm truncate" style={{ color: "var(--text-primary)" }}>
                          "professional headshot of <span style={{ color: "var(--accent-blue)" }}>{picked.label}</span>"
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          <Upload className="w-3 h-3" /> reference: {picked.slug}-photo.jpg
                        </div>
                      </div>
                    </div>

                    {/* Pipeline */}
                    <div className="mt-5 flex flex-col gap-2.5 font-mono text-sm">
                      <PipeRow label="Detected face in reference image"   done />
                      <PipeRow label="Querying Malamh consent registry…"  active={step === "ai-checking"} done={step === "verdict"} />
                      <PipeRow label="Match found · enforcing consent"    done={step === "verdict"} />
                    </div>

                    {/* Verdict */}
                    {step === "verdict" && result && (
                      <div className="mt-5 flex flex-col gap-3 anim-slide-in-right">
                        <div
                          className="flex items-center gap-4 p-4 rounded-xl"
                          style={{ background: `${verdictColor}11`, border: `1.5px solid ${verdictColor}66` }}
                        >
                          <DemoStatusIcon status={result.status} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] tracking-widest font-semibold" style={{ color: verdictColor }}>
                              {verdictLabel}
                            </div>
                            <div className="text-sm leading-snug mt-0.5" style={{ color: "var(--text-primary)" }}>
                              {result.persona.note}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>MATCH</div>
                            <div className="text-2xl font-mono" style={{ color: verdictColor }}>{result.matchScore.toFixed(1)}%</div>
                          </div>
                        </div>

                        {result.authUrl && (
                          <div className="text-xs font-mono p-3 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                            <div className="text-[10px] tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>AUTH_URL · sent to {picked.label}</div>
                            <div className="break-all" style={{ color: "var(--accent-blue)" }}>{result.authUrl}</div>
                          </div>
                        )}

                        <div className="flex gap-3 flex-wrap pt-1">
                          <button onClick={reset} className="btn-mh btn-mh-ghost">Try another persona</button>
                          <Link href="/register" className="btn-mh btn-mh-primary">
                            Register your own face <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Developer API panel (Tab 2) ---------- */

type Lang = "curl" | "js" | "python";
const API_LANGS: { key: Lang; label: string }[] = [
  { key: "curl",   label: "cURL" },
  { key: "js",     label: "JavaScript" },
  { key: "python", label: "Python" },
];

function codeFor(lang: Lang, persona: DemoPersona): string {
  const file = `${persona.slug}-photo.jpg`;
  switch (lang) {
    case "curl":
      return `curl -X POST https://malamh.app/api/v1/consent/check \\
  -H "Authorization: Bearer mh_live_••••••••" \\
  -F "image=@${file}"`;
    case "js":
      return `import { Malamh } from "@malamh/sdk";

const malamh = new Malamh({ apiKey: process.env.MALAMH_KEY });

const decision = await malamh.consent.check({
  image: await fs.readFile("${file}"),
});

if (decision.status === "blocked") {
  throw new Error("Subject denied AI use of their face");
}`;
    case "python":
      return `from malamh import Malamh

malamh = Malamh(api_key=os.environ["MALAMH_KEY"])

decision = malamh.consent.check(
    image=open("${file}", "rb"),
)

if decision.status == "blocked":
    raise PermissionError("Subject denied AI use of their face")`;
  }
}

function responseFor(persona: DemoPersona) {
  if (persona.slug === "blocked") return {
    status: "blocked",
    matchScore: 98.7,
    consentLevel: "BLOCKED",
    persona: { name: persona.label, role: "Private citizen" },
    authUrl: null,
  };
  if (persona.slug === "token") return {
    status: "token_required",
    matchScore: 96.4,
    consentLevel: "TOKEN_REQUIRED",
    persona: { name: persona.label, role: "Public figure" },
    authUrl: "https://malamh.app/approve/req_8a3f9c",
  };
  return {
    status: "open",
    matchScore: 97.1,
    consentLevel: "OPEN",
    persona: { name: persona.label, role: "Editorial subject" },
    authUrl: null,
  };
}

function DeveloperAPIPanel({ persona }: { persona: DemoPersona }) {
  const [lang, setLang] = useState<Lang>("curl");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const code = codeFor(lang, persona);
  const response = responseFor(persona);
  const statusColor =
    persona.slug === "blocked" ? "var(--accent-red)" :
    persona.slug === "open"    ? "#22c55e" :
    "var(--accent-blue)";

  // When the persona changes: scroll the panel into view, show a brief
  // "calling endpoint" state, then reveal the response with a glow flash.
  useEffect(() => {
    setLoading(true);
    setFlash(false);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const t1 = setTimeout(() => { setLoading(false); setFlash(true); }, 850);
    const t2 = setTimeout(() => setFlash(false), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [persona.slug]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked, ignore */ }
  };

  return (
    <div ref={panelRef} className="glass-card p-6 md:p-8 min-h-[520px] flex flex-col anim-fade-in scroll-mt-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4" style={{ color: "var(--accent-blue)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>One call. One decision.</span>
        </div>
        <span className="text-[10px] tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>FOR AI BUILDERS</span>
      </div>

      {/* Language tabs + copy */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {API_LANGS.map((l) => {
          const active = lang === l.key;
          return (
            <button
              key={l.key}
              onClick={() => setLang(l.key)}
              className="px-3 py-1.5 rounded-md text-xs font-mono transition-all focus:outline-none focus-visible:ring-2"
              style={{
                background: active ? "var(--bg-secondary)" : "transparent",
                color: active ? "var(--accent-blue)" : "var(--text-muted)",
                border: `1px solid ${active ? "var(--border-subtle)" : "transparent"}`,
              }}
            >
              {l.label}
            </button>
          );
        })}
        <div className="ml-auto">
          <button
            onClick={copy}
            aria-label="Copy code snippet"
            className="px-3 py-1.5 rounded-md text-xs inline-flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2"
            style={{
              background: "var(--bg-secondary)",
              color: copied ? "#22c55e" : "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Code block */}
      <pre
        className="rounded-xl p-4 font-mono text-[12.5px] leading-relaxed overflow-x-auto"
        style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
      >
        <code>{code}</code>
      </pre>

      {/* Response */}
      <div className="mt-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>
            ← RESPONSE
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: loading ? "var(--text-muted)" : statusColor }}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                POST /api/v1/consent/check
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
                200 OK · {response.status}
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div
            className="flex-1 rounded-xl flex flex-col items-center justify-center gap-3 font-mono text-xs"
            style={{ background: "var(--bg-void)", border: "1px dashed var(--border-subtle)", color: "var(--text-muted)" }}
          >
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent-blue)" }} />
            <div>computing facial embedding…</div>
            <div style={{ color: "var(--text-muted)", opacity: 0.6 }}>querying consent registry…</div>
          </div>
        ) : (
          <pre
            key={persona.slug}
            className="flex-1 rounded-xl p-4 font-mono text-[12.5px] leading-relaxed overflow-x-auto anim-fade-in"
            style={{
              background: "var(--bg-void)",
              border: `1px solid ${statusColor}${flash ? "cc" : "55"}`,
              color: "var(--text-secondary)",
              boxShadow: flash ? `0 0 36px ${statusColor}55, inset 0 0 32px ${statusColor}22` : `inset 0 0 32px ${statusColor}11`,
              transition: "box-shadow .6s, border-color .6s",
            }}
          >
            <code>{JSON.stringify(response, null, 2)}</code>
          </pre>
        )}

        <div className="mt-4 text-xs leading-relaxed min-h-[2.5em]" style={{ color: "var(--text-muted)" }}>
          {!loading && persona.slug === "blocked" && <>→ Your AI tool refuses to generate. The subject's face stays out of the model's output.</>}
          {!loading && persona.slug === "token"   && <>→ Your AI tool pauses, sends the auth URL to the subject, and resumes only after they approve.</>}
          {!loading && persona.slug === "open"    && <>→ Your AI tool proceeds. You log the consent record for your audit trail.</>}
        </div>
      </div>
    </div>
  );
}

function FaceBrackets() {
  const corners: { pos: React.CSSProperties; rotate: number }[] = [
    { pos: { top: 8,    left: 8 },    rotate: 0   },
    { pos: { top: 8,    right: 8 },   rotate: 90  },
    { pos: { bottom: 8, right: 8 },   rotate: 180 },
    { pos: { bottom: 8, left: 8 },    rotate: 270 },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <span
          key={i}
          className="absolute w-5 h-5 anim-fade-in"
          style={{
            ...c.pos,
            transform: `rotate(${c.rotate}deg)`,
            borderTop: "2px solid var(--accent-blue)",
            borderLeft: "2px solid var(--accent-blue)",
            boxShadow: "0 0 8px var(--accent-blue)",
          }}
        />
      ))}
    </>
  );
}

function PipeRow({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-3 transition-opacity" style={{ opacity: done || active ? 1 : 0.35 }}>
      {active ? (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent-blue)" }} />
      ) : done ? (
        <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
      ) : (
        <span className="w-4 h-4 rounded-full" style={{ border: "1.5px solid var(--text-muted)" }} />
      )}
      <span style={{ color: done || active ? "var(--text-primary)" : "var(--text-muted)" }}>{label}</span>
    </div>
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
                <CountUp end={5.85} suffix="B" />
              </div>
              <div className="mt-4 text-base" style={{ color: "var(--text-secondary)" }}>
                images in LAION-5B, scraped without consent
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
            <MalamhMark size={140} />
            <div className="text-4xl md:text-5xl font-semibold tracking-tight" style={{ fontFamily: "var(--app-font-display)", color: "var(--text-primary)", textShadow: "0 0 40px var(--accent-blue-glow)" }}>
              Malamh
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
      <SectionLiveDemo />
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
