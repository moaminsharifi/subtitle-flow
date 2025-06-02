
/**
 * @fileOverview Utility for transcribing a segment of audio using OpenAI or AvalAI API.
 *
 * - transcribeAudioSegment - Function to transcribe an audio segment.
 * - TranscribeAudioSegmentInput - Input type for the function.
 * - TranscribeAudioSegmentOutput - Output type for the function (now returns segments).
 */

import OpenAI from 'openai';
import { z, type ZodType } from 'zod';
import type { TranscriptionModelType, Segment, AppSettings } from '@/lib/types';
import { dataUriToRequestFile } from '@/lib/subtitle-utils';

const TranscribeAudioSegmentInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A segment of audio, as a data URI that must include a MIME type (e.g., 'audio/wav') and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  openAIModel: z.custom<TranscriptionModelType>().describe("The AI transcription model to use (e.g., 'whisper-1', 'gpt-4o-mini-transcribe'). This model name is used for both OpenAI and AvalAI providers."),
  language: z.string().optional().describe("Optional language code for transcription (e.g., 'en', 'es'). Expects BCP-47 format."),
});
export type TranscribeAudioSegmentInput = z.infer<typeof TranscribeAudioSegmentInputSchema>;

const SegmentSchema = z.object({
  id: z.number().optional(),
  start: z.number().describe("Start time of the segment in seconds."),
  end: z.number().describe("End time of the segment in seconds."),
  text: z.string().describe("Transcribed text of the segment."),
});

const TranscribeAudioSegmentOutputSchema = z.object({
  segments: z.array(SegmentSchema).describe('Array of transcribed segments with timestamps.'),
  fullText: z.string().describe('The full concatenated transcribed text from all segments or the direct transcription if segments are not available.'),
});
export type TranscribeAudioSegmentOutput = z.infer<typeof TranscribeAudioSegmentOutputSchema>;

export async function transcribeAudioSegment(
  input: TranscribeAudioSegmentInput,
  appSettings: AppSettings
): Promise<TranscribeAudioSegmentOutput> {

  let apiKey: string | undefined;
  let baseUrl: string | undefined;
  let providerName: string = 'OpenAI'; // Default

  switch (appSettings.transcriptionProvider) {
 case 'avalai':
    if (!appSettings.avalaiToken) {
      throw new Error('AvalAI API key is required for transcription.');
    }
    apiKey = appSettings.avalaiToken;
    baseUrl = 'https://api.avalai.ir/v1'; // AvalAI specific endpoint
    providerName = 'AvalAI';
 break;
    case 'openai': // Default case
 if (!appSettings.openAIToken) {
 throw new Error('OpenAI API key is required for transcription.');
 }
    apiKey = appSettings.openAIToken;
 // Temperature and prompt are typically only applicable/explicitly supported by chat-like models,
 // but we pass them here in case the provider's API handles them.
 // OpenAI's whisper-1 model does not support 'temperature' or 'prompt' directly in the API.
 // OpenAI's default base URL will be used if `baseUrl` is undefined
 providerName = 'OpenAI';
 break;
  }

  try {
    const audioFile = await dataUriToRequestFile(input.audioDataUri, 'audio_segment.wav', 'audio/wav');

    console.log(`Attempting ${providerName} transcription with model: ${input.openAIModel}, language: ${input.language || 'auto-detect'}`);
    
    let transcriptionParams: OpenAI.Audio.TranscriptionCreateParams;
    // Assuming whisper-1 provides segments and gpt-4o models provide full text JSON.
    // This logic might need adjustment if AvalAI behaves differently with these models.
    let isWhisperModelFormat = input.openAIModel === 'whisper-1';

    const apiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });

    if (isWhisperModelFormat) {
      transcriptionParams = {
          file: audioFile,
          model: input.openAIModel,
          response_format: 'verbose_json', 
          timestamp_granularities: ["segment"] 
      } as OpenAI.Audio.TranscriptionCreateParams; // Explicitly type for safety
    } else { 
      // For gpt-4o-transcribe and gpt-4o-mini-transcribe (and potentially other non-whisper models)
      // These may support temperature and prompt as they are likely wrappers around chat models.
      transcriptionParams = {
          file: audioFile,
          model: input.openAIModel,
          response_format: 'json', 
      } as OpenAI.Audio.TranscriptionCreateParams; // Explicitly type for safety
    }

    // Add advanced settings if they exist in appSettings.
    // The API provider (OpenAI or AvalAI) will determine if these parameters are used/valid for the given model.
    if (appSettings.temperature !== undefined) {
        (transcriptionParams as any).temperature = appSettings.temperature; // Use 'any' or extend the type if needed
    }

    if (input.language) {
        transcriptionParams.language = input.language;
    }

    const transcription = await apiClient.audio.transcriptions.create(transcriptionParams);

    let segments: Segment[] = [];
    let fullText = "";

    if (isWhisperModelFormat && (transcription as OpenAI.Audio.Transcriptions.TranscriptionVerboseJson).segments) {
      const apiResponse = transcription as OpenAI.Audio.Transcriptions.TranscriptionVerboseJson;
      segments = apiResponse.segments?.map(s => ({
        id: s.id,
        start: s.start,
        end: s.end,
        text: s.text.trim(),
      })) || [];
      fullText = apiResponse.text || segments.map(s => s.text).join(' ') || "";
    } else {
      const apiResponse = transcription as { text?: string; [key: string]: any }; 
      if (apiResponse && typeof apiResponse.text === 'string') {
        fullText = apiResponse.text.trim();
      } else {
        if (typeof transcription === 'string') { // Fallback for plain text response
            fullText = (transcription as string).trim();
        } else {
            console.warn(`Unexpected API response structure for ${input.openAIModel} from ${providerName}:`, transcription);
            fullText = ''; 
        }
      }
      // Segments are not typically provided by non-whisper-1 models or if the format is just 'json'
      segments = []; 
    }

    if (segments.length === 0 && !fullText) {
      console.warn(`${providerName} Transcription result was empty (no segments or text).`);
      return { segments: [], fullText: "" };
    }
    return { segments, fullText };

  } catch (error: any) {
    console.error(`Error during ${providerName} transcription:`, error);
    // Attempt to parse out a more specific message from OpenAI-like error structures
    const errorResponseMessage = error.response?.data?.error?.message || error.error?.message || error.message || 'Unknown transcription error';
    throw new Error(`${providerName} Transcription failed: ${errorResponseMessage}`);
  }
}
