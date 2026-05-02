import { pgTable, text, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const apiKeysTable = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    usageCount: integer("usage_count").notNull().default(0),
    lastUsed: timestamp("last_used"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("api_keys_user_id_idx").on(t.userId)],
);

export const insertApiKeySchema = createInsertSchema(apiKeysTable).omit({
  createdAt: true,
});
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeysTable.$inferSelect;
