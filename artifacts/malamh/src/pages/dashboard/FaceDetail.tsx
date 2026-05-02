import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useGetFace,
  useUpdateFace,
  useDeleteFace,
  useListConsentTokens,
  useRequestConsent,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, ScanFace, Copy, Check } from "lucide-react";

type ConsentLevel = "OPEN" | "BLOCKED" | "TOKEN_REQUIRED";

const consentLabels: Record<string, string> = {
  OPEN: "Open",
  BLOCKED: "Blocked",
  TOKEN_REQUIRED: "Token Required",
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
      { id, data: { consentLevel: level as "BLOCKED" | "TOKEN_REQUIRED" | "OPEN" } },
      {
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("Delete this face registration? This cannot be undone.")) return;
    deleteFace.mutate(
      { id },
      {
        onSuccess: () => setLocation("/dashboard/overview"),
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      }
    );
  };

  const handleCreateToken = () => {
    requestConsent.mutate(
      { data: { faceId: id, requesterName: "Manual", purpose: "Self-created token" } },
      {
        onError: () => toast({ title: "Failed to create token", variant: "destructive" }),
      }
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !face) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">Face not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
              <ScanFace className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{face.label ?? "Face"}</h1>
              <p className="text-xs text-muted-foreground font-mono">{face.id}</p>
            </div>
          </div>
          <button onClick={handleDelete} className="btn btn-ghost text-destructive hover:bg-destructive/10 gap-2 h-9 px-3 text-sm">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>

        {/* Consent level */}
        <div className="surface p-6">
          <h2 className="font-semibold mb-4">Consent Level</h2>
          <div className="flex flex-col gap-2">
            {(["OPEN", "TOKEN_REQUIRED", "BLOCKED"] as ConsentLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => handleUpdateConsent(level)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-colors ${
                  currentConsent === level
                    ? "border-primary/50 bg-primary/5 text-foreground"
                    : "border-border/50 text-muted-foreground hover:border-border"
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    currentConsent === level ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}
                />
                <span className="font-medium">{consentLabels[level]}</span>
                {currentConsent === level && updateFace.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Face ID */}
        <div className="surface p-6">
          <h2 className="font-semibold mb-3">Face ID</h2>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm bg-background rounded border border-border/50 px-3 py-2 text-muted-foreground break-all">
              {face.id}
            </code>
            <button onClick={() => handleCopy(face.id)} className="btn btn-ghost border border-border/50 h-9 w-9 p-0 flex-shrink-0">
              {copied === face.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this ID with AI systems that need to check your consent.
          </p>
        </div>

        {/* Consent tokens */}
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Consent Tokens</h2>
            <button
              onClick={handleCreateToken}
              disabled={requestConsent.isPending}
              className="btn btn-ghost border border-border/50 h-8 px-3 text-xs gap-1.5"
            >
              {requestConsent.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "+ New token"
              )}
            </button>
          </div>
          {faceTokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tokens yet. Create one to grant temporary consent.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {faceTokens.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs bg-background rounded border border-border/50 px-3 py-2 text-muted-foreground truncate">
                    {t.token}
                  </code>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                      t.approved ? "badge-open" : t.used ? "badge-blocked" : "badge-token"
                    }`}
                  >
                    {t.approved ? "approved" : t.used ? "used" : "pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Registered {new Date(face.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </DashboardLayout>
  );
}
