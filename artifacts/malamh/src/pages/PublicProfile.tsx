import { useParams } from "wouter";
import { PublicLayout, MalamhMark } from "@/components/layout/PublicLayout";
import { ExternalLink } from "lucide-react";

const consentConfig = {
  open: {
    label: "OPEN", description: "This person has allowed AI generation of their likeness.",
    badgeClass: "badge-open", glowVar: "var(--accent-green)", glowRgba: "rgba(0,212,138,0.18)",
  },
  blocked: {
    label: "BLOCKED", description: "This person has blocked all AI generation of their likeness.",
    badgeClass: "badge-blocked", glowVar: "var(--accent-red)", glowRgba: "rgba(255,77,94,0.18)",
  },
  token: {
    label: "TOKEN REQUIRED", description: "AI must request approval each time before using this person's likeness.",
    badgeClass: "badge-token", glowVar: "var(--accent-amber)", glowRgba: "rgba(255,176,32,0.18)",
  },
};

// Generate a stable abstract avatar from the username hash
function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function AbstractAvatar({ seed, size = 96 }: { seed: string; size?: number }) {
  const h = hashCode(seed);
  const hue1 = h % 360;
  const hue2 = (hue1 + 60) % 360;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="rounded-full" style={{ boxShadow: "0 0 40px var(--accent-blue-glow)" }}>
      <defs>
        <linearGradient id={`avg-${seed}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={`hsl(${hue1} 80% 55%)`} />
          <stop offset="1" stopColor={`hsl(${hue2} 80% 35%)`} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#avg-${seed})`} />
      {[...Array(6)].map((_, i) => {
        const a = (h + i * 60) % 360;
        const r = 18 + (i * 4) % 14;
        const cx = 50 + Math.cos((a * Math.PI) / 180) * 22;
        const cy = 50 + Math.sin((a * Math.PI) / 180) * 22;
        return <circle key={i} cx={cx} cy={cy} r={r * 0.4} fill="rgba(255,255,255,0.18)" />;
      })}
    </svg>
  );
}

export default function PublicProfile() {
  const params = useParams<{ username: string }>();
  const username = params.username ?? "";
  const consent = "open" as keyof typeof consentConfig;
  const cfg = consentConfig[consent];

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto px-6 py-20 text-center anim-fade-up">
        <div className="flex justify-center mb-6">
          <AbstractAvatar seed={username || "anon"} size={104} />
        </div>

        <h1 className="headline-section text-2xl mb-1">{username}</h1>
        <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>Malamh consent profile</p>

        <div className="glass-card-elevated p-8 mb-6" style={{ boxShadow: `0 0 60px ${cfg.glowRgba}` }}>
          <span className={`badge-mh ${cfg.badgeClass} text-sm mb-5`} style={{ padding: "6px 16px" }}>
            {cfg.label}
          </span>
          <p className="text-base leading-relaxed mt-2" style={{ color: "var(--text-primary)" }}>
            {cfg.description}
          </p>
        </div>

        <div className="glass-card p-6 text-left">
          <div className="section-label mb-4">For AI builders</div>
          <pre className="code-block text-xs overflow-x-auto whitespace-pre" style={{ padding: "14px 16px" }}>
{`POST /api/check
{ "face_id": "face_${username.toLowerCase()}_xxx" }`}
          </pre>
          <p className="text-xs mt-4" style={{ color: "var(--text-secondary)" }}>
            Check this person's consent before generating their likeness.{" "}
            <a href="/docs" className="inline-flex items-center gap-1 hover:underline" style={{ color: "var(--accent-blue)" }}>
              API Docs <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        <div
          className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs"
          style={{ border: "1px solid var(--accent-blue)", color: "var(--text-secondary)", boxShadow: "0 0 30px var(--accent-blue-glow)" }}
        >
          <MalamhMark size={14} />
          Protected by Malamh
          <span className="brand-arabic">ملامح</span>
        </div>
      </div>
    </PublicLayout>
  );
}
