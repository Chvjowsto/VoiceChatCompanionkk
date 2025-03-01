import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  audioUrl: text("audio_url"),
  context: jsonb("context").default({
    summary: "",
    relevantIds: [],
    importance: 1,
    topics: []
  })
});

// Enhanced insert schema with context
export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  role: true,
  audioUrl: true,
  context: true
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Define context structure for type safety
export interface MessageContext {
  summary?: string;
  relevantIds: number[];
  importance: number;
  topics: string[];
}