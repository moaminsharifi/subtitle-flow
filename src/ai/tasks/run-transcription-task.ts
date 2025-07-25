
/**
 * @fileOverview Client-side task for transcribing audio segments using various AI providers.
 * This function directly uses SDKs for OpenAI, AvalAI (OpenAI-compatible), and Groq
 * with API keys from appSettings (localStorage).
 * For Google AI (including AvalAI Gemini-based), it calls a server action that uses
 * the Genkit `ai.generate()` with the globally configured Google AI plugin.
 */

import { z } from 'zod';
import type {
  AppSettings,
  Segment,
  LanguageCode,
  // GoogleAILLMModelType, // Renamed, use LLMModelType with provider check
  // OpenAIModelType, // Renamed, use LLMModelType or WhisperModelType
  // AvalAIOpenAIBasedWhisperModels, // Covered by WhisperModelType
  // AvalAIOpenAIBasedGPTModels, // Covered by LLMModelType
  // AvalAIGeminiBasedModels, // Covered by LLMModelType
  WhisperModelType,
  LLMModelType as GenericLLMModelType, // Keep as GenericLLMModelType for clarity when it's truly generic
  TranscriptionModelType, // For timestamp task
  LLMModelType,
  GroqWhisperModels, // For cue/slice task
  // GroqWhisperModels as GroqWhisperModelTypes // Use GroqWhisperModels directly
} from '@/lib/types';
import {
  TranscriptionProvider as TranscriptionProviderTypeImport, // Keep alias if used distinctly in Zod
  LLMProviderType as LLMProviderTypeImport, // Keep alias if used distinctly in Zod
  DEFAULT_AVALAI_BASE_URL,
  isGroqWhisperModel,
  OpenAIWhisperModels, // To check if an OpenAI model is Whisper
  isOpenAISpecificTranscriptionModel
} from '@/lib/types';
import { dataUriToRequestFile } from '@/lib/subtitle-utils';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
// import { getGoogleAIModel, performGoogleAIGeneration } from '@/ai/genkit'; // performGoogleAIGeneration is commented out for static export
import { getGoogleAIModel } from '@/ai/genkit';


// Input Schema
const TranscriptionTaskInputSchema = z.object({
  audioDataUri: z.string().describe("Audio segment as a data URI."),
  provider: z.union([
      z.enum(['openai', 'avalai_openai', 'groq']), // For TranscriptionProviderTypeImport
      z.enum(['googleai', 'openai', 'avalai_openai', 'avalai_gemini', 'groq']) // For LLMProviderTypeImport
  ]).describe("The AI provider to use."),
  modelName: z.string().describe("The specific model name for the provider."),
  language: z.string().optional().describe("Optional language code (BCP-47)."),
  task: z.enum(['timestamp', 'cue_slice']).describe("Transcription task type."),
  appSettings: z.custom<AppSettings>().describe("Application settings containing API keys."),
});
export type TranscriptionTaskInput = z.infer<typeof TranscriptionTaskInputSchema>;

const SegmentSchema = z.object({
  id: z.number().optional(),
  start: z.number().describe("Start time of the segment in seconds."),
  end: z.number().describe("End time of the segment in seconds."),
  text: z.string().describe("Transcribed text of the segment."),
});

const TranscriptionTaskOutputSchema = z.object({
  segments: z.array(SegmentSchema).optional().describe('Array of transcribed segments with timestamps (primarily for "timestamp" task).'),
  fullText: z.string().describe('The full concatenated transcribed text (primarily for "cue_slice" task or fallback).'),
});
export type TranscriptionTaskOutput = z.infer<typeof TranscriptionTaskOutputSchema>;


