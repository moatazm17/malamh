import { useState } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ScanFace, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type ConsentLevel = "blocked" | "token" | "open";

const DEMO_FACES = [
  { id: "demo_face_001", label: "Alice Chen", consent: "open" as ConsentLevel },
  { id: "demo_face_002", label: "Bob Williams", consent: "blocked" as ConsentLevel },
  { id: "demo_face_003", label: "Carla Russo", consent: "token" as ConsentLevel },
];

const statusConfig: Record<ConsentLevel, { icon: typeof CheckCircle; label: string; color: string; badge: string }> = {
  open: { icon: CheckCircle, label: "Allowed", color: "text-green-400", badge: "badge-open" },
  blocked: { icon: XCircle, label: "Blocked", color: "text-destructive", badge: "badge-blocked" },
  token: { icon: AlertCircle, label: "Token Required", color: "text-yellow-400", badge: "badge-token" },
};

export default function Playground() {
  const [faceId, setFaceId] = useState("");
  const [result, setResult] = useState<{ consent: ConsentLevel; face_id: string; latency: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const check = async (id: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
    const demo = DEMO_FACES.find((f) => f.id === id || f.label.toLowerCase().includes(id.toLowerCase()));
    const latency = Date.now() - start;
    if (demo) {
      setResult({ consent: demo.consent, face_id: demo.id, latency });
    } else {
      setError("Face ID not found in the registry.");
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceId.trim()) return;
    check(faceId.trim());
  };

  return (
    <PublicLayout>
      <div className="container mx-auto max-w-2xl px-4 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <ScanFace className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">API Playground</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Try the Malamh consent-check API live. Enter a face ID (or one of the demo IDs below) to see the response.
          </p>
        </div>

        <div className="surface p-6 mb-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={faceId}
              onChange={(e) => setFaceId(e.target.value)}
              className="input flex-1"
              placeholder="Enter face_id or demo name…"
            />
            <button type="submit" disabled={loading} className="btn btn-primary px-6 gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <p className="text-xs text-muted-foreground mr-2 self-center">Try:</p>
            {DEMO_FACES.map((f) => (
              <button
                key={f.id}
                onClick={() => { setFaceId(f.id); check(f.id); }}
                className="px-3 py-1 rounded-md text-xs border border-border/50 bg-muted/50 hover:bg-muted transition-colors"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="surface p-4 border-destructive/40 bg-destructive/5 flex items-center gap-3 text-sm text-destructive mb-6">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (() => {
          const cfg = statusConfig[result.consent];
          const Icon = cfg.icon;
          return (
            <div className="surface p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Response</h3>
                <span className="text-xs text-muted-foreground">{result.latency}ms</span>
              </div>
              <div className="bg-background rounded-md border border-border/50 p-4 font-mono text-sm mb-6 whitespace-pre">
{`{
  "face_id": "${result.face_id}",
  "consent": "${result.consent}",
  "allowed": ${result.consent !== "blocked"},
  "checked_at": "${new Date().toISOString()}"
}`}
              </div>
              <div className={`flex items-center gap-3 ${cfg.color}`}>
                <Icon className="h-5 w-5" />
                <span className="font-medium text-base">{cfg.label}</span>
              </div>
            </div>
          );
        })()}

        <div className="mt-10 surface p-6">
          <h2 className="text-sm font-semibold mb-4">Demo face IDs</h2>
          <div className="flex flex-col gap-3">
            {DEMO_FACES.map((f) => {
              const cfg = statusConfig[f.consent];
              return (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{f.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono">{f.id}</span>
                  </div>
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
