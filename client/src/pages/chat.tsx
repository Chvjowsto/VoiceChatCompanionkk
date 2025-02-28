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
    queryKey: ["/api/messages"],
    refetchInterval: 1000 // Poll every second to ensure we get updates
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
      const response = await apiRequest("POST", "/api/messages", {
        content,
        role: "user",
        audioUrl: null,
        context: null
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 flex flex-col">
      {/* Header with frosted glass effect */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/60 backdrop-blur-lg supports-[backdrop-filter]:bg-background/30">
        <div className="container flex h-16 max-w-screen-2xl items-center px-4">
          <div className="mr-4 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent animate-gradient">
              Voice Chat with Gemini
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="h-9 px-4 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with modern styling */}
      <main className="flex-1 flex flex-col container max-w-screen-md mx-auto w-full p-4 md:p-6 gap-4">
        <div className="flex-1 rounded-lg bg-background/40 backdrop-blur-sm p-4 md:p-6 shadow-xl ring-1 ring-black/5">
          <MessageList 
            messages={messages || []} 
            isLoading={isLoading} 
          />
        </div>

        {/* Voice Recorder with floating effect */}
        <div className="sticky bottom-4 w-full px-4 md:px-0 animate-fade-up">
          <VoiceRecorder
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onRecordingStateChange={(isRecording) => {
              // Handle recording state changes
              console.log("Recording state changed:", isRecording);
              setIsRecording(isRecording); // Update the state
            }}
            onTranscript={(text) => sendMessage.mutate(text)}
            disabled={sendMessage.isPending}
          />
        </div>
      </main>
    </div>
  );
}