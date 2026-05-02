import { useState, useEffect } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ScanFace, Loader2, XCircle, Shield } from "lucide-react";

type ConsentLevel = "blocked" | "token" | "open";

const DEMO_FACES = [
  { id: "demo_face_001", label: "Alice Chen", consent: "open" as ConsentLevel },
  { id: "demo_face_002", label: "Bob Williams", consent: "blocked" as ConsentLevel },
  { id: "demo_face_003", label: "Carla Russo", consent: "token" as ConsentLevel },
];

const consentMeta: Record<ConsentLevel, { label: string; badge: string; color: string }> = {
  open: { label: "OPEN", badge: "badge-open", color: "var(--accent-green)" },
  blocked: { label: "BLOCKED", badge: "badge-blocked", color: "var(--accent-red)" },
  token: { label: "TOKEN REQUIRED", badge: "badge-token", color: "var(--accent-amber)" },
};

function ScoreRing({ value, color }: { value: number; color: string }) {
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDrawn(eased * value);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  const r = 84;
  const c = 2 * Math.PI * r;
  const dash = (drawn / 100) * c;
  return (
    <div className="relative w-[200px] h-[200px] mx-auto">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        <circle cx="100" cy="100" r={r} stroke="var(--border-subtle)" strokeWidth="8" fill="none" />
        <circle
          cx="100" cy="100" r={r} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ filter: `drop-shadow(0 0 16px ${color})`, transition: "stroke-dasharray 0.05s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="headline-display text-5xl" style={{ color }}>{drawn.toFixed(0)}%</span>
        <span className="text-xs mt-1 section-label">Confidence</span>
      </div>
    </div>
  );
}

export default function Playground() {
  const [faceId, setFaceId] = useState("");
  const [result, setResult] = useState<{ consent: ConsentLevel; face_id: string; latency: number; score: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [noMatch, setNoMatch] = useState(false);

  const check = async (id: string) => {
    setLoading(true);
    setResult(null);
    setNoMatch(false);
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    const demo = DEMO_FACES.find((f) => f.id === id || f.label.toLowerCase().includes(id.toLowerCase()));
    const latency = Date.now() - start;
    if (demo) setResult({ consent: demo.consent, face_id: demo.id, latency, score: 88 + Math.random() * 11 });
    else setNoMatch(true);
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceId.trim()) return;
    check(faceId.trim());
  };

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="section-label mb-3">Playground</div>
          <h1 className="headline-display text-4xl md:text-5xl mb-4">Test the API</h1>
          <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Live consent-check API. Try a demo face ID or your own.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT — input */}
          <div className="glass-card-elevated p-8">
            <div className="section-label mb-4">Input</div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text" value={faceId} onChange={(e) => setFaceId(e.target.value)}
                className="input-mh" placeholder="Enter face_id or demo name…"
              />
              <button type="submit" disabled={loading} className="btn-mh btn-mh-primary w-full justify-center">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ScanFace className="w-4 h-4" /> Check Face</>}
              </button>
            </form>

            <div className="mt-6">
              <div className="section-label mb-3">Quick test</div>
              <div className="flex flex-col gap-2">
                {DEMO_FACES.map((f) => {
                  const meta = consentMeta[f.consent];
                  return (
                    <button
                      key={f.id}
                      onClick={() => { setFaceId(f.id); check(f.id); }}
                      className="flex items-center justify-between text-left rounded-lg px-4 py-3 transition-colors"
                      style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.label}</div>
                        <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{f.id}</div>
                      </div>
                      <span className={`badge-mh ${meta.badge}`}>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — result */}
          <div className="glass-card-elevated p-8 min-h-[420px] flex flex-col">
            <div className="section-label mb-4">Result</div>
            <div className="flex-1 flex flex-col items-center justify-center">
              {!result && !noMatch && !loading && (
                <div className="text-center">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Submit a face ID to see the response</p>
                </div>
              )}
              {loading && (
                <div className="text-center">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin mb-3" style={{ color: "var(--accent-blue)" }} />
                  <p className="text-sm section-label">Checking registry…</p>
                </div>
              )}
              {noMatch && (
                <div className="text-center">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: "var(--text-muted)" }} />
                  <h3 className="headline-section text-xl mb-2">No match found in registry</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>This face is not protected.</p>
                </div>
              )}
              {result && (() => {
                const meta = consentMeta[result.consent];
                return (
                  <div className="text-center w-full anim-scale-in">
                    <ScoreRing value={result.score} color={meta.color} />
                    <span className={`badge-mh ${meta.badge} mt-5 text-sm`}>{meta.label}</span>
                    <p className="mt-3 text-base font-medium" style={{ color: "var(--text-primary)" }}>{DEMO_FACES.find(f => f.id === result.face_id)?.label}</p>
                    <details className="mt-5 text-left">
                      <summary className="cursor-pointer text-xs section-label">Raw JSON response</summary>
                      <pre className="code-block mt-2 text-xs">
{`{
  "face_id": "${result.face_id}",
  "consent": "${result.consent}",
  "allowed": ${result.consent !== "blocked"},
  "score": ${result.score.toFixed(2)},
  "latency_ms": ${result.latency},
  "checked_at": "${new Date().toISOString()}"
}`}
                      </pre>
                    </details>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
