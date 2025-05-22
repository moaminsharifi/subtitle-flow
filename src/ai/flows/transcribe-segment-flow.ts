
'use server';
/**
 * @fileOverview Utility for transcribing a segment of audio using OpenAI API.
 *
 * - transcribeAudioSegment - Function to transcribe an audio segment.
 * - TranscribeAudioSegmentInput - Input type for the function.
 * - TranscribeAudioSegmentOutput - Output type for the function.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import type { OpenAIModelType } from '@/lib/types';
import { dataUriToRequestFile } from '@/lib/subtitle-utils';

const TranscribeAudioSegmentInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A segment of audio, as a data URI that must include a MIME type (e.g., 'audio/wav') and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  openAIModel: z.custom<OpenAIModelType>().describe("The OpenAI transcription model to use (e.g., 'whisper-1')."),
  language: z.string().optional().describe("Optional language code for transcription (e.g., 'en', 'es'). OpenAI expects BCP-47 format."),
  openAIApiKey: z.string().describe("OpenAI API Key.")
});
export type TranscribeAudioSegmentInput = z.infer<typeof TranscribeAudioSegmentInputSchema>;

const TranscribeAudioSegmentOutputSchema = z.object({
  transcribedText: z.string().describe('The transcribed text from the audio segment.'),
});
export type TranscribeAudioSegmentOutput = z.infer<typeof TranscribeAudioSegmentOutputSchema>;

export async function transcribeAudioSegment(
  input: TranscribeAudioSegmentInput
): Promise<TranscribeAudioSegmentOutput> {

  if (!input.openAIApiKey) {
    throw new Error('OpenAI API key is required for transcription.');
  }

  const openai = new OpenAI({
    apiKey: input.openAIApiKey,
  });

  try {
    const audioFile = await dataUriToRequestFile(input.audioDataUri, 'audio_segment.wav', 'audio/wav');

    console.log(`Attempting OpenAI transcription with model: ${input.openAIModel}, language: ${input.language || 'auto-detect'}`);
    
    const transcriptionParams: OpenAI.Audio.TranscriptionCreateParams = {
        file: audioFile,
        model: input.openAIModel, // Use the selected OpenAI model
        response_format: 'json',
    };

    if (input.language) {
        transcriptionParams.language = input.language;
    }

    const transcription = await openai.audio.transcriptions.create(transcriptionParams);

    const transcribedText = transcription.text;

    if (transcribedText === undefined || transcribedText === null) {
      console.warn('OpenAI Transcription result was empty or null.');
      return { transcribedText: '' };
    }
    return { transcribedText };

  } catch (error: any) {
    console.error('Error during OpenAI transcription:', error);
    // Attempt to parse more detailed error message from OpenAI response
    const errorResponseMessage = error.response?.data?.error?.message || error.error?.message || error.message || 'Unknown transcription error';
    throw new Error(`OpenAI Transcription failed: ${errorResponseMessage}`);
  }
}
