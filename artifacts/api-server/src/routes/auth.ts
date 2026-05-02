import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "../lib/auth";
import { cuid } from "../lib/id";

const router = Router();

/**
 * Returns the current authenticated user (provisioned by Clerk on first request).
 * Also lazily creates a default FREE subscription if none exists yet.
 */
router.get("/auth/me", requireSession, async (req, res) => {
  const user = (req as any).user;
  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, user.id)).limit(1);
  if (!sub) {
    [sub] = await db
      .insert(subscriptionsTable)
      .values({ id: cuid(), userId: user.id, plan: "FREE", status: "active" })
      .returning();
  }
  const { hashedPassword, ...safe } = user;
  res.json({ ...safe, subscription: sub });
});

export default router;
