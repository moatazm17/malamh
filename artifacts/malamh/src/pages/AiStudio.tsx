import { useState, useRef, useCallback } from "react";
import { Shield, ShieldCheck, ShieldAlert, ShieldOff, Upload, Camera, Loader2, ExternalLink, Sparkles, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/image-utils";
import { useToast } from "@/hooks/use-toast";

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
        const result = canvas.toDataURL("image/jpeg", 0.85);
        if (result.length > 4 * 1024 * 1024 * 1.37) {
          canvas.width = Math.round(width * 0.7); canvas.height = Math.round(height * 0.7);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        } else {
          resolve(result);
        }
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
  const [tokenId, setTokenId] = useState<string | null>(null);
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
    if (!imageBase64) {
      toast({ title: "Upload a photo first", variant: "destructive" });
      return;
    }
    if (!prompt.trim()) {
      toast({ title: "Enter a prompt first", variant: "destructive" });
      return;
    }
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("checking");
    setMatchScore(null);
    setAuthUrl(null);
    setTokenId(null);
    setProgress(0);

    try {
      const rawB64 = imageBase64.split(",")[1] || imageBase64;
      const res = await apiFetch("/api/internal/consent-check", {
        method: "POST",
        body: JSON.stringify({ imageBase64: rawB64, requesterName: "AI Studio Demo", purpose: prompt }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus("no_match");
        if (err.message) toast({ title: err.message, variant: "destructive" });
        return;
      }

      const data = await res.json();
      setMatchScore(data.matchScore ?? null);

      if (data.status === "blocked") {
        setStatus("blocked");
      } else if (data.status === "open" || data.status === "no_match") {
        if (data.status === "no_match") {
          setStatus("no_match");
          setTimeout(() => fakeGenerate(), 800);
        } else {
          setStatus("open");
          setTimeout(() => fakeGenerate(), 400);
        }
      } else if (data.status === "token_required") {
        setStatus("token_required");
        setAuthUrl(data.authUrl ?? null);
        if (data.authUrl) {
          const parts = data.authUrl.split("/");
          setTokenId(parts[parts.length - 1]);
          startPolling(parts[parts.length - 1]);
        }
      }
    } catch (err: any) {
      toast({ title: err.message ?? "Request failed", variant: "destructive" });
      setStatus("idle");
    }
  };

  const fakeGenerate = () => {
    const filter = CSS_FILTERS[Math.floor(Math.random() * CSS_FILTERS.length)];
    setCssFilter(filter);
    setStatus("generating");
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 18 + 4;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => setStatus("done"), 400);
      } else {
        setProgress(Math.round(p));
      }
    }, 200);
  };

  const startPolling = (token: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/consent/status/${token}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.approved === true) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("open");
          setTimeout(() => fakeGenerate(), 400);
        } else if (data.approved === false) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("denied");
        }
      } catch { /* keep polling */ }
    }, 2000);
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("idle");
    setMatchScore(null);
    setAuthUrl(null);
    setTokenId(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none">AI Studio</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Consent-aware image generation demo</p>
          </div>
        </div>
        <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to home</a>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-2xl mx-auto w-full">

        {/* Photo upload */}
        <div className="w-full mb-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !photoSrc && fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
              photoSrc ? "border-border/40 cursor-default" : "border-border/60 hover:border-primary/40 cursor-pointer"
            } bg-muted/20`}
            style={{ minHeight: photoSrc ? "auto" : "180px" }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />

            {photoSrc ? (
              <div className="flex items-start gap-4 p-4">
                <div className="relative flex-shrink-0">
                  {status === "done" ? (
                    <div className="relative">
                      <img src={photoSrc} alt="Generated" className="w-28 h-28 object-cover rounded-xl" style={{ filter: cssFilter }} />
                      <div className="absolute top-1 right-1 bg-green-500/90 rounded-full p-0.5">
                        <ShieldCheck className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  ) : (
                    <img src={photoSrc} alt="Uploaded" className="w-28 h-28 object-cover rounded-xl border border-border/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <StatusPanel
                    status={status}
                    matchScore={matchScore}
                    authUrl={authUrl}
                    progress={progress}
                  />
                </div>
                <button onClick={(e) => { e.stopPropagation(); setPhotoSrc(null); setImageBase64(null); reset(); }} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drop a photo or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · auto-compressed to 1024px</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  className="btn btn-ghost border border-border/40 h-8 px-3 text-xs gap-1.5 mt-1"
                >
                  <Camera className="h-3.5 w-3.5" /> Use camera
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Prompt input */}
        <div className="w-full mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runGeneration(); } }}
              placeholder="Describe the image you want to generate…"
              className="input flex-1 h-12 text-sm"
              disabled={status === "checking" || status === "generating"}
            />
            <button
              onClick={runGeneration}
              disabled={!imageBase64 || !prompt.trim() || status === "checking" || status === "generating"}
              className="btn btn-primary h-12 px-5 gap-2 flex-shrink-0"
            >
              {status === "checking" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {status === "checking" ? "Checking…" : "Generate"}
            </button>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="w-full flex flex-wrap gap-2 mb-8">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setPrompt(chip)}
              className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 hover:bg-muted/60 hover:border-border transition-all text-muted-foreground hover:text-foreground"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* How it works */}
        <div className="w-full surface p-5 text-sm">
          <p className="font-medium mb-3 text-xs uppercase tracking-wider text-muted-foreground">How this demo works</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: Upload, label: "Upload a face", sub: "Any photo with a clear face" },
              { icon: Shield, label: "Consent check", sub: "Malamh checks the registry" },
              { icon: Sparkles, label: "Generate (or block)", sub: "Result depends on consent" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium text-xs">{label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({ status, matchScore, authUrl, progress }: {
  status: ConsentStatus;
  matchScore: number | null;
  authUrl: string | null;
  progress: number;
}) {
  if (status === "idle") return (
    <p className="text-sm text-muted-foreground pt-1">Ready — enter a prompt and click Generate.</p>
  );

  if (status === "checking") return (
    <div className="flex items-center gap-2 pt-1">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
      <span className="text-sm text-muted-foreground">Checking consent registry…</span>
    </div>
  );

  if (status === "blocked") return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ShieldOff className="h-4 w-4 text-red-400 flex-shrink-0" />
        <p className="text-sm font-semibold text-red-400">Generation Blocked</p>
      </div>
      <p className="text-xs text-muted-foreground">This person has blocked AI use of their likeness.</p>
      {matchScore !== null && <p className="text-xs text-muted-foreground mt-0.5">Match confidence: {(matchScore * 100).toFixed(0)}%</p>}
    </div>
  );

  if (status === "no_match") return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-4 w-4 text-blue-400 flex-shrink-0" />
        <p className="text-sm font-semibold text-blue-400">Not in registry</p>
      </div>
      <p className="text-xs text-muted-foreground">No consent record found — proceeding with generation.</p>
    </div>
  );

  if (status === "open") return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-4 w-4 text-green-400 flex-shrink-0" />
        <p className="text-sm font-semibold text-green-400">Consent Verified</p>
      </div>
      <p className="text-xs text-muted-foreground">Open consent — generation approved.</p>
      {matchScore !== null && <p className="text-xs text-muted-foreground mt-0.5">Match: {(matchScore * 100).toFixed(0)}%</p>}
    </div>
  );

  if (status === "generating") return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="h-4 w-4 animate-spin text-green-400 flex-shrink-0" />
        <p className="text-sm font-semibold text-green-400">Generating…</p>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
    </div>
  );

  if (status === "done") return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-4 w-4 text-green-400 flex-shrink-0" />
        <p className="text-sm font-semibold text-green-400">Generation complete</p>
      </div>
      <p className="text-xs text-muted-foreground">Applied artistic style filter to the image.</p>
    </div>
  );

  if (status === "token_required") return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="h-4 w-4 text-yellow-400 flex-shrink-0" />
        <p className="text-sm font-semibold text-yellow-400">Consent Required</p>
      </div>
      <p className="text-xs text-muted-foreground mb-2">This person requires per-request consent. Waiting for approval…</p>
      {authUrl && (
        <a href={authUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost border border-yellow-500/30 h-7 px-2 text-xs gap-1 text-yellow-400">
          <ExternalLink className="h-3 w-3" /> Open consent page
        </a>
      )}
      <div className="flex items-center gap-1.5 mt-2">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Polling for response…</span>
      </div>
    </div>
  );

  if (status === "denied") return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ShieldOff className="h-4 w-4 text-red-400 flex-shrink-0" />
        <p className="text-sm font-semibold text-red-400">Consent Denied</p>
      </div>
      <p className="text-xs text-muted-foreground">The person rejected this generation request.</p>
    </div>
  );

  return null;
}
