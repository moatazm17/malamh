import { db } from "@workspace/db";
import { subscriptionsTable, facesTable, accessLogsTable } from "@workspace/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

export const PLAN_LIMITS: Record<string, { faces: number; checksPerMonth: number }> = {
  FREE: { faces: 3, checksPerMonth: 100 },
  MONITOR: { faces: 5, checksPerMonth: 1000 },
  MONITOR_PRO: { faces: 10, checksPerMonth: 5000 },
  PRO: { faces: 10, checksPerMonth: 10_000 },
  API_BUILDER: { faces: Infinity, checksPerMonth: Infinity },
};

export async function getUserPlan(userId: string): Promise<string> {
  const [sub] = await db
    .select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);
  return sub?.plan ?? "FREE";
}

export async function getUserFaceCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(facesTable)
    .where(eq(facesTable.userId, userId));
  return Number(row?.count ?? 0);
}

export async function getUserMonthlyCheckCount(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({ count: count() })
    .from(accessLogsTable)
    .where(
      and(
        eq(accessLogsTable.userId, userId),
        gte(accessLogsTable.createdAt, startOfMonth),
      ),
    );
  return Number(row?.count ?? 0);
}

export async function checkFaceLimit(userId: string): Promise<{ allowed: boolean; plan: string; limit: number; current: number }> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
  const current = await getUserFaceCount(userId);
  return { allowed: current < limits.faces, plan, limit: limits.faces, current };
}

export async function checkMonthlyQuota(userId: string): Promise<{ allowed: boolean; plan: string; limit: number; current: number }> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
  const current = await getUserMonthlyCheckCount(userId);
  return { allowed: current < limits.checksPerMonth, plan, limit: limits.checksPerMonth, current };
}
