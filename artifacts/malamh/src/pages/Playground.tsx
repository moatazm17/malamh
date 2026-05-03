import { useRef, useState, useEffect, useCallback } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Loader2, Shield, Upload, Camera, X, ScanFace } from "lucide-react";

type Status = "open" | "blocked" | "token_required" | "no_match" | "approved" | "denied" | "expired";

const statusMeta: Record<Status, { label: string; badge: string; color: string }> = {
  open: { label: "OPEN", badge: "badge-open", color: "var(--accent-green)" },
  blocked: { label: "BLOCKED", badge: "badge-blocked", color: "var(--accent-red)" },
  token_required: { label: "TOKEN REQUIRED · WAITING", badge: "badge-token", color: "var(--accent-amber)" },
  no_match: { label: "NO MATCH", badge: "badge-mh", color: "var(--text-muted)" },
  approved: { label: "CONSENT APPROVED", badge: "badge-open", color: "var(--accent-green)" },
  denied: { label: "CONSENT DENIED", badge: "badge-blocked", color: "var(--accent-red)" },
  expired: { label: "TOKEN EXPIRED", badge: "badge-mh", color: "var(--text-muted)" },
};

function ScoreRing({ value, color }: { value: number; color: string }) {
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDrawn(eased * value);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  const r = 84;
  const c = 2 * Math.PI * r;
  const dash = (drawn / 100) * c;
  return (
    <div className="relative w-[200px] h-[200px] mx-auto">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        <circle cx="100" cy="100" r={r} stroke="var(--border-subtle)" strokeWidth="8" fill="none" />
        <circle
          cx="100" cy="100" r={r} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ filter: `drop-shadow(0 0 16px ${color})`, transition: "stroke-dasharray 0.05s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="headline-display text-5xl" style={{ color }}>{drawn.toFixed(0)}%</span>
        <span className="text-xs mt-1 section-label">Match score</span>
      </div>
    </div>
  );
}

