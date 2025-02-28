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
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center text-muted-foreground text-sm md:text-base px-4">
        Start a conversation by speaking into the microphone
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <Card 
          key={message.id}
          className={`p-3 md:p-4 ${
            message.role === "assistant" 
              ? "bg-primary/5" 
              : "bg-background"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium mb-1">
                {message.role === "assistant" ? "Gemini" : "You"}
              </div>
              <div className="text-sm break-words">{message.content}</div>
            </div>
            {message.role === "assistant" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => speak(message.content)}
                className="flex-shrink-0 h-8 w-8"
              >
                <PlayCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}