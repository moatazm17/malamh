import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import {
  Upload, Camera, Loader2, CheckCircle, ShieldOff, ShieldAlert, ShieldCheck,
  SmilePlus, RotateCcw, Eye, ArrowLeft, ArrowRight, User, Smile, ArrowLeftRight,
} from "lucide-react";

type ConsentLevel = "OPEN" | "BLOCKED" | "TOKEN_REQUIRED";
type Step = "mode" | "liveness" | "capture" | "encoding" | "consent" | "done";
type LivenessChallenge = "smile" | "left" | "right";

const CHALLENGES: { id: LivenessChallenge; label: string; instruction: string; Icon: any }[] = [
  { id: "smile", label: "Smile", instruction: "Smile for the camera", Icon: Smile },
  { id: "left", label: "Turn left", instruction: "Turn your head to the left", Icon: ArrowLeft },
  { id: "right", label: "Turn right", instruction: "Turn your head to the right", Icon: ArrowLeftRight },
];

const consentOptions: { value: ConsentLevel; label: string; desc: string; Icon: any; color: string; glow: string }[] = [
  { value: "BLOCKED", label: "Full Block", desc: "No AI system may generate or use your likeness.", Icon: ShieldOff, color: "var(--accent-red)", glow: "rgba(255,77,94,0.15)" },
  { value: "TOKEN_REQUIRED", label: "Require Approval", desc: "AI must request your permission each time.", Icon: ShieldAlert, color: "var(--accent-amber)", glow: "rgba(255,176,32,0.15)" },
  { value: "OPEN", label: "Open Consent", desc: "AI systems may freely generate your likeness.", Icon: ShieldCheck, color: "var(--accent-green)", glow: "rgba(0,212,138,0.15)" },
];

