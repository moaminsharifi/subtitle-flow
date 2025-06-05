
/**
 * @fileOverview Utility for transcribing a segment of audio using OpenAI, AvalAI, or Groq API.
 *
 * - transcribeAudioSegment - Function to transcribe an audio segment.
 * - TranscribeAudioSegmentInput - Input type for the function.
 * - TranscribeAudioSegmentOutput - Output type for the function (now returns segments).
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { TranscriptionModelType, Segment, AppSettings, ToastFn } from '@/lib/types';
import { dataUriToRequestFile } from '@/lib/subtitle-utils';

const TranscribeAudioSegmentInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A segment of audio, as a data URI that must include a MIME type (e.g., 'audio/wav') and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  openAIModel: z.custom<TranscriptionModelType>().describe("The AI transcription model to use (e.g., 'whisper-1'). This model name is used across providers, potentially mapped to provider-specific model names internally."),
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


interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  providerName: string;
  modelToUse: TranscriptionModelType | string; // Can be a provider-specific model string
}

// Helper function to get provider-specific configuration
function getProviderConfig(appSettings: AppSettings, inputModel: TranscriptionModelType): ProviderConfig {
  let apiKey: string | undefined;
  let baseUrl: string | undefined;
  let providerName: string;
  let modelToUse: TranscriptionModelType | string = inputModel;

  switch (appSettings.transcriptionProvider) {
    case 'avalai':
      if (!appSettings.avalaiToken) {
        throw new Error('AvalAI API key is required for transcription.');
      }
      apiKey = appSettings.avalaiToken;
      baseUrl = 'https://api.avalai.ir/v1';
      providerName = 'AvalAI';
      // AvalAI typically uses OpenAI-compatible model names.
      break;
    case 'openai':
      if (!appSettings.openAIToken) {
        throw new Error('OpenAI API key is required for transcription.');
      }
      apiKey = appSettings.openAIToken;
      providerName = 'OpenAI';
      break;
    case 'groq':
      if (!appSettings.groqToken || appSettings.groqToken === '') {
        throw new Error('Groq API key is required for transcription.');
      }
      apiKey = appSettings.groqToken;
      baseUrl = 'https://api.groq.com/openai/v1';
      providerName = 'Groq';
      // Groq's primary Whisper model is 'whisper-large-v3'.
      // If other models are intended for Groq, this mapping might need to be more nuanced.
      modelToUse = 'whisper-large-v3';
      break;
    default:
      throw new Error(`Unsupported transcription provider: ${appSettings.transcriptionProvider}`);
  }
  return { apiKey, baseUrl, providerName, modelToUse };
}

// Helper function to determine if segmented output is expected
function shouldExpectSegmentedOutput(providerName: string, inputModel: TranscriptionModelType): boolean {
  if (providerName === 'OpenAI' && inputModel === 'whisper-1') {
    return true;
  } else if (providerName === 'Groq') { // Groq uses whisper-large-v3 which gives segments
    return true;
  } else if (providerName === 'AvalAI' && inputModel === 'whisper-1') {
    // Assuming AvalAI with whisper-1 also provides segments similar to OpenAI
    return true; 
  }
  return false;
}

// Helper function to prepare transcription parameters
function prepareTranscriptionParams(
  audioFile: File,
  input: TranscribeAudioSegmentInput, // Contains original input.openAIModel
  appSettings: AppSettings,
  providerConfig: ProviderConfig
): OpenAI.Audio.Transcriptions.TranscriptionCreateParams {
  
  const expectSegments = shouldExpectSegmentedOutput(providerConfig.providerName, input.openAIModel);
  let transcriptionParams: OpenAI.Audio.Transcriptions.TranscriptionCreateParams;

  if (expectSegments) {
    transcriptionParams = {
      file: audioFile,
      model: providerConfig.modelToUse,
      response_format: 'verbose_json',
      timestamp_granularities: ["segment"],
    } as OpenAI.Audio.Transcriptions.TranscriptionCreateParamsVerboseJson;
  } else {
    transcriptionParams = {
      file: audioFile,
      model: providerConfig.modelToUse,
      response_format: 'json',
    } as OpenAI.Audio.Transcriptions.TranscriptionCreateParamsJson;
  }

  // Temperature is typically for non-Whisper models or when not expecting segments.
  if (appSettings.temperature !== undefined && !expectSegments) {
    (transcriptionParams as any).temperature = appSettings.temperature;
  }
  if (input.language && input.language !== "auto-detect") { // "auto-detect" should not be sent
    transcriptionParams.language = input.language;
  }

  return transcriptionParams;
}

// Helper function to process the transcription response
function processTranscriptionResponse(
  transcription: OpenAI.Audio.Transcriptions.Transcription | OpenAI.Audio.Transcriptions.TranscriptionVerboseJson,
  expectSegmentedOutputFlag: boolean,
  providerName: string,
  originalInputModel: TranscriptionModelType // For logging context
): { segments: Segment[]; fullText: string } {
  let segments: Segment[] = [];
  let fullText = "";

  if (expectSegmentedOutputFlag && 'segments' in transcription && (transcription as OpenAI.Audio.Transcriptions.TranscriptionVerboseJson).segments) {
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
    } else if (typeof transcription === 'string') { // Fallback for plain text response (though less common with current SDK)
      fullText = (transcription as string).trim();
    } else {
      console.warn(`Unexpected API response structure for ${originalInputModel} from ${providerName}:`, transcription);
      fullText = '';
    }
    segments = []; // Segments not expected or not provided
  }

  if (segments.length === 0 && !fullText) {
    console.warn(`${providerName} Transcription result was empty (no segments or text) for model ${originalInputModel}.`);
  }
  
  return { segments, fullText };
}

// Helper function to handle API errors
function handleTranscriptionError(
    error: any, 
    providerName: string, 
    toast: ToastFn, 
    onProgress?: (progress: number, message: string) => void
): never { // This function will always throw an error
  console.error(`Error during ${providerName} transcription:`, error);
  const errorResponseMessage = error.response?.data?.error?.message || error.error?.message || error.message || 'Unknown transcription error';

  if (error.response && error.response.status === 413) {
    const toastMessageKey = `toast.transcriptionError.payloadTooLarge.${providerName.toLowerCase()}`; // e.g., toast.transcriptionError.payloadTooLarge.openai
    // Fallback message if translation key is not found
    const fallbackMessage = `Payload too large for ${providerName}. Please use a smaller audio segment.`;
    // Assuming `toast` can handle a key or a direct message. If it only handles keys, a check is needed.
    toast(toastMessageKey || fallbackMessage, 'error'); // Use 'error' severity
    if (onProgress) onProgress(0, `Error: Payload too large`);
    throw new Error('Transcription failed: Audio file too large.');
  } else {
    if (onProgress) onProgress(0, `Error: ${errorResponseMessage}`);
    // Consider toasting this error message as well for non-413 errors.
    // toast(`${providerName} Transcription failed: ${errorResponseMessage}`, 'error');
    throw new Error(`${providerName} Transcription failed: ${errorResponseMessage}`);
  }
}

export async function transcribeAudioSegment(
  input: TranscribeAudioSegmentInput,
  appSettings: AppSettings,
  toast: ToastFn,
  onProgress?: (progress: number, message: string) => void
): Promise<TranscribeAudioSegmentOutput> {
  try {
    const providerConfig = getProviderConfig(appSettings, input.openAIModel);

    if (onProgress) onProgress(0, 'Preparing audio data...');
    const audioFile = await dataUriToRequestFile(input.audioDataUri, 'audio_segment.wav', 'audio/wav');
    
    if (onProgress) onProgress(0, `Uploading to ${providerConfig.providerName}...`);
    console.log(`Attempting ${providerConfig.providerName} transcription with model: ${providerConfig.modelToUse}, language: ${input.language || 'auto-detect'}`);

    const transcriptionParams = prepareTranscriptionParams(audioFile, input, appSettings, providerConfig);
    
    const apiClient = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseUrl,
      dangerouslyAllowBrowser: true,
    });

    if (onProgress) onProgress(-1, `Waiting for ${providerConfig.providerName} response...`);
    const transcriptionResponse = await apiClient.audio.transcriptions.create(transcriptionParams);
    
    const expectSegmentedOutputFlag = shouldExpectSegmentedOutput(providerConfig.providerName, input.openAIModel);

    const { segments, fullText } = processTranscriptionResponse(
        transcriptionResponse, 
        expectSegmentedOutputFlag, 
        providerConfig.providerName, 
        input.openAIModel
    );

    if (onProgress) onProgress(100, 'Transcription complete. Applying segment rules...');
    return { segments, fullText };

  } catch (error: any) {
    // Handle errors from getProviderConfig (e.g., API key missing)
    if (error.message.includes('API key is required') || error.message.includes('Unsupported transcription provider')) {
        const specificErrorMessage = `Configuration Error: ${error.message}`;
        if (onProgress) onProgress(0, specificErrorMessage);
        toast(specificErrorMessage, 'error'); // Toast this specific configuration error
        throw error; // Rethrow to ensure the caller knows it failed
    }
    
    // For other errors (assumed to be from API calls or subsequent processing)
    const providerNameForError = appSettings.transcriptionProvider || 'AI Provider';
    handleTranscriptionError(error, providerNameForError, toast, onProgress); // This will throw, satisfying the return type
    // Fallback throw if handleTranscriptionError somehow doesn't (shouldn't happen with `never` return type)
    throw new Error("Unhandled error in transcription flow after error handling attempt.");
  }
}

