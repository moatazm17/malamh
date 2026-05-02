import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const facesTable = pgTable(
  "faces",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    embedding: text("embedding").notNull(),
    awsFaceId: text("aws_face_id"),
    consentLevel: text("consent_level").notNull().default("BLOCKED"),
    label: text("label"),
    verified: boolean("verified").notNull().default(false),
    referenceImage: text("reference_image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("faces_user_id_idx").on(t.userId)],
);

export const insertFaceSchema = createInsertSchema(facesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertFace = z.infer<typeof insertFaceSchema>;
export type Face = typeof facesTable.$inferSelect;
