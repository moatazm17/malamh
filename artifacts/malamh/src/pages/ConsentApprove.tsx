import { useState } from "react";
import { useParams } from "wouter";
import { Shield, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { useConsentDecision } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function ConsentApprove() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const { toast } = useToast();
  const consentDecision = useConsentDecision();
  const [done, setDone] = useState<"approve" | "deny" | null>(null);

  const handle = (decision: "approve" | "deny") => {
    consentDecision.mutate(
      { data: { token, decision } },
      {
        onSuccess: () => setDone(decision),
        onError: () => toast({ title: `Failed to ${decision} request`, variant: "destructive" }),
      }
    );
  };

  if (done === "approve") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 text-center">
        <CheckCircle className="h-16 w-16 text-green-400 mb-6" />
        <h1 className="text-2xl font-bold mb-2">Consent Approved</h1>
        <p className="text-muted-foreground">You've approved this one-time generation request. You can close this page.</p>
      </div>
    );
  }

  if (done === "deny") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 text-center">
        <XCircle className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold mb-2">Request Rejected</h1>
        <p className="text-muted-foreground">You've rejected this generation request. The requester has been notified.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold tracking-tight">Malamh</span>
          </div>
        </div>

        <div className="surface p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-7 w-7 text-yellow-400" />
          </div>

          <h1 className="text-xl font-bold mb-2">Consent Request</h1>
          <p className="text-sm text-muted-foreground mb-6">
            An AI system is requesting permission to generate an image using your likeness.
            This is a one-time consent token.
          </p>

          <div className="bg-background rounded border border-border/50 p-3 font-mono text-xs text-muted-foreground mb-8 text-left break-all">
            Token: {token}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handle("approve")}
              disabled={consentDecision.isPending}
              className="btn btn-primary h-12 text-base gap-2"
            >
              {consentDecision.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <><CheckCircle className="h-5 w-5" /> Approve this request</>
              )}
            </button>
            <button
              onClick={() => handle("deny")}
              disabled={consentDecision.isPending}
              className="btn btn-danger h-12 text-base gap-2"
            >
              <XCircle className="h-5 w-5" /> Reject
            </button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            This token can only be used once and expires in 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
