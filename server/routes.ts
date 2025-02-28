import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, GEMINI_MODELS } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ContextManager } from "./services/contextManager";

// Initialize with environment variable, can be overridden via API
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
let contextManager = new ContextManager(GEMINI_API_KEY);
let genAI = new GoogleGenerativeAI(GEMINI_API_KEY);


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

      // Build context for the new message with selected model
      const modelName = parsed.data.model || "gemini-1.5-pro-latest";
      const context = await contextManager.buildMessageContext(
        parsed.data.content,
        allMessages,
        modelName
      );

      // Add message with context
      const userMessage = await storage.addMessage({
        ...parsed.data,
        context
      });

      // If it's a user message, generate AI response
      if (parsed.data.role === "user") {
        try {
          // Send the message to Gemini with the selected model and configuration
          const modelName = parsed.data.model || "gemini-1.5-pro-latest";
          const modelConfig = parsed.data.config || {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          };

          // Extract configuration values
          const { systemPrompt, temperature, topK, topP, maxOutputTokens } = modelConfig;

          // Create model with configuration
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              temperature,
              topK,
              topP,
              maxOutputTokens
            }
          });

          // Build the prompt with system instructions if available
          const systemInstruction = systemPrompt 
            ? `Instructions: ${systemPrompt}\n\n` 
            : '';

          const prompt = `${systemInstruction}Context: ${context.summary}\nCurrent topics: ${context.topics.join(", ")}\n\nUser message: ${parsed.data.content}`;
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const responseText = response.text();

          // Build context for the assistant's response using the same model
          const assistantContext = await contextManager.buildMessageContext(
            responseText,
            [...allMessages, userMessage],
            modelName
          );

          // Save the assistant's response
          const assistantMessage = await storage.addMessage({
            content: responseText,
            role: "assistant",
            audioUrl: null,
            model: modelName, // Store which model was used
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

  app.post("/api/apikey", async (req, res) => {
    try {
      const apiKey = req.body.apiKey;

      if (!apiKey || apiKey.length === 0) {
        return res.status(400).json({ error: "Empty API key provided" });
      }

      // Test the API key with a simple request
      const testGenAI = new GoogleGenerativeAI(apiKey);
      try {
        // Try to get model info using the provided key
        const model = testGenAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("Test"); // Simple test prompt

        // Fetch available models from Google API
        const availableModels = await fetchAvailableModels(apiKey);

        // If successful, update the API key
        GEMINI_API_KEY = apiKey;
        contextManager = new ContextManager(GEMINI_API_KEY);
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

        // Return success with available models
        res.json({ 
          message: "API key validated and updated successfully.",
          models: availableModels
        });
      } catch (apiError) {
        console.error("API key validation failed:", apiError);
        return res.status(401).json({ 
          error: "Invalid API key or API quota exceeded",
          details: apiError.message
        });
      }
    } catch (error) {
      console.error("Error updating API key:", error);
      res.status(500).json({ error: "Failed to update API key" });
    }
  });

  // Function to fetch available Gemini models
  async function fetchAvailableModels(apiKey) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();

      // Filter for Gemini models only and remove duplicates
      const geminiModels = data.models
        .filter(model => model.name.includes('gemini'))
        .map(model => model.name.replace('models/', ''));

      // Remove duplicates and ensure we have latest versions
      const uniqueModels = [];
      const modelBaseNames = new Set();

      // First pass: collect base model names (without version)
      geminiModels.forEach(model => {
        const baseName = model.split('-').slice(0, -1).join('-');
        modelBaseNames.add(baseName);
      });

      // Second pass: for each base name, find the latest version
      modelBaseNames.forEach(baseName => {
        const matchingModels = geminiModels
          .filter(model => model.startsWith(baseName))
          .sort((a, b) => {
            // Sort by version number (assuming format like xxx-latest, xxx-001, etc.)
            const versionA = a.split('-').pop();
            const versionB = b.split('-').pop();
            // "latest" should always be first
            if (versionA === 'latest') return -1;
            if (versionB === 'latest') return 1;
            return versionB.localeCompare(versionA);
          });

        if (matchingModels.length > 0) {
          uniqueModels.push(matchingModels[0]);
        }
      });

      console.log("Fetched models from Google API:", uniqueModels);
      return uniqueModels;
    } catch (error) {
      console.error("Error fetching models:", error);
      return GEMINI_MODELS; // Fallback to schema models if API fails
    }
  }

  // Add endpoint to validate API key without setting it
  app.post("/api/validate-api-key", async (req, res) => {
    try {
      const apiKey = req.body.apiKey;

      if (!apiKey || apiKey.length === 0) {
        return res.status(400).json({ error: "Empty API key provided" });
      }

      console.log("Validating API key...");

      // Test the API key with a simple request
      const testGenAI = new GoogleGenerativeAI(apiKey);
      try {
        // Try to get model info using the provided key
        console.log("Testing API key with gemini-1.5-flash...");
        const model = testGenAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("Test"); // Simple test prompt
        console.log("API key validation successful");

        // Fetch available models from Google API
        const availableModels = await fetchAvailableModels(apiKey);

        // Return success with available models
        res.json({ 
          valid: true,
          message: "API key is valid",
          models: availableModels
        });
      } catch (apiError) {
        console.error("API key validation failed:", apiError);
        return res.status(401).json({ 
          valid: false,
          error: "Invalid API key or API quota exceeded",
          details: apiError.message
        });
      }
    } catch (error) {
      console.error("Error validating API key:", error);
      res.status(500).json({ 
        valid: false,
        error: "Failed to validate API key" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}