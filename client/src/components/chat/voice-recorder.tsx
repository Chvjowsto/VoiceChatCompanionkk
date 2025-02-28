import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

// Add speech recognition typing
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
import { Button } from '@/components/ui/button';
import { Mic, Send, Square } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import ModelSelector from './model-selector';
// import { type GeminiModel, GEMINI_MODELS } from '@shared/schema'; // Removed since models are fetched dynamically

export default function VoiceRecorder({ 
  onRecordingStateChange, 
  onTranscript,
  disabled
}: { 
  onRecordingStateChange: (isRecording: boolean) => void,
  onTranscript?: (text: string) => void,
  disabled?: boolean
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>("gemini-1.5-pro-latest");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Fetch available models when component mounts
  useEffect(() => {
    // First try to load models from localStorage
    const savedModels = localStorage.getItem('availableGeminiModels');
    if (savedModels) {
      try {
        const parsedModels = JSON.parse(savedModels);
        if (Array.isArray(parsedModels) && parsedModels.length > 0) {
          console.log("Loading models from localStorage:", parsedModels);
          setAvailableModels(parsedModels);
          setSelectedModel(parsedModels[0]);
        }
      } catch (e) {
        console.error("Error parsing saved models:", e);
      }
    }

    // Then try to fetch fresh models if an API key exists
    const apiKey = localStorage.getItem('geminiApiKey');
    if (apiKey) {
      console.log("Fetching fresh models from API with saved key");
      fetch('/api/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid && data.models && Array.isArray(data.models)) {
            console.log("Fresh models received from API:", data.models);
            setAvailableModels(data.models);
            if(data.models.length > 0){
              setSelectedModel(data.models[0]);
            }
            // Update localStorage with fresh models
            localStorage.setItem('availableGeminiModels', JSON.stringify(data.models));
          }
        })
        .catch(err => console.error('Failed to fetch available models:', err));
    }
  }, []);

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

        try {
          // Use the Web Speech API for transcription
          const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
          recognition.lang = 'en-US';

          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript.trim()) {
              setText(transcript);
              // Automatically send the message
              sendMessage.mutate({
                content: transcript,
                role: "user",
                model: selectedModel
              });
            }
          };

          recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            toast({
              title: 'Transcription Error',
              description: 'Could not transcribe audio. Please try again or type your message.',
              variant: 'destructive',
            });
          };

          // Start recognition with the recorded audio
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.onended = () => recognition.stop();

          recognition.start();
          audio.play();
        } catch (error) {
          console.error('Transcription error:', error);
          toast({
            title: 'Error',
            description: 'Speech recognition not supported in this browser. Please type your message.',
            variant: 'destructive',
          });
        }
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
      // First update UI to show stopped state
      setIsRecording(false);
      onRecordingStateChange(false);

      // Then stop recording - this will trigger the onstop event
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

      // Show loading indicator 
      toast({
        title: 'Processing',
        description: 'Transcribing your message...',
      });
    }
  };

  const sendMessage = useMutation({
    mutationFn: async ({content, role, model}: {content: string, role: string, model: string}) => {
      if (!content.trim()) return;

      // Show sending indicator
      toast({
        title: "Sending message",
        description: `Using model: ${model}`,
      });

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content,
          role: role,
          model: model,
          //config: chatConfig // Pass the config to the API -  Removed as chatConfig is not defined in the original code.
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}):`, errorText);

        // Suggest model change if rate limited
        if (response.status === 429 || errorText.includes("quota") || errorText.includes("rate")) {
          toast({
            title: "API Rate Limited",
            description: "Try switching to another model or wait a moment",
            variant: "destructive",
          });
          return;
        }

        throw new Error(errorText || response.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Check console for details",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      try {
        setText(""); // Clear input immediately for better UX
        await sendMessage.mutateAsync({content: text, role: "user", model: selectedModel});
      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error sending message",
          description: "Failed to send message. API might be rate limited or try another model.",
          variant: "destructive"
        });
      }
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t flex flex-col gap-2 bg-background/80 backdrop-blur-md rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <ModelSelector value={selectedModel} onChange={handleModelChange} availableModels={availableModels} />
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