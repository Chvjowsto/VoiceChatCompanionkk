interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

let recognition: SpeechRecognition | null = null;
let synthesis: SpeechSynthesis | null = null;

if (typeof window !== "undefined") {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  synthesis = window.speechSynthesis;
}

export function startRecording(onTranscript: (text: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!recognition) {
      reject(new Error("Speech recognition not supported"));
      return;
    }

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
        finalTranscript = "";
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      reject(event.error);
    };

    recognition.onstart = () => {
      resolve();
    };

    recognition.start();
  });
}

export function stopRecording() {
  recognition?.stop();
}

export function speak(text: string) {
  if (!synthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  synthesis.speak(utterance);
}