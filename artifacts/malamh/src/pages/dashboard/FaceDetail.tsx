import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useGetFace, useUpdateFace, useDeleteFace, useListConsentTokens, useRequestConsent,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, ScanFace, Copy, Check, ShieldOff, ShieldAlert, ShieldCheck } from "lucide-react";

type ConsentLevel = "OPEN" | "BLOCKED" | "TOKEN_REQUIRED";

const consentMeta: Record<ConsentLevel, { label: string; Icon: any; color: string; badge: string }> = {
  BLOCKED:        { label: "Blocked",         Icon: ShieldOff,   color: "var(--accent-red)",   badge: "badge-blocked" },
  TOKEN_REQUIRED: { label: "Token Required",  Icon: ShieldAlert, color: "var(--accent-amber)", badge: "badge-token" },
  OPEN:           { label: "Open",            Icon: ShieldCheck, color: "var(--accent-green)", badge: "badge-open" },
};

export default function FaceDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: face, isLoading, error } = useGetFace(id);
  const { data: tokens } = useListConsentTokens();
  const updateFace = useUpdateFace();
  const deleteFace = useDeleteFace();
  const requestConsent = useRequestConsent();
  const [copied, setCopied] = useState<string | null>(null);

  const faceTokens = (tokens ?? []).filter((t) => t.faceId === id);
  const currentConsent: ConsentLevel = (face?.consentLevel ?? "OPEN") as ConsentLevel;

  const handleUpdateConsent = (level: ConsentLevel) => {
    updateFace.mutate(
      { id, data: { consentLevel: level } },
      { onError: () => toast({ title: "Update failed", variant: "destructive" }) }
    );
  };

  const handleDelete = () => {
    if (!confirm("Delete this face registration? This cannot be undone.")) return;
    deleteFace.mutate({ id }, {
      onSuccess: () => setLocation("/dashboard/overview"),
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  const handleCreateToken = () => {
    requestConsent.mutate(
      { data: { faceId: id, requesterName: "Manual", purpose: "Self-created token" } },
      { onError: () => toast({ title: "Failed to create token", variant: "destructive" }) }
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent-blue)" }} />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !face) {
    return (
      <DashboardLayout>
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>Face not found.</div>
      </DashboardLayout>
    );
  }

  const meta = consentMeta[currentConsent];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-3xl anim-fade-up">
        {/* Top info card */}
        <div className="glass-card-elevated p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue)" }}
              >
                <ScanFace className="w-7 h-7" style={{ color: "var(--accent-blue)" }} />
              </div>
              <div>
                <h1 className="headline-section text-2xl mb-1">{face.label ?? "Face"}</h1>
                <span className={`badge-mh ${meta.badge} mr-2`}>{meta.label}</span>
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                  Registered {new Date(face.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
            <button onClick={handleDelete} className="btn-mh btn-mh-danger">
              <Trash2 className="w-4 h-4" /> Delete Face
            </button>
          </div>
        </div>

        {/* Consent selector */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-5" style={{ fontFamily: "var(--app-font-display)" }}>Change Consent</h2>
          <div className="flex flex-col gap-3">
            {(["BLOCKED", "TOKEN_REQUIRED", "OPEN"] as ConsentLevel[]).map((level) => {
              const m = consentMeta[level];
              const active = currentConsent === level;
              return (
                <button
                  key={level} onClick={() => handleUpdateConsent(level)}
                  className="flex items-start gap-4 p-4 rounded-xl text-left transition-all"
                  style={{
                    background: active ? `color-mix(in srgb, ${m.color} 8%, transparent)` : "var(--bg-void)",
                    border: `1px solid ${active ? m.color : "var(--border-subtle)"}`,
                    borderLeftWidth: active ? 4 : 1,
                    boxShadow: active ? `0 0 24px color-mix(in srgb, ${m.color} 18%, transparent)` : undefined,
                  }}
                >
                  <m.Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: m.color }} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{m.label}</p>
                  </div>
                  {active && updateFace.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {active && !updateFace.isPending && <Check className="w-4 h-4" style={{ color: m.color }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Face ID */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--app-font-display)" }}>Face ID</h2>
          <div className="flex items-center gap-2">
            <code className="flex-1 code-block text-xs break-all" style={{ padding: "10px 14px" }}>{face.id}</code>
            <button onClick={() => handleCopy(face.id)} className="btn-mh btn-mh-ghost flex-shrink-0" style={{ padding: "10px 14px" }}>
              {copied === face.id ? <Check className="w-4 h-4" style={{ color: "var(--accent-green)" }} /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Share this ID with AI systems that need to check your consent.
          </p>
        </div>

        {/* Consent tokens */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--app-font-display)" }}>Pending Consent Tokens</h2>
            <button onClick={handleCreateToken} disabled={requestConsent.isPending} className="btn-mh btn-mh-ghost text-xs" style={{ padding: "6px 14px" }}>
              {requestConsent.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "+ New token"}
            </button>
          </div>
          {faceTokens.length === 0 ? (
            <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>No pending requests.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {faceTokens.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <code className="flex-1 code-block text-xs truncate" style={{ padding: "8px 12px" }}>{t.token}</code>
                  <span className={`badge-mh ${t.approved ? "badge-open" : t.used ? "badge-blocked" : "badge-token"} flex-shrink-0`}>
                    {t.approved ? "approved" : t.used ? "used" : "pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
