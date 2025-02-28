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
      className="w-full h-14 md:h-16 rounded-full shadow-lg hover:shadow-xl transition-shadow"
      variant={isRecording ? "destructive" : "default"}
      onClick={isRecording ? handleStopRecording : handleStartRecording}
      disabled={disabled}
    >
      {isRecording ? (
        <>
          <Square className="w-5 h-5 md:w-6 md:h-6 mr-2" />
          <span className="text-sm md:text-base">Stop Recording</span>
        </>
      ) : (
        <>
          <Mic className="w-5 h-5 md:w-6 md:h-6 mr-2" />
          <span className="text-sm md:text-base">Hold to Speak</span>
        </>
      )}
    </Button>
  );
}