async function compressImage(file: File, maxDim = 1024, quality = 0.85): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function Playground() {
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    status: Status;
    matchScore: number | null;
    authUrl: string | null;
    tokenId: string | null;
    mock?: boolean;
    latency_ms: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

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
    setError(null);
    setResult(null);
    setPhotoSrc(dataUrl);
    setImageBase64(dataUrl.replace(/^data:[^,]+,/, ""));
    closeCamera();
  }, [closeCamera]);

  useEffect(() => () => { stopPolling(); stopCamera(); }, [stopCamera]);

  // Scroll the result panel into view when something happens (loading / result / error).
  // On mobile the right column stacks below the input, so users miss the result.
  useEffect(() => {
    if (loading || result || error) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading, result, error]);

  const startPolling = (tokenId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/consent/status/${tokenId}`);
        if (!r.ok) return;
        const data = await r.json();
        if (data.status === "approved" || data.status === "denied" || data.status === "expired") {
          stopPolling();
          setResult((prev) => (prev ? { ...prev, status: data.status as Status } : prev));
        }
      } catch { /* keep polling */ }
    }, 2000);
  };

  const loadFile = async (file: File) => {
    setError(null);
    setResult(null);
    try {
      const compressed = await compressImage(file);
      setPhotoSrc(compressed);
      setImageBase64(compressed.replace(/^data:[^,]+,/, ""));
    } catch (err: any) {
      setError(err?.message ?? "Could not load image");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  };

  const reset = () => {
    stopPolling();
    setPhotoSrc(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
  };

  const runCheck = async () => {
    if (!imageBase64) return;
    stopPolling();
    setLoading(true);
    setResult(null);
    setError(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/internal/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, requesterName: "Playground", purpose: "API playground test" }),
      });
      const latency_ms = Date.now() - start;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult({
        status: data.status,
        matchScore: data.matchScore,
        authUrl: data.authUrl,
        tokenId: data.tokenId,
        mock: data.mock,
        latency_ms,
      });
      if (data.status === "token_required" && data.tokenId) {
        startPolling(data.tokenId);
      }
    } catch (err: any) {
      setError(err?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="section-label mb-3">Playground</div>
          <h1 className="headline-display text-4xl md:text-5xl mb-4">Test the API live</h1>
          <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Upload any photo. We run it against the live consent registry and return the real JSON response.
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
                minHeight: photoSrc ? "auto" : 220,
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
              {photoSrc ? (
                <div className="relative">
                  <img src={photoSrc} alt="Uploaded" className="w-full max-h-80 object-cover" />
                  <button onClick={(e) => { e.stopPropagation(); reset(); }} className="absolute top-3 right-3 p-2 rounded-full" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid var(--border-subtle)" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
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

            <button
              onClick={runCheck}
              disabled={!imageBase64 || loading}
              className="btn-mh btn-mh-primary w-full justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ScanFace className="w-4 h-4" /> Run consent check</>}
            </button>

            <div className="mt-5">
              <div className="section-label mb-2">Endpoint</div>
              <code className="block text-xs font-mono px-3 py-2 rounded-md" style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                POST /api/internal/match
              </code>
            </div>
          </div>

          {/* RIGHT — result */}
          <div ref={resultRef} className="glass-card-elevated p-7 min-h-[420px] flex flex-col scroll-mt-24">
            <div className="section-label mb-4">Response</div>
            <div className="flex-1 flex flex-col items-center justify-center">
              {!result && !error && !loading && (
                <div className="text-center">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Upload a photo and run a check</p>
                </div>
              )}
              {loading && (
                <div className="text-center">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin mb-3" style={{ color: "var(--accent-blue)" }} />
                  <p className="text-sm section-label">Checking registry…</p>
                </div>
              )}
              {error && (
                <div className="text-center">
                  <X className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--accent-red)" }} />
                  <h3 className="headline-section text-xl mb-2">Request failed</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
                </div>
              )}
              {result && (() => {
                const meta = statusMeta[result.status];
                const score = result.matchScore != null ? Math.round(result.matchScore * 100) : 0;
                return (
                  <div className="text-center w-full anim-scale-in">
                    {result.matchScore != null ? (
                      <ScoreRing value={score} color={meta.color} />
                    ) : (
                      <Shield className="w-16 h-16 mx-auto mb-2" style={{ color: meta.color }} />
                    )}
                    <span className={`badge-mh ${meta.badge} mt-5 text-sm`}>{meta.label}</span>
                    <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      {result.latency_ms} ms{result.mock ? " · mock matcher" : ""}
                    </p>
                    {result.status === "token_required" && (
                      <p className="text-xs mt-3 inline-flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                        <Loader2 className="w-3 h-3 animate-spin" /> Waiting for consent decision…
                      </p>
                    )}
                    {result.authUrl && result.status === "token_required" && (
                      <a href={result.authUrl} target="_blank" rel="noreferrer" className="btn-mh btn-mh-ghost text-xs mt-4 inline-flex">
                        Open consent request →
                      </a>
                    )}
                    <details className="mt-5 text-left">
                      <summary className="cursor-pointer text-xs section-label">Raw JSON response</summary>
                      <pre className="code-block mt-2 text-xs">
{JSON.stringify(
  {
    status: result.status,
    matchScore: result.matchScore,
    authUrl: result.authUrl,
    tokenId: result.tokenId,
    ...(result.mock !== undefined ? { mock: result.mock } : {}),
    latency_ms: result.latency_ms,
  },
  null,
  2,
)}
                      </pre>
                    </details>
                  </div>
                );
              })()}
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
              <button onClick={closeCamera} className="p-2 rounded-full hover:bg-white/5" aria-label="Close camera">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="relative rounded-2xl overflow-hidden mb-4"
              style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)", aspectRatio: "16 / 9" }}
            >
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: "rgba(0,0,0,0.7)" }}>
                  <X className="w-10 h-10 mb-3" style={{ color: "var(--accent-red)" }} />
                  <p className="text-sm font-medium mb-1">Camera unavailable</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{cameraError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={closeCamera} className="btn-mh btn-mh-ghost" style={{ padding: "10px 18px" }}>Cancel</button>
              <button onClick={captureFromCamera} disabled={!!cameraError} className="btn-mh btn-mh-primary" style={{ padding: "10px 18px" }}>
                <Camera className="w-4 h-4" /> Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
