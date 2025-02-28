import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import MessageList from "@/components/chat/message-list";
import VoiceRecorder from "@/components/chat/voice-recorder";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages"]
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/messages");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Conversation cleared",
        description: "All messages have been deleted"
      });
    }
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/messages", {
        content,
        role: "user",
        audioUrl: null,
        context: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    }
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Voice Chat with Gemini
            </h1>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="h-8"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col container max-w-screen-md mx-auto w-full p-4 md:p-6 gap-4">
        <Card className="flex-1 p-4">
          <MessageList 
            messages={messages || []} 
            isLoading={isLoading} 
          />
        </Card>

        {/* Voice Recorder - Fixed at bottom */}
        <div className="sticky bottom-4 w-full px-4 md:px-0">
          <VoiceRecorder
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onTranscript={(text) => sendMessage.mutate(text)}
            disabled={sendMessage.isPending}
          />
        </div>
      </main>
    </div>
  );
}