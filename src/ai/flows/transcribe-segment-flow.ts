
'use server';
/**
 * @fileOverview A Genkit flow for transcribing a segment of audio.
 *
 * - transcribeAudioSegment - Function to transcribe an audio segment.
 * - TranscribeAudioSegmentInput - Input type for the flow.
 * - TranscribeAudioSegmentOutput - Output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod'; // Corrected import for Zod
import type {TranscribeModelType} from '@/lib/types';

const TranscribeAudioSegmentInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A segment of audio, as a data URI that must include a MIME type (e.g., 'audio/wav' or 'audio/webm') and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  modelType: z.custom<TranscribeModelType>().describe("The transcription model to use: 'openai' or 'groq'."),
  language: z.string().optional().describe("Optional language code for transcription (e.g., 'en', 'es'). Model-dependent.")
});
export type TranscribeAudioSegmentInput = z.infer<typeof TranscribeAudioSegmentInputSchema>;

const TranscribeAudioSegmentOutputSchema = z.object({
  transcribedText: z.string().describe('The transcribed text from the audio segment.'),
});
export type TranscribeAudioSegmentOutput = z.infer<typeof TranscribeAudioSegmentOutputSchema>;

// Main exported function to be called from the application
export async function transcribeAudioSegment(input: TranscribeAudioSegmentInput): Promise<TranscribeAudioSegmentOutput> {
  return transcribeAudioSegmentFlow(input);
}

const transcribeAudioSegmentFlow = ai.defineFlow(
  {
    name: 'transcribeAudioSegmentFlow',
    inputSchema: TranscribeAudioSegmentInputSchema,
    outputSchema: TranscribeAudioSegmentOutputSchema,
  },
  async (input) => {
    let modelToUse: string;
    let promptContent: any = [{media: {url: input.audioDataUri}}];

    if (input.modelType === 'openai') {
      modelToUse = 'openai/whisper-1'; // Standard OpenAI Whisper model identifier for Genkit OpenAI plugin
      // Whisper specific options can be added to config if needed, e.g. language
    } else if (input.modelType === 'groq') {
      // IMPORTANT: Replace 'groq/whisper-model-identifier' with the actual model identifier
      // if Groq provides models via a Genkit plugin and specific identifiers.
      // If Groq access is via a direct API call not wrapped by a standard Genkit plugin,
      // this flow would need to make an HTTP request here instead of using ai.generate().
      // For this example, we'll assume a Genkit-compatible model identifier for Groq.
      modelToUse = 'groq/whisper-large-v3'; // This is a placeholder, adjust as per Groq's offering & Genkit plugin
      console.warn("Using placeholder model for Groq. Ensure 'groq/whisper-large-v3' is a valid Genkit model identifier or adjust flow logic.");
    } else {
      throw new Error(`Unsupported model type: ${input.modelType}`);
    }
    
    console.log(`Attempting transcription with model: ${modelToUse} for language: ${input.language || 'auto-detect'}`);

    try {
      const {text} = await ai.generate({
        model: modelToUse,
        prompt: promptContent, // For Whisper, the prompt is effectively the audio data.
        config: input.language ? { language: input.language } : {}, // Some models might take language in config
      });
      
      const transcribed = text ? text : "";
      if (!transcribed && text !== "") { // text() could be null if no transcription
         console.warn('Transcription result was empty or null.');
         return { transcribedText: '' };
      }
      return { transcribedText: transcribed };

    } catch (error) {
      console.error('Error during transcription with Genkit:', error);
      throw new Error(`Transcription failed with model ${modelToUse}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
