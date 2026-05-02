import { PublicLayout } from "@/components/layout/PublicLayout";

type Endpoint = { method: "GET" | "POST" | "DELETE"; path: string; description: string };

type Section = { id: string; title: string; intro?: string; endpoints?: Endpoint[]; code?: string; bullets?: string[] };

const sections: Section[] = [
  {
    id: "intro", title: "Introduction",
    intro: "Malamh (ملامح) is the world's first facial consent registry. AI image-generation systems call the Malamh API before generating someone's likeness to verify consent. This document covers all public endpoints, authentication, rate limits, and webhooks.",
  },
  {
    id: "auth", title: "Authentication",
    intro: "All API endpoints require an API key passed in the Authorization header. Obtain a key from your dashboard under API Keys.",
    code: `curl -X POST https://api.malamh.io/api/v1/check-face \\
  -H "Authorization: Bearer mlm_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"face_id":"face_abc123"}'`,
  },
  {
    id: "check", title: "Check Face",
    endpoints: [
      { method: "POST", path: "/api/v1/check-face", description: "Returns the consent status for a given face ID or image." },
    ],
    code: `// Request
{
  "image": "data:image/jpeg;base64,...",
  "threshold": 0.85
}

// Response 200 — match
{
  "match": true,
  "face_id": "face_abc123",
  "confidence": 0.97,
  "consent": "open",
  "allowed": true
}

// Response 200 — no match
{ "match": false }

// Response 403 — blocked
{
  "match": true,
  "consent": "blocked",
  "allowed": false
}`,
  },
  {
    id: "tokens", title: "Consent Tokens",
    intro: "When consent is set to TOKEN_REQUIRED, you must request a one-time approval token. The user receives a notification and can approve or deny.",
    endpoints: [
      { method: "POST", path: "/api/v1/tokens/request", description: "Request a consent token. Returns a token ID and approval URL." },
      { method: "GET", path: "/api/v1/tokens/{id}", description: "Check the status of a token (pending / approved / denied)." },
    ],
  },
  {
    id: "webhooks", title: "Webhooks",
    intro: "Subscribe to events to be notified in real-time when faces are checked, blocked, or when consent is requested.",
    bullets: [
      "face.checked — every successful check against your face",
      "face.blocked — when an AI was denied generation",
      "consent.requested — when an AI requests a consent token",
      "scan.completed — when web monitoring finds a new match",
    ],
    code: `// Webhook payload
{
  "id": "evt_abc123",
  "type": "face.blocked",
  "created": 1714694400,
  "data": {
    "face_id": "face_xyz",
    "requester": "openai",
    "purpose": "image_generation"
  }
}`,
  },
  {
    id: "limits", title: "Rate Limits",
    intro: "Rate limits depend on your plan. Exceeding the limit returns HTTP 429.",
    bullets: [
      "Personal: 100 checks / month",
      "Pro: 10,000 checks / month",
      "API Builder: Unlimited",
    ],
    code: `// Response headers
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9432
X-RateLimit-Reset: 1714694400`,
  },
];

const methodClass = (m: string) => m === "GET" ? "method-get" : m === "POST" ? "method-post" : m === "DELETE" ? "method-delete" : "method-patch";

export default function Docs() {
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-12 flex gap-12">
        {/* Sidebar */}
        <aside className="hidden md:block w-[250px] flex-shrink-0 sticky top-24 self-start">
          <div
            className="rounded-xl p-5"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="section-label mb-4">API Reference</div>
            <nav className="flex flex-col gap-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-sm py-2 px-3 rounded-md transition-colors hover:bg-white/5"
                  style={{ color: "var(--text-secondary)", borderLeft: "2px solid transparent" }}
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-12">
            <div className="section-label mb-3">Documentation</div>
            <h1 className="headline-display text-4xl md:text-5xl">API Reference</h1>
            <p className="mt-3 text-base" style={{ color: "var(--text-secondary)" }}>Malamh Consent Registry — v1.0</p>
          </div>

          <div className="flex flex-col gap-16">
            {sections.map((s) => (
              <section key={s.id} id={s.id}>
                <h2 className="headline-section text-2xl mb-4">{s.title}</h2>
                {s.intro && <p className="text-base leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>{s.intro}</p>}

                {s.endpoints && (
                  <div className="flex flex-col gap-3 mb-5">
                    {s.endpoints.map((e) => (
                      <div key={e.path} className="glass-card p-5 flex items-start gap-4">
                        <span className={`badge-mh ${methodClass(e.method)} font-mono`}>{e.method}</span>
                        <div className="flex-1 min-w-0">
                          <code className="text-sm font-mono break-all" style={{ color: "var(--text-primary)" }}>{e.path}</code>
                          <p className="text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>{e.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {s.bullets && (
                  <ul className="flex flex-col gap-2 mb-5">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--accent-blue)" }}>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.code && (
                  <div className="glass-card overflow-hidden">
                    <pre className="code-block whitespace-pre overflow-x-auto" style={{ border: "none", borderRadius: 0 }}>{s.code}</pre>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
