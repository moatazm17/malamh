import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const WEBHOOK_EVENTS = [
  "face.blocked",
  "face.allowed",
  "consent.token_issued",
  "consent.approved",
  "consent.denied",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhooksTable = pgTable(
  "webhooks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: text("events").array().notNull().default([]),
    active: boolean("active").notNull().default(true),
    description: text("description"),
    lastDeliveredAt: timestamp("last_delivered_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("webhooks_user_id_idx").on(t.userId)],
);

export const insertWebhookSchema = createInsertSchema(webhooksTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooksTable.$inferSelect;
