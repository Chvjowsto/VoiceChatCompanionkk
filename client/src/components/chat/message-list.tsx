import { type Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speak } from "@/lib/speech";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm p-6 text-muted-foreground text-sm md:text-base"
        >
          Start a conversation by speaking into the microphone below
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div
            className={`flex ${
              message.role === "assistant" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-[85%] group ${
                message.role === "assistant"
                  ? "bg-primary/5 rounded-2xl rounded-tl-sm"
                  : "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
              } p-4 shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1 opacity-75">
                    <span>{message.role === "assistant" ? "Gemini" : "You"}</span>
                    {message.context && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-background/10"
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1 text-xs">
                            <p className="font-medium">Context Summary:</p>
                            <p>{message.context.summary || "No summary available"}</p>
                            <p className="font-medium mt-2">Topics:</p>
                            <p>{message.context.topics?.join(", ") || "No topics"}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="text-sm leading-relaxed break-words">
                    {message.content}
                  </div>
                </div>
                {message.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => speak(message.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  >
                    <PlayCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
    </TooltipProvider>
    </TooltipProvider>
  );
}