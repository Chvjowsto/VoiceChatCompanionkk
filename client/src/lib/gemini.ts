import { GoogleGenerativeAI, GenerativeModel, ChatSession } from "@google/generative-ai";
import { type Message } from "@shared/schema";

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;
let chat: ChatSession | null = null;

export function initializeGemini(apiKey: string = process.env.GEMINI_API_KEY || "YOUR-API-KEY") {
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: "gemini-pro" });
  chat = null; // Reset chat session
}

export function startNewChat(history: Message[] = []) {
  if (!model) {
    throw new Error("Gemini not initialized. Call initializeGemini first.");
  }

  // Convert our Message type to Gemini's chat history format
  const formattedHistory = history.map(msg => ({
    role: msg.role,
    parts: msg.content
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
    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw new Error("Failed to get response from Gemini");
  }
}

// Initialize Gemini on module load
initializeGemini();

export default {
  initializeGemini,
  startNewChat,
  sendMessage
};
