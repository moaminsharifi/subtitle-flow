
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

export interface Segment {
  id?: number;
  start: number;
  end: number;
  text: string;
}

export type ToastFn = (message: string, type: 'info' | 'error' | 'warn' | 'success' | 'debug') => void;

// --- Model Types ---
// Timestamp Transcription Models (typically Whisper-like)
export const OpenAIWhisperModels = ['whisper-1'] as const;
export const AvalAIOpenAIBasedWhisperModels = ['whisper-1'] as const; // Used with AvalAI's OpenAI-compatible endpoint
export const GroqWhisperModels = ['whisper-large-v3', 'whisper-large-v3-turbo'] as const;

export type WhisperModelType = 
  | typeof OpenAIWhisperModels[number]
  | typeof AvalAIOpenAIBasedWhisperModels[number]
  | typeof GroqWhisperModels[number];

// LLM Models for Cue/Slice Transcription (Gemini, GPTs, etc.)
export const GoogleGeminiLLModels = [
  'gemini-1.5-pro-latest', 
  'gemini-1.5-flash-latest',
  'gemini-2.5-pro-preview-06-05', 
  'gemini-2.5-flash-preview-05-20',
] as const;

export const AvalAIGeminiBasedModels = [ 
  'gemini-2.5-pro-preview-06-05',
  'gemini-2.5-flash-preview-05-20',
] as const;

export const OpenAIGPTModels = [ 
  'gpt-4o', 
  'gpt-4o-mini', 
  'gpt-3.5-turbo',
  'gpt-4.1', 
  'gpt-4.1-mini', 
  'gpt-4.1-nano', 
  'o1-pro', 
  'o3', 
  'gpt-4o-transcribe', 
  'gpt-4o-mini-transcribe', 
] as const;

export const AvalAIOpenAIBasedGPTModels = [ 
  'gpt-4o', 
  'gpt-4o-mini',
  'o1-pro', 
] as const;

export const GroqLLModels = [
    'llama3-8b-8192',
    'llama3-70b-8192',
    'mixtral-8x7b-32768',
    'gemma-7b-it',
    'whisper-large-v3-turbo', 
] as const;


// Union types for overall model categories
export type TranscriptionModelType = WhisperModelType; // For models used in 'timestamp' task (Whisper variants)
export type LLMModelType = 
  | typeof GoogleGeminiLLModels[number]
  | typeof AvalAIGeminiBasedModels[number]
  | typeof OpenAIGPTModels[number]
  | typeof AvalAIOpenAIBasedGPTModels[number]
  | typeof GroqLLModels[number]; 

// --- Provider Types ---
export type TranscriptionProvider = 'openai' | 'avalai_openai' | 'groq';
export type LLMProviderType = 'googleai' | 'openai' | 'avalai_openai' | 'avalai_gemini' | 'groq';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'fa';

export interface AppSettings {
  openAIToken?: string;
  avalaiToken?: string;
  // avalaiBaseUrl?: string; // Removed
  groqToken?: string; 
  googleApiKey?: string;

  transcriptionProvider?: TranscriptionProvider;
  transcriptionModel?: TranscriptionModelType;

  llmProvider?: LLMProviderType;
  llmModel?: LLMModelType;

  defaultTranscriptionLanguage?: LanguageCode | "auto-detect";
  temperature?: number;
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

// Keys for localStorage
export const THEME_KEY = 'app-theme';
export const LANGUAGE_KEY = 'app-language';
export const DEFAULT_TRANSCRIPTION_LANGUAGE_KEY = 'app-settings-default-transcription-language';

export const TRANSCRIPTION_PROVIDER_KEY = 'app-settings-transcription-provider';
export const TRANSCRIPTION_MODEL_KEY = 'app-settings-transcription-model';

export const LLM_PROVIDER_KEY = 'app-settings-llm-provider';
export const LLM_MODEL_KEY = 'app-settings-llm-model';

export const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
export const AVALAI_TOKEN_KEY = 'app-settings-avalai-token';
// export const AVALAI_BASE_URL_KEY = 'app-settings-avalai-base-url'; // Removed
export const GROQ_TOKEN_KEY = 'app-settings-groq-token'; 
export const GOOGLE_API_KEY_KEY = 'app-settings-google-api-key';

export const MAX_SEGMENT_DURATION_KEY = 'app-settings-max-segment-duration';
export const TEMPERATURE_KEY = 'app-settings-temperature';

export interface AudioSegment {
  startTime: number;
  endTime: number;
  duration: number;
}

// This interface was defined in page.tsx, better to have it generally available or remove if not used outside.
// For now, keeping it as it might be related to editor props.
export interface SubtitleEditorProps {
  handleSeekPlayer: (timeInSeconds: number) => void;
}

// For clarity in SettingsDialog
export const DEFAULT_AVALAI_BASE_URL = 'https://api.avalai.ir/v1';

// Helper type to check if a model is a Whisper model from Groq
export const isGroqWhisperModel = (modelName: string): modelName is typeof GroqWhisperModels[number] => {
  return (GroqWhisperModels as readonly string[]).includes(modelName);
};
