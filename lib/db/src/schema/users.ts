import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  username: text("username").unique(),
  image: text("image"),
  hashedPassword: text("hashed_password"),
  emailVerified: timestamp("email_verified"),
  isAdmin: boolean("is_admin").notNull().default(false),
  notifyOnScan: boolean("notify_on_scan").notNull().default(true),
  notifyOnConsent: boolean("notify_on_consent").notNull().default(true),
  notifyOnApiCheck: boolean("notify_on_api_check").notNull().default(false),
  shareCount: integer("share_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
