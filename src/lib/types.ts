
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
export const AvalAIOpenAIBasedWhisperModels = ['whisper-1'] as const;
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
    'gpt-4o-transcribe',
    'gpt-4o-mini-transcribe',
    'whisper-1', // whisper-1 can also be used for cue/slice via OpenAI API
] as const;

export const AvalAIOpenAIBasedGPTModels = [
    'gpt-4o-transcribe',
    'gpt-4o-mini-transcribe',
    'whisper-1',
] as const;

export const GroqLLModels = [ // For Cue/Slice Task, these are Whisper models via Groq
    'whisper-large-v3',
    'whisper-large-v3-turbo',
] as const;


// Union types for overall model categories
export type TranscriptionModelType = WhisperModelType; // For models used in 'timestamp' task (Whisper variants)
export type LLMModelType = // For models used in 'cue_slice' task
  | typeof GoogleGeminiLLModels[number]
  | typeof AvalAIGeminiBasedModels[number]
  | typeof OpenAIGPTModels[number]
  | typeof AvalAIOpenAIBasedGPTModels[number]
  | typeof GroqLLModels[number];

// Translation LLM Models
export const GoogleTranslationLLModels = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'] as const;
export const OpenAITranslationLLModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] as const;
export const GroqTranslationLLModels = ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'] as const;

export type TranslationLLMModelType =
  | typeof GoogleTranslationLLModels[number]
  | typeof OpenAITranslationLLModels[number]
  | typeof GroqTranslationLLModels[number];


// --- Provider Types ---
export type TranscriptionProvider = 'openai' | 'avalai_openai' | 'groq';
export type LLMProviderType = 'googleai' | 'openai' | 'avalai_openai' | 'avalai_gemini' | 'groq';
export type SimpleLLMProviderType = 'googleai' | 'openai' | 'groq'; // For translation where proxy providers are not directly used with Genkit

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'fa';

export interface AppSettings {
  openAIToken?: string;
  avalaiToken?: string;
  groqToken?: string;
  googleApiKey?: string;

  transcriptionProvider?: TranscriptionProvider;
  transcriptionModel?: TranscriptionModelType;

  llmProvider?: LLMProviderType; // For Cue/Slice
  llmModel?: LLMModelType;    // For Cue/Slice

  translationLLMProvider?: SimpleLLMProviderType; // For Translation
  translationLLMModel?: TranslationLLMModelType;  // For Translation

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

export const LLM_PROVIDER_KEY = 'app-settings-llm-provider'; // For Cue/Slice task
export const LLM_MODEL_KEY = 'app-settings-llm-model';       // For Cue/Slice task

export const TRANSLATION_LLM_PROVIDER_KEY = 'app-settings-translation-llm-provider';
export const TRANSLATION_LLM_MODEL_KEY = 'app-settings-translation-llm-model';

export const OPENAI_TOKEN_KEY = 'app-settings-openai-token';
export const AVALAI_TOKEN_KEY = 'app-settings-avalai-token';
export const GROQ_TOKEN_KEY = 'app-settings-groq-token';
export const GOOGLE_API_KEY_KEY = 'app-settings-google-api-key';

export const MAX_SEGMENT_DURATION_KEY = 'app-settings-max-segment-duration';
export const TEMPERATURE_KEY = 'app-settings-temperature';

export interface AudioSegment {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface SubtitleEditorProps {
  handleSeekPlayer: (timeInSeconds: number) => void;
}

export const DEFAULT_AVALAI_BASE_URL = 'https://api.avalai.ir/v1';

export const isGroqWhisperModel = (modelName: string): modelName is typeof GroqWhisperModels[number] => {
  return (GroqWhisperModels as readonly string[]).includes(modelName);
};

export const isOpenAISpecificTranscriptionModel = (modelName: string): boolean => {
  return ['whisper-1', 'gpt-4o-transcribe', 'gpt-4o-mini-transcribe'].includes(modelName);
};

export type GoogleAILLMModelType = typeof GoogleGeminiLLModels[number];
export const isGoogleAILLMModel = (modelName: string): modelName is GoogleAILLMModelType => {
    return (GoogleGeminiLLModels as readonly string[]).includes(modelName);
};

export type OpenAIModelType = typeof OpenAIGPTModels[number];
export const isOpenAIGPTModel = (modelName: string): modelName is OpenAIModelType => {
    return (OpenAIGPTModels as readonly string[]).includes(modelName);
};

export type GroqModelType = typeof GroqLLModels[number];
// export const isGroqLLModel = (modelName: string): modelName is GroqModelType => {
// return (GroqLLModels as readonly string[]).includes(modelName) && isGroqWhisperModel(modelName);
// };
// GroqLLModels for Cue/Slice are Whisper models. For Translation, they are different (chat models).
export const isGroqLLModelForCueSlice = (modelName: string): modelName is typeof GroqLLModels[number] => {
    return (GroqLLModels as readonly string[]).includes(modelName);
};
export const isGroqTranslationModel = (modelName: string): modelName is typeof GroqTranslationLLModels[number] => {
    return (GroqTranslationLLModels as readonly string[]).includes(modelName);
};


// Types for Full Transcription Progress (Option 2)
export interface FullTranscriptionProgress {
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  currentStage: string | null; // e.g., 'slicing', 'transcribing', 'processing'
  chunkProgress?: number; // Progress within the current chunk (0-100)
  chunkMessage?: string; // Message for current chunk progress
}

// Types for Multi-Process Transcription (Option 3)
export interface SegmentRefinementDetail {
  id: string; // Original segment ID from initial transcription
  startTime: number;
  endTime: number;
  originalText: string;
  refinedText: string | null; // Null if refinement failed or not yet done
  status: 'pending' | 'processing' | 'done' | 'error';
}

export interface MultiProcessTranscriptionProgress {
  stage: 'idle' | 'initial_transcription' | 'segment_refinement' | 'complete' | 'error';
  statusMessage: string; // User-facing status message
  initialTranscriptionProgress: FullTranscriptionProgress | null; // Reuse for Stage 1
  segmentRefinementProgress: {
    totalSegments: number;
    processedSegments: number; // Number of segments for which refinement task has been initiated
    completedSegments: number; // Number of segments successfully refined or failed (processing finished)
    refinedSuccessfully: number;
    failedToRefine: number;
    // segments: SegmentRefinementDetail[]; // Keep track of each segment's status and refined text if needed for detailed UI
  } | null;
}

    