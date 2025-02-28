import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { startRecording, stopRecording } from "@/lib/speech";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Button
        className={`w-full h-14 md:h-16 rounded-full shadow-lg hover:shadow-xl transition-all ${
          isRecording 
            ? "bg-destructive hover:bg-destructive/90" 
            : "bg-gradient-to-r from-primary via-purple-500 to-blue-500 hover:scale-[1.02]"
        }`}
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        disabled={disabled}
      >
        <motion.div
          animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex items-center justify-center gap-2"
        >
          {isRecording ? (
            <>
              <Square className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-sm md:text-base font-medium">Stop Recording</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-sm md:text-base font-medium">Hold to Speak</span>
            </>
          )}
        </motion.div>
      </Button>
    </motion.div>
  );
}