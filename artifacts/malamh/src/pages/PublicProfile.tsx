import { useParams } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Shield, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";

const consentConfig = {
  open: { icon: CheckCircle, label: "Open — AI generation allowed", color: "text-green-400", badge: "badge-open" },
  blocked: { icon: XCircle, label: "Blocked — AI generation not allowed", color: "text-destructive", badge: "badge-blocked" },
  token: { icon: AlertCircle, label: "Token required — approval needed per request", color: "text-yellow-400", badge: "badge-token" },
};

export default function PublicProfile() {
  const params = useParams<{ username: string }>();
  const username = params.username ?? "";

  const consent = "open" as "open" | "blocked" | "token";
  const cfg = consentConfig[consent];
  const Icon = cfg.icon;

  return (
    <PublicLayout>
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center text-3xl font-bold mb-6 border border-border">
          {username.charAt(0).toUpperCase()}
        </div>

        <h1 className="text-2xl font-bold mb-1">{username}</h1>
        <p className="text-sm text-muted-foreground mb-8">Malamh Consent Profile</p>

        <div className="surface p-8 mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className={`flex items-center gap-3 ${cfg.color}`}>
              <Icon className="h-8 w-8" />
              <span className="text-xl font-semibold">Consent Status</span>
            </div>
            <p className="text-muted-foreground text-sm">{cfg.label}</p>
          </div>
        </div>

        <div className="surface p-6 text-left">
          <h2 className="text-sm font-semibold mb-4">For AI builders</h2>
          <div className="font-mono text-xs bg-background rounded border border-border/50 p-4 mb-3">
            {`POST /api/check\n{ "face_id": "face_${username.toLowerCase()}_xxx" }`}
          </div>
          <p className="text-xs text-muted-foreground">
            Check this person's consent before generating their likeness.{" "}
            <a href="/docs" className="text-primary hover:underline inline-flex items-center gap-1">
              API Docs <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Protected by Malamh Facial Consent Registry</span>
        </div>
      </div>
    </PublicLayout>
  );
}
