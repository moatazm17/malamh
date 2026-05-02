import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ShieldCheck, ShieldAlert, ShieldOff, Upload, Camera, Loader2, ExternalLink, Sparkles, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MalamhMark } from "@/components/layout/PublicLayout";

type ConsentStatus = "idle" | "checking" | "blocked" | "open" | "token_required" | "no_match" | "generating" | "done" | "denied";

const PROMPT_CHIPS = [
  "Generate a portrait in cyberpunk style",
  "Create a movie poster featuring this person",
  "Make an oil painting of this face",
  "Render this person as a Renaissance painting",
  "Create a fantasy character portrait",
];

const CSS_FILTERS: string[] = [
  "hue-rotate(30deg) saturate(1.8) brightness(1.1)",
  "sepia(0.6) contrast(1.3) brightness(1.05)",
  "hue-rotate(200deg) saturate(2) contrast(1.2)",
  "grayscale(0.5) contrast(1.4) brightness(1.15) sepia(0.3)",
  "hue-rotate(90deg) saturate(1.5) contrast(1.1)",
];

async function compressTo1024(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > height ? width > MAX : height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = src;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export default function AiStudio() {
  const { toast } = useToast();
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<ConsentStatus>("idle");
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [cssFilter, setCssFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const compressed = await compressTo1024(file);
      setPhotoSrc(compressed);
      setImageBase64(compressed);
      setStatus("idle");
    } catch {
      toast({ title: "Could not load image", variant: "destructive" });
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }, [loadFile]);

  const runGeneration = async () => {
    if (!imageBase64) { toast({ title: "Upload a photo first", variant: "destructive" }); return; }
    if (!prompt.trim()) { toast({ title: "Enter a prompt first", variant: "destructive" }); return; }
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("checking"); setMatchScore(null); setAuthUrl(null); setProgress(0);

    try {
      const rawB64 = imageBase64.split(",")[1] || imageBase64;
      const res = await apiFetch("/api/internal/consent-check", {
        method: "POST",
        body: JSON.stringify({ imageBase64: rawB64, requesterName: "AI Studio", purpose: prompt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus("no_match");
        if (err.message) toast({ title: err.message, variant: "destructive" });
        return;
      }
      const data = await res.json();
      setMatchScore(data.matchScore ?? null);
      if (data.status === "blocked") setStatus("blocked");
      else if (data.status === "open" || data.status === "no_match") {
        setStatus(data.status === "no_match" ? "no_match" : "open");
        setTimeout(() => fakeGenerate(), data.status === "no_match" ? 800 : 400);
      } else if (data.status === "token_required") {
        setStatus("token_required");
        setAuthUrl(data.authUrl ?? null);
        if (data.authUrl) {
          const parts = data.authUrl.split("/");
          startPolling(parts[parts.length - 1]);
        }
      }
    } catch (err: any) {
      toast({ title: err.message ?? "Request failed", variant: "destructive" });
      setStatus("idle");
    }
  };

  const fakeGenerate = () => {
    setCssFilter(CSS_FILTERS[Math.floor(Math.random() * CSS_FILTERS.length)]);
    setStatus("generating");
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 18 + 4;
      if (p >= 100) { p = 100; clearInterval(interval); setProgress(100); setTimeout(() => setStatus("done"), 400); }
      else setProgress(Math.round(p));
    }, 200);
  };

  const startPolling = (token: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/consent/status/${token}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "approved") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("open");
          setTimeout(() => fakeGenerate(), 400);
        } else if (data.status === "denied" || data.status === "expired") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("denied");
        }
      } catch { /* keep polling */ }
    }, 2000);
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("idle"); setMatchScore(null); setAuthUrl(null); setProgress(0);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80">
              <MalamhMark size={26} />
              <span className="font-semibold tracking-tight" style={{ fontFamily: "var(--app-font-display)" }}>Malamh</span>
              <span className="brand-arabic text-sm" style={{ color: "var(--text-secondary)" }}>ملامح</span>
            </Link>
            <span className="badge-mh badge-blue ml-2 text-[0.65rem]" style={{ padding: "3px 10px" }}>AI STUDIO</span>
          </div>
          <Link href="/" className="text-sm" style={{ color: "var(--text-secondary)" }}>← Back home</Link>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="section-label mb-3">AI Studio</div>
          <h1 className="headline-display text-4xl md:text-5xl mb-4">Consent-aware AI generation</h1>
          <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Upload any photo. We check the live registry first, then only generate if consent allows.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT — input */}
          <div className="glass-card-elevated p-7 flex flex-col">
            <div className="section-label mb-4">Input</div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !photoSrc && fileInputRef.current?.click()}
              className="rounded-2xl transition-all overflow-hidden mb-5"
              style={{
                border: photoSrc ? "1px solid var(--border-subtle)" : "2px dashed var(--border-subtle)",
                cursor: photoSrc ? "default" : "pointer",
                background: "var(--bg-void)",
                minHeight: photoSrc ? "auto" : 200,
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
              {photoSrc ? (
                <div className="relative">
                  <img src={photoSrc} alt="Uploaded" className="w-full max-h-80 object-cover" />
                  <button onClick={(e) => { e.stopPropagation(); setPhotoSrc(null); setImageBase64(null); reset(); }} className="absolute top-3 right-3 p-2 rounded-full" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid var(--border-subtle)" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue)" }}>
                    <Upload className="w-6 h-6" style={{ color: "var(--accent-blue)" }} />
                  </div>
                  <p className="text-sm font-medium">Drop a photo or click to upload</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>JPG, PNG, WebP · auto-compressed</p>
                  <button onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }} className="btn-mh btn-mh-ghost text-xs mt-2" style={{ padding: "6px 14px" }}>
                    <Camera className="w-3.5 h-3.5" /> Use camera
                  </button>
                </div>
              )}
            </div>

            <input
              type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runGeneration(); } }}
              placeholder="Describe the image you want to generate…"
              className="input-mh mb-3"
              disabled={status === "checking" || status === "generating"}
            />

            <div className="flex flex-wrap gap-2 mb-5">
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip} onClick={() => setPrompt(chip)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                >
                  {chip}
                </button>
              ))}
            </div>

            <button
              onClick={runGeneration}
              disabled={!imageBase64 || !prompt.trim() || status === "checking" || status === "generating"}
              className="btn-mh btn-mh-primary justify-center"
              style={{ padding: "14px 22px" }}
            >
              {status === "checking" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {status === "checking" ? "Checking…" : "Generate"}
            </button>
          </div>

          {/* RIGHT — result */}
          <div className="glass-card-elevated p-7 min-h-[480px] flex flex-col">
            <div className="section-label mb-4">Result</div>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <ResultPanel status={status} matchScore={matchScore} authUrl={authUrl} progress={progress} photoSrc={photoSrc} cssFilter={cssFilter} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ status, matchScore, authUrl, progress, photoSrc, cssFilter }: {
  status: ConsentStatus; matchScore: number | null; authUrl: string | null; progress: number; photoSrc: string | null; cssFilter: string;
}) {
  if (status === "idle") {
    return (
      <div>
        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Upload a photo, enter a prompt, and click Generate.</p>
      </div>
    );
  }
  if (status === "checking") {
    return (
      <div>
        <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4" style={{ color: "var(--accent-blue)" }} />
        <p className="text-sm section-label">Checking consent registry…</p>
      </div>
    );
  }
  if (status === "blocked") {
    return (
      <div>
        <div className="relative inline-block mb-4">
          {photoSrc && (
            <img src={photoSrc} alt="Blocked" className="w-44 h-44 object-cover rounded-xl" style={{ filter: "blur(10px) saturate(0.4)" }} />
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: "rgba(255,77,94,0.25)", border: "2px solid var(--accent-red)" }}>
            <ShieldOff className="w-12 h-12" style={{ color: "var(--accent-red)" }} />
          </div>
        </div>
        <span className="badge-mh badge-blocked text-sm mb-3" style={{ padding: "6px 16px" }}>BLOCKED</span>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>This person has blocked AI use of their likeness.</p>
        {matchScore !== null && <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Match: {(matchScore * 100).toFixed(0)}%</p>}
      </div>
    );
  }
  if (status === "token_required") {
    return (
      <div>
        <div className="relative inline-block mb-4">
          {photoSrc && (
            <img src={photoSrc} alt="Pending" className="w-44 h-44 object-cover rounded-xl" style={{ filter: "blur(8px) brightness(0.6)" }} />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl" style={{ background: "rgba(255,176,32,0.2)", border: "2px solid var(--accent-amber)" }}>
            <ShieldAlert className="w-10 h-10 mb-2" style={{ color: "var(--accent-amber)" }} />
            <p className="text-xs font-semibold" style={{ color: "var(--accent-amber)" }}>APPROVAL REQUIRED</p>
          </div>
        </div>
        {authUrl && (
          <a href={authUrl} target="_blank" rel="noopener noreferrer" className="btn-mh btn-mh-ghost text-xs mt-3" style={{ padding: "8px 16px", borderColor: "var(--accent-amber)", color: "var(--accent-amber)" }}>
            <ExternalLink className="w-3.5 h-3.5" /> Request Access
          </a>
        )}
        <div className="flex items-center justify-center gap-2 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="w-3 h-3 animate-spin" /> Polling for response…
        </div>
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div>
        <ShieldOff className="w-14 h-14 mx-auto mb-4" style={{ color: "var(--accent-red)" }} />
        <span className="badge-mh badge-blocked text-sm">CONSENT DENIED</span>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>The person rejected this generation request.</p>
      </div>
    );
  }
  if (status === "no_match") {
    return (
      <div>
        <ShieldCheck className="w-14 h-14 mx-auto mb-4" style={{ color: "var(--accent-blue)" }} />
        <span className="badge-mh badge-blue text-sm">UNREGISTERED FACE</span>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>No consent record found — proceeding with generation.</p>
      </div>
    );
  }
  if (status === "open") {
    return (
      <div>
        <ShieldCheck className="w-14 h-14 mx-auto mb-4" style={{ color: "var(--accent-green)" }} />
        <span className="badge-mh badge-open text-sm">CONSENT GRANTED</span>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>Open consent — generation approved.</p>
      </div>
    );
  }
  if (status === "generating") {
    return (
      <div className="w-full max-w-xs">
        <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4" style={{ color: "var(--accent-green)" }} />
        <p className="text-sm font-medium mb-3" style={{ color: "var(--accent-green)" }}>Generating…</p>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-void)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "var(--accent-green)", boxShadow: "0 0 12px var(--accent-green)" }} />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{progress}%</p>
      </div>
    );
  }
  if (status === "done") {
    return (
      <div>
        <div className="relative inline-block mb-4">
          {photoSrc && (
            <img src={photoSrc} alt="Generated" className="w-48 h-48 object-cover rounded-xl" style={{ filter: cssFilter, boxShadow: "0 0 40px rgba(0,212,138,0.2)" }} />
          )}
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-[0.65rem] font-bold flex items-center gap-1" style={{ background: "var(--accent-green)", color: "white" }}>
            <ShieldCheck className="w-3 h-3" /> CONSENT GRANTED
          </div>
        </div>
        <p className="text-sm mt-3 font-medium" style={{ color: "var(--accent-green)" }}>Generation complete</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Applied artistic style filter</p>
      </div>
    );
  }
  return null;
}
