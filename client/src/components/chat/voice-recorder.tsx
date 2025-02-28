import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { startRecording, stopRecording } from "@/lib/speech";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({
  isRecording,
  setIsRecording,
  onTranscript,
  disabled
}: VoiceRecorderProps) {
  const { toast } = useToast();

  const handleStartRecording = async () => {
    try {
      await startRecording((transcript) => {
        onTranscript(transcript);
        setIsRecording(false);
      });
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    setIsRecording(false);
  };

  return (
    <Button
      className="w-full h-16"
      variant={isRecording ? "destructive" : "default"}
      onClick={isRecording ? handleStopRecording : handleStartRecording}
      disabled={disabled}
    >
      {isRecording ? (
        <>
          <Square className="w-6 h-6 mr-2" />
          Stop Recording
        </>
      ) : (
        <>
          <Mic className="w-6 h-6 mr-2" />
          Hold to Speak
        </>
      )}
    </Button>
  );
}
