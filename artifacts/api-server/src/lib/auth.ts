import { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, apiKeysTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { cuid } from "./id";

function usernameFromEmail(email: string): string {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
}

/**
 * Resolve (and lazily create) the local user row for the current Clerk session.
 * Returns null if the request has no valid session.
 */
async function resolveOrCreateUser(req: Request): Promise<typeof usersTable.$inferSelect | null> {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) return null;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (existing) return existing;

  // First request from this Clerk user — provision a local row.
  const clerkUser = await clerkClient.users.getUser(clerkId);
  const primary = clerkUser.primaryEmailAddress;
  const isPrimaryVerified = primary?.verification?.status === "verified";
  const rawEmail =
    primary?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkId}@no-email.local`;
  const email = rawEmail.toLowerCase();
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const image = clerkUser.imageUrl || null;

  // Reuse a row that already exists for this email (prior account from old auth) and link it,
  // but ONLY when Clerk has verified the primary email — otherwise an attacker could hijack a
  // pre-existing account by signing up with an unverified copy of its email.
  if (isPrimaryVerified) {
    const [byEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (byEmail) {
      // Refuse to overwrite an already-linked row (one Clerk identity per local user).
      if (byEmail.clerkId && byEmail.clerkId !== clerkId) {
        throw new Error("Account email is already linked to a different Clerk identity");
      }
      const [linked] = await db
        .update(usersTable)
        .set({
          clerkId,
          image: byEmail.image ?? image,
          name: byEmail.name ?? name,
          emailVerified: byEmail.emailVerified ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, byEmail.id))
        .returning();
      return linked;
    }
  }

  const baseUsername = usernameFromEmail(email);
  let username = baseUsername;
  let suffix = 0;
  while (true) {
    const [taken] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!taken) break;
    suffix += 1;
    username = `${baseUsername}_${suffix}`;
  }

  const id = cuid();
  const [created] = await db
    .insert(usersTable)
    .values({
      id,
      clerkId,
      email,
      name,
      username,
      image,
      emailVerified: isPrimaryVerified ? new Date() : null,
    })
    .returning();
  return created;
}

export async function requireSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveOrCreateUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "No active session" });
      return;
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ error: "Unauthorized", message: err?.message ?? "Auth failed" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveOrCreateUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "No active session" });
      return;
    }
    if (!user.isAdmin) {
      res.status(403).json({ error: "Forbidden", message: "Admin access required" });
      return;
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ error: "Unauthorized", message: err?.message ?? "Auth failed" });
  }
}

export async function authenticateApiKey(req: Request): Promise<{ userId: string; keyId: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer mlm_")) return null;

  const key = authHeader.slice(7);

  const [apiKey] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.key, key)).limit(1);
  if (!apiKey || !apiKey.active) return null;

  await db
    .update(apiKeysTable)
    .set({ lastUsed: new Date(), usageCount: apiKey.usageCount + 1 })
    .where(eq(apiKeysTable.id, apiKey.id));

  return { userId: apiKey.userId, keyId: apiKey.id };
}

export function getRequesterIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return (req.headers["x-real-ip"] as string) || "127.0.0.1";
}
