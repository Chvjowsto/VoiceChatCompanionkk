import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with proper error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

      const message = await storage.addMessage(parsed.data);

      if (parsed.data.role === "user") {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-pro" });
          const chat = model.startChat({
            history: (await storage.getMessages()).map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }]
            }))
          });

          const result = await chat.sendMessage([{ text: parsed.data.content }]);
          const response = await result.response;
          const responseText = response.text();

          await storage.addMessage({
            content: responseText,
            role: "assistant",
            audioUrl: null,
            context: null
          });
        } catch (aiError) {
          console.error("Gemini API error:", aiError);
          return res.status(500).json({ error: "Failed to get AI response" });
        }
      }

      res.json(message);
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