import { Router } from "express";
import { db } from "@workspace/db";
import { accessLogsTable } from "@workspace/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { requireSession } from "../lib/auth";

const router = Router();

router.get("/activity", requireSession, async (req, res) => {
  const user = (req as any).user;
  const limit = Math.min(parseInt(String(req.query.limit || "50")), 200);
  const offset = parseInt(String(req.query.offset || "0"));

  const [totalRow] = await db.select({ count: count() }).from(accessLogsTable)
    .where(eq(accessLogsTable.userId, user.id));

  const logs = await db.select().from(accessLogsTable)
    .where(eq(accessLogsTable.userId, user.id))
    .orderBy(desc(accessLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ logs, total: Number(totalRow.count) });
});

export default router;
