import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Mic, Send, Square } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import ModelSelector from './model-selector';
import { type GeminiModel, GEMINI_MODELS } from '@shared/schema';

export default function VoiceRecorder({ onRecordingStateChange }: { onRecordingStateChange: (isRecording: boolean) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('');
  const [selectedModel, setSelectedModel] = useState<GeminiModel>("gemini-1.5-pro");
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // For now, we'll just transcribe on the client side
        // In a real app, you might want to send this to a server
        // const audioUrl = URL.createObjectURL(audioBlob);
        // Handle the audio file
      };

      mediaRecorder.start();
      setIsRecording(true);
      onRecordingStateChange(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to start recording. Please check microphone permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      onRecordingStateChange(false);
    }
  };

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!text.trim()) return;

      // Send message to API with selected model
      await apiRequest('POST', '/api/messages', {
        content: text,
        role: 'user',
        model: selectedModel,
        audioUrl: null
      });
      setText('');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to send message. The API might be rate limited, try another model.',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage.mutate();
  };

  const handleModelChange = (model: GeminiModel) => {
    setSelectedModel(model);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <ModelSelector value={selectedModel} onChange={handleModelChange} />
        {sendMessage.isError && (
          <span className="text-xs text-destructive">Try another model, current one might be rate limited</span>
        )}
      </div>
      <Textarea
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="resize-none"
        rows={3}
      />
      <div className="flex justify-end gap-2">
        {!isRecording ? (
          <Button 
            type="button" 
            size="icon" 
            variant="outline"
            onClick={startRecording}
          >
            <Mic className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="button" 
            size="icon" 
            variant="destructive"
            onClick={stopRecording}
          >
            <Square className="h-4 w-4" />
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={!text.trim() || sendMessage.isPending}
        >
          <Send className="h-4 w-4 mr-2" />
          Send
        </Button>
      </div>
    </form>
  );
}