import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { ShieldCheck, ShieldAlert, ShieldOff, Upload, Camera, Loader2, ExternalLink, Sparkles, X, RefreshCw, Download } from "lucide-react";
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

// Image generation goes through our /internal/replicate-generate proxy which
// calls black-forest-labs/flux-schnell on Replicate. The backend keeps the
// REPLICATE_API_TOKEN secret and returns a hosted image URL.

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
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generationSeed, setGenerationSeed] = useState<number>(0);
  const [generationPrompt, setGenerationPrompt] = useState<string>("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [consentOutcome, setConsentOutcome] = useState<"open" | "no_match" | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const genTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genIdRef = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);

  // Scroll the result panel into view whenever a meaningful state appears.
  // On mobile the result column stacks below the input, so users miss it otherwise.
  useEffect(() => {
    if (status !== "idle") {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const clearPending = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (genTimeoutRef.current) { clearTimeout(genTimeoutRef.current); genTimeoutRef.current = null; }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(err?.message ?? "Could not access camera. Check browser permissions.");
    }
  }, []);

  const closeCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
    setCameraError(null);
  }, [stopCamera]);

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPhotoSrc(dataUrl);
    setImageBase64(dataUrl);
    setStatus("idle");
    closeCamera();
  }, [closeCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      clearPending();
    };
  }, [stopCamera, clearPending]);

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
    clearPending();
    genIdRef.current += 1; // invalidate any in-flight onLoad/onError from a previous run
    setStatus("checking"); setMatchScore(null); setAuthUrl(null);
    setGeneratedUrl(null); setGenerationError(null); setConsentOutcome(null);

    const promptAtRunStart = prompt;
    try {
      const rawB64 = imageBase64.split(",")[1] || imageBase64;
      const res = await apiFetch("/internal/consent-check", {
        method: "POST",
        body: JSON.stringify({ imageBase64: rawB64, requesterName: "AI Studio", purpose: promptAtRunStart }),
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
        const outcome = data.status as "open" | "no_match";
        setConsentOutcome(outcome);
        setStatus(outcome);
        const delay = outcome === "no_match" ? 800 : 400;
        genTimeoutRef.current = setTimeout(() => {
          genTimeoutRef.current = null;
          startImageGeneration(promptAtRunStart);
        }, delay);
      } else if (data.status === "token_required") {
        setStatus("token_required");
        setAuthUrl(data.authUrl ?? null);
        if (data.authUrl) {
          const parts = data.authUrl.split("/");
          startPolling(parts[parts.length - 1], promptAtRunStart);
        }
      }
    } catch (err: any) {
      toast({ title: err.message ?? "Request failed", variant: "destructive" });
      setStatus("idle");
    }
  };

  const startImageGeneration = async (effectivePrompt: string, newSeed?: number) => {
    const seed = newSeed ?? Math.floor(Math.random() * 1_000_000);
    genIdRef.current += 1;
    const myId = genIdRef.current;
    setGenerationSeed(seed);
    setGenerationPrompt(effectivePrompt);
    setGenerationError(null);
    setGeneratedUrl(null);
    setStatus("generating");

    try {
      const res = await apiFetch("/internal/replicate-generate", {
        method: "POST",
        body: JSON.stringify({ prompt: effectivePrompt, seed }),
      });
      const data = await res.json().catch(() => ({}));
      if (myId !== genIdRef.current) return; // stale — user started a new run
      if (!res.ok || !data.imageUrl) {
        setGenerationError(data?.message || "The image generator didn't respond. Try again.");
        setStatus("done");
        return;
      }
      setGeneratedUrl(data.imageUrl);
      // <img onLoad> will flip status to "done" once the file is decoded.
    } catch (err: any) {
      if (myId !== genIdRef.current) return;
      setGenerationError(err?.message ?? "Network error. Try again.");
      setStatus("done");
    }
  };

  const handleImageLoaded = (id: number) => {
    if (id !== genIdRef.current) return; // stale event from a prior generation
    setStatus("done");
  };

  const handleImageError = (id: number) => {
    if (id !== genIdRef.current) return;
    setGenerationError("The image generator didn't respond in time. Try again — flux can be busy.");
    setStatus("done");
  };

  const regenerate = () => {
    // Use the prompt that was actually used for the last successful generation,
    // not whatever is currently in the input field.
    if (!generationPrompt) return;
    startImageGeneration(generationPrompt);
  };

  const downloadImage = async () => {
    if (!generatedUrl) return;
    try {
      const res = await fetch(generatedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `malamh-${generationSeed}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Could not download image", variant: "destructive" });
    }
  };

  const startPolling = (token: string, effectivePrompt: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/consent/status/${token}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "approved") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setConsentOutcome("open");
          setStatus("open");
          genTimeoutRef.current = setTimeout(() => {
            genTimeoutRef.current = null;
            startImageGeneration(effectivePrompt);
          }, 400);
        } else if (data.status === "denied" || data.status === "expired") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setStatus("denied");
        }
      } catch { /* keep polling */ }
    }, 2000);
  };

  const reset = () => {
    clearPending();
    genIdRef.current += 1;
    setStatus("idle"); setMatchScore(null); setAuthUrl(null);
    setGeneratedUrl(null); setGenerationError(null); setConsentOutcome(null);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80">
              <MalamhMark size={38} />
              <span className="font-semibold tracking-tight" style={{ fontFamily: "var(--app-font-display)" }}>Malamh</span>
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
                  <button onClick={(e) => { e.stopPropagation(); openCamera(); }} className="btn-mh btn-mh-ghost text-xs mt-2" style={{ padding: "6px 14px" }}>
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
          <div ref={resultRef} className="glass-card-elevated p-7 min-h-[480px] flex flex-col scroll-mt-24">
            <div className="section-label mb-4">Result</div>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <ResultPanel
                status={status}
                matchScore={matchScore}
                authUrl={authUrl}
                photoSrc={photoSrc}
                generatedUrl={generatedUrl}
                generationPrompt={generationPrompt}
                generationError={generationError}
                consentOutcome={consentOutcome}
                generationId={genIdRef.current}
                onImageLoaded={handleImageLoaded}
                onImageError={handleImageError}
                onRegenerate={regenerate}
                onDownload={downloadImage}
              />
            </div>
          </div>
        </div>
      </div>

      {cameraOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={closeCamera}
        >
          <div
            className="glass-card-elevated p-5 w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" style={{ color: "var(--accent-blue)" }} />
                <h3 className="headline-section text-lg">Capture from camera</h3>
              </div>
              <button
                onClick={closeCamera}
                className="p-2 rounded-full hover:bg-white/5"
                aria-label="Close camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="relative rounded-2xl overflow-hidden mb-4"
              style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)", aspectRatio: "16 / 9" }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: "rgba(0,0,0,0.7)" }}>
                  <X className="w-10 h-10 mb-3" style={{ color: "var(--accent-red)" }} />
                  <p className="text-sm font-medium mb-1">Camera unavailable</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{cameraError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={closeCamera} className="btn-mh btn-mh-ghost" style={{ padding: "10px 18px" }}>
                Cancel
              </button>
              <button
                onClick={captureFromCamera}
                disabled={!!cameraError}
                className="btn-mh btn-mh-primary"
                style={{ padding: "10px 18px" }}
              >
                <Camera className="w-4 h-4" /> Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultPanel({
  status, matchScore, authUrl, photoSrc, generatedUrl, generationPrompt, generationError,
  consentOutcome, generationId, onImageLoaded, onImageError, onRegenerate, onDownload,
}: {
  status: ConsentStatus;
  matchScore: number | null;
  authUrl: string | null;
  photoSrc: string | null;
  generatedUrl: string | null;
  generationPrompt: string;
  generationError: string | null;
  consentOutcome: "open" | "no_match" | null;
  generationId: number;
  onImageLoaded: (id: number) => void;
  onImageError: (id: number) => void;
  onRegenerate: () => void;
  onDownload: () => void;
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
      <div className="w-full max-w-sm">
        <div className="relative inline-block mb-4">
          {photoSrc && (
            <img src={photoSrc} alt="Denied" className="w-44 h-44 object-cover rounded-xl mx-auto" style={{ filter: "blur(14px) saturate(0.3)" }} />
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: "rgba(255,77,94,0.3)", border: "2px solid var(--accent-red)" }}>
            <ShieldOff className="w-14 h-14" style={{ color: "var(--accent-red)" }} />
          </div>
        </div>
        <span className="badge-mh badge-blocked text-sm" style={{ padding: "6px 16px" }}>CONSENT DENIED</span>
        <p className="text-sm mt-3 font-medium" style={{ color: "var(--text-primary)" }}>The face owner rejected this generation.</p>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Malamh blocked it before any pixel was generated. This is exactly what the registry is for.
        </p>
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
      <div className="w-full max-w-sm">
        <div
          className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4"
          style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)" }}
        >
          {/* Hidden img so onLoad fires when the real image arrives */}
          {generatedUrl && (
            <img
              key={generationId}
              src={generatedUrl}
              alt="Generating…"
              className="absolute inset-0 w-full h-full object-cover opacity-0"
              onLoad={() => onImageLoaded(generationId)}
              onError={() => onImageError(generationId)}
            />
          )}
          {/* Shimmer skeleton */}
          <div className="absolute inset-0 anim-shimmer" style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(0,212,138,0.08) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
          }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: "var(--accent-green)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--accent-green)" }}>Generating with FLUX…</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>This usually takes 5–15 seconds</p>
          </div>
        </div>
        <p className="text-xs italic text-center" style={{ color: "var(--text-muted)" }}>"{generationPrompt}"</p>
      </div>
    );
  }
  if (status === "done") {
    if (generationError) {
      return (
        <div className="w-full max-w-sm">
          <ShieldAlert className="w-14 h-14 mx-auto mb-4" style={{ color: "var(--accent-amber)" }} />
          <p className="text-sm font-medium mb-2">Generation failed</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{generationError}</p>
          <button onClick={onRegenerate} className="btn-mh btn-mh-primary text-xs" style={{ padding: "8px 16px" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      );
    }
    return (
      <div className="w-full max-w-sm">
        <div className="relative inline-block mb-4 w-full">
          {generatedUrl && (
            <img
              src={generatedUrl}
              alt="Generated"
              className="w-full aspect-square object-cover rounded-2xl"
              style={{ boxShadow: "0 0 40px rgba(0,212,138,0.2)", border: "1px solid var(--accent-green)" }}
            />
          )}
          <div
            className="absolute top-3 right-3 px-2 py-1 rounded-full text-[0.65rem] font-bold flex items-center gap-1"
            style={{
              background: consentOutcome === "no_match" ? "var(--accent-blue)" : "var(--accent-green)",
              color: "white",
            }}
          >
            <ShieldCheck className="w-3 h-3" />
            {consentOutcome === "no_match" ? "UNREGISTERED" : "CONSENT GRANTED"}
          </div>
        </div>
        <p className="text-xs italic mb-4" style={{ color: "var(--text-muted)" }}>"{generationPrompt}"</p>
        <div className="flex gap-2 justify-center">
          <button onClick={onRegenerate} className="btn-mh btn-mh-ghost text-xs" style={{ padding: "8px 14px" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
          </button>
          <button onClick={onDownload} className="btn-mh btn-mh-primary text-xs" style={{ padding: "8px 14px" }}>
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
        <p className="text-[0.65rem] mt-3" style={{ color: "var(--text-muted)" }}>
          Generated by FLUX via Pollinations.ai
        </p>
      </div>
    );
  }
  return null;
}
