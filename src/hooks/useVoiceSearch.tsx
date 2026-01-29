import { useState, useEffect, useCallback, useRef } from "react";

interface UseVoiceSearchOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface UseVoiceSearchReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const useVoiceSearch = ({
  onResult,
  onError,
  language = "en-US",
}: UseVoiceSearchOptions = {}): UseVoiceSearchReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if browser supports Speech Recognition
  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Initialize recognition instance
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      // Only call onResult with final transcript
      if (finalTranscript && onResult) {
        onResult(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = "Voice recognition error";
      
      switch (event.error) {
        case "no-speech":
          errorMessage = "No speech detected. Please try again.";
          break;
        case "audio-capture":
          errorMessage = "No microphone found. Please check your device.";
          break;
        case "not-allowed":
          errorMessage = "Microphone access denied. Please enable it in your browser settings.";
          break;
        case "network":
          errorMessage = "Network error. Please check your connection.";
          break;
        case "aborted":
          // User cancelled, not an error
          setIsListening(false);
          return;
        default:
          errorMessage = `Voice recognition error: ${event.error}`;
      }

      setError(errorMessage);
      setIsListening(false);
      onError?.(errorMessage);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isSupported, language, onResult, onError]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError("Voice search is not supported in this browser");
      onError?.("Voice search is not supported in this browser");
      return;
    }

    setTranscript("");
    setError(null);

    try {
      recognitionRef.current.start();
    } catch (err) {
      // Recognition might already be running
      console.error("Failed to start recognition:", err);
    }
  }, [isSupported, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
};
