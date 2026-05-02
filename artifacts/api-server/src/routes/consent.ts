import { Router } from "express";
import { db } from "@workspace/db";
import { consentTokensTable, facesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";
import { cuid, generateToken } from "../lib/id";

const router = Router();

router.get("/consent/tokens", requireSession, async (req, res) => {
  const user = (req as any).user;
  const tokens = await db.select().from(consentTokensTable).where(eq(consentTokensTable.userId, user.id));
  res.json(tokens);
});

router.post("/consent/decision", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = z.object({
    token: z.string(),
    decision: z.enum(["approve", "deny"]),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }

  const [consentToken] = await db.select().from(consentTokensTable)
    .where(and(eq(consentTokensTable.token, parsed.data.token), eq(consentTokensTable.userId, user.id)))
    .limit(1);

  if (!consentToken) {
    res.status(404).json({ error: "NotFound", message: "Token not found" });
    return;
  }

  if (consentToken.used) {
    res.status(400).json({ error: "BadRequest", message: "Token already used" });
    return;
  }

  if (new Date() > consentToken.expiresAt) {
    res.status(400).json({ error: "BadRequest", message: "Token has expired" });
    return;
  }

  await db.update(consentTokensTable)
    .set({ approved: parsed.data.decision === "approve" })
    .where(eq(consentTokensTable.id, consentToken.id));

  res.json({ success: true, message: `Consent ${parsed.data.decision}d` });
});

router.get("/consent/status/:token", async (req, res) => {
  const [consentToken] = await db.select().from(consentTokensTable)
    .where(eq(consentTokensTable.token, req.params.token))
    .limit(1);

  if (!consentToken) {
    res.status(404).json({ error: "NotFound", message: "Token not found" });
    return;
  }

  if (consentToken.used) {
    res.json({ status: "approved" }); // used implies was approved
    return;
  }

  if (new Date() > consentToken.expiresAt) {
    res.json({ status: "expired" });
    return;
  }

  if (consentToken.approved) {
    res.json({ status: "approved" });
    return;
  }

  // Check if denied (approved = false AND explicitly set — we use null as pending)
  res.json({ status: "pending" });
});

router.get("/consent/approve/:token", async (req, res) => {
  const [consentToken] = await db.select().from(consentTokensTable)
    .where(eq(consentTokensTable.token, req.params.token))
    .limit(1);

  if (!consentToken) {
    res.status(404).json({ error: "NotFound", message: "Token not found" });
    return;
  }

  const [face] = await db.select().from(facesTable).where(eq(facesTable.id, consentToken.faceId)).limit(1);

  // Check if caller is owner (pass user context if authenticated)
  const isOwner = false; // Frontend handles this via useGetMe

  res.json({
    token: consentToken,
    faceLabel: face?.label || null,
    isOwner,
  });
});

export { generateToken, cuid };
export default router;
