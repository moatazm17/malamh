import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, subscriptionsTable, facesTable, apiKeysTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().nullable().optional(),
  username: z.string().regex(/^[a-z0-9_-]+$/).nullable().optional(),
  notifyOnScan: z.boolean().optional(),
  notifyOnConsent: z.boolean().optional(),
  notifyOnApiCheck: z.boolean().optional(),
});

router.patch("/user/profile", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.username !== undefined) updates.username = parsed.data.username;
  if (parsed.data.notifyOnScan !== undefined) updates.notifyOnScan = parsed.data.notifyOnScan;
  if (parsed.data.notifyOnConsent !== undefined) updates.notifyOnConsent = parsed.data.notifyOnConsent;
  if (parsed.data.notifyOnApiCheck !== undefined) updates.notifyOnApiCheck = parsed.data.notifyOnApiCheck;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  const { hashedPassword, ...safe } = updated;
  res.json(safe);
});

router.delete("/user/delete", requireSession, async (req, res) => {
  const user = (req as any).user;
  // Cascade deletes handle faces, keys, etc.
  await db.delete(usersTable).where(eq(usersTable.id, user.id));
  res.clearCookie("malamh_session");
  res.json({ success: true, message: "Account deleted" });
});

router.get("/u/:username", async (req, res) => {
  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.username, req.params.username))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "NotFound", message: "User not found" });
    return;
  }

  const faces = await db.select().from(facesTable).where(eq(facesTable.userId, user.id));

  res.json({
    username: user.username,
    totalFaces: faces.length,
    blockedCount: faces.filter(f => f.consentLevel === "BLOCKED").length,
    openCount: faces.filter(f => f.consentLevel === "OPEN").length,
    tokenRequiredCount: faces.filter(f => f.consentLevel === "TOKEN_REQUIRED").length,
    memberSince: user.createdAt,
  });
});

export default router;
