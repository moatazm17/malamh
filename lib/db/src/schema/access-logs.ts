import { pgTable, text, real, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const accessLogsTable = pgTable(
  "access_logs",
  {
    id: text("id").primaryKey(),
    faceId: text("face_id"),
    userId: text("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    requesterName: text("requester_name").notNull(),
    requesterIp: text("requester_ip").notNull(),
    action: text("action").notNull(),
    matchScore: real("match_score").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("access_logs_user_id_idx").on(t.userId),
    index("access_logs_face_id_idx").on(t.faceId),
    index("access_logs_created_at_idx").on(t.createdAt),
  ],
);

export const insertAccessLogSchema = createInsertSchema(accessLogsTable).omit({
  createdAt: true,
});
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessLog = typeof accessLogsTable.$inferSelect;
