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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Card className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Voice Chat with Gemini
          </h1>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
        </div>

        <MessageList 
          messages={messages || []} 
          isLoading={isLoading} 
        />

        <div className="mt-6">
          <VoiceRecorder
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onTranscript={(text) => sendMessage.mutate(text)}
            disabled={sendMessage.isPending}
          />
        </div>
      </Card>
    </div>
  );
}
