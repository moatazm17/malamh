import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { facesTable } from "./faces";

export const consentTokensTable = pgTable(
  "consent_tokens",
  {
    id: text("id").primaryKey(),
    faceId: text("face_id")
      .notNull()
      .references(() => facesTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    requesterName: text("requester_name").notNull(),
    purpose: text("purpose"),
    token: text("token").notNull().unique(),
    approved: boolean("approved").notNull().default(false),
    used: boolean("used").notNull().default(false),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("consent_tokens_face_id_idx").on(t.faceId),
    index("consent_tokens_user_id_idx").on(t.userId),
  ],
);

export const insertConsentTokenSchema = createInsertSchema(consentTokensTable).omit({
  createdAt: true,
});
export type InsertConsentToken = z.infer<typeof insertConsentTokenSchema>;
export type ConsentToken = typeof consentTokensTable.$inferSelect;
