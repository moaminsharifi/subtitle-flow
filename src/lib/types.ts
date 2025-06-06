
export interface SubtitleEntry {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

export interface MediaFile {
  name: string;
  type: 'audio' | 'video';
  url: string; // Object URL for local file
  duration: number;
  rawFile: File; // Keep raw file for AI processing
}

export type SubtitleFormat = 'srt' | 'vtt';

export interface SubtitleTrack {
  id: string; // Unique ID for this track instance
  fileName: string;
  format: SubtitleFormat;
  entries: SubtitleEntry[];
}

// For OpenAI's verbose_json response
export interface Segment {
  id?: number; // Optional, as we mainly care about start, end, text
  start: number; // Start time of the segment in seconds
  end: number;   // End time of the segment in seconds
  text: string;  // Transcribed text of the segment
}


export type ToastFn = (message: string, type: 'info' | 'error' | 'warn' | 'success' | 'debug') => void;

export type TranscriptionModelType = 'whisper-1' | 'gpt-4o-mini-transcribe' | 'gpt-4o-transcribe'| 'whisper-large-v3'| 'whisper-large-v3-turbo';
export type OpenAIModelType = TranscriptionModelType; // Alias for backward compatibility or specific OpenAI usage
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'fa'; // Consider adding more supported UI languages
export type TranscriptionProvider = 'openai' | 'avalai' | 'groq';
export type LLMProviderType = TranscriptionProvider; // For now, LLM providers are the same as transcription providers

export const OpenAIAvalAILLMModels = ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'] as const;
export const GroqLLMModels = ['llama-3.1-8b-instant'] as const;
export type LLMModelType = typeof OpenAIAvalAILLMModels[number] | typeof GroqLLMModels[number];

export interface AppSettings {
  openAIToken?: string;
  groqToken?: string; 
  avalaiToken?: string; 
  transcriptionProvider?: TranscriptionProvider;
  llmProvider?: LLMProviderType; 
  transcriptionModel?: OpenAIModelType; 
  llmModel?: LLMModelType; 
  defaultTranscriptionLanguage?: LanguageCode | "auto-detect";
  temperature?: number;
  prompt?: string;
  theme?: Theme;
  maxSegmentDuration?: number; 
  language?: Language;
}

export const LANGUAGE_OPTIONS = [
  { value: "auto-detect", label: "Auto-detect (Default)" },
  { value: "af", label: "Afrikaans" },
  { value: "ar", label: "Arabic" },
  { value: "hy", label: "Armenian" },
  { value: "az", label: "Azerbaijani" },
  { value: "be", label: "Belarusian" },
  { value: "bs", label: "Bosnian" },
  { value: "bg", label: "Bulgarian" },
  { value: "ca", label: "Catalan" },
  { value: "zh", label: "Chinese" },
  { value: "hr", label: "Croatian" },
  { value: "cs", label: "Czech" },
  { value: "da", label: "Danish" },
  { value: "nl", label: "Dutch" },
  { value: "en", label: "English" },
  { value: "et", label: "Estonian" },
  { value: "fi", label: "Finnish" },
  { value: "fr", label: "French" },
  { value: "gl", label: "Galician" },
  { value: "de", label: "German" },
  { value: "el", label: "Greek" },
  { value: "he", label: "Hebrew" },
  { value: "hi", label: "Hindi" },
  { value: "hu", label: "Hungarian" },
  { value: "is", label: "Icelandic" },
  { value: "id", label: "Indonesian" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "kn", label: "Kannada" },
  { value: "kk", label: "Kazakh" },
  { value: "ko", label: "Korean" },
  { value: "lv", label: "Latvian" },
  { value: "lt", label: "Lithuanian" },
  { value: "mk", label: "Macedonian" },
  { value: "ms", label: "Malay" },
  { value: "mr", label: "Marathi" },
  { value: "mi", label: "Maori" },
  { value: "ne", label: "Nepali" },
  { value: "no", label: "Norwegian" },
  { value: "fa", label: "Persian" },
  { value: "pl", label: "Polish" },
  { value: "pt", label: "Portuguese" },
  { value: "ro", label: "Romanian" },
  { value: "ru", label: "Russian" },
  { value: "sr", label: "Serbian" },
  { value: "sk", label: "Slovak" },
  { value: "sl", label: "Slovenian" },
  { value: "es", label: "Spanish" },
  { value: "sw", label: "Swahili" },
  { value: "sv", label: "Swedish" },
  { value: "tl", label: "Tagalog" },
  { value: "ta", label: "Tamil" },
  { value: "th", label: "Thai" },
  { value: "tr", label: "Turkish" },
  { value: "uk", label: "Ukrainian" },
  { value: "ur", label: "Urdu" },
  { value: "vi", label: "Vietnamese" },
  { value: "cy", label: "Welsh" },
] as const;

export type LanguageCode = typeof LANGUAGE_OPTIONS[number]['value'];

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'warn' | 'success' | 'debug';
}

export const THEME_KEY = 'app-theme';
export const LANGUAGE_KEY = 'app-language';
export const DEFAULT_TRANSCRIPTION_LANGUAGE_KEY = 'app-settings-default-transcription-language';
export const TRANSCRIPTION_PROVIDER_KEY = 'app-settings-transcription-provider';
export const LLM_PROVIDER_KEY = 'app-settings-llm-provider'; // New key for LLM Provider
export const TRANSCRIPTION_MODEL_KEY = 'app-settings-transcription-model';
export const LLM_MODEL_KEY = 'app-settings-llm-model';
export const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
export const AVALAI_TOKEN_KEY = 'app-settings-avalai-token';
export const GROQ_TOKEN_KEY = 'app-settings-groq-token';
export const MAX_SEGMENT_DURATION_KEY = 'app-settings-max-segment-duration';

// AudioSegment interface for splitting audio
export interface AudioSegment {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface SubtitleEditorProps {
  handleSeekPlayer: (timeInSeconds: number) => void;
}
