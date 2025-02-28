
import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const GEMINI_MODELS = [
  "gemini-1.5-pro", 
  "gemini-1.5-flash", 
  "gemini-1.5-pro-latest", 
  "gemini-1.0-pro",
  "gemini-1.0-pro-latest",
  "gemini-1.0-pro-vision",
  "gemini-1.0-pro-vision-latest",
  "gemini-1.5-flash-latest"
] as const;
export type GeminiModel = typeof GEMINI_MODELS[number];

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  audioUrl: text("audio_url"),
  model: text("model").default(GEMINI_MODELS[0]), // Fixed model field definition
  context: jsonb("context").default({
    summary: "",
    relevantIds: [],
    importance: 1,
    topics: []
  }),
  config: jsonb("config").default({
    systemPrompt: "You are a helpful AI assistant.",
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024
  })
});

// Enhanced insert schema with context and model
export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  role: true,
  audioUrl: true,
  model: true, // Added model to insert schema
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

export interface ModelConfig {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}
