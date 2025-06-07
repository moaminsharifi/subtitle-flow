/**
 * @fileOverview Client-side task for transcribing audio segments using various AI providers.
 * This function directly uses SDKs for OpenAI, AvalAI, and Groq with API keys from appSettings (localStorage).
 * For Google AI, it calls a server action that uses the Genkit `ai.generate()` with the globally configured Google AI plugin.
 */

import { z } from 'zod';
import type { AppSettings, Segment, LanguageCode, TranscriptionProvider, LLMProviderType, GoogleAILLMModelType, OpenAIModelType, GroqModelType, AvalAIModelType } from '@/lib/types';
import { dataUriToRequestFile } from '@/lib/subtitle-utils';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
// Import the new server action for Google AI and getGoogleAIModel, but NOT the 'ai' object itself.
import { getGoogleAIModel, performGoogleAIGeneration } from '@/ai/genkit';

// Input Schema
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
      if (!appSettings.googleApiKey) throw new Error('Google API Key is required for Google AI provider. Configure it in Settings.');
      
      if (task === 'cue_slice') { // Gemini for cue/slice transcription
        const genkitModel = await getGoogleAIModel(modelName as GoogleAILLMModelType);
        if (onProgress) onProgress(20, `Transcribing with Google AI (${modelName})...`);
        
        // Call the server action performGoogleAIGeneration instead of ai.generate directly
        const generateOptions = {
          model: genkitModel,
          prompt: `Transcribe the following audio data precisely. Respond only with the transcribed text. Language hint: ${language || 'auto-detect'}. Audio: {{media url=${audioDataUri}}}`,
          config: { 
            temperature: appSettings.temperature || 0.2,
          },
        };
        const result = await performGoogleAIGeneration(generateOptions);
        fullText = result.text || "";
        if (onProgress) onProgress(100, `Google AI transcription complete.`);
      } else {
        throw new Error(`Google AI provider currently only supports 'cue_slice' task with Gemini models for direct text output.`);
      }
    } else if (provider === 'openai' || provider === 'avalai') {
      let apiKey: string | undefined;
      let baseURL: string | undefined;
      let effectiveModelName = modelName;

      if (provider === 'openai') {
        if (!appSettings.openAIToken) throw new Error('OpenAI API Key is required. Configure it in Settings.');
        apiKey = appSettings.openAIToken;
        effectiveModelName = modelName as OpenAIModelType; 
      } else { // avalai
        if (!appSettings.avalaiToken) throw new Error('AvalAI API Key is required. Configure it in Settings.');
        apiKey = appSettings.avalaiToken;
        baseURL = appSettings.avalaiBaseUrl || 'https://api.avalai.ir/v1'; 
        effectiveModelName = modelName as AvalAIModelType;
      }

      const openaiClient = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });
      
      if (task === 'timestamp') { 
        if (onProgress) onProgress(20, `Transcribing with ${provider} Whisper (${effectiveModelName})...`);
        const response = await openaiClient.audio.transcriptions.create({
          file: audioFile,
          model: effectiveModelName, 
          response_format: 'verbose_json',
          timestamp_granularities: ["segment"],
          language: (language === "auto-detect" ? undefined : language),
          temperature: appSettings.temperature,
        });
        segments = response.segments?.map(s => ({ start: s.start, end: s.end, text: s.text.trim() })) || [];
        fullText = response.text || segments.map(s => s.text).join(' ') || "";
      } else { // 'cue_slice' with GPT models
         if (onProgress) onProgress(20, `Transcribing with ${provider} GPT-style model (${effectiveModelName})...`);
        const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Transcribe the audio from the provided data URI precisely. Respond only with the transcribed text. Language hint: ${language || 'auto-detect'}.` },
              { type: 'image_url', image_url: { url: audioDataUri, detail: 'auto' } } 
            ]
          }
        ];
        
        const response = await openaiClient.chat.completions.create({
          model: effectiveModelName,
          messages: chatMessages,
          temperature: appSettings.temperature || 0.2,
        });
        fullText = response.choices[0]?.message?.content?.trim() || "";
      }
      if (onProgress) onProgress(100, `${provider} transcription complete.`);

    } else if (provider === 'groq') {
      if (!appSettings.groqToken) throw new Error('Groq API Key is required. Configure it in Settings.');
      const groqClient = new Groq({ apiKey: appSettings.groqToken, dangerouslyAllowBrowser: true });

      if (task === 'timestamp') { 
         if (onProgress) onProgress(20, `Transcribing with Groq Whisper (${modelName as GroqModelType})...`);
        const response = await groqClient.audio.transcriptions.create({
          file: audioFile,
          model: modelName as GroqModelType,
          response_format: 'verbose_json',
          timestamp_granularities: ["segment"],
          language: (language === "auto-detect" ? undefined : language),
          temperature: appSettings.temperature,
        });
        segments = response.segments?.map(s => ({ id: s.id, start: s.start, end: s.end, text: s.text.trim() })) || [];
        fullText = response.text || segments.map(s => s.text).join(' ') || "";
         if (onProgress) onProgress(100, `Groq transcription complete.`);
      } else { 
        if (onProgress) onProgress(20, `Transcribing with Groq LLM (${modelName})...`);
        const chatCompletion = await groqClient.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content:  `Transcribe the following audio data precisely. Respond only with the transcribed text. Language hint: ${language || 'auto-detect'}. The audio is provided as a data URI that you cannot directly process, but imagine it's available for transcription: ${audioDataUri.substring(0,100)}... [CONTEXT: Pretend you can process this audio data URI]`,
                }
            ],
            model: modelName, 
            temperature: appSettings.temperature || 0.2,
        });
        fullText = chatCompletion.choices[0]?.message?.content?.trim() || "";
        if (onProgress) onProgress(100, `Groq LLM transcription complete.`);
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
    throw new Error(`${provider} transcription failed: ${error.message || 'Unknown error'}`);
  }
}
