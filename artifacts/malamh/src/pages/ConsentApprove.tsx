import { useState } from "react";
import { useParams } from "wouter";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useConsentDecision } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { MalamhMark } from "@/components/layout/PublicLayout";

export default function ConsentApprove() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const { toast } = useToast();
  const consentDecision = useConsentDecision();
  const [done, setDone] = useState<"approve" | "deny" | null>(null);
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-blue)" }} />
      </div>
    );
  }

  if (!isSignedIn) {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const redirectUrl = `${basePath}/consent/approve/${encodeURIComponent(token)}`;
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
        <div className="mesh-blob" style={{ width: 600, height: 600, background: "rgba(77,124,255,0.18)", top: "-15%", left: "-10%", animation: "mh-orbit-1 28s ease-in-out infinite" }} />
        <div className="w-full max-w-md relative z-10 anim-fade-up">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2.5">
              <MalamhMark size={28} />
              <span className="font-semibold tracking-tight text-lg" style={{ fontFamily: "var(--app-font-display)" }}>Malamh</span>
              <span className="brand-arabic" style={{ color: "var(--text-secondary)" }}>ملامح</span>
            </div>
          </div>
          <div className="glass-card-elevated p-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue)" }}
            >
              <AlertTriangle className="w-8 h-8" style={{ color: "var(--accent-blue)" }} />
            </div>
            <h1 className="headline-section text-2xl mb-2">Sign in to review</h1>
            <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>
              Someone is asking permission to generate an image using a face you registered. Sign in to your Malamh account to verify ownership and approve or deny this request.
            </p>
            <a
              href={`${basePath}/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
              className="btn-mh btn-mh-primary w-full justify-center"
              style={{ padding: "14px 22px" }}
            >
              Sign in to continue
            </a>
            <p className="mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
              Only the registered owner of the face can approve this request.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handle = (decision: "approve" | "deny") => {
    consentDecision.mutate(
      { data: { token, decision } },
      {
        onSuccess: () => setDone(decision),
        onError: () => toast({ title: `Failed to ${decision} request`, variant: "destructive" }),
      }
    );
  };

  if (done) {
    const ok = done === "approve";
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 text-center anim-fade-up" style={{ background: "var(--bg-primary)" }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{
            background: ok ? "var(--accent-green-glow)" : "var(--accent-red-glow)",
            border: `1px solid ${ok ? "var(--accent-green)" : "var(--accent-red)"}`,
            boxShadow: `0 0 60px ${ok ? "rgba(0,212,138,0.3)" : "rgba(255,77,94,0.3)"}`,
          }}
        >
          {ok ? <CheckCircle className="w-10 h-10" style={{ color: "var(--accent-green)" }} /> : <XCircle className="w-10 h-10" style={{ color: "var(--accent-red)" }} />}
        </div>
        <h1 className="headline-section text-3xl mb-2">{ok ? "Consent Approved" : "Request Rejected"}</h1>
        <p className="text-base max-w-sm" style={{ color: "var(--text-secondary)" }}>
          {ok
            ? "You've approved this one-time generation request. You can close this page."
            : "You've rejected this generation request. The requester has been notified."}
        </p>
        <p className="mt-6 text-xs" style={{ color: "var(--text-muted)" }}>{new Date().toLocaleString()}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <div className="mesh-blob" style={{ width: 600, height: 600, background: "rgba(255,176,32,0.10)", top: "-15%", left: "-10%", animation: "mh-orbit-1 28s ease-in-out infinite" }} />

      <div className="w-full max-w-md relative z-10 anim-fade-up">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <MalamhMark size={28} />
            <span className="font-semibold tracking-tight text-lg" style={{ fontFamily: "var(--app-font-display)" }}>Malamh</span>
            <span className="brand-arabic" style={{ color: "var(--text-secondary)" }}>ملامح</span>
          </div>
        </div>

        <div className="glass-card-elevated p-8 text-center" style={{ boxShadow: "0 0 60px rgba(255,176,32,0.1)" }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "var(--accent-amber-glow)", border: "1px solid var(--accent-amber)" }}
          >
            <AlertTriangle className="w-8 h-8" style={{ color: "var(--accent-amber)" }} />
          </div>

          <h1 className="headline-section text-2xl mb-2">Consent Request</h1>
          <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>
            An AI system is requesting permission to generate an image using your likeness. This is a one-time consent token.
          </p>

          <div className="code-block text-xs mb-8 text-left break-all" style={{ padding: "12px 14px" }}>
            <span className="code-token-comment">// token</span>
            <br />
            {token}
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => handle("approve")} disabled={consentDecision.isPending} className="btn-mh w-full justify-center" style={{ padding: "14px 22px", background: "var(--accent-green)", color: "white", boxShadow: "0 0 30px rgba(0,212,138,0.3)" }}>
              {consentDecision.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Approve this request</>}
            </button>
            <button onClick={() => handle("deny")} disabled={consentDecision.isPending} className="btn-mh w-full justify-center" style={{ padding: "14px 22px", background: "transparent", color: "var(--accent-red)", border: "1px solid var(--accent-red)" }}>
              <XCircle className="w-5 h-5" /> Deny
            </button>
          </div>

          <p className="mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
            This token can only be used once and expires in 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
