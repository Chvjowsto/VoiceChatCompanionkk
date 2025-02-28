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
          let assistantContext;
          try {
            assistantContext = await contextManager.buildMessageContext(
              responseText,
              [...allMessages, userMessage],
              modelName
            );
          } catch (contextError) {
            console.error("Error building assistant context:", contextError);
            assistantContext = { summary: "", topics: [], relevantIds: [], importance: 1 };
          }

          // Save the assistant's response
          const assistantMessage = await storage.addMessage({
            content: responseText,
            role: "assistant",
            audioUrl: null,
            model: modelName, // Store which model was used
            context: assistantContext,
            config: parsed.data.config // Pass the configuration
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
      console.log("Fetching models from Google API...");
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
      
      if (!response.ok) {
        console.error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Raw model data:", data);
      
      if (!data.models || !Array.isArray(data.models)) {
        console.error("Invalid model data structure:", data);
        return GEMINI_MODELS;
      }

      // Get all available Gemini models with their version info
      const allGeminiModels = data.models
        .filter(model => model.name && model.name.includes('gemini'))
        .map(model => {
          const fullName = model.name.replace('models/', '');
          const parts = fullName.split('-');
          const version = parts[parts.length - 1];
          // Extract base name without version number
          const baseName = parts.slice(0, -1).join('-');
          
          return {
            fullName,
            baseName,
            version,
            // Parse numeric versions for comparison (like 001, 002, etc)
            numericVersion: !isNaN(version) ? parseInt(version, 10) : 0,
            // 'latest' should always be prioritized
            isLatest: version === 'latest',
            // Include display name if available
            displayName: model.displayName || fullName
          };
        });
      
      console.log("Processed Gemini models:", allGeminiModels);
      
      // Group models by base name
      const modelsByBaseName = {};
      allGeminiModels.forEach(model => {
        if (!modelsByBaseName[model.baseName]) {
          modelsByBaseName[model.baseName] = [];
        }
        modelsByBaseName[model.baseName].push(model);
      });
      
      // For each base name, select the best version (prioritize 'latest', then highest numeric version)
      const uniqueModels = [];
      Object.values(modelsByBaseName).forEach(models => {
        // Sort by priority: latest first, then by numeric version (descending)
        const sortedModels = models.sort((a, b) => {
          if (a.isLatest && !b.isLatest) return -1;
          if (!a.isLatest && b.isLatest) return 1;
          return b.numericVersion - a.numericVersion;
        });
        
        if (sortedModels.length > 0) {
          uniqueModels.push(sortedModels[0].fullName);
        }
      });
      
      console.log("Final unique models:", uniqueModels);
      
      // If no models were found (unlikely), fall back to schema-defined models
      if (uniqueModels.length === 0) {
        console.warn("No models found, falling back to schema models");
        return GEMINI_MODELS;
      }
      
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