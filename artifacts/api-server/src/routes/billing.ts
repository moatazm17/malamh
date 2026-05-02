import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";

const router = Router();

router.get("/billing/subscription", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, user.id))
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "NotFound", message: "No subscription found" });
    return;
  }
  res.json(sub);
});

router.post("/billing/subscribe", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = z.object({ plan: z.enum(["MONITOR", "MONITOR_PRO"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Valid plan required" });
    return;
  }

  // Demo mode — no Stripe key
  if (!process.env.STRIPE_SECRET_KEY) {
    await db.update(subscriptionsTable)
      .set({ plan: parsed.data.plan, status: "active" })
      .where(eq(subscriptionsTable.userId, user.id));

    res.json({
      success: true,
      checkoutUrl: null,
      plan: parsed.data.plan,
      message: `Upgraded to ${parsed.data.plan} (demo mode — no payment required)`,
    });
    return;
  }

  // TODO: real Stripe checkout
  res.json({ success: false, message: "Stripe integration pending API key setup" });
});

router.post("/billing/portal", requireSession, async (req, res) => {
  const user = (req as any).user;

  if (!process.env.STRIPE_SECRET_KEY) {
    // Demo: downgrade to FREE
    await db.update(subscriptionsTable)
      .set({ plan: "FREE", status: "active" })
      .where(eq(subscriptionsTable.userId, user.id));

    res.json({ success: true, portalUrl: null, message: "Downgraded to FREE (demo mode)" });
    return;
  }

  res.json({ success: false, message: "Stripe portal pending API key setup" });
});

export default router;
