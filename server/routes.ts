import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ContextManager } from "./services/contextManager";

// Initialize Gemini with proper error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const contextManager = new ContextManager(process.env.GEMINI_API_KEY || "");

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/messages", async (_req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const parsed = insertMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error });
      }

      // Get all messages for context
      const allMessages = await storage.getMessages();

      // Build context for the new message
      const context = await contextManager.buildMessageContext(
        parsed.data.content,
        allMessages
      );

      // Add message with context
      const userMessage = await storage.addMessage({
        ...parsed.data,
        context
      });

      // If it's a user message, generate AI response
      if (parsed.data.role === "user") {
        try {
          // Send the message to Gemini
          const model = genAI.getGenerativeModel({ model: "gemini-pro" });
          const prompt = `Context: ${context.summary}\nCurrent topics: ${context.topics.join(", ")}\n\nUser message: ${parsed.data.content}`;
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const responseText = response.text();

          // Build context for the assistant's response
          const assistantContext = await contextManager.buildMessageContext(
            responseText,
            [...allMessages, userMessage]
          );

          // Save the assistant's response
          const assistantMessage = await storage.addMessage({
            content: responseText,
            role: "assistant",
            audioUrl: null,
            context: assistantContext
          });

          // Return both messages
          res.json([userMessage, assistantMessage]);
        } catch (aiError) {
          console.error("Gemini API error:", aiError);
          return res.status(500).json({ error: "Failed to get AI response" });
        }
      } else {
        res.json([userMessage]);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  app.delete("/api/messages", async (_req, res) => {
    try {
      await storage.clearMessages();
      res.status(204).end();
    } catch (error) {
      console.error("Error clearing messages:", error);
      res.status(500).json({ error: "Failed to clear messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}