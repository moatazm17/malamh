import { Router } from "express";
import { db } from "@workspace/db";
import { facesTable, accessLogsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";
import { cuid } from "../lib/id";
import { mockEmbedding, isMockMode } from "../lib/face-service";
import {
  detectFaces,
  indexFace,
  deleteFaceFromCollection,
  compressImage,
} from "../lib/rekognition";
import { logger } from "../lib/logger";
import { checkFaceLimit, ownerPlanAllowsToken, getOwnerPlan } from "../lib/plan-limits";
import sharp from "sharp";

const router = Router();

const createFaceSchema = z.object({
  embedding: z.string(),
  consentLevel: z.enum(["BLOCKED", "TOKEN_REQUIRED", "OPEN"]),
  label: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  awsFaceId: z.string().optional(),
  referenceImage: z.string().nullable().optional(),
});

const updateFaceSchema = z.object({
  consentLevel: z.enum(["BLOCKED", "TOKEN_REQUIRED", "OPEN"]).optional(),
  label: z.string().nullable().optional(),
});

router.get("/internal/faces", requireSession, async (req, res) => {
  const user = (req as any).user;
  const faces = await db.select().from(facesTable).where(eq(facesTable.userId, user.id));
  res.json(faces.map(sanitizeFace));
});

router.post("/internal/faces", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = createFaceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }

  // Enforce plan face limit
  const limitCheck = await checkFaceLimit(user.id);
  if (!limitCheck.allowed) {
    res.status(403).json({
      error: "PlanLimitExceeded",
      message: `Your ${limitCheck.plan} plan allows up to ${limitCheck.limit} face${limitCheck.limit === 1 ? "" : "s"} (you have ${limitCheck.current}). Upgrade to register more.`,
      current: limitCheck.current,
      limit: limitCheck.limit,
    });
    return;
  }

  const { embedding, consentLevel, label, verified, awsFaceId, referenceImage } = parsed.data;

  // TOKEN_REQUIRED requires a paid OWNER plan.
  if (consentLevel === "TOKEN_REQUIRED") {
    const ownerPlan = await getOwnerPlan(user.id);
    if (!ownerPlanAllowsToken(ownerPlan)) {
      res.status(403).json({
        error: "PlanLimitExceeded",
        message: `Per-request consent tokens require a paid plan. Upgrade to Pro to enable token-mode consent.`,
      });
      return;
    }
  }

  const face = await db.insert(facesTable).values({
    id: cuid(),
    userId: user.id,
    embedding,
    awsFaceId: awsFaceId ?? null,
    consentLevel,
    label: label ?? null,
    verified: verified ?? false,
    referenceImage: referenceImage ?? null,
  }).returning();

  res.status(201).json(sanitizeFace(face[0]));
});

router.get("/internal/faces/:id", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [face] = await db.select().from(facesTable)
    .where(and(eq(facesTable.id, req.params.id), eq(facesTable.userId, user.id)))
    .limit(1);

  if (!face) {
    res.status(404).json({ error: "NotFound", message: "Face not found" });
    return;
  }
  res.json(sanitizeFace(face));
});

router.patch("/internal/faces/:id", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = updateFaceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(facesTable)
    .where(and(eq(facesTable.id, req.params.id), eq(facesTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "NotFound", message: "Face not found" });
    return;
  }

  // Same TOKEN_REQUIRED gate when a face is being switched into token mode.
  if (parsed.data.consentLevel === "TOKEN_REQUIRED") {
    const ownerPlan = await getOwnerPlan(user.id);
    if (!ownerPlanAllowsToken(ownerPlan)) {
      res.status(403).json({
        error: "PlanLimitExceeded",
        message: `Per-request consent tokens require a paid plan. Upgrade to Pro to enable token-mode consent.`,
      });
      return;
    }
  }

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (parsed.data.consentLevel !== undefined) updates.consentLevel = parsed.data.consentLevel;
  if (parsed.data.label !== undefined) updates.label = parsed.data.label;

  const [updated] = await db.update(facesTable).set(updates).where(eq(facesTable.id, req.params.id)).returning();
  res.json(sanitizeFace(updated));
});

