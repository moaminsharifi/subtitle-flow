
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


export type TranscriptionModelType = 'whisper-1' | 'gpt-4o-mini-transcribe' | 'gpt-4o-transcribe';
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'fa'; // Consider adding more supported UI languages
export type TranscriptionProvider = 'openai' | 'avalai' | 'groq';

export interface AppSettings {
  openAIToken?: string;
  groqToken?: string; // Added for Groq
  avalaiToken?: string; // Added for AvalAI
  transcriptionProvider?: TranscriptionProvider;
  transcriptionModel?: TranscriptionModelType; // This refers to the model name, used by any provider
  defaultTranscriptionLanguage?: LanguageCode | "auto-detect";
  temperature?: number;
  prompt?: string;
  theme?: Theme;
  maxSegmentDuration?: number; // Added for custom segment duration
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
export const TRANSCRIPTION_MODEL_KEY = 'app-settings-transcription-model';
export const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
export const AVALAI_TOKEN_KEY = 'app-settings-avalai-token';
export const GROQ_TOKEN_KEY = 'app-settings-groq-token';
export const TRANSCRIPTION_PROVIDER_KEY = 'app-settings-transcription-provider';
export const MAX_SEGMENT_DURATION_KEY = 'app-settings-max-segment-duration'; // Added for custom segment duration
