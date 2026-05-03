import { Router } from "express";
import { db } from "@workspace/db";
import { webhooksTable, WEBHOOK_EVENTS } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { requireSession } from "../lib/auth";
import { cuid } from "../lib/id";
import { testWebhook } from "../lib/webhook-service";

const router = Router();

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  description: z.string().optional(),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
  description: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

function sanitize(hook: any) {
  // Never expose the signing secret in list responses
  const { secret, ...rest } = hook;
  return rest;
}

router.get("/webhooks", requireSession, async (req, res) => {
  const user = (req as any).user;
  const hooks = await db
    .select()
    .from(webhooksTable)
    .where(eq(webhooksTable.userId, user.id));
  res.json(hooks.map(sanitize));
});

router.post("/webhooks", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = createWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }

  const secret = randomBytes(32).toString("hex");
  const [hook] = await db
    .insert(webhooksTable)
    .values({
      id: cuid(),
      userId: user.id,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
      description: parsed.data.description ?? null,
      active: true,
    })
    .returning();

  // Return the secret once on creation — user must save it
  res.status(201).json({ ...hook });
});

router.patch("/webhooks/:id", requireSession, async (req, res) => {
  const user = (req as any).user;
  const parsed = updateWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, req.params.id), eq(webhooksTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "NotFound", message: "Webhook not found" });
    return;
  }

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (parsed.data.url !== undefined) updates.url = parsed.data.url;
  if (parsed.data.events !== undefined) updates.events = parsed.data.events;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;

  const [updated] = await db
    .update(webhooksTable)
    .set(updates)
    .where(eq(webhooksTable.id, req.params.id))
    .returning();

  res.json(sanitize(updated));
});

router.delete("/webhooks/:id", requireSession, async (req, res) => {
  const user = (req as any).user;
  const id = String(req.params.id);
  const [existing] = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "NotFound", message: "Webhook not found" });
    return;
  }

  await db.delete(webhooksTable).where(eq(webhooksTable.id, id));
  res.json({ success: true });
});

router.post("/webhooks/:id/test", requireSession, async (req, res) => {
  const user = (req as any).user;
  const id = String(req.params.id);
  const [existing] = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "NotFound", message: "Webhook not found" });
    return;
  }

  const result = await testWebhook(existing.id, existing.url, existing.secret);
  res.json(result);
});

router.post("/webhooks/:id/rotate-secret", requireSession, async (req, res) => {
  const user = (req as any).user;
  const id = String(req.params.id);
  const [existing] = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "NotFound", message: "Webhook not found" });
    return;
  }

  const newSecret = randomBytes(32).toString("hex");
  const [updated] = await db
    .update(webhooksTable)
    .set({ secret: newSecret, updatedAt: new Date() })
    .where(eq(webhooksTable.id, id))
    .returning();

  // Return new secret once — user must save it
  res.json({ ...updated });
});

export default router;
