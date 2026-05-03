import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";
import { cuid } from "../lib/id";
import { logger } from "../lib/logger";
import { getUncachableStripeClient } from "../lib/stripe-client";

const router = Router();

// Plan → kind mapping. Each plan name lives in exactly one tree.
const PLAN_KIND: Record<string, "OWNER" | "API"> = {
  PRO: "OWNER",
  FAMILY: "OWNER",
  API_BUILDER: "API",
};

const PRICE_IDS: Record<string, string | undefined> = {
  PRO: process.env.STRIPE_PRICE_PRO,
  FAMILY: process.env.STRIPE_PRICE_FAMILY,
  API_BUILDER: process.env.STRIPE_PRICE_API_BUILDER,
};

const PLAN_NAMES: Record<string, string> = {
  PRO: "Pro",
  FAMILY: "Family",
  API_BUILDER: "API Builder",
};

router.get("/billing/subscription", requireSession, async (req, res) => {
  const user = (req as any).user;
  // Default to the OWNER subscription for back-compat.
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.kind, "OWNER")))
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "NotFound", message: "No subscription found" });
    return;
  }
  res.json(sub);
});

router.post("/billing/checkout", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = z
    .object({ plan: z.enum(["PRO", "FAMILY", "API_BUILDER"]) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Valid plan required" });
    return;
  }

  const { plan } = parsed.data;
  const kind = PLAN_KIND[plan];
  const stripe = await getUncachableStripeClient();

  if (!stripe) {
    // Demo mode — no Stripe configured
    await db
      .update(subscriptionsTable)
      .set({ plan, status: "active" })
      .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.kind, kind)));

    res.json({
      success: true,
      checkoutUrl: null,
      plan,
      message: `Upgraded to ${PLAN_NAMES[plan]} (demo mode — no payment required)`,
    });
    return;
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    // No price ID configured yet — still demo-upgrade but warn
    logger.warn({ plan }, "Stripe price ID not configured, using demo upgrade");
    await db
      .update(subscriptionsTable)
      .set({ plan, status: "active" })
      .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.kind, kind)));
    res.json({
      success: true,
      checkoutUrl: null,
      plan,
      message: `Upgraded to ${PLAN_NAMES[plan]} (Stripe price not yet configured — set STRIPE_PRICE_${plan})`,
    });
    return;
  }

  try {
    const subs = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, user.id));

    let sub = subs.find((s) => s.kind === kind);

    // Defensive upsert: if /auth/me hasn't lazy-provisioned this kind yet
    // (e.g. user goes straight to checkout), create it now so subsequent
    // updates have a row to land on.
    if (!sub) {
      const fallbackPlan = kind === "API" ? "DEVELOPER" : "FREE";
      [sub] = await db
        .insert(subscriptionsTable)
        .values({ id: cuid(), userId: user.id, kind, plan: fallbackPlan, status: "active" })
        .returning();
    }

    // Reuse the same Stripe customer across both kinds so a single portal
    // session can manage all of the user's subscriptions.
    let customerId: string | undefined =
      sub.stripeCustomerId ?? subs.find((s) => s.stripeCustomerId)?.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
    }

    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard/settings?upgraded=1`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId: user.id, plan, kind },
    });

    await db
      .update(subscriptionsTable)
      .set({ stripeCustomerId: customerId })
      .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.kind, kind)));

    res.json({ success: true, checkoutUrl: session.url });
  } catch (err: any) {
    logger.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: "StripeError", message: err.message });
  }
});

router.post("/billing/portal", requireSession, async (req, res) => {
  const user = (req as any).user;
  const stripe = await getUncachableStripeClient();

  if (!stripe) {
    await db
      .update(subscriptionsTable)
      .set({ plan: "FREE", status: "active" })
      .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.kind, "OWNER")));
    await db
      .update(subscriptionsTable)
      .set({ plan: "DEVELOPER", status: "active" })
      .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.kind, "API")));
    res.json({ success: true, portalUrl: null, message: "Downgraded to FREE (demo mode)" });
    return;
  }

  try {
    // Use whichever subscription has a Stripe customer attached.
    const subs = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, user.id));
    const sub = subs.find((s) => s.stripeCustomerId);

    if (!sub?.stripeCustomerId) {
      res.status(400).json({ error: "BadRequest", message: "No Stripe customer found — subscribe first" });
      return;
    }

    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/dashboard/settings`,
    });

    res.json({ success: true, portalUrl: portalSession.url });
  } catch (err: any) {
    logger.error({ err }, "Stripe portal error");
    res.status(500).json({ error: "StripeError", message: err.message });
  }
});

/**
 * POST /billing/webhook
 * Receives Stripe events and updates subscription status.
 * Set STRIPE_WEBHOOK_SECRET to verify signatures.
 */
router.post("/billing/webhook", async (req, res) => {
  const stripe = await getUncachableStripeClient();
  if (!stripe) {
    res.json({ received: true });
    return;
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: any;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err: any) {
    logger.warn({ err }, "Stripe webhook signature verification failed");
    res.status(400).json({ error: "Bad signature" });
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      const kind = (session.metadata?.kind as "OWNER" | "API" | undefined) ?? PLAN_KIND[plan];
      if (userId && plan && kind) {
        await db
          .update(subscriptionsTable)
          .set({ plan, status: "active", stripeCustomerId: session.customer, stripeSubId: session.subscription })
          .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.kind, kind)));
        logger.info({ userId, plan, kind }, "Subscription activated via Stripe checkout");
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const [dbSub] = await db
        .select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.stripeSubId, sub.id))
        .limit(1);
      if (dbSub) {
        const downgrade = dbSub.kind === "API" ? "DEVELOPER" : "FREE";
        await db
          .update(subscriptionsTable)
          .set({ plan: downgrade, status: "active", stripeSubId: null })
          .where(eq(subscriptionsTable.id, dbSub.id));
        logger.info({ userId: dbSub.userId, kind: dbSub.kind }, "Subscription cancelled via Stripe, downgraded");
      }
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Error handling Stripe webhook event");
  }

  res.json({ received: true });
});

export default router;
