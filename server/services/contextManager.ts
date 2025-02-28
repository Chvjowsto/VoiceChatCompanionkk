import { type Message, type MessageContext } from "@shared/schema";
import { storage } from "../storage";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_CONTEXT_MESSAGES = 10;
const RELEVANCE_THRESHOLD = 0.7;

export class ContextManager {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async summarizeContext(messages: Message[]): Promise<string> {
    if (messages.length === 0) return "";

    try {
      const prompt = `Summarize the following conversation in a concise way that captures the key points and context:
      ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error summarizing context:", error);
      return messages[messages.length - 1].content;
    }
  }

  async getRelevantMessages(currentMessage: string, messages: Message[]): Promise<number[]> {
    if (messages.length === 0) return [];

    try {
      const prompt = `Given the current message: "${currentMessage}"
      Rate the relevance of each previous message (0-1):
      ${messages.map(m => `${m.id}: ${m.content}`).join('\n')}`;

      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const relevanceScores = this.parseRelevanceScores(response.text());

      return messages
        .filter((_, index) => relevanceScores[index] >= RELEVANCE_THRESHOLD)
        .map(m => m.id);
    } catch (error) {
      console.error("Error getting relevant messages:", error);
      return messages.slice(-3).map(m => m.id);
    }
  }

  private parseRelevanceScores(text: string): number[] {
    try {
      return text.split('\n')
        .map(line => parseFloat(line.match(/[\d.]+/)?.[0] || "0"))
        .filter(score => !isNaN(score) && score >= 0 && score <= 1);
    } catch (error) {
      console.error("Error parsing relevance scores:", error);
      return [];
    }
  }

  async extractTopics(content: string): Promise<string[]> {
    try {
      const prompt = `Extract key topics from this message as a comma-separated list: "${content}"`;
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().split(',').map(topic => topic.trim());
    } catch (error) {
      console.error("Error extracting topics:", error);
      return [];
    }
  }

  async buildMessageContext(content: string, allMessages: Message[]): Promise<MessageContext> {
    const relevantIds = await this.getRelevantMessages(content, allMessages);
    const relevantMessages = allMessages.filter(m => relevantIds.includes(m.id));
    const summary = await this.summarizeContext(relevantMessages);
    const topics = await this.extractTopics(content);

    return {
      summary,
      relevantIds,
      importance: 1,
      topics
    };
  }

  pruneContext(messages: Message[]): Message[] {
    if (messages.length <= MAX_CONTEXT_MESSAGES) return messages;

    return messages
      .sort((a, b) => ((b.context?.importance || 0) - (a.context?.importance || 0)))
      .slice(0, MAX_CONTEXT_MESSAGES)
      .sort((a, b) => a.id - b.id);
  }
}