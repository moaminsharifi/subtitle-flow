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
import type { TranscribeModelType } from '@/lib/types';
import { dataUriToRequestFile } from '@/lib/subtitle-utils';

const TranscribeAudioSegmentInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A segment of audio, as a data URI that must include a MIME type (e.g., 'audio/wav') and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  modelType: z.custom<TranscribeModelType>().describe("The transcription model to use. Currently only 'openai' is functional here."),
  language: z.string().optional().describe("Optional language code for transcription (e.g., 'en', 'es')."),
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
  if (input.modelType !== 'openai') {
    console.warn(`Transcription called with modelType '${input.modelType}', but only 'openai' is implemented directly. Proceeding with OpenAI.`);
    // Or throw new Error(`Unsupported model type: ${input.modelType}. Only 'openai' is supported.`);
  }

  if (!input.openAIApiKey) {
    throw new Error('OpenAI API key is required for transcription.');
  }

  const openai = new OpenAI({
    apiKey: input.openAIApiKey,
  });

  try {
    const audioFile = await dataUriToRequestFile(input.audioDataUri, 'audio_segment.wav', 'audio/wav');

    console.log(`Attempting OpenAI transcription for language: ${input.language || 'auto-detect'}`);

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1', // OpenAI's primary transcription model
      language: input.language, // Optional: BCP-47 language code
      response_format: 'json', // Get plain text
    });

    const transcribedText = transcription.text;

    if (transcribedText === undefined || transcribedText === null) {
      console.warn('OpenAI Transcription result was empty or null.');
      return { transcribedText: '' };
    }
    return { transcribedText };

  } catch (error: any) {
    console.error('Error during OpenAI transcription:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown transcription error';
    throw new Error(`OpenAI Transcription failed: ${errorMessage}`);
  }
}