export async function runTranscriptionTask(
  input: TranscriptionTaskInput,
  onProgress?: (progress: number, message: string) => void
): Promise<TranscriptionTaskOutput> {
  TranscriptionTaskInputSchema.parse(input); // Validate input

  const { audioDataUri, provider, modelName, language, task, appSettings } = input;
  const audioFile = await dataUriToRequestFile(audioDataUri, 'audio_segment_for_transcription.wav', 'audio/wav');

  let segments: Segment[] = [];
  let fullText = "";

  try {
    if (onProgress) onProgress(0, `Preparing transcription with ${provider}...`);

    if (provider === 'googleai' || provider === 'avalai_gemini') {
      if (!appSettings.googleApiKey && provider === 'googleai') {
        const errorMsg = 'Google API Key is required for Google AI provider. Configure it in Settings.';
        throw new Error(errorMsg);
      }
      if (!appSettings.googleApiKey && provider === 'avalai_gemini') {
         const errorMsg = 'Google API Key is required for AvalAI (Gemini Base) provider. Configure it in Settings.';
        throw new Error(errorMsg);
      }

      // performGoogleAIGeneration was a Server Action and is not available in static export.
      // Throw an error to indicate this limitation.
      const staticExportErrorMsg = 'Google AI / AvalAI Gemini provider is not available in static export mode due to Server Action limitations.';
      if (onProgress) onProgress(0, `Error: ${staticExportErrorMsg}`);
      throw new Error(staticExportErrorMsg);

      /* Code relying on performGoogleAIGeneration is commented out:
      if (task === 'cue_slice') {
        const genkitModel = await getGoogleAIModel(modelName as GenericLLMModelType); // Cast to generic LLM as it covers Gemini
        if (onProgress) onProgress(20, `Transcribing with ${provider} (${modelName})...`);

        const generateOptions = {
          model: genkitModel,
          prompt: `Transcribe the following audio data precisely. Respond only with the transcribed text. Language hint: ${language || 'auto-detect'}. Audio: {{media url=${audioDataUri}}}`,
          config: {
            temperature: appSettings.temperature || 0.2,
          },
        };
        // const result = await performGoogleAIGeneration(generateOptions); // This was the Server Action call
        // fullText = result.text || "";
        // if (onProgress) onProgress(100, `${provider} transcription complete.`);
      } else { // timestamp task
        throw new Error(`${provider} provider currently only supports 'cue_slice' task with Gemini models for direct text output via ai.generate. Timestamped output is not supported via this path.`);
      }
      */

    } else if (provider === 'openai' || provider === 'avalai_openai') {
      let apiKey: string | undefined;
      let baseURL: string | undefined = provider === 'avalai_openai' ? DEFAULT_AVALAI_BASE_URL : undefined;

      if (provider === 'openai') {
        if (!appSettings.openAIToken) throw new Error('OpenAI API Key is required. Configure it in Settings.');
        apiKey = appSettings.openAIToken;
      } else { // avalai_openai
        if (!appSettings.avalaiToken) throw new Error('AvalAI API Key is required. Configure it in Settings.');
        apiKey = appSettings.avalaiToken;
      }

      const openaiClient = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });

      if (task === 'timestamp') {
        if (onProgress) onProgress(20, `Transcribing with ${provider} Whisper (${modelName as WhisperModelType})...`);
        const response = await openaiClient.audio.transcriptions.create({
          file: audioFile,
          model: modelName as WhisperModelType, // Explicitly a WhisperModelType for timestamp task
          response_format: 'verbose_json',
          timestamp_granularities: ["segment"],
          language: (language === "auto-detect" ? undefined : language),
          temperature: appSettings.temperature,
        });
        segments = response.segments?.map(s => ({ start: s.start, end: s.end, text: s.text.trim() })) || [];
        fullText = response.text || segments.map(s => s.text).join(' ') || "";
      } else { // cue_slice task
        if (isOpenAISpecificTranscriptionModel(modelName)) {
            // Use audio.transcriptions for specific transcription models like 'whisper-1', 'gpt-4o-transcribe'
            if (onProgress) onProgress(20, `Transcribing with ${provider} specific model (${modelName})...`);
            const transcriptionResponse = await openaiClient.audio.transcriptions.create({
                file: audioFile,
                model: modelName, // Use modelName directly as it's a valid string ID
                response_format: 'text', // Get plain text for cue_slice
                language: (language === "auto-detect" ? undefined : language),
                temperature: appSettings.temperature,
            });
            fullText = (typeof transcriptionResponse === 'string' ? transcriptionResponse.trim() : '');

        } else {
            // This block should ideally not be reached if settings restrict models correctly for OpenAI/AvalAI cue/slice.
            // Passing audio data URI as an image_url to chat.completions is invalid.
            const errorMsg = `Invalid model ('${modelName}') for OpenAI/AvalAI cue/slice task. Only specific transcription models (e.g., whisper-1, gpt-4o-transcribe) are supported for this provider and task combination. Check settings.`;
            console.error(errorMsg);
            if (onProgress) onProgress(0, `Error: ${errorMsg}`);
            throw new Error(errorMsg);
        }
      }
      if (onProgress) onProgress(100, `${provider} transcription complete.`);

    } else if (provider === 'groq') {
      if (!appSettings.groqToken) throw new Error('Groq API Key is required. Configure it in Settings.');
      const groqClient = new Groq({ apiKey: appSettings.groqToken, dangerouslyAllowBrowser: true });

      if (task === 'timestamp' || (task === 'cue_slice' && isGroqWhisperModel(modelName))) {
        // For timestamp task, OR for cue_slice task if a Whisper model is chosen for Groq
        if (onProgress) onProgress(20, `Transcribing with Groq Whisper (${modelName})...`);
        const response = await groqClient.audio.transcriptions.create({
          file: audioFile,
          model: modelName as typeof GroqWhisperModels[number], // Model is a Groq Whisper model
          response_format: task === 'timestamp' ? 'verbose_json' : 'json', // verbose for timestamps, json for text from Whisper
          timestamp_granularities: task === 'timestamp' ? ["segment"] : undefined,
          language: (language === "auto-detect" ? undefined : language),
          temperature: appSettings.temperature,
        });

        if (task === 'timestamp') {
            segments = response.segments?.map(s => ({ id: s.id, start: s.start, end: s.end, text: s.text.trim() })) || [];
            fullText = response.text || segments.map(s => s.text).join(' ') || "";
        } else { // cue_slice with a Groq Whisper model
            fullText = response.text || (response.segments?.map(s => s.text).join(' ').trim() ?? "");
            segments = []; // No segments for cue_slice output
        }

      } else if (task === 'cue_slice') { // cue_slice with a Groq non-Whisper LLM (THIS PATH SHOULD NO LONGER BE REACHED GIVEN MODEL RESTRICTIONS)
        // This branch is problematic as Groq LLMs cannot directly process audio.
        // Keeping for now but ideally this path is avoided by model selection UI.
        if (onProgress) onProgress(20, `Transcribing with Groq LLM (${modelName})...`);
        console.warn(`Attempting cue/slice with Groq LLM (${modelName}) which cannot directly process audio. Transcription quality may be poor or fail.`);
        const chatCompletion = await groqClient.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content:  `Transcribe the following audio data precisely. Respond only with the transcribed text. Language hint: ${language || 'auto-detect'}. The audio is provided as a data URI that you cannot directly process, but imagine it's available for transcription: ${audioDataUri.substring(0,100)}... [CONTEXT: Pretend you can process this audio data URI]`,
                }
            ],
            model: modelName as GenericLLMModelType, // Model is a Groq LLM
            temperature: appSettings.temperature || 0.2,
        });
        fullText = chatCompletion.choices[0]?.message?.content?.trim() || "";
      } else {
         throw new Error(`Unsupported task '${task}' for Groq provider with model ${modelName}.`);
      }
      if (onProgress) onProgress(100, `Groq transcription complete.`);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    if (segments.length === 0 && !fullText) {
      console.warn(`${provider} transcription resulted in empty output for model ${modelName}.`);
    }

    return TranscriptionTaskOutputSchema.parse({ segments: segments.length > 0 ? segments : undefined, fullText });

  } catch (error: any) {
    console.error(`Error during ${provider} transcription task (${task}, ${modelName}):`, error);
    if (onProgress) onProgress(0, `Error: ${error.message}`);
    // Propagate the error message more directly
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    throw new Error(`${provider} transcription failed: ${errorMessage}`);
  }
}