router.delete("/internal/faces/:id", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [existing] = await db.select().from(facesTable)
    .where(and(eq(facesTable.id, req.params.id), eq(facesTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "NotFound", message: "Face not found" });
    return;
  }

  if (existing.awsFaceId && !isMockMode()) {
    try {
      await deleteFaceFromCollection(existing.awsFaceId);
    } catch (err) {
      logger.warn({ err, awsFaceId: existing.awsFaceId }, "Failed to delete face from Rekognition collection");
    }
  }

  await db.delete(facesTable).where(eq(facesTable.id, req.params.id));
  res.json({ success: true, message: "Face deleted" });
});

router.get("/internal/faces/:id/activity", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [face] = await db.select().from(facesTable)
    .where(and(eq(facesTable.id, req.params.id), eq(facesTable.userId, user.id)))
    .limit(1);

  if (!face) {
    res.status(404).json({ error: "NotFound", message: "Face not found" });
    return;
  }

  const logs = await db.select().from(accessLogsTable).where(eq(accessLogsTable.faceId, req.params.id));
  res.json(logs);
});

/**
 * GET /internal/face-image/:id
 * Returns the stored reference thumbnail as image/jpeg.
 */
router.get("/internal/face-image/:id", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [face] = await db.select().from(facesTable)
    .where(and(eq(facesTable.id, req.params.id), eq(facesTable.userId, user.id)))
    .limit(1);

  if (!face || !face.referenceImage) {
    res.status(404).json({ error: "NotFound", message: "No reference image stored for this face" });
    return;
  }

  const base64 = face.referenceImage.replace(/^data:[^,]+,/, "");
  const imageBuffer = Buffer.from(base64, "base64");
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(imageBuffer);
});

/**
 * POST /internal/embed
 *
 * AWS mode:  DetectFaces (liveness) → IndexFaces → returns { awsFaceId, embedding: awsFaceId, referenceImageBase64, mock: false }
 * Mock mode: deterministic vector hash → returns { embedding: JSON vector, mock: true }
 */
router.post("/internal/embed", requireSession, async (req, res) => {
  const { imageBase64, label } = req.body;
  if (!imageBase64) {
    res.status(400).json({ error: "BadRequest", message: "imageBase64 required" });
    return;
  }

  const imageBytes = Buffer.from(imageBase64.replace(/^data:[^,]+,/, ""), "base64");

  // Generate 256x256 reference thumbnail
  let referenceImageBase64: string | null = null;
  try {
    const thumb = await sharp(imageBytes)
      .resize(256, 256, { fit: "cover", position: "center" })
      .jpeg({ quality: 80 })
      .toBuffer();
    referenceImageBase64 = `data:image/jpeg;base64,${thumb.toString("base64")}`;
  } catch (err) {
    logger.warn({ err }, "Failed to generate reference thumbnail");
  }

  if (!isMockMode()) {
    try {
      const detection = await detectFaces(imageBytes);

      if (detection.faceCount === 0) {
        res.status(422).json({
          error: "NoFaceDetected",
          message: "No face detected in the image. Please use a clear, well-lit, front-facing photo.",
        });
        return;
      }

      if (detection.faceCount > 1) {
        res.status(422).json({
          error: "MultipleFacesDetected",
          message: "Multiple faces detected. Please upload a photo with only one person.",
        });
        return;
      }

      const tempId = cuid();
      const { awsFaceId, confidence } = await indexFace(imageBytes, tempId);

      res.json({
        embedding: awsFaceId,
        awsFaceId,
        referenceImageBase64,
        mock: false,
        faceCount: detection.faceCount,
        confidence,
      });
    } catch (err: any) {
      logger.error({ err }, "Rekognition embed failed");
      res.status(500).json({ error: "RekognitionError", message: err.message ?? "Face indexing failed" });
    }
    return;
  }

  const embedding = mockEmbedding(imageBytes);
  res.json({ embedding: JSON.stringify(embedding), referenceImageBase64, mock: true });
});

function sanitizeFace(face: any) {
  const { embedding, referenceImage, ...rest } = face;
  return rest;
}

export default router;
