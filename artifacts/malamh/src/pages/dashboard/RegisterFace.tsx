import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEmbedImage, useCreateFace } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/image-utils";
import { Upload, ScanFace, Loader2, CheckCircle } from "lucide-react";

type ConsentLevel = "OPEN" | "BLOCKED" | "TOKEN_REQUIRED";

const consentOptions: { value: ConsentLevel; label: string; desc: string }[] = [
  { value: "OPEN", label: "Open", desc: "AI generation of your likeness is allowed without restrictions." },
  { value: "TOKEN_REQUIRED", label: "Token Required", desc: "Each request requires you to approve a one-time token." },
  { value: "BLOCKED", label: "Blocked", desc: "No AI system is allowed to generate your likeness." },
];

export default function RegisterFace() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const embedImage = useEmbedImage();
  const createFace = useCreateFace();

  const [label, setLabel] = useState("");
  const [consentLevel, setConsentLevel] = useState<ConsentLevel>("OPEN");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    const compressed = await compressImage(file);
    setPreview(compressed);
    setImageData(compressed);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageData) {
      toast({ title: "No image", description: "Please upload a photo.", variant: "destructive" });
      return;
    }

    // Step 1: detect + index the image (AWS) or generate mock embedding
    const rawBase64 = imageData.split(",")[1] || imageData;
    embedImage.mutate(
      { data: { imageBase64: rawBase64, mimeType: "image/jpeg" } },
      {
        onSuccess: (embedResult) => {
          // Step 2: register the face record
          // In AWS mode, embedResult.embedding is the awsFaceId string.
          // In mock mode, embedResult.embedding is already a JSON-stringified vector.
          // Either way, pass it verbatim — do NOT re-stringify.
          createFace.mutate(
            {
              data: {
                embedding: embedResult.embedding,
                consentLevel,
                label: label || null,
                awsFaceId: embedResult.awsFaceId ?? undefined,
              },
            },
            {
              onSuccess: (face) => setDone(face.id),
              onError: (err: any) =>
                toast({
                  title: "Registration failed",
                  description: err?.message ?? "Could not save face record.",
                  variant: "destructive",
                }),
            }
          );
        },
        onError: (err: any) =>
          toast({
            title: "Image processing failed",
            description: err?.message ?? "No face detected or image quality too low.",
            variant: "destructive",
          }),
      }
    );
  };

  const isPending = embedImage.isPending || createFace.isPending;

  if (done) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 max-w-md mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-green-400" />
          <div>
            <h2 className="text-xl font-bold mb-2">Face Registered!</h2>
            <p className="text-sm text-muted-foreground mb-1">Your face ID:</p>
            <p className="font-mono text-primary text-sm bg-background border border-border/50 px-3 py-2 rounded break-all">{done}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setLocation(`/dashboard/face/${done}`)} className="btn btn-primary h-10 px-5">
              View face
            </button>
            <button
              onClick={() => { setDone(null); setPreview(null); setImageData(null); setLabel(""); }}
              className="btn btn-ghost border border-border/50 h-10 px-5"
            >
              Register another
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Register a Face</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a clear photo. We store only a mathematical embedding — your image is never saved.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Upload area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
            } flex flex-col items-center justify-center p-8 cursor-pointer`}
            onClick={() => document.getElementById("face-upload")?.click()}
          >
            <input
              id="face-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
            />
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-full border-2 border-primary/30" />
                <p className="text-xs text-muted-foreground">Click to change photo</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Drop a photo here</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — max 10MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Label <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="input w-full"
              placeholder="e.g. Professional headshot"
            />
          </div>

          {/* Consent level */}
          <div>
            <label className="block text-sm font-medium mb-3">Consent level</label>
            <div className="flex flex-col gap-2">
              {consentOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    consentLevel === opt.value ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="consent"
                    value={opt.value}
                    checked={consentLevel === opt.value}
                    onChange={() => setConsentLevel(opt.value)}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isPending || !imageData} className="btn btn-primary h-12 text-base gap-2">
            {isPending
              ? <><Loader2 className="h-5 w-5 animate-spin" /> {embedImage.isPending ? "Processing image…" : "Registering…"}</>
              : <><ScanFace className="h-5 w-5" /> Register face</>
            }
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
