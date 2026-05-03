import { Router } from "express";
import { db } from "@workspace/db";
import { facesTable, accessLogsTable, consentTokensTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { authenticateApiKey, getRequesterIp, requireSession } from "../lib/auth";
import { mockEmbedding, matchAgainstRegistry, isMockMode } from "../lib/face-service";
import { searchFacesByImage } from "../lib/rekognition";
import { cuid, generateToken } from "../lib/id";
import { logger } from "../lib/logger";
import { fireWebhook } from "../lib/webhook-service";
import { checkMonthlyQuota } from "../lib/plan-limits";

const router = Router();

function getBaseUrl(req: any): string {
  const fwdHost = req.headers["x-forwarded-host"];
  const host =
    (typeof fwdHost === "string" ? fwdHost.split(",")[0].trim() : undefined) ||
    req.headers.host ||
    "localhost";
  const fwdProto = req.headers["x-forwarded-proto"];
  const proto =
    (typeof fwdProto === "string" ? fwdProto.split(",")[0].trim() : undefined) ||
    "http";
  return `${proto}://${host}`;
}

function isInvalidImageError(err: any): boolean {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  const name = String(err?.name ?? "").toLowerCase();
  return (
    name.includes("invalidimage") ||
    name.includes("invalidparameter") ||
    msg.includes("invalid image") ||
    msg.includes("image format") ||
    msg.includes("imagetoolarge") ||
    msg.includes("no faces")
  );
}

/**
 * Resolve a face record from an image using either AWS Rekognition or mock matching.
 */
async function resolveMatch(imageBytes: Buffer): Promise<{
  matched: boolean;
  faceId: string | null;
  userId: string | null;
  consentLevel: string | null;
  score: number;
}> {
  if (!isMockMode()) {
    // AWS Rekognition: search by image against the collection
    try {
      const result = await searchFacesByImage(imageBytes);
      if (!result) {
        return { matched: false, faceId: null, userId: null, consentLevel: null, score: 0 };
      }

      // Look up our face record by awsFaceId
      const [face] = await db
        .select()
        .from(facesTable)
        .where(eq(facesTable.awsFaceId, result.awsFaceId))
        .limit(1);

      if (!face) {
        // Indexed in AWS but not in our DB (shouldn't happen in normal operation)
        return { matched: false, faceId: null, userId: null, consentLevel: null, score: result.similarity };
      }

      return {
        matched: true,
        faceId: face.id,
        userId: face.userId,
        consentLevel: face.consentLevel,
        score: result.similarity,
      };
    } catch (err) {
      logger.error({ err }, "Rekognition search failed");
      throw err;
    }
  }

  // Mock mode: load all embeddings and do cosine similarity
  const allFaces = await db.select().from(facesTable);
  const queryEmbedding = mockEmbedding(imageBytes);
  return matchAgainstRegistry(queryEmbedding, allFaces);
}

router.post("/v1/check-face", async (req, res) => {
  const apiAuth = await authenticateApiKey(req);
  if (!apiAuth) {
    res.status(401).json({ error: "Unauthorized", message: "Valid API key required" });
    return;
  }

  // Enforce monthly quota
  const quota = await checkMonthlyQuota(apiAuth.userId);
  if (!quota.allowed) {
    res.status(429).json({
      error: "QuotaExceeded",
      message: `Monthly limit of ${quota.limit.toLocaleString()} checks reached for ${quota.plan} plan. Upgrade to increase your quota.`,
      limit: quota.limit,
      current: quota.current,
    });
    return;
  }

  const parsed = z.object({
    imageBase64: z.string(),
    requesterName: z.string().optional(),
    purpose: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "BadRequest", message: "imageBase64 required" });
    return;
  }

  const { imageBase64, requesterName = "Unknown", purpose } = parsed.data;
  const imageBytes = Buffer.from(imageBase64.replace(/^data:[^,]+,/, ""), "base64");
  const ip = getRequesterIp(req);

  let match: Awaited<ReturnType<typeof resolveMatch>>;
  try {
    match = await resolveMatch(imageBytes);
  } catch (err: any) {
    if (isInvalidImageError(err)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid or unreadable image. Provide a JPEG/PNG containing a clear face." });
      return;
    }
    res.status(500).json({ error: "MatchError", message: err.message ?? "Face matching failed" });
    return;
  }

  if (!match.matched) {
    res.json({ status: "no_match", matchScore: null, authUrl: null });
    return;
  }

  const action =
    match.consentLevel === "BLOCKED" ? "blocked"
    : match.consentLevel === "OPEN" ? "allowed"
    : "token_issued";

  if (match.userId) {
    await db.insert(accessLogsTable).values({
      id: cuid(),
      faceId: match.faceId,
      userId: match.userId,
      requesterName,
      requesterIp: ip,
      action,
      matchScore: match.score,
    });
  }

  if (match.consentLevel === "BLOCKED") {
    if (match.userId) fireWebhook(match.userId, "face.blocked", { faceId: match.faceId, requesterName, matchScore: match.score });
    res.json({ status: "blocked", matchScore: match.score, authUrl: null });
    return;
  }

  if (match.consentLevel === "OPEN") {
    if (match.userId) fireWebhook(match.userId, "face.allowed", { faceId: match.faceId, requesterName, matchScore: match.score });
    res.json({ status: "open", matchScore: match.score, authUrl: null });
    return;
  }

  // TOKEN_REQUIRED
  if (match.faceId && match.userId) {
    const token = generateToken();
    await db.insert(consentTokensTable).values({
      id: cuid(),
      faceId: match.faceId,
      userId: match.userId,
      requesterName,
      purpose,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const authUrl = `${getBaseUrl(req)}/consent/approve/${token}`;
    fireWebhook(match.userId, "consent.token_issued", { faceId: match.faceId, requesterName, purpose: purpose ?? null, authUrl });
    res.json({ status: "token_required", matchScore: match.score, authUrl });
  }
});

router.post("/v1/check-face-with-token", async (req, res) => {
  const apiAuth = await authenticateApiKey(req);
  if (!apiAuth) {
    res.status(401).json({ error: "Unauthorized", message: "Valid API key required" });
    return;
  }

  const parsed = z.object({
    imageBase64: z.string(),
    consentToken: z.string(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "BadRequest", message: parsed.error.message });
    return;
  }

  const [ct] = await db
    .select()
    .from(consentTokensTable)
    .where(eq(consentTokensTable.token, parsed.data.consentToken))
    .limit(1);

  if (!ct) {
    res.status(400).json({ error: "BadRequest", message: "Invalid token" });
    return;
  }
  if (ct.used) {
    res.status(400).json({ error: "BadRequest", message: "Token already used" });
    return;
  }
  if (new Date() > ct.expiresAt) {
    res.status(400).json({ error: "BadRequest", message: "Token expired" });
    return;
  }
  if (!ct.approved) {
    res.status(400).json({ error: "BadRequest", message: "Token not yet approved" });
    return;
  }

  // SECURITY: re-match the submitted image and verify it belongs to the same
  // face the token was issued for. Without this, a stolen/leaked one-time
  // token could be used to "approve" a completely different person's image.
  const imageBytes = Buffer.from(parsed.data.imageBase64.replace(/^data:[^,]+,/, ""), "base64");
  let match: Awaited<ReturnType<typeof resolveMatch>>;
  try {
    match = await resolveMatch(imageBytes);
  } catch (err: any) {
    if (isInvalidImageError(err)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid or unreadable image. Provide a JPEG/PNG containing a clear face." });
      return;
    }
    res.status(500).json({ error: "MatchError", message: err.message ?? "Face matching failed" });
    return;
  }

  if (!match.matched || match.faceId !== ct.faceId) {
    res.status(400).json({
      error: "TokenFaceMismatch",
      message: "The submitted image does not match the face this token was issued for.",
    });
    return;
  }

  await db.update(consentTokensTable).set({ used: true }).where(eq(consentTokensTable.id, ct.id));
  res.json({ status: "open", matchScore: match.score, authUrl: null });
});

router.post("/v1/request-consent", async (req, res) => {
  const apiAuth = await authenticateApiKey(req);
  if (!apiAuth) {
    res.status(401).json({ error: "Unauthorized", message: "Valid API key required" });
    return;
  }

  const parsed = z.object({
    faceId: z.string(),
    requesterName: z.string(),
    purpose: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "BadRequest", message: parsed.error.message });
    return;
  }

  const [face] = await db.select().from(facesTable).where(eq(facesTable.id, parsed.data.faceId)).limit(1);
  if (!face) {
    res.status(404).json({ error: "NotFound", message: "Face not found" });
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(consentTokensTable).values({
    id: cuid(),
    faceId: face.id,
    userId: face.userId,
    requesterName: parsed.data.requesterName,
    purpose: parsed.data.purpose,
    token,
    expiresAt,
  });

  res.status(201).json({ token, authUrl: `${getBaseUrl(req)}/consent/approve/${token}`, expiresAt });
});

// Internal match endpoint (playground + AI studio) — session-only, never API-key
router.post("/internal/match", requireSession, async (req, res) => {
  const { imageBase64, requesterName = "Playground", purpose } = req.body;
  if (!imageBase64) {
    res.status(400).json({ error: "BadRequest", message: "imageBase64 required" });
    return;
  }

  const imageBytes = Buffer.from(imageBase64.replace(/^data:[^,]+,/, ""), "base64");

  let match: Awaited<ReturnType<typeof resolveMatch>>;
  try {
    match = await resolveMatch(imageBytes);
  } catch (err: any) {
    if (isInvalidImageError(err)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid or unreadable image. Provide a JPEG/PNG containing a clear face." });
      return;
    }
    res.status(500).json({ error: "MatchError", message: err.message ?? "Face matching failed" });
    return;
  }

  if (!match.matched) {
    res.json({
      status: "no_match",
      matchScore: null,
      authUrl: null,
      tokenId: null,
      mock: isMockMode(),
    });
    return;
  }

  let authUrl: string | null = null;
  let tokenId: string | null = null;

  if (match.consentLevel === "TOKEN_REQUIRED" && match.faceId && match.userId) {
    const token = generateToken();
    tokenId = token;
    await db.insert(consentTokensTable).values({
      id: cuid(),
      faceId: match.faceId,
      userId: match.userId,
      requesterName,
      purpose,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    authUrl = `${getBaseUrl(req)}/consent/approve/${token}`;
  }

  const status =
    match.consentLevel === "BLOCKED" ? "blocked"
    : match.consentLevel === "OPEN" ? "open"
    : "token_required";

  res.json({ status, matchScore: match.score, authUrl, tokenId, mock: isMockMode() });
});

router.post("/internal/consent-check", requireSession, async (req, res) => {
  const { imageBase64, prompt, requesterName = "AI Studio" } = req.body;
  if (!imageBase64) {
    res.status(400).json({ error: "BadRequest", message: "imageBase64 required" });
    return;
  }

  const imageBytes = Buffer.from(imageBase64.replace(/^data:[^,]+,/, ""), "base64");

  let match: Awaited<ReturnType<typeof resolveMatch>>;
  try {
    match = await resolveMatch(imageBytes);
  } catch (err: any) {
    if (isInvalidImageError(err)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid or unreadable image. Provide a JPEG/PNG containing a clear face." });
      return;
    }
    res.status(500).json({ error: "MatchError", message: err.message ?? "Face matching failed" });
    return;
  }

  if (!match.matched) {
    res.json({ status: "no_match", matchScore: null, authUrl: null, tokenId: null, logId: null });
    return;
  }

  const action =
    match.consentLevel === "BLOCKED" ? "blocked"
    : match.consentLevel === "OPEN" ? "allowed"
    : "token_issued";

  let logId: string | null = null;
  if (match.userId) {
    const id = cuid();
    logId = id;
    await db.insert(accessLogsTable).values({
      id,
      faceId: match.faceId,
      userId: match.userId,
      requesterName,
      requesterIp: getRequesterIp(req),
      action,
      matchScore: match.score,
    });
  }

  let authUrl: string | null = null;
  let tokenId: string | null = null;

  if (match.consentLevel === "TOKEN_REQUIRED" && match.faceId && match.userId) {
    const token = generateToken();
    tokenId = token;
    await db.insert(consentTokensTable).values({
      id: cuid(),
      faceId: match.faceId,
      userId: match.userId,
      requesterName,
      purpose: prompt,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    authUrl = `${getBaseUrl(req)}/consent/approve/${token}`;
  }

  const status =
    match.consentLevel === "BLOCKED" ? "blocked"
    : match.consentLevel === "OPEN" ? "open"
    : "token_required";

  res.json({ status, matchScore: match.score, authUrl, tokenId, logId });
});

export default router;
