'use server';

/**
 * @fileOverview This file defines a Genkit flow to suggest subtitle timings based on an audio file.
 *
 * - suggestSubtitleTimings - A function that analyzes an audio file and suggests timings for subtitles.
 * - SuggestSubtitleTimingsInput - The input type for the suggestSubtitleTimings function.
 * - SuggestSubtitleTimingsOutput - The return type for the suggestSubtitleTimings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSubtitleTimingsInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      'The audio file as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Per Genkit docs
    ),
  subtitleText: z.string().describe('The subtitle text to be timed.'),
});
export type SuggestSubtitleTimingsInput = z.infer<
  typeof SuggestSubtitleTimingsInputSchema
>;

const SuggestSubtitleTimingsOutputSchema = z.object({
  suggestedStartTime: z
    .number()
    .describe('The suggested start time for the subtitle in seconds.'),
  suggestedEndTime: z
    .number()
    .describe('The suggested end time for the subtitle in seconds.'),
  confidence: z
    .number()
    .describe(
      'The confidence level of the suggested timings, between 0 and 1.'
    ),
});
export type SuggestSubtitleTimingsOutput = z.infer<
  typeof SuggestSubtitleTimingsOutputSchema
>;

export async function suggestSubtitleTimings(
  input: SuggestSubtitleTimingsInput
): Promise<SuggestSubtitleTimingsOutput> {
  return suggestSubtitleTimingsFlow(input);
}

const suggestSubtitleTimingsPrompt = ai.definePrompt({
  name: 'suggestSubtitleTimingsPrompt',
  input: {schema: SuggestSubtitleTimingsInputSchema},
  output: {schema: SuggestSubtitleTimingsOutputSchema},
  prompt: `You are an AI expert in aligning subtitles with audio.

  Given the audio file and the subtitle text, analyze the audio to determine the optimal start and end times for the subtitle.
  Consider the spoken words in the audio and the text in the subtitle to provide the most accurate timing suggestions.
  The start and end times should be in seconds.
  Return a confidence level between 0 and 1 to indicate the accuracy of the suggested timings.

  Audio: {{media url=audioDataUri}}
  Subtitle Text: {{{subtitleText}}}
  `,
});

const suggestSubtitleTimingsFlow = ai.defineFlow(
  {
    name: 'suggestSubtitleTimingsFlow',
    inputSchema: SuggestSubtitleTimingsInputSchema,
    outputSchema: SuggestSubtitleTimingsOutputSchema,
  },
  async input => {
    const {output} = await suggestSubtitleTimingsPrompt(input);
    return output!;
  }
);
