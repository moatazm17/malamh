/**
 * Webhook delivery service.
 * Signs payloads with HMAC-SHA256 and POSTs to user-configured URLs.
 * Fires asynchronously (does not block the request that triggered it).
 */

import { createHmac } from "node:crypto";
import { db } from "@workspace/db";
import { webhooksTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import type { WebhookEvent } from "@workspace/db/schema";

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

function sign(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

async function deliver(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = sign(secret, body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Malamh-Signature": signature,
        "X-Malamh-Event": payload.event,
        "User-Agent": "Malamh-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.warn(
        { webhookId, url, status: res.status, event: payload.event },
        "Webhook delivery received non-2xx response",
      );
    } else {
      // Update lastDeliveredAt
      await db
        .update(webhooksTable)
        .set({ lastDeliveredAt: new Date() })
        .where(eq(webhooksTable.id, webhookId));
    }
  } catch (err: any) {
    logger.warn(
      { webhookId, url, event: payload.event, err: err?.message },
      "Webhook delivery failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fire a webhook event to all active webhooks subscribed to it for a given user.
 * Non-blocking — errors are logged but do not propagate.
 */
export function fireWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): void {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Run async in background — do not await
  void (async () => {
    try {
      const hooks = await db
        .select()
        .from(webhooksTable)
        .where(
          and(
            eq(webhooksTable.userId, userId),
            eq(webhooksTable.active, true),
          ),
        );

      const subscribers = hooks.filter(
        (h) => (h.events as string[]).includes(event) || (h.events as string[]).includes("*"),
      );

      await Promise.allSettled(
        subscribers.map((h) => deliver(h.id, h.url, h.secret, payload)),
      );
    } catch (err) {
      logger.error({ err, userId, event }, "Failed to query webhooks for delivery");
    }
  })();
}

/**
 * Test-fire a webhook synchronously (used by the test endpoint).
 * Returns success/failure details.
 */
export async function testWebhook(
  webhookId: string,
  url: string,
  secret: string,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const payload: WebhookPayload = {
    event: "face.allowed",
    timestamp: new Date().toISOString(),
    data: {
      faceId: "test_face_id",
      requesterName: "Malamh Test",
      matchScore: 0.99,
      note: "This is a test webhook delivery from Malamh.",
    },
  };

  const body = JSON.stringify(payload);
  const signature = sign(secret, body);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Malamh-Signature": signature,
        "X-Malamh-Event": payload.event,
        "User-Agent": "Malamh-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    });

    if (res.ok) {
      await db
        .update(webhooksTable)
        .set({ lastDeliveredAt: new Date() })
        .where(eq(webhooksTable.id, webhookId));
    }

    return { success: res.ok, statusCode: res.status };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Request failed" };
  } finally {
    clearTimeout(timeout);
  }
}
