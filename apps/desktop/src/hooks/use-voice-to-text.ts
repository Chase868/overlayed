import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface UseVoiceToTextResult {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
}

export const useVoiceToText = (
  enabled: boolean,
  language = "en-US",
  speakerId?: string | null
): UseVoiceToTextResult => {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const SpeechRecognitionImpl = useMemo(() => window.SpeechRecognition ?? window.webkitSpeechRecognition, []);

  useEffect(() => {
    if (!SpeechRecognitionImpl) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (!enabled) {
      setTranscript("");
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = event => {
      const nextTranscript = Array.from(event.results)
        .map(result => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      setTranscript(nextTranscript);
      setError(null);
    };

    recognition.onerror = event => {
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [SpeechRecognitionImpl, language]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (!enabled || !speakerId) {
      recognition.stop();
      setTranscript("");
      setIsListening(false);
      return;
    }

    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [enabled, speakerId]);

  return {
    transcript,
    isListening,
    isSupported: Boolean(SpeechRecognitionImpl),
    error,
  };
};
