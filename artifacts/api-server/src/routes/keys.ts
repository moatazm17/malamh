import { Router } from "express";
import { db } from "@workspace/db";
import { apiKeysTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";
import { cuid, generateApiKey } from "../lib/id";

const router = Router();

router.get("/keys", requireSession, async (req, res) => {
  const user = (req as any).user;
  const keys = await db.select().from(apiKeysTable).where(eq(apiKeysTable.userId, user.id));
  res.json(keys.map(maskKey));
});

router.post("/keys", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Name is required" });
    return;
  }

  const key = generateApiKey();
  const [created] = await db.insert(apiKeysTable).values({
    id: cuid(),
    userId: user.id,
    key,
    name: parsed.data.name,
  }).returning();

  // Return full key only on creation
  res.status(201).json(created);
});

router.delete("/keys/:id", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [existing] = await db.select().from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, req.params.id), eq(apiKeysTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "NotFound", message: "API key not found" });
    return;
  }

  await db.delete(apiKeysTable).where(eq(apiKeysTable.id, req.params.id));
  res.json({ success: true, message: "API key deleted" });
});

function maskKey(key: any) {
  return {
    ...key,
    key: key.key.slice(0, 8) + "..." + key.key.slice(-4),
  };
}

export default router;
