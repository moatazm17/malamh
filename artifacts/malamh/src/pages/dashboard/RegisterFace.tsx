import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import {
  Upload, Camera, Loader2, CheckCircle, ShieldOff, ShieldAlert, ShieldCheck,
  SmilePlus, RotateCcw, Eye,
} from "lucide-react";

type ConsentLevel = "OPEN" | "BLOCKED" | "TOKEN_REQUIRED";
type Step = "mode" | "liveness" | "capture" | "encoding" | "consent" | "done";
type LivenessChallenge = "smile" | "left" | "right";

const CHALLENGES: { id: LivenessChallenge; label: string; instruction: string }[] = [
  { id: "smile", label: "Smile", instruction: "Smile for the camera" },
  { id: "left", label: "Turn left", instruction: "Turn your head to the left" },
  { id: "right", label: "Turn right", instruction: "Turn your head to the right" },
];

const consentOptions: { value: ConsentLevel; label: string; desc: string; icon: typeof ShieldOff; color: string }[] = [
  { value: "BLOCKED", label: "Blocked", desc: "No AI system may generate your likeness.", icon: ShieldOff, color: "text-red-400 border-red-500/30 bg-red-500/5" },
  { value: "TOKEN_REQUIRED", label: "Token Required", desc: "Each request needs your personal approval.", icon: ShieldAlert, color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5" },
  { value: "OPEN", label: "Open", desc: "AI generation of your likeness is freely allowed.", icon: ShieldCheck, color: "text-green-400 border-green-500/30 bg-green-500/5" },
];

function captureFrameFromVideo(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function RegisterFace() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<"liveness" | "upload">("liveness");

  // Liveness state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [passed, setPassed] = useState<Record<LivenessChallenge, boolean>>({ smile: false, left: false, right: false });
  const [liveData, setLiveData] = useState<{ smile: number; yaw: number; eyesOpen: boolean; brightness: number; sharpness: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Capture state
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [captureStep, setCaptureStep] = useState(0);
  const CAPTURE_INSTRUCTIONS = ["Look straight at the camera", "Turn slightly to the left", "Turn slightly to the right"];

  // Upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Encoding / consent state
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

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera access to use liveness detection.", variant: "destructive" });
    }
  };

  const startLiveness = async () => {
    setStep("liveness");
    setChallengeIdx(0);
    setPassed({ smile: false, left: false, right: false });
    setLiveData(null);
    await startCamera();
    // Start polling frames
    pollRef.current = setInterval(() => analyzeFrame(), 1200);
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || analyzing) return;
    const video = videoRef.current;
    if (video.videoWidth === 0) return;
    setAnalyzing(true);
    const frameData = captureFrameFromVideo(video);
    const b64 = frameData.split(",")[1] || frameData;
    try {
      const res = await apiFetch("/api/internal/liveness-frame", {
        method: "POST",
        body: JSON.stringify({ imageBase64: b64 }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.faceDetected) return;
      setLiveData({ smile: data.smileConfidence ?? 0, yaw: data.yaw ?? 0, eyesOpen: data.eyesOpen ?? false, brightness: data.brightness ?? 0, sharpness: data.sharpness ?? 0 });

      setPassed((prev) => {
        const next = { ...prev };
        if (!prev.smile && data.smile && data.smileConfidence > 80) next.smile = true;
        if (!prev.left && data.yaw < -15) next.left = true;
        if (!prev.right && data.yaw > 15) next.right = true;
        return next;
      });
    } catch {
      // ignore
    } finally {
      setAnalyzing(false);
    }
  };

  // Check if all challenges passed
  const allPassed = passed.smile && passed.left && passed.right;
  useEffect(() => {
    if (allPassed && step === "liveness") {
      if (pollRef.current) clearInterval(pollRef.current);
      setTimeout(() => {
        setStep("capture");
        setCaptureStep(0);
        setCapturedFrames([]);
      }, 600);
    }
  }, [allPassed, step]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const frame = captureFrameFromVideo(videoRef.current);
    const newFrames = [...capturedFrames, frame];
    setCapturedFrames(newFrames);
    if (newFrames.length >= 3) {
      stopCamera();
      // Use the first frame as reference, start encoding
      encodeFrames(newFrames);
    } else {
      setCaptureStep(captureStep + 1);
    }
  };

  const encodeFrames = async (frames: string[]) => {
    setStep("encoding");
    const primary = frames[0];
    const b64 = primary.split(",")[1] || primary;
    try {
      const res = await apiFetch("/api/internal/embed", {
        method: "POST",
        body: JSON.stringify({ imageBase64: b64 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Encoding failed", description: err.message ?? "Could not process image", variant: "destructive" });
        setStep("liveness");
        return;
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
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setUploadedImage(src);
    };
    reader.readAsDataURL(file);
  };

  const encodeUpload = async () => {
    if (!uploadedImage) return;
    setStep("encoding");
    const b64 = uploadedImage.split(",")[1] || uploadedImage;
    try {
      const res = await apiFetch("/api/internal/embed", {
        method: "POST",
        body: JSON.stringify({ imageBase64: b64 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Encoding failed", description: err.message ?? "Could not process image", variant: "destructive" });
        setStep("mode");
        return;
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
      const res = await apiFetch("/api/internal/faces", {
        method: "POST",
        body: JSON.stringify({
          embedding,
          consentLevel,
          label: label || null,
          awsFaceId: awsFaceId ?? undefined,
          referenceImage: referenceImage ?? undefined,
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
      setStep("done");
    } catch (err: any) {
      toast({ title: "Network error", description: err.message, variant: "destructive" });
    } finally {
      setEncoding(false);
    }
  };

  // ─── Step: Done ───
  if (step === "done") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 max-w-md mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-green-400" />
          <div>
            <h2 className="text-xl font-bold mb-2">Face Registered!</h2>
            <p className="text-sm text-muted-foreground mb-1">Face ID:</p>
            <p className="font-mono text-primary text-sm bg-background border border-border/50 px-3 py-2 rounded break-all">{doneId}</p>
            {mode === "liveness" && <p className="text-xs text-green-400 mt-2">✓ Liveness verified</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setLocation(`/dashboard/face/${doneId}`)} className="btn btn-primary h-10 px-5">View face</button>
            <button onClick={() => { setStep("mode"); setAwsFaceId(null); setReferenceImage(null); setLabel(""); setCapturedFrames([]); setUploadedImage(null); }} className="btn btn-ghost border border-border/50 h-10 px-5">Register another</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Step: Encoding ───
  if (step === "encoding") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-md mx-auto text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <h2 className="text-lg font-semibold">Processing face…</h2>
          <p className="text-sm text-muted-foreground">Running liveness analysis and facial encoding</p>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Step: Consent selection ───
  if (step === "consent") {
    return (
      <DashboardLayout>
        <div className="max-w-xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Set Consent Level</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose how AI systems may use your likeness.</p>
          </div>
          {awsFaceId && (
            <div className="surface p-4 mb-6 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Face encoded successfully</p>
                <p className="font-mono text-xs text-muted-foreground truncate">AWS ID: {awsFaceId}</p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 mb-6">
            {consentOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <label key={opt.value} className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${consentLevel === opt.value ? opt.color : "border-border/40 hover:border-border"}`}>
                  <input type="radio" name="consent" value={opt.value} checked={consentLevel === opt.value} onChange={() => setConsentLevel(opt.value)} className="mt-0.5 accent-primary" />
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${consentLevel === opt.value ? "" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-semibold">{opt.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1.5">Label <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="input w-full" placeholder="e.g. Professional headshot" />
          </div>
          <button onClick={saveFace} disabled={encoding} className="btn btn-primary h-12 w-full text-base gap-2">
            {encoding ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            {encoding ? "Saving…" : "Save face & consent"}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Step: Multi-angle capture ───
  if (step === "capture") {
    return (
      <DashboardLayout>
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Photo {captureStep + 1} of 3</h1>
            <p className="text-sm text-muted-foreground mt-1">{CAPTURE_INSTRUCTIONS[captureStep]}</p>
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-border/40 aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-52 rounded-full border-2 border-primary/50 opacity-60" />
                </div>
              </div>
              <button onClick={capturePhoto} className="btn btn-primary w-full mt-4 h-12 gap-2">
                <Camera className="h-5 w-5" /> Capture photo {captureStep + 1}
              </button>
            </div>
            <div className="w-28 flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`rounded-xl aspect-[4/3] flex items-center justify-center border ${capturedFrames[i] ? "border-green-500/30" : "border-border/30 bg-muted/20"}`}>
                  {capturedFrames[i] ? (
                    <img src={capturedFrames[i]} className="w-full h-full object-cover rounded-xl" alt={`Frame ${i + 1}`} />
                  ) : (
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Step: Liveness challenge ───
  if (step === "liveness") {
    const currentChallenge = CHALLENGES[challengeIdx === -1 ? 0 : Math.min(challengeIdx, CHALLENGES.length - 1)];
    const nextChallenge = passed.smile ? (passed.left ? (passed.right ? null : CHALLENGES[2]) : CHALLENGES[1]) : CHALLENGES[0];

    return (
      <DashboardLayout>
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Liveness Verification</h1>
            <p className="text-sm text-muted-foreground mt-1">Follow the challenges to verify you're a real person.</p>
          </div>

          <div className="flex gap-6">
            {/* Camera feed */}
            <div className="flex-1">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-border/40 aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-44 h-56 rounded-full border-2 transition-colors ${allPassed ? "border-green-400" : "border-primary/50"} opacity-60`} />
                </div>
                {allPassed && (
                  <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-400" />
                  </div>
                )}
              </div>

              {/* Current instruction */}
              {nextChallenge && !allPassed && (
                <div className="surface p-3 mt-3 flex items-center gap-3">
                  <SmilePlus className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-sm font-medium">{nextChallenge.instruction}</p>
                  {analyzing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-52 flex flex-col gap-4">
              {/* Challenge checklist */}
              <div className="surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Challenges</p>
                <div className="flex flex-col gap-2">
                  {CHALLENGES.map((c) => (
                    <div key={c.id} className={`flex items-center gap-2 text-sm ${passed[c.id] ? "text-green-400" : "text-muted-foreground"}`}>
                      {passed[c.id] ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <div className="h-4 w-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />}
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live analysis */}
              {liveData && (
                <div className="surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Live analysis</p>
                  <div className="flex flex-col gap-2.5">
                    <Meter label="Smile" value={liveData.smile} max={100} unit="%" />
                    <div className="text-xs">
                      <p className="text-muted-foreground mb-1">Head yaw</p>
                      <p className="font-mono font-medium">{liveData.yaw.toFixed(1)}°</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={liveData.eyesOpen ? "text-green-400" : "text-muted-foreground"}>
                        Eyes {liveData.eyesOpen ? "open" : "closed"}
                      </span>
                    </div>
                    <Meter label="Brightness" value={liveData.brightness} max={100} unit="%" />
                    <Meter label="Sharpness" value={liveData.sharpness} max={100} unit="%" />
                  </div>
                </div>
              )}

              <button onClick={() => { stopCamera(); setStep("mode"); }} className="btn btn-ghost border border-border/40 h-9 text-xs gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Step: Mode selection ───
  return (
    <DashboardLayout>
      <div className="max-w-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Register a Face</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to register your face.</p>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <div
            onClick={() => { setMode("liveness"); startLiveness(); }}
            className="surface p-6 cursor-pointer hover:border-primary/40 transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">Camera + Liveness Check</p>
                <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">Recommended</span>
              </div>
              <p className="text-sm text-muted-foreground">Smile, turn left, turn right — proves you're a real person. Marks your face as verified.</p>
            </div>
          </div>

          <div className="surface p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-1">Upload a photo</p>
              <p className="text-sm text-muted-foreground mb-3">Manually upload an image. Marks as unverified.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
              {uploadedImage ? (
                <div className="flex items-center gap-3">
                  <img src={uploadedImage} className="w-14 h-14 object-cover rounded-lg border border-border/50" alt="Preview" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Photo ready</p>
                    <button onClick={encodeUpload} className="btn btn-primary h-8 px-3 text-xs mt-1 gap-1">
                      <Loader2 className="h-3.5 w-3.5 hidden" /> Continue →
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost border border-border/50 h-9 px-4 text-sm gap-2">
                  <Upload className="h-4 w-4" /> Choose photo
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
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xs font-mono font-medium">{value.toFixed(0)}{unit}</p>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
