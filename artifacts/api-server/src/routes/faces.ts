import { Router } from "express";
import { db } from "@workspace/db";
import { facesTable, accessLogsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";
import { cuid } from "../lib/id";
import { mockEmbedding, isMockMode } from "../lib/face-service";

const router = Router();

const createFaceSchema = z.object({
  embedding: z.string(),
  consentLevel: z.enum(["BLOCKED", "TOKEN_REQUIRED", "OPEN"]),
  label: z.string().nullable().optional(),
  verified: z.boolean().optional(),
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

  const { embedding, consentLevel, label, verified } = parsed.data;

  const face = await db.insert(facesTable).values({
    id: cuid(),
    userId: user.id,
    embedding,
    consentLevel,
    label: label ?? null,
    verified: verified ?? false,
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
  res.json(face); // Return full embedding to owner
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

  // TODO: if existing.awsFaceId, delete from AWS Rekognition
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

// Embed endpoint — returns mock embedding in demo mode
router.post("/internal/embed", requireSession, async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    res.status(400).json({ error: "BadRequest", message: "imageBase64 required" });
    return;
  }

  const imageBytes = Buffer.from(imageBase64.replace(/^data:[^,]+,/, ""), "base64");
  const embedding = mockEmbedding(imageBytes);

  res.json({ embedding: JSON.stringify(embedding), mock: isMockMode() });
});

function sanitizeFace(face: any) {
  // Return face without raw embedding to non-owners (keep for GET by id)
  const { embedding, ...rest } = face;
  return rest;
}

export default router;
