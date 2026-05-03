import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useListFaces, useGetStatsOverview } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MalamhMark } from "@/components/layout/PublicLayout";
import { CheckCircle, Copy, Pencil, Loader2, ScanFace, ArrowRight } from "lucide-react";

const SHARE_URL = "https://malamh.app";
const DEFAULT_MESSAGE = `My face. My rules. ✋

I just registered on @MalamhApp — the first facial consent registry.

AI companies now need MY permission before generating my likeness. No more unauthorized deepfakes. No more training on my photos without consent.

15.4 billion images were used to train AI. Zero people were asked.

It's time to change that. Protect your face too → ${SHARE_URL}

#MyFaceMyRules #Malamh`;

type Platform = "twitter" | "facebook" | "linkedin" | "whatsapp" | "copy";

export default function Share() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: faces } = useListFaces();
  const { data: globalStats } = useGetStatsOverview();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareTotal, setShareTotal] = useState<number | null>(null);

  // Load global share total
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/stats/shares");
        if (res.ok) {
          const data = await res.json();
          setShareTotal(data.totalShares ?? 0);
        }
      } catch { /* silent */ }
    })();
  }, []);

  const fireShare = async (platform: Platform) => {
    // Fire-and-forget — don't block UI
    apiFetch("/internal/share-count", {
      method: "POST",
      body: JSON.stringify({ platform }),
    }).then(() => setShareTotal((n) => (n ?? 0) + 1)).catch(() => {});
  };

  const openShare = (platform: Exclude<Platform, "copy">, url: string) => {
    fireShare(platform);
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      fireShare("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const enc = encodeURIComponent(message);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${enc}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${enc}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`;
  const whatsappUrl = `https://wa.me/?text=${enc}`;

  // Check if user has any registered faces
  const hasFaces = (faces ?? []).length > 0;
  const totalFaces = globalStats?.totalFaces ?? globalStats?.totalUsers ?? 0;

  // Redirect to login if no user
  useEffect(() => {
    if (!userLoading && !user) setLocation("/login");
  }, [user, userLoading, setLocation]);

  if (userLoading || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent-blue)" }} />
      </div>
    );
  }

  // No-face state
  if (!hasFaces) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center" style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}>
        <NoiseLayer />
        <MeshGlow />
        <div className="relative z-10 max-w-md anim-fade-up">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue)" }}
          >
            <ScanFace className="w-7 h-7" style={{ color: "var(--accent-blue)" }} />
          </div>
          <h1 className="headline-section text-3xl mb-3">Register your face first</h1>
          <p className="text-base mb-7" style={{ color: "var(--text-secondary)" }}>
            Take control of your likeness, then share your declaration with the world.
          </p>
          <Link href="/dashboard/register-face" className="btn-mh btn-mh-primary inline-flex">
            Register your face <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="mt-5">
            <Link href="/dashboard/overview" className="text-xs" style={{ color: "var(--text-muted)" }}>
              Go to dashboard →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}>
      <NoiseLayer />
      <MeshGlow />

      {/* Top brand strip */}
      <div className="relative z-10 max-w-[600px] mx-auto px-6 pt-8 pb-2">
        <Link href="/dashboard/overview" className="inline-flex items-center gap-2 hover:opacity-80">
          <MalamhMark size={22} />
          <span className="font-semibold tracking-tight" style={{ fontFamily: "var(--app-font-display)" }}>Malamh</span>
        </Link>
      </div>

      <div className="relative z-10 max-w-[600px] mx-auto px-6 pb-16 pt-6 flex flex-col items-center text-center">
        {/* 1. Success celebration */}
        <SuccessCheckmark />

        <h1
          className="headline-display text-4xl md:text-5xl mt-7 mb-3 anim-fade-up"
          style={{ animationDelay: "0.5s", animationFillMode: "both", opacity: 0 }}
        >
          Your face is now protected.
        </h1>
        <p
          className="text-base md:text-lg max-w-md anim-fade-up"
          style={{ color: "var(--text-secondary)", animationDelay: "0.8s", animationFillMode: "both", opacity: 0 }}
        >
          You're one of <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>{totalFaces.toLocaleString()}</span>{" "}
          {totalFaces === 1 ? "person" : "people"} who took control of their face.
        </p>

        {/* 2. Petition statement */}
        <div
          className="w-full mt-10 anim-fade-up"
          style={{ animationDelay: "1.1s", animationFillMode: "both", opacity: 0 }}
        >
          <div
            className="glass-card-elevated p-8 text-left relative"
            style={{
              borderLeft: "4px solid var(--accent-blue)",
              boxShadow: "0 0 40px var(--accent-blue-glow), 0 30px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div className="section-label mb-4">My Declaration</div>
            {editing ? (
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={11}
                className="input-mh resize-none w-full"
                style={{
                  fontSize: "1.05rem",
                  lineHeight: 1.7,
                  fontFamily: "var(--app-font-body)",
                  fontWeight: 500,
                }}
                autoFocus
              />
            ) : (
              <p
                className="whitespace-pre-line"
                style={{
                  fontFamily: "var(--app-font-body)",
                  fontSize: "1.05rem",
                  lineHeight: 1.7,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {message}
              </p>
            )}
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => setEditing((e) => !e)}
                className="text-xs inline-flex items-center gap-1.5 hover:underline transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <Pencil className="w-3 h-3" />
                {editing ? "Done editing" : "Edit message"}
              </button>
              {editing && (
                <button
                  onClick={() => { setMessage(DEFAULT_MESSAGE); setEditing(false); }}
                  className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}
                >Reset to default</button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Share buttons */}
        <div
          className="w-full mt-7 anim-fade-up"
          style={{ animationDelay: "1.4s", animationFillMode: "both", opacity: 0 }}
        >
          {/* Primary: X / Twitter */}
          <button
            onClick={() => openShare("twitter", twitterUrl)}
            className="btn-mh btn-mh-primary w-full justify-center mb-3 group"
            style={{ padding: "16px 22px", fontSize: "0.95rem" }}
          >
            <XIcon className="w-5 h-5" />
            Share on X
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ShareButton
              onClick={() => openShare("facebook", facebookUrl)}
              icon={<FacebookIcon className="w-4 h-4" />}
              label="Facebook"
              delay="1.5s"
            />
            <ShareButton
              onClick={() => openShare("linkedin", linkedinUrl)}
              icon={<LinkedInIcon className="w-4 h-4" />}
              label="LinkedIn"
              delay="1.6s"
            />
            <ShareButton
              onClick={() => openShare("whatsapp", whatsappUrl)}
              icon={<WhatsAppIcon className="w-4 h-4" />}
              label="WhatsApp"
              delay="1.7s"
            />
            <ShareButton
              onClick={handleCopy}
              icon={copied
                ? <CheckCircle className="w-4 h-4" style={{ color: "var(--accent-green)" }} />
                : <Copy className="w-4 h-4" />}
              label={copied ? "Copied!" : "Copy text"}
              labelColor={copied ? "var(--accent-green)" : undefined}
              delay="1.8s"
            />
          </div>
        </div>

        {/* 4. Social proof counter */}
        {shareTotal !== null && (
          <div
            className="w-full mt-10 anim-fade-up"
            style={{ animationDelay: "1.8s", animationFillMode: "both", opacity: 0 }}
          >
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{shareTotal.toLocaleString()}</span>{" "}
              {shareTotal === 1 ? "person has" : "people have"} shared their declaration
            </p>
            {shareTotal > 100 && (
              <div className="max-w-xs mx-auto mt-3">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (shareTotal / 10000) * 100)}%`,
                      background: "var(--accent-blue)",
                      boxShadow: "0 0 12px var(--accent-blue)",
                    }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Goal: 10,000 declarations
                </p>
              </div>
            )}
          </div>
        )}

        {/* 5. Skip */}
        <Link
          href="/dashboard/overview"
          className="mt-12 text-xs transition-colors anim-fade-up"
          style={{
            color: "var(--text-muted)",
            animationDelay: "2.0s",
            animationFillMode: "both",
            opacity: 0,
          }}
        >
          Go to dashboard →
        </Link>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function ShareButton({ onClick, icon, label, labelColor, delay }: {
  onClick: () => void; icon: React.ReactNode; label: string; labelColor?: string; delay: string;
}) {
  return (
    <button
      onClick={onClick}
      className="glass-card glass-card-hover flex items-center justify-center gap-2 transition-all anim-fade-up"
      style={{
        padding: "12px 14px",
        fontSize: "0.85rem",
        fontWeight: 500,
        color: labelColor ?? "var(--text-primary)",
        animationDelay: delay,
        animationFillMode: "both",
        opacity: 0,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SuccessCheckmark() {
  return (
    <div className="relative w-20 h-20">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "var(--accent-green-glow)",
          boxShadow: "0 0 60px rgba(0,212,138,0.4), 0 0 120px rgba(0,212,138,0.15)",
          animation: "mh-pulse-glow 2.5s ease-in-out infinite",
        }}
      />
      <svg width="80" height="80" viewBox="0 0 80 80" className="relative">
        <circle
          cx="40" cy="40" r="36"
          fill="none"
          stroke="var(--accent-green)"
          strokeWidth="2.5"
          strokeDasharray="226"
          strokeDashoffset="226"
          style={{ animation: "mh-draw-circle 0.5s ease-out forwards" }}
        />
        <path
          d="M 24 41 L 36 53 L 56 30"
          fill="none"
          stroke="var(--accent-green)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="55"
          strokeDashoffset="55"
          style={{ animation: "mh-draw-check 0.4s ease-out 0.5s forwards" }}
        />
      </svg>
      <style>{`
        @keyframes mh-draw-circle { to { stroke-dashoffset: 0; } }
        @keyframes mh-draw-check  { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}

function NoiseLayer() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
        opacity: 0.04,
        mixBlendMode: "overlay",
        zIndex: 1,
      }}
    />
  );
}

function MeshGlow() {
  return (
    <>
      <div
        className="pointer-events-none absolute"
        style={{
          top: "-20%", left: "-10%", width: "60%", height: "60%",
          background: "radial-gradient(circle, rgba(77,124,255,0.15), transparent 70%)",
          filter: "blur(80px)",
          zIndex: 0,
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "-20%", right: "-10%", width: "60%", height: "60%",
          background: "radial-gradient(circle, rgba(0,212,138,0.12), transparent 70%)",
          filter: "blur(80px)",
          zIndex: 0,
        }}
      />
    </>
  );
}

// ─── Brand SVG icons ──────────────────────────────────────────────────

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.413c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.99 5.93L3.95 16.59a.41.41 0 00-.01.262l1.142 4.144zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01a1.094 1.094 0 00-.794.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}
