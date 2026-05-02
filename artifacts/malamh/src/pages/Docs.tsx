import { PublicLayout } from "@/components/layout/PublicLayout";
import { BookOpen } from "lucide-react";

const sections = [
  {
    title: "Introduction",
    id: "intro",
    content: `Malamh (ملامح) is a facial consent registry. Individuals register their face and set a consent level.
AI image-generation systems call the Malamh API before generating someone's likeness to verify consent.`,
  },
  {
    title: "Authentication",
    id: "auth",
    content: `All public API endpoints require an API key passed in the Authorization header:\n\nAuthorization: Bearer mk_live_xxxxxxxxxxxxxxxx\n\nObtain a key from your dashboard under API Keys.`,
    code: `curl -X POST https://api.malamh.io/api/check \\
  -H "Authorization: Bearer mk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"face_id":"face_abc123"}'`,
  },
  {
    title: "Check Consent — POST /api/check",
    id: "check",
    content: "Returns the consent status for a given face ID.",
    code: `// Request
{
  "face_id": "face_abc123"
}

// Response 200
{
  "allowed": true,
  "consent": "open",       // "open" | "blocked" | "token"
  "face_id": "face_abc123",
  "checked_at": "2026-05-02T12:00:00Z"
}

// Response 403 (blocked)
{
  "allowed": false,
  "consent": "blocked",
  "face_id": "face_abc123"
}`,
  },
  {
    title: "Check With Image — POST /api/check-image",
    id: "check-image",
    content: "Performs face matching against registered profiles and returns consent status. Send a base64-encoded image.",
    code: `// Request
{
  "image": "data:image/jpeg;base64,...",
  "threshold": 0.85   // optional, default 0.85
}

// Response
{
  "match": true,
  "face_id": "face_abc123",
  "confidence": 0.97,
  "consent": "open",
  "allowed": true
}`,
  },
  {
    title: "Consent Levels",
    id: "levels",
    content: `There are three consent levels:\n\n• open — Generation is allowed without restriction.\n• blocked — Generation is not allowed. Respect this and do not proceed.\n• token — A one-time consent token is required. The user must approve via their Malamh dashboard.`,
  },
  {
    title: "Rate Limits",
    id: "limits",
    content: `Free plan: 100 checks/month\nPro plan: 10,000 checks/month\nAPI Builder: 100,000 checks/month\n\nExceeding the limit returns HTTP 429. Rate limit headers are included in every response:\n\nX-RateLimit-Limit: 10000\nX-RateLimit-Remaining: 9432\nX-RateLimit-Reset: 1714694400`,
  },
  {
    title: "Error Codes",
    id: "errors",
    content: "All errors follow a consistent shape.",
    code: `{
  "error": "face_not_found",
  "message": "No face with that ID is registered.",
  "status": 404
}

// Common codes
// 400 bad_request
// 401 unauthorized
// 403 forbidden / blocked_by_user
// 404 face_not_found
// 429 rate_limit_exceeded
// 500 internal_error`,
  },
];

export default function Docs() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-4xl px-4 py-16 flex gap-10">
        {/* Sidebar TOC */}
        <aside className="hidden md:block w-52 flex-shrink-0 sticky top-24 self-start">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">On this page</p>
          <nav className="flex flex-col gap-1.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">API Reference</h1>
              <p className="text-sm text-muted-foreground">Malamh Consent Registry v1.0</p>
            </div>
          </div>

          <div className="flex flex-col gap-12">
            {sections.map((s) => (
              <section key={s.id} id={s.id}>
                <h2 className="text-lg font-semibold mb-3">{s.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-4">{s.content}</p>
                {s.code && (
                  <pre className="bg-card border border-border/50 rounded-lg p-4 text-xs text-foreground overflow-x-auto">
                    <code>{s.code}</code>
                  </pre>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
