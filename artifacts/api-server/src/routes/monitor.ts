import { Router } from "express";
import { db } from "@workspace/db";
import { scanResultsTable, subscriptionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";
import { cuid } from "../lib/id";

const router = Router();

const DEMO_DOMAINS = [
  "artstation.com", "deviantart.com", "midjourney.com", "stability.ai",
  "civitai.com", "flickr.com", "reddit.com", "tumblr.com",
];

function requireMonitorPlan(plan: string): boolean {
  return plan === "MONITOR" || plan === "MONITOR_PRO";
}

router.post("/monitor/scan", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, user.id))
    .limit(1);

  if (!sub || !requireMonitorPlan(sub.plan)) {
    res.status(403).json({ error: "Forbidden", message: "MONITOR or MONITOR_PRO plan required" });
    return;
  }

  // Demo mode: generate 1-3 random scan results
  const count = Math.floor(Math.random() * 3) + 1;
  const results = [];

  for (let i = 0; i < count; i++) {
    const domain = DEMO_DOMAINS[Math.floor(Math.random() * DEMO_DOMAINS.length)];
    const matchScore = 0.6 + Math.random() * 0.35;
    const slugs = ["profile", "gallery", "artwork", "posts", "photo"];
    const slug = slugs[Math.floor(Math.random() * slugs.length)];
    const sourceUrl = `https://www.${domain}/${slug}/${Math.random().toString(36).slice(2, 8)}`;

    const [result] = await db.insert(scanResultsTable).values({
      id: cuid(),
      userId: user.id,
      sourceUrl,
      sourceDomain: domain,
      pageTitle: `Found on ${domain}`,
      matchScore,
      status: "NEW",
    }).returning();

    results.push(result);
  }

  res.json({ success: true, newResults: results.length, results });
});

router.get("/monitor/results", requireSession, async (req, res) => {
  const user = (req as any).user;
  const results = await db.select().from(scanResultsTable).where(eq(scanResultsTable.userId, user.id));
  res.json(results);
});

router.patch("/monitor/results/:id", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = z.object({
    status: z.enum(["NEW", "SEEN", "TAKEDOWN_SENT", "RESOLVED", "IGNORED"]),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Valid status required" });
    return;
  }

  const [existing] = await db.select().from(scanResultsTable)
    .where(and(eq(scanResultsTable.id, req.params.id), eq(scanResultsTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "NotFound", message: "Scan result not found" });
    return;
  }

  const [updated] = await db.update(scanResultsTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(scanResultsTable.id, req.params.id))
    .returning();

  res.json(updated);
});

export default router;
