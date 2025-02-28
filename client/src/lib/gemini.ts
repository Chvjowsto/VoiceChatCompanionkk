import { GoogleGenerativeAI, GenerativeModel, ChatSession } from "@google/generative-ai";
import { type Message } from "@shared/schema";

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;
let chat: ChatSession | null = null;

export function initializeGemini(apiKey: string = process.env.GEMINI_API_KEY || "") {
  if (!apiKey) {
    console.error("Gemini API key not provided");
    return;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    chat = null; // Reset chat session
  } catch (error) {
    console.error("Failed to initialize Gemini:", error);
  }
}

export function startNewChat(history: Message[] = []) {
  if (!model) {
    throw new Error("Gemini not initialized. Call initializeGemini first.");
  }

  const formattedHistory = history.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

  chat = model.startChat({
    history: formattedHistory,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
      topP: 0.8,
      topK: 40
    }
  });

  return chat;
}

export async function sendMessage(message: string): Promise<string> {
  if (!chat) {
    throw new Error("No active chat session. Call startNewChat first.");
  }

  try {
    const result = await chat.sendMessage([{ text: message }]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw new Error("Failed to get response from Gemini");
  }
}

// Initialize Gemini on module load if API key is available
if (process.env.GEMINI_API_KEY) {
  initializeGemini();
}

export default {
  initializeGemini,
  startNewChat,
  sendMessage
};