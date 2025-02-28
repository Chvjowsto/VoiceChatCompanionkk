import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR-API-KEY");

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    const message = await storage.addMessage(parsed.data);

    if (parsed.data.role === "user") {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const chat = model.startChat({
        history: (await storage.getMessages()).map(m => ({
          role: m.role,
          parts: m.content
        }))
      });
      
      const result = await chat.sendMessage(parsed.data.content);
      const response = await result.response;
      const responseText = response.text();
      
      await storage.addMessage({
        content: responseText,
        role: "assistant",
        audioUrl: null,
        context: null
      });
    }

    res.json(message);
  });

  app.delete("/api/messages", async (_req, res) => {
    await storage.clearMessages();
    res.status(204).end();
  });

  const httpServer = createServer(app);
  return httpServer;
}
