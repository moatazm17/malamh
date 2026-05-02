import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2024-11-20.acacia" });
}

const PRICE_IDS: Record<string, string | undefined> = {
  PRO: process.env.STRIPE_PRICE_PRO,
  API_BUILDER: process.env.STRIPE_PRICE_API_BUILDER,
};

const PLAN_NAMES: Record<string, string> = {
  PRO: "Pro",
  API_BUILDER: "API Builder",
};

router.get("/billing/subscription", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, user.id))
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
    .object({ plan: z.enum(["PRO", "API_BUILDER"]) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Valid plan required" });
    return;
  }

  const { plan } = parsed.data;
  const stripe = getStripe();

  if (!stripe) {
    await db
      .update(subscriptionsTable)
      .set({ plan, status: "active" })
      .where(eq(subscriptionsTable.userId, user.id));

    res.json({
      success: true,
      checkoutUrl: null,
      plan,
      message: `Upgraded to ${PLAN_NAMES[plan]} (demo mode)`,
    });
    return;
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    res.status(500).json({ error: "ConfigError", message: `STRIPE_PRICE_${plan} not configured` });
    return;
  }

  try {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, user.id))
      .limit(1);

    let customerId: string | undefined = sub?.stripeCustomerId ?? undefined;

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
      metadata: { userId: user.id, plan },
    });

    await db
      .update(subscriptionsTable)
      .set({ stripeCustomerId: customerId })
      .where(eq(subscriptionsTable.userId, user.id));

    res.json({ success: true, checkoutUrl: session.url });
  } catch (err: any) {
    logger.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: "StripeError", message: err.message });
  }
});

router.post("/billing/portal", requireSession, async (req, res) => {
  const user = (req as any).user;
  const stripe = getStripe();

  if (!stripe) {
    await db
      .update(subscriptionsTable)
      .set({ plan: "FREE", status: "active" })
      .where(eq(subscriptionsTable.userId, user.id));
    res.json({ success: true, portalUrl: null, message: "Downgraded to FREE (demo mode)" });
    return;
  }

  try {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, user.id))
      .limit(1);

    if (!sub?.stripeCustomerId) {
      res.status(400).json({ error: "BadRequest", message: "No Stripe customer found" });
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

router.post("/billing/webhook", async (req, res) => {
  const stripe = getStripe();
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

      if (userId && plan) {
        await db
          .update(subscriptionsTable)
          .set({
            plan,
            status: "active",
            stripeCustomerId: session.customer,
            stripeSubId: session.subscription,
          })
          .where(eq(subscriptionsTable.userId, userId));
        logger.info({ userId, plan }, "Subscription activated via checkout");
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
        await db
          .update(subscriptionsTable)
          .set({ plan: "FREE", status: "active", stripeSubId: null })
          .where(eq(subscriptionsTable.userId, dbSub.userId));
        logger.info({ userId: dbSub.userId }, "Subscription cancelled, downgraded to FREE");
      }
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Error handling Stripe webhook");
  }

  res.json({ received: true });
});

export default router;
