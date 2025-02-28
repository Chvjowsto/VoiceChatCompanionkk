import { messages, type Message, type InsertMessage } from "@shared/schema";
import { db } from "./db";
import { desc } from "drizzle-orm";

export interface IStorage {
  getMessages(): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  clearMessages(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getMessages(): Promise<Message[]> {
    try {
      return await db.select().from(messages).orderBy(desc(messages.timestamp));
    } catch (error) {
      console.error("Failed to get messages:", error);
      return [];
    }
  }

  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      const [message] = await db
        .insert(messages)
        .values(insertMessage)
        .returning();
      return message;
    } catch (error) {
      console.error("Failed to add message:", error);
      throw error;
    }
  }

  async clearMessages(): Promise<void> {
    try {
      await db.delete(messages);
    } catch (error) {
      console.error("Failed to clear messages:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();