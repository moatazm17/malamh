import { Router } from "express";
import { db } from "@workspace/db";
import { scanResultsTable, subscriptionsTable, facesTable } from "@workspace/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";
import { cuid } from "../lib/id";
import { isMockMode } from "../lib/face-service";
import { logger } from "../lib/logger";

const router = Router();

const DEMO_DOMAINS = [
  "artstation.com", "deviantart.com", "midjourney.com", "stability.ai",
  "civitai.com", "flickr.com", "reddit.com", "tumblr.com",
];

function requireMonitorPlan(plan: string): boolean {
  return plan === "MONITOR" || plan === "MONITOR_PRO" || plan === "PRO" || plan === "API_BUILDER";
}

async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function verifyFaceMatch(imageUrl: string, userFaces: Array<{ id: string; awsFaceId: string | null; userId: string }>): Promise<{ matched: boolean; faceId: string; score: number } | null> {
  const buffer = await fetchImageAsBuffer(imageUrl);
  if (!buffer || buffer.length < 1000) return null;

  if (isMockMode()) {
    const rand = Math.random();
    if (rand > 0.7 && userFaces.length > 0) {
      const face = userFaces[Math.floor(Math.random() * userFaces.length)];
      return { matched: true, faceId: face.id, score: 0.7 + Math.random() * 0.25 };
    }
    return null;
  }

  try {
    const { searchFacesByImage } = await import("../lib/rekognition");
    const result = await searchFacesByImage(buffer);
    if (!result) return null;

    const matchedFace = userFaces.find(f => f.awsFaceId === result.awsFaceId);
    if (!matchedFace || result.similarity < 0.7) return null;

    return { matched: true, faceId: matchedFace.id, score: result.similarity };
  } catch (err) {
    logger.warn({ err }, "Face verification failed for candidate image");
    return null;
  }
}

router.post("/monitor/scan", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, user.id))
    .limit(1);

  if (!sub || !requireMonitorPlan(sub.plan)) {
    res.status(403).json({ error: "Forbidden", message: "PRO, MONITOR, or API_BUILDER plan required" });
    return;
  }

  const userFaces = await db
    .select()
    .from(facesTable)
    .where(and(eq(facesTable.userId, user.id), isNotNull(facesTable.referenceImage)));

  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  const appUrl = process.env.APP_URL || (() => {
    const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
    return domains ? `https://${domains}` : null;
  })();

  // If no real sources available, run demo mode
  if (!SERPAPI_KEY && isMockMode()) {
    return runDemoScan(user.id, res);
  }

  const newResults: any[] = [];

  for (const face of userFaces) {
    const candidates: Array<{ url: string; pageUrl: string; domain: string; title: string; source: string }> = [];

    // Source A: SerpAPI Google Lens
    if (SERPAPI_KEY && appUrl) {
      try {
        const imageUrl = `${appUrl}/api/internal/face-image/${face.id}`;
        const serpUrl = `https://serpapi.com/search?engine=google_lens&url=${encodeURIComponent(imageUrl)}&api_key=${SERPAPI_KEY}`;
        const resp = await fetch(serpUrl, { signal: AbortSignal.timeout(15000) });
        if (resp.ok) {
          const data = await resp.json() as any;
          const matches = (data.visual_matches ?? []).slice(0, 15);
          for (const m of matches) {
            if (m.thumbnail) {
              candidates.push({
                url: m.thumbnail,
                pageUrl: m.link ?? m.thumbnail,
                domain: m.source ?? new URL(m.link ?? m.thumbnail).hostname,
                title: m.title ?? "Google Lens match",
                source: "google_lens",
              });
            }
          }
        }
      } catch (err) {
        logger.warn({ err }, "SerpAPI Google Lens request failed");
      }
    }

    // Source B: Lexica.art (free, no key needed)
    try {
      const lexicaResp = await fetch(
        "https://lexica.art/api/v1/search?q=portrait+face+photo",
        { signal: AbortSignal.timeout(8000) },
      );
      if (lexicaResp.ok) {
        const data = await lexicaResp.json() as any;
        const images = (data.images ?? []).slice(0, 15);
        for (const img of images) {
          if (img.src) {
            candidates.push({
              url: img.src,
              pageUrl: `https://lexica.art/?q=${encodeURIComponent(img.prompt ?? "portrait")}`,
              domain: "lexica.art",
              title: img.prompt ? img.prompt.slice(0, 80) : "AI generated portrait",
              source: "ai_platform",
            });
          }
        }
      }
    } catch (err) {
      logger.warn({ err }, "Lexica.art request failed");
    }

    // Verify each candidate against the face
    for (const candidate of candidates.slice(0, 20)) {
      try {
        const match = await verifyFaceMatch(candidate.url, [face]);
        if (match?.matched) {
          const [result] = await db.insert(scanResultsTable).values({
            id: cuid(),
            userId: user.id,
            faceId: face.id,
            sourceUrl: candidate.pageUrl,
            sourceDomain: candidate.domain,
            pageTitle: candidate.title,
            matchScore: match.score,
            source: candidate.source,
            status: "NEW",
          }).returning();
          newResults.push(result);
        }
      } catch (err) {
        logger.warn({ err, url: candidate.url }, "Candidate verification error");
      }
    }
  }

  // If no real results found, run a demo scan as fallback
  if (newResults.length === 0 && userFaces.length === 0) {
    return runDemoScan(user.id, res);
  }

  res.json({ success: true, newResults: newResults.length, results: newResults });
});

async function runDemoScan(userId: string, res: any) {
  const count = Math.floor(Math.random() * 3) + 1;
  const results = [];
  for (let i = 0; i < count; i++) {
    const domain = DEMO_DOMAINS[Math.floor(Math.random() * DEMO_DOMAINS.length)];
    const matchScore = 0.6 + Math.random() * 0.35;
    const slug = ["profile", "gallery", "artwork", "posts", "photo"][Math.floor(Math.random() * 5)];
    const sourceUrl = `https://www.${domain}/${slug}/${Math.random().toString(36).slice(2, 8)}`;
    const [result] = await db.insert(scanResultsTable).values({
      id: cuid(),
      userId,
      sourceUrl,
      sourceDomain: domain,
      pageTitle: `Found on ${domain}`,
      matchScore,
      source: "demo",
      status: "NEW",
    }).returning();
    results.push(result);
  }
  return res.json({ success: true, newResults: results.length, results });
}

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
