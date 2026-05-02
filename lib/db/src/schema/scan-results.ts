import { pgTable, text, real, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { facesTable } from "./faces";

export const scanResultsTable = pgTable(
  "scan_results",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    faceId: text("face_id").references(() => facesTable.id, { onDelete: "set null" }),
    sourceUrl: text("source_url").notNull(),
    sourceDomain: text("source_domain").notNull(),
    pageTitle: text("page_title"),
    matchScore: real("match_score").notNull(),
    screenshotUrl: text("screenshot_url"),
    source: text("source").notNull().default("demo"),
    status: text("status").notNull().default("NEW"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("scan_results_user_id_idx").on(t.userId)],
);

export const insertScanResultSchema = createInsertSchema(scanResultsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertScanResult = z.infer<typeof insertScanResultSchema>;
export type ScanResult = typeof scanResultsTable.$inferSelect;
