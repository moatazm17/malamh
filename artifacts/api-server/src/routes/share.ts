import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireSession } from "../lib/auth";

const router = Router();

const VALID_PLATFORMS = new Set(["twitter", "facebook", "linkedin", "whatsapp", "copy"]);

router.post("/internal/share-count", requireSession, async (req, res) => {
  const user = (req as any).user;
  const platform = typeof req.body?.platform === "string" ? req.body.platform : "unknown";
  if (platform !== "unknown" && !VALID_PLATFORMS.has(platform)) {
    return res.status(400).json({ message: "Invalid platform" });
  }
  await db
    .update(usersTable)
    .set({ shareCount: sql`${usersTable.shareCount} + 1`, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));
  res.json({ ok: true });
});

router.get("/stats/shares", async (_req, res) => {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${usersTable.shareCount}), 0)::int` })
    .from(usersTable);
  res.json({ totalShares: Number(row?.total ?? 0) });
});

export default router;
