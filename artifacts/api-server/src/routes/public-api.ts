import { Router } from "express";
import { db } from "@workspace/db";
import { facesTable, accessLogsTable, consentTokensTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { authenticateApiKey, getRequesterIp } from "../lib/auth";
import { mockEmbedding, matchAgainstRegistry } from "../lib/face-service";
import { cuid, generateToken } from "../lib/id";

const router = Router();

function getBaseUrl(req: any): string {
  const host = req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${host}`;
}

router.post("/v1/check-face", async (req, res) => {
  const apiAuth = await authenticateApiKey(req);
  if (!apiAuth) {
    res.status(401).json({ error: "Unauthorized", message: "Valid API key required" });
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

  // Get all faces and do local matching
  const allFaces = await db.select().from(facesTable);
  const queryEmbedding = mockEmbedding(imageBytes);
  const match = matchAgainstRegistry(queryEmbedding, allFaces);

  const ip = getRequesterIp(req);

  if (!match.matched) {
    res.json({ status: "no_match", matchScore: null, authUrl: null });
    return;
  }

  const action = match.consentLevel === "BLOCKED" ? "blocked"
    : match.consentLevel === "OPEN" ? "allowed"
    : "token_issued";

  // Log the access
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
    res.json({ status: "blocked", matchScore: match.score, authUrl: null });
    return;
  }

  if (match.consentLevel === "OPEN") {
    res.json({ status: "open", matchScore: match.score, authUrl: null });
    return;
  }

  // TOKEN_REQUIRED — create consent token
  if (match.faceId && match.userId) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.insert(consentTokensTable).values({
      id: cuid(),
      faceId: match.faceId,
      userId: match.userId,
      requesterName,
      purpose,
      token,
      expiresAt,
    });

    const authUrl = `${getBaseUrl(req)}/consent/approve/${token}`;
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

  const [ct] = await db.select().from(consentTokensTable)
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

  // Mark token as used
  await db.update(consentTokensTable).set({ used: true }).where(eq(consentTokensTable.id, ct.id));

  res.json({ status: "open", matchScore: 1.0, authUrl: null });
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

  const authUrl = `${getBaseUrl(req)}/consent/approve/${token}`;
  res.status(201).json({ token, authUrl, expiresAt });
});

// Internal match endpoint (playground + AI studio)
router.post("/internal/match", async (req, res) => {
  const { imageBase64, requesterName = "Playground", purpose } = req.body;
  if (!imageBase64) {
    res.status(400).json({ error: "BadRequest", message: "imageBase64 required" });
    return;
  }

  const imageBytes = Buffer.from(imageBase64.replace(/^data:[^,]+,/, ""), "base64");
  const queryEmbedding = mockEmbedding(imageBytes);
  const allFaces = await db.select().from(facesTable);
  const match = matchAgainstRegistry(queryEmbedding, allFaces);

  if (!match.matched) {
    res.json({
      status: "no_match",
      matchScore: null,
      authUrl: null,
      tokenId: null,
      queryEmbeddingSample: queryEmbedding.slice(0, 32),
      matchedEmbeddingSample: null,
    });
    return;
  }

  let matchedEmbeddingSample: number[] | null = null;
  if (match.faceId) {
    const [f] = await db.select().from(facesTable).where(eq(facesTable.id, match.faceId)).limit(1);
    if (f) {
      try {
        matchedEmbeddingSample = (JSON.parse(f.embedding) as number[]).slice(0, 32);
      } catch {}
    }
  }

  let authUrl: string | null = null;
  let tokenId: string | null = null;

  if (match.consentLevel === "TOKEN_REQUIRED" && match.faceId && match.userId) {
    const token = generateToken();
    tokenId = token;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour for playground
    await db.insert(consentTokensTable).values({
      id: cuid(),
      faceId: match.faceId,
      userId: match.userId,
      requesterName,
      purpose,
      token,
      expiresAt,
    });
    authUrl = `${getBaseUrl(req)}/consent/approve/${token}`;
  }

  const status = match.consentLevel === "BLOCKED" ? "blocked"
    : match.consentLevel === "OPEN" ? "open"
    : "token_required";

  res.json({
    status,
    matchScore: match.score,
    authUrl,
    tokenId,
    queryEmbeddingSample: queryEmbedding.slice(0, 32),
    matchedEmbeddingSample,
  });
});

router.post("/internal/consent-check", async (req, res) => {
  // Same as match but also logs
  const { imageBase64, prompt, requesterName = "AI Studio" } = req.body;
  if (!imageBase64) {
    res.status(400).json({ error: "BadRequest", message: "imageBase64 required" });
    return;
  }

  const imageBytes = Buffer.from(imageBase64.replace(/^data:[^,]+,/, ""), "base64");
  const queryEmbedding = mockEmbedding(imageBytes);
  const allFaces = await db.select().from(facesTable);
  const match = matchAgainstRegistry(queryEmbedding, allFaces);

  if (!match.matched) {
    res.json({ status: "no_match", matchScore: null, authUrl: null, tokenId: null, logId: null });
    return;
  }

  const action = match.consentLevel === "BLOCKED" ? "blocked"
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
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(consentTokensTable).values({
      id: cuid(),
      faceId: match.faceId,
      userId: match.userId,
      requesterName,
      purpose: prompt,
      token,
      expiresAt,
    });
    authUrl = `${getBaseUrl(req)}/consent/approve/${token}`;
  }

  const status = match.consentLevel === "BLOCKED" ? "blocked"
    : match.consentLevel === "OPEN" ? "open"
    : "token_required";

  res.json({ status, matchScore: match.score, authUrl, tokenId, logId });
});

export default router;
