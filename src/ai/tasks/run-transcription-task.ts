/**
 * @fileOverview Client-side task for transcribing audio segments using various AI providers.
 * This function directly uses SDKs for OpenAI, AvalAI, and Groq with API keys from appSettings (localStorage).
 * For Google AI, it attempts to use the Genkit `ai.generate()` with the globally configured Google AI plugin.
 */

import { z } from 'zod';
import type { AppSettings, Segment, LanguageCode } from '@/lib/types';
import { dataUriToRequestFile } from '@/lib/subtitle-utils';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { ai, getGoogleAIModel } from '@/ai/genkit'; // For Google AI

// Input Schema (mirroring some aspects of the old flow but for a client-side task)
const TranscriptionTaskInputSchema = z.object({
  audioDataUri: z.string().describe("Audio segment as a data URI."),
  provider: z.enum(['googleai', 'openai', 'avalai', 'groq']).describe("The AI provider to use."),
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

    if (provider === 'googleai') {
      if (!appSettings.googleApiKey) throw new Error('Google API Key is required for Google AI provider.');
      // Assuming genkit.ts initializes googleAI plugin with key from env or appSettings.
      // If direct key passing needed & supported by plugin, adjust here.
      // For client-side, direct SDK might be more reliable if genkit plugin struggles with client keys.
      // However, we'll try with Genkit `ai.generate` first as per plan.
      if (task === 'cue_slice') { // Gemini for cue/slice transcription
        const genkitModel = getGoogleAIModel(modelName);
        if (onProgress) onProgress(20, `Transcribing with Google AI (${modelName})...`);
        const {text} = await ai.generate({
          model: genkitModel,
          prompt: `Transcribe the following audio data precisely. Language hint: ${language || 'auto-detect'}. Audio: {{media url=${audioDataUri}}}`,
          config: { temperature: appSettings.temperature || 0.2 }, // Example config
        });
        fullText = text || "";
        if (onProgress) onProgress(100, `Google AI transcription complete.`);
      } else {
        throw new Error(`Google AI provider does not support 'timestamp' task directly for Whisper-like segmentation. Please use it for 'cue_slice'.`);
      }
    } else if (provider === 'openai' || provider === 'avalai') {
      let apiKey: string | undefined;
      let baseURL: string | undefined;

      if (provider === 'openai') {
        if (!appSettings.openAIToken) throw new Error('OpenAI API Key is required.');
        apiKey = appSettings.openAIToken;
      } else { // avalai
        if (!appSettings.avalaiToken) throw new Error('AvalAI API Key is required.');
        apiKey = appSettings.avalaiToken;
        baseURL = appSettings.avalaiBaseUrl || 'https://api.avalai.ir/v1'; // Default AvalAI URL
      }

      const openaiClient = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });
      
      if (task === 'timestamp') { // Whisper models for detailed segmentation
        if (onProgress) onProgress(20, `Transcribing with ${provider} Whisper (${modelName})...`);
        const response = await openaiClient.audio.transcriptions.create({
          file: audioFile,
          model: modelName, // e.g., 'whisper-1'
          response_format: 'verbose_json',
          timestamp_granularities: ["segment"],
          language: (language === "auto-detect" ? undefined : language),
          temperature: appSettings.temperature,
        });
        segments = response.segments?.map(s => ({ start: s.start, end: s.end, text: s.text.trim() })) || [];
        fullText = response.text || segments.map(s => s.text).join(' ') || "";
      } else { // 'cue_slice' with GPT models (e.g., GPT-4o)
        if (onProgress) onProgress(20, `Transcribing with ${provider} GPT-style model (${modelName})...`);
         // GPT-4o and similar models can accept image data URIs in user messages.
         // We're sending audio data URI here, assuming the model API can handle it for transcription context.
         // The prompt instructs it to transcribe.
        const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Transcribe the audio from the provided data URI precisely. Respond only with the transcribed text. Language hint: ${language || 'auto-detect'}.` },
              { type: 'image_url', image_url: { url: audioDataUri, detail: 'auto' } } // Using image_url for data URI
            ]
          }
        ];
        
        const response = await openaiClient.chat.completions.create({
          model: modelName, // e.g., 'gpt-4o'
          messages: chatMessages,
          temperature: appSettings.temperature || 0.2,
        });
        fullText = response.choices[0]?.message?.content?.trim() || "";
      }
      if (onProgress) onProgress(100, `${provider} transcription complete.`);

    } else if (provider === 'groq') {
      if (!appSettings.groqToken) throw new Error('Groq API Key is required.');
      const groqClient = new Groq({ apiKey: appSettings.groqToken, dangerouslyAllowBrowser: true });

      if (task === 'timestamp') { // Groq Whisper for detailed segmentation
         if (onProgress) onProgress(20, `Transcribing with Groq Whisper (${modelName})...`);
        const response = await groqClient.audio.transcriptions.create({
          file: audioFile,
          model: modelName, // e.g., 'whisper-large-v3'
          response_format: 'verbose_json',
          timestamp_granularities: ["segment"],
          language: (language === "auto-detect" ? undefined : language),
          temperature: appSettings.temperature,
        });
        segments = response.segments?.map(s => ({ id: s.id, start: s.start, end: s.end, text: s.text.trim() })) || [];
        fullText = response.text || segments.map(s => s.text).join(' ') || "";
         if (onProgress) onProgress(100, `Groq transcription complete.`);
      } else {
        throw new Error(`Groq provider currently configured only for 'timestamp' task with Whisper models.`);
      }
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
    // Rethrow to be handled by the caller (e.g., to show a toast)
    // Consider more specific error messages based on error type or status code if available
    throw new Error(`${provider} transcription failed: ${error.message || 'Unknown error'}`);
  }
}
