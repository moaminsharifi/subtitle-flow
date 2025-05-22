
'use server';
/**
 * @fileOverview Utility for transcribing a segment of audio using OpenAI API.
 *
 * - transcribeAudioSegment - Function to transcribe an audio segment.
 * - TranscribeAudioSegmentInput - Input type for the function.
 * - TranscribeAudioSegmentOutput - Output type for the function (now returns segments).
 */

import OpenAI from 'openai';
import { z } from 'zod';
import type { OpenAIModelType, Segment } from '@/lib/types';
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

const SegmentSchema = z.object({
  id: z.number().optional(),
  start: z.number().describe("Start time of the segment in seconds."),
  end: z.number().describe("End time of the segment in seconds."),
  text: z.string().describe("Transcribed text of the segment."),
  // OpenAI verbose response has more fields, but these are primary
});

const TranscribeAudioSegmentOutputSchema = z.object({
  segments: z.array(SegmentSchema).describe('Array of transcribed segments with timestamps.'),
  fullText: z.string().describe('The full concatenated transcribed text from all segments.'),
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
        model: input.openAIModel,
        response_format: 'verbose_json', // Request detailed segments
        timestamp_granularities: ["segment"] // Request segment-level timestamps
    };

    if (input.language) {
        transcriptionParams.language = input.language;
    }

    const transcription = await openai.audio.transcriptions.create(transcriptionParams);

    // The actual response structure for verbose_json might be directly the object
    // or nested under a property. Assuming `transcription` is the direct response object.
    const apiResponse = transcription as OpenAI.Audio.Transcriptions.TranscriptionVerboseJson;

    const segments: Segment[] = apiResponse.segments?.map(s => ({
      id: s.id,
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    })) || [];
    
    const fullText = apiResponse.text || segments.map(s => s.text).join(' ') || "";


    if (segments.length === 0 && !fullText) {
      console.warn('OpenAI Transcription result was empty (no segments or text).');
      return { segments: [], fullText: "" };
    }
    return { segments, fullText };

  } catch (error: any) {
    console.error('Error during OpenAI transcription:', error);
    const errorResponseMessage = error.response?.data?.error?.message || error.error?.message || error.message || 'Unknown transcription error';
    throw new Error(`OpenAI Transcription failed: ${errorResponseMessage}`);
  }
}
