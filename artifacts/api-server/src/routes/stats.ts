import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, facesTable, accessLogsTable, subscriptionsTable } from "@workspace/db/schema";
import { eq, count, gte } from "drizzle-orm";
import { requireSession } from "../lib/auth";

const router = Router();

router.get("/stats/overview", async (req, res) => {
  const [totalFaces] = await db.select({ count: count() }).from(facesTable);
  const [totalUsers] = await db.select({ count: count() }).from(usersTable);
  const [totalChecks] = await db.select({ count: count() }).from(accessLogsTable);
  const [totalBlocked] = await db.select({ count: count() }).from(accessLogsTable)
    .where(eq(accessLogsTable.action, "blocked"));

  res.json({
    totalFaces: Number(totalFaces.count),
    totalUsers: Number(totalUsers.count),
    totalChecks: Number(totalChecks.count),
    totalBlocked: Number(totalBlocked.count),
  });
});

router.get("/stats/dashboard", requireSession, async (req, res) => {
  const user = (req as any).user;

  const faces = await db.select().from(facesTable).where(eq(facesTable.userId, user.id));
  const logs = await db.select().from(accessLogsTable).where(eq(accessLogsTable.userId, user.id));

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentLogs = logs.filter(l => l.createdAt > oneDayAgo);

  res.json({
    facesRegistered: faces.length,
    totalChecks: logs.length,
    recentActivityCount: recentLogs.length,
    blockedCount: faces.filter(f => f.consentLevel === "BLOCKED").length,
    tokenRequiredCount: faces.filter(f => f.consentLevel === "TOKEN_REQUIRED").length,
    openCount: faces.filter(f => f.consentLevel === "OPEN").length,
  });
});

export default router;
