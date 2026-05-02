import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, subscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cuid } from "../lib/id";
import { signToken, requireSession } from "../lib/auth";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function usernameFromEmail(email: string): string {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
}

router.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const { email, password, name } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const id = cuid();
  const baseUsername = usernameFromEmail(email);

  // Ensure unique username
  let username = baseUsername;
  const existing2 = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing2.length > 0) username = `${baseUsername}_${Date.now().toString(36)}`;

  const [user] = await db
    .insert(usersTable)
    .values({ id, email, name: name || null, username, hashedPassword })
    .returning();

  // Create FREE subscription
  await db.insert(subscriptionsTable).values({
    id: cuid(),
    userId: id,
    plan: "FREE",
    status: "active",
  });

  const token = signToken({ userId: user.id, email: user.email });

  res.cookie("malamh_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({ user: sanitizeUser(user), token });
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !user.hashedPassword) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.cookie("malamh_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ user: sanitizeUser(user), token });
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie("malamh_session");
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireSession, async (req, res) => {
  const user = (req as any).user;
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, user.id)).limit(1);
  res.json({ ...sanitizeUser(user), subscription: sub || null });
});

function sanitizeUser(user: any) {
  const { hashedPassword, ...safe } = user;
  return safe;
}

export default router;
