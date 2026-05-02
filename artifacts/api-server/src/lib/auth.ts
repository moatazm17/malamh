import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, apiKeysTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "malamh-dev-secret-change-in-production";

export interface AuthPayload {
  userId: string;
  email: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  // Check cookie first, then Authorization header
  const cookieToken = req.cookies?.["malamh_session"];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // API keys start with mlm_ — skip them here
    if (!token.startsWith("mlm_")) return token;
  }
  return null;
}

export async function requireSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "No session token provided" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired session" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "User not found" });
    return;
  }

  (req as any).user = user;
  next();
}

export async function authenticateApiKey(req: Request): Promise<{ userId: string; keyId: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer mlm_")) return null;

  const key = authHeader.slice(7);

  const [apiKey] = await db
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.key, key))
    .limit(1);

  if (!apiKey || !apiKey.active) return null;

  // Update usage
  await db
    .update(apiKeysTable)
    .set({ lastUsed: new Date(), usageCount: apiKey.usageCount + 1 })
    .where(eq(apiKeysTable.id, apiKey.id));

  return { userId: apiKey.userId, keyId: apiKey.id };
}

export function getRequesterIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.headers["x-real-ip"] as string || "127.0.0.1";
}
