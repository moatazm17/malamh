import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "../lib/auth";
import { cuid } from "../lib/id";

const router = Router();

/**
 * Returns the current authenticated user (provisioned by Clerk on first request).
 * Lazily provisions both an OWNER subscription (FREE) and an API subscription
 * (DEVELOPER) if missing, and migrates legacy single-row subscriptions into the
 * two-tree model.
 */
router.get("/auth/me", requireSession, async (req, res) => {
  const user = (req as any).user;
  const subs = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, user.id));

  // Migration is plan-driven (NOT kind-driven) because the new `kind` column
  // defaults to OWNER, so legacy rows storing API plans were silently mis-stamped
  // as kind=OWNER by the schema default. We re-derive the correct kind from the
  // plan name itself, which is the source of truth.
  const API_PLANS = new Set(["DEVELOPER", "API_BUILDER", "ENTERPRISE"]);
  for (const s of subs) {
    const wantedKind = API_PLANS.has(s.plan) ? "API" : "OWNER";
    const wantedPlan =
      s.plan === "MONITOR" || s.plan === "MONITOR_PRO" ? "PRO" : s.plan;
    if (s.kind !== wantedKind || s.plan !== wantedPlan) {
      await db
        .update(subscriptionsTable)
        .set({ kind: wantedKind, plan: wantedPlan })
        .where(eq(subscriptionsTable.id, s.id));
      s.kind = wantedKind;
      s.plan = wantedPlan;
    }
  }

  let ownerSub = subs.find((s) => s.kind === "OWNER");
  let apiSub = subs.find((s) => s.kind === "API");

  if (!ownerSub) {
    [ownerSub] = await db
      .insert(subscriptionsTable)
      .values({ id: cuid(), userId: user.id, kind: "OWNER", plan: "FREE", status: "active" })
      .returning();
  }
  if (!apiSub) {
    [apiSub] = await db
      .insert(subscriptionsTable)
      .values({ id: cuid(), userId: user.id, kind: "API", plan: "DEVELOPER", status: "active" })
      .returning();
  }

  const { hashedPassword, ...safe } = user;
  // `subscription` kept for back-compat (= owner subscription).
  res.json({ ...safe, subscription: ownerSub, ownerSubscription: ownerSub, apiSubscription: apiSub });
});

export default router;