function captureFrameFromVideo(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function Stepper({ step }: { step: Step }) {
  const stepNum = step === "liveness" ? 1 : step === "capture" || step === "encoding" ? 2 : step === "consent" || step === "done" ? 3 : 1;
  return (
    <div className="flex items-center gap-2 mb-8 max-w-md">
      {[1, 2, 3].map((n, i) => (
        <div key={n} className="flex items-center flex-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
            style={{
              background: stepNum > n ? "var(--accent-green)" : stepNum === n ? "var(--accent-blue)" : "transparent",
              border: `1px solid ${stepNum >= n ? "transparent" : "var(--border-subtle)"}`,
              color: stepNum >= n ? "white" : "var(--text-muted)",
              boxShadow: stepNum === n ? "0 0 16px var(--accent-blue-glow)" : undefined,
            }}
          >
            {stepNum > n ? "✓" : n}
          </div>
          {i < 2 && (
            <div className="flex-1 h-px mx-2" style={{ background: stepNum > n ? "var(--accent-green)" : "var(--border-subtle)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function RegisterFace() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<"liveness" | "upload">("liveness");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [passed, setPassed] = useState<Record<LivenessChallenge, boolean>>({ smile: false, left: false, right: false });
  const [liveData, setLiveData] = useState<{ smile: number; yaw: number; eyesOpen: boolean; brightness: number; sharpness: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [captureStep, setCaptureStep] = useState(0);
  const CAPTURE_POSES: { title: string; hint: string; Icon: any }[] = [
    { title: "Look straight at the camera", hint: "Face forward, neutral expression. Keep your eyes on the lens.", Icon: User },
    { title: "Turn slightly to your left", hint: "Just a small turn — about 15°. Keep both eyes visible.", Icon: ArrowLeft },
    { title: "Turn slightly to your right", hint: "Same gentle turn the other way. Keep both eyes visible.", Icon: ArrowRight },
  ];

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [label, setLabel] = useState("");
  const [consentLevel, setConsentLevel] = useState<ConsentLevel>("BLOCKED");
  const [encoding, setEncoding] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [awsFaceId, setAwsFaceId] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
          frameRate: { ideal: 30 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera access.", variant: "destructive" });
    }
  };

  const startLiveness = async () => {
    setStep("liveness");
    setPassed({ smile: false, left: false, right: false });
    setLiveData(null);
    await startCamera();
    pollRef.current = setInterval(() => analyzeFrame(), 800);
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || analyzing) return;
    const video = videoRef.current;
    if (video.videoWidth === 0) return;
    setAnalyzing(true);
    const frameData = captureFrameFromVideo(video);
    const b64 = frameData.split(",")[1] || frameData;
    try {
      const res = await apiFetch("/internal/liveness-frame", { method: "POST", body: JSON.stringify({ imageBase64: b64 }) });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.faceDetected) return;
      setLiveData({ smile: data.smileConfidence ?? 0, yaw: data.yaw ?? 0, eyesOpen: data.eyesOpen ?? false, brightness: data.brightness ?? 0, sharpness: data.sharpness ?? 0 });
      setPassed((prev) => {
        const next = { ...prev };
        if (!prev.smile && data.smile && data.smileConfidence > 55) next.smile = true;
        if (!prev.left && data.yaw > 12) next.left = true;
        if (!prev.right && data.yaw < -12) next.right = true;
        return next;
      });
    } catch { /* ignore */ }
    finally { setAnalyzing(false); }
  };

  const allPassed = passed.smile && passed.left && passed.right;
  useEffect(() => {
    if (allPassed && step === "liveness") {
      if (pollRef.current) clearInterval(pollRef.current);
      setTimeout(() => { setStep("capture"); setCaptureStep(0); setCapturedFrames([]); }, 600);
    }
  }, [allPassed, step]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const frame = captureFrameFromVideo(videoRef.current);
    const newFrames = [...capturedFrames, frame];
    setCapturedFrames(newFrames);
    if (newFrames.length >= 3) { stopCamera(); encodeFrames(newFrames); }
    else setCaptureStep(captureStep + 1);
  };

  const encodeFrames = async (frames: string[]) => {
    setStep("encoding");
    const primary = frames[0];
    const b64 = primary.split(",")[1] || primary;
    try {
      const res = await apiFetch("/internal/embed", { method: "POST", body: JSON.stringify({ imageBase64: b64 }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Encoding failed", description: err.message ?? "Could not process image", variant: "destructive" });
        setStep("liveness"); return;
      }
      const data = await res.json();
      setAwsFaceId(data.awsFaceId ?? null);
      setReferenceImage(data.referenceImageBase64 ?? null);
      setStep("consent");
    } catch (err: any) {
      toast({ title: "Network error", description: err.message, variant: "destructive" });
      setStep("liveness");
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const encodeUpload = async () => {
    if (!uploadedImage) return;
    setStep("encoding");
    const b64 = uploadedImage.split(",")[1] || uploadedImage;
    try {
      const res = await apiFetch("/internal/embed", { method: "POST", body: JSON.stringify({ imageBase64: b64 }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Encoding failed", description: err.message ?? "Could not process image", variant: "destructive" });
        setStep("mode"); return;
      }
      const data = await res.json();
      setAwsFaceId(data.awsFaceId ?? null);
      setReferenceImage(data.referenceImageBase64 ?? null);
      setStep("consent");
    } catch (err: any) {
      toast({ title: "Network error", description: err.message, variant: "destructive" });
      setStep("mode");
    }
  };

  const saveFace = async () => {
    const embedding = awsFaceId ?? "mock";
    setEncoding(true);
    try {
      const res = await apiFetch("/internal/faces", {
        method: "POST",
        body: JSON.stringify({
          embedding, consentLevel, label: label || null,
          awsFaceId: awsFaceId ?? undefined, referenceImage: referenceImage ?? undefined,
          verified: mode === "liveness",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Registration failed", description: err.message ?? "Could not save.", variant: "destructive" });
        return;
      }
      const face = await res.json();
      setDoneId(face.id);
      // Redirect to share page — the success moment IS the share moment
      setLocation(`/dashboard/share?new=${face.id}`);
      return;
    } catch (err: any) {
      toast({ title: "Network error", description: err.message, variant: "destructive" });
    } finally { setEncoding(false); }
  };

  // ─── DONE
  if (step === "done") {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center anim-scale-in py-10">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: "var(--accent-green-glow)", border: "1px solid var(--accent-green)", boxShadow: "0 0 60px rgba(0,212,138,0.3)" }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: "var(--accent-green)" }} />
          </div>
          <h2 className="headline-section text-3xl mb-3">Your face is now protected</h2>
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Face ID</p>
          <code className="code-block text-xs inline-block break-all" style={{ padding: "8px 14px", color: "var(--accent-blue)" }}>{doneId}</code>
          {mode === "liveness" && (
            <p className="text-xs mt-4" style={{ color: "var(--accent-green)" }}>✓ Liveness verified</p>
          )}
          <div className="flex gap-3 justify-center mt-8">
            <button onClick={() => setLocation(`/dashboard/face/${doneId}`)} className="btn-mh btn-mh-primary">View face</button>
            <button onClick={() => { setStep("mode"); setAwsFaceId(null); setReferenceImage(null); setLabel(""); setCapturedFrames([]); setUploadedImage(null); }} className="btn-mh btn-mh-ghost">Register another</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── ENCODING
  if (step === "encoding") {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center py-20 anim-fade-up">
          <Stepper step="encoding" />
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border-subtle)", borderTopColor: "var(--accent-blue)" }} />
          <h2 className="headline-section text-2xl mb-2">Generating facial signature…</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Computing 512-dimension embedding</p>
          <div className="mt-6 flex gap-1 justify-center max-w-sm mx-auto h-8">
            {[...Array(32)].map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded"
                style={{
                  background: i % 3 === 0 ? "var(--accent-amber)" : i % 3 === 1 ? "var(--accent-blue)" : "var(--accent-green)",
                  height: `${20 + Math.random() * 80}%`,
                  alignSelf: "flex-end",
                  animation: `mh-fade-up 0.4s ease-out ${i * 30}ms both`,
                }}
              />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── CONSENT
  if (step === "consent") {
    return (
      <DashboardLayout>
        <div className="max-w-2xl anim-fade-up">
          <Stepper step="consent" />
          <div className="mb-7">
            <div className="section-label mb-2">Step 3 of 3</div>
            <h1 className="headline-section text-3xl">Set Your Consent</h1>
            <p className="text-base mt-2" style={{ color: "var(--text-secondary)" }}>Choose how AI systems may use your likeness.</p>
          </div>

          {awsFaceId && (
            <div className="glass-card p-4 mb-6 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--accent-green)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Face encoded successfully</p>
                <p className="font-mono text-xs truncate" style={{ color: "var(--text-muted)" }}>AWS ID: {awsFaceId}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-6">
            {consentOptions.map((opt) => {
              const active = consentLevel === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setConsentLevel(opt.value)}
                  className="text-left p-5 rounded-xl transition-all flex items-start gap-4"
                  style={{
                    background: active ? `color-mix(in srgb, ${opt.color} 8%, transparent)` : "var(--bg-elevated)",
                    border: `1px solid ${active ? opt.color : "var(--border-subtle)"}`,
                    borderLeftWidth: 4,
                    borderLeftColor: opt.color,
                    boxShadow: active ? `0 0 32px ${opt.glow}` : undefined,
                  }}
                >
                  <opt.Icon className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: opt.color }} />
                  <div className="flex-1">
                    <p className="font-semibold text-base mb-1">{opt.label}</p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{opt.desc}</p>
                  </div>
                  {active && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: opt.color }} />}
                </button>
              );
            })}
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold mb-2 section-label">Label (optional)</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="input-mh" placeholder="e.g. Professional headshot" />
          </div>

          <button onClick={saveFace} disabled={encoding} className="btn-mh btn-mh-primary w-full justify-center" style={{ padding: "14px 22px" }}>
            {encoding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            {encoding ? "Saving…" : "Complete Registration"}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // ─── CAPTURE
  if (step === "capture") {
    return (
      <DashboardLayout>
        <div className="max-w-3xl anim-fade-up">
          <Stepper step="capture" />
          <div className="mb-6">
            <div className="section-label mb-2">Step 2 of 3</div>
            <h1 className="headline-section text-3xl">Photo {captureStep + 1} of 3</h1>
          </div>
          {(() => {
            const pose = CAPTURE_POSES[captureStep];
            return (
              <div className="glass-card-elevated p-5 mb-6 flex items-center gap-4" style={{ borderColor: "var(--accent-blue)", boxShadow: "0 0 40px var(--accent-blue-glow)" }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue)" }}>
                  <pose.Icon className="w-7 h-7" style={{ color: "var(--accent-blue)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{pose.title}</p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{pose.hint}</p>
                </div>
              </div>
            );
          })()}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3]" style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)" }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-56 rounded-full" style={{ border: "2px solid var(--accent-blue)", opacity: 0.5, boxShadow: "0 0 40px var(--accent-blue-glow)" }} />
                </div>
              </div>
              <button onClick={capturePhoto} className="btn-mh btn-mh-primary w-full justify-center mt-4" style={{ padding: "14px 22px" }}>
                <Camera className="w-5 h-5" /> Capture photo {captureStep + 1}
              </button>
            </div>
            <div className="w-full md:w-32 flex md:flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full flex-1 md:flex-none w-20 h-20 flex items-center justify-center overflow-hidden"
                  style={{
                    background: capturedFrames[i] ? "transparent" : "var(--bg-void)",
                    border: `2px solid ${capturedFrames[i] ? "var(--accent-green)" : "var(--border-subtle)"}`,
                    boxShadow: capturedFrames[i] ? "0 0 20px rgba(0,212,138,0.3)" : undefined,
                  }}
                >
                  {capturedFrames[i] ? (
                    <img src={capturedFrames[i]} className="w-full h-full object-cover" alt={`Frame ${i + 1}`} />
                  ) : (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── LIVENESS
  if (step === "liveness") {
    const nextChallenge = passed.smile ? (passed.left ? (passed.right ? null : CHALLENGES[2]) : CHALLENGES[1]) : CHALLENGES[0];

    return (
      <DashboardLayout>
        <div className="max-w-3xl anim-fade-up">
          <Stepper step="liveness" />
          <div className="mb-6">
            <div className="section-label mb-2">Step 1 of 3</div>
            <h1 className="headline-section text-3xl">Liveness Verification</h1>
            <p className="text-base mt-2" style={{ color: "var(--text-secondary)" }}>Follow the challenges to verify you're a real person.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="relative rounded-2xl overflow-hidden aspect-[16/10]" style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)" }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="w-48 h-60 rounded-full transition-colors"
                    style={{
                      border: `2px solid ${allPassed ? "var(--accent-green)" : "var(--accent-blue)"}`,
                      opacity: 0.6,
                      boxShadow: `0 0 40px ${allPassed ? "rgba(0,212,138,0.3)" : "var(--accent-blue-glow)"}`,
                    }}
                  />
                </div>
                {allPassed && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,212,138,0.1)" }}>
                    <CheckCircle className="w-16 h-16 anim-scale-in" style={{ color: "var(--accent-green)" }} />
                  </div>
                )}
              </div>

              {nextChallenge && !allPassed && (
                <div className="glass-card p-4 mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue)" }}>
                    <nextChallenge.Icon className="w-5 h-5" style={{ color: "var(--accent-blue)" }} />
                  </div>
                  <p className="text-sm font-medium flex-1">{nextChallenge.instruction}</p>
                  {analyzing && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />}
                </div>
              )}
            </div>

            <div className="md:w-56 flex flex-col gap-4">
              <div className="glass-card p-4">
                <div className="section-label mb-3">Challenges</div>
                <div className="flex flex-col gap-2.5">
                  {CHALLENGES.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-sm" style={{ color: passed[c.id] ? "var(--accent-green)" : "var(--text-muted)" }}>
                      {passed[c.id]
                        ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ border: "1px solid var(--border-subtle)" }} />}
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>

              {liveData && (
                <div className="glass-card p-4">
                  <div className="section-label mb-3">Live analysis</div>
                  <div className="flex flex-col gap-3">
                    <Meter label="Smile" value={liveData.smile} max={100} unit="%" />
                    <div className="text-xs">
                      <p className="mb-1" style={{ color: "var(--text-muted)" }}>Head yaw</p>
                      <p className="font-mono font-medium">{liveData.yaw.toFixed(1)}°</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: liveData.eyesOpen ? "var(--accent-green)" : "var(--text-muted)" }}>
                      <Eye className="w-3.5 h-3.5" />
                      Eyes {liveData.eyesOpen ? "open" : "closed"}
                    </div>
                    <Meter label="Brightness" value={liveData.brightness} max={100} unit="%" />
                    <Meter label="Sharpness" value={liveData.sharpness} max={100} unit="%" />
                  </div>
                </div>
              )}

              <button onClick={() => { stopCamera(); setStep("mode"); }} className="btn-mh btn-mh-ghost text-xs" style={{ padding: "8px 14px" }}>
                <RotateCcw className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── MODE SELECTION
  return (
    <DashboardLayout>
      <div className="max-w-2xl anim-fade-up">
        <div className="mb-8">
          <div className="section-label mb-2">Register a Face</div>
          <h1 className="headline-section text-3xl md:text-4xl">Add a face to your registry</h1>
          <p className="text-base mt-2" style={{ color: "var(--text-secondary)" }}>Choose how you'd like to register.</p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => { setMode("liveness"); startLiveness(); }}
            className="glass-card glass-card-hover p-6 text-left flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue)" }}>
              <Camera className="w-6 h-6" style={{ color: "var(--accent-blue)" }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="font-semibold text-base">Camera + Liveness Check</p>
                <span className="badge-mh badge-open text-[0.65rem]" style={{ padding: "2px 8px" }}>RECOMMENDED</span>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Smile, turn left, turn right — proves you're a real person. Marks your face as verified.
              </p>
            </div>
          </button>

          <div className="glass-card p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-void)", border: "1px solid var(--border-subtle)" }}>
              <Upload className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-1.5">Upload a photo</p>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Manually upload an image. Marks as unverified.</p>
              <input
                ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
              {uploadedImage ? (
                <div className="flex items-center gap-3">
                  <img src={uploadedImage} className="w-14 h-14 object-cover rounded-lg" style={{ border: "1px solid var(--border-subtle)" }} alt="Preview" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--accent-green)" }}>Photo ready</p>
                    <button onClick={() => { setMode("upload"); encodeUpload(); }} className="btn-mh btn-mh-primary text-xs mt-1" style={{ padding: "6px 14px" }}>Continue →</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="btn-mh btn-mh-ghost">
                  <Upload className="w-4 h-4" /> Choose photo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Meter({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-xs font-mono">{value.toFixed(0)}{unit}</p>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-void)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: pct > 70 ? "var(--accent-green)" : pct > 40 ? "var(--accent-blue)" : "var(--accent-amber)" }}
        />
      </div>
    </div>
  );
}
