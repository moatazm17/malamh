import { db } from "@workspace/db";
import { subscriptionsTable, facesTable, accessLogsTable } from "@workspace/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

/**
 * Two-tree plan model:
 *
 *  OWNER plans — for individuals protecting their own faces.
 *  Face owners are NEVER quota-limited on being checked. Their faces are
 *  always protected, on the 1st check and the millionth.
 *
 *  API plans — for AI companies querying the registry.
 *  API callers are billed by check volume against their own user account.
 */

export const OWNER_PLAN_LIMITS: Record<
  string,
  { faces: number; allowToken: boolean; allowMonitor: boolean }
> = {
  FREE: { faces: 1, allowToken: false, allowMonitor: false },
  PRO: { faces: 5, allowToken: true, allowMonitor: true },
  FAMILY: { faces: 25, allowToken: true, allowMonitor: true },
};

export const API_PLAN_LIMITS: Record<
  string,
  { checksPerMonth: number; webhooks: boolean }
> = {
  DEVELOPER: { checksPerMonth: 1_000, webhooks: false },
  API_BUILDER: { checksPerMonth: 100_000, webhooks: true },
  ENTERPRISE: { checksPerMonth: Number.POSITIVE_INFINITY, webhooks: true },
};

async function getPlanByKind(userId: string, kind: "OWNER" | "API"): Promise<string> {
  const [sub] = await db
    .select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.kind, kind)))
    .limit(1);
  if (sub?.plan) return sub.plan;
  return kind === "OWNER" ? "FREE" : "DEVELOPER";
}

export const getOwnerPlan = (userId: string) => getPlanByKind(userId, "OWNER");
export const getApiPlan = (userId: string) => getPlanByKind(userId, "API");

export function ownerPlanAllowsToken(plan: string): boolean {
  return OWNER_PLAN_LIMITS[plan]?.allowToken ?? false;
}

export function ownerPlanAllowsMonitor(plan: string): boolean {
  return OWNER_PLAN_LIMITS[plan]?.allowMonitor ?? false;
}

export async function checkFaceLimit(
  userId: string,
): Promise<{ allowed: boolean; plan: string; limit: number; current: number }> {
  const plan = await getOwnerPlan(userId);
  const limits = OWNER_PLAN_LIMITS[plan] ?? OWNER_PLAN_LIMITS.FREE;
  const [{ count: current }] = await db
    .select({ count: count() })
    .from(facesTable)
    .where(eq(facesTable.userId, userId));
  return { allowed: current < limits.faces, plan, limit: limits.faces, current };
}

/**
 * Quota for AI companies calling the public API.
 * Counts log rows tagged with `api_caller_user_id = X` in the current month.
 */
export async function checkApiQuota(
  apiCallerUserId: string,
): Promise<{ allowed: boolean; plan: string; limit: number; current: number }> {
  const plan = await getApiPlan(apiCallerUserId);
  const limits = API_PLAN_LIMITS[plan] ?? API_PLAN_LIMITS.DEVELOPER;
  if (!Number.isFinite(limits.checksPerMonth)) {
    return { allowed: true, plan, limit: limits.checksPerMonth, current: 0 };
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [{ count: current }] = await db
    .select({ count: count() })
    .from(accessLogsTable)
    .where(
      and(
        eq(accessLogsTable.apiCallerUserId, apiCallerUserId),
        gte(accessLogsTable.createdAt, startOfMonth),
      ),
    );

  return { allowed: current < limits.checksPerMonth, plan, limit: limits.checksPerMonth, current };
}
