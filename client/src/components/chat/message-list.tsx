import { type Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speak } from "@/lib/speech";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Start a conversation by speaking into the microphone
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card 
          key={message.id}
          className={`p-4 ${
            message.role === "assistant" 
              ? "bg-primary/5" 
              : "bg-background"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="font-medium mb-1">
                {message.role === "assistant" ? "Gemini" : "You"}
              </div>
              <div className="text-sm">{message.content}</div>
            </div>
            {message.role === "assistant" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => speak(message.content)}
              >
                <PlayCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
