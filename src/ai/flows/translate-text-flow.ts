
'use server';
/**
 * @fileOverview A flow to translate a single text string to a target language.
 */

import {ai} from '@/ai/genkit-instance'; // Import ai from the new instance file
import {z} from 'genkit';
import { LANGUAGE_OPTIONS } from '@/lib/types';
import { gemini15Flash } from '@genkit-ai/googleai'; // Using Gemini Flash as a default model

const TranslateTextInputSchema = z.object({
  textToTranslate: z.string().describe('The text to be translated.'),
  targetLanguageCode: z.string().describe('The BCP-47 code of the target language (e.g., "es", "fr").'),
  // sourceLanguageCode: z.string().optional().describe('Optional BCP-47 code of the source language.'), // Source language can be part of the prompt construction if needed
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

// This prompt is designed for translation tasks.
const translateTextPrompt = ai.definePrompt({
    name: 'translateTextPrompt',
    model: gemini15Flash, // Explicitly using Gemini Flash for this prompt
    input: { schema: z.object({
        textToTranslate: z.string(),
        targetLanguageName: z.string(),
    })},
    output: { schema: TranslateTextOutputSchema },
    prompt: `Translate the following text into {{targetLanguageName}}.
Respond *only* with the translated text. Do not add any extra explanations, apologies, or conversational filler.
If the input text is a common placeholder like "New subtitle text...", "...", "null", or appears to be already in {{targetLanguageName}}, please return the original text unchanged.
Do not translate proper nouns or entities that should remain in their original language unless contextually appropriate for {{targetLanguageName}}.

Original text:
'''
{{{textToTranslate}}}
'''`,
    config: { temperature: 0.2 }, // Lower temperature for more direct and faithful translation
});

export const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    const targetLanguage = LANGUAGE_OPTIONS.find(lang => lang.value === input.targetLanguageCode);
    // Fallback to language code if full name not found, though LANGUAGE_OPTIONS should be comprehensive
    const targetLanguageName = targetLanguage ? targetLanguage.label.split(" (")[0] : input.targetLanguageCode;

    // Basic check to avoid translating very short, obviously non-translatable, or placeholder-like content.
    const textToTranslateTrimmed = input.textToTranslate.trim();
    if (textToTranslateTrimmed.length < 2 || textToTranslateTrimmed === "..." || textToTranslateTrimmed.toLowerCase() === "new subtitle text..." || textToTranslateTrimmed.toLowerCase() === "null") {
        return { translatedText: input.textToTranslate };
    }

    try {
        const result = await translateTextPrompt({
            textToTranslate: input.textToTranslate,
            targetLanguageName: targetLanguageName,
        });
        
        const output = result.output();
        if (output && typeof output.translatedText === 'string' && output.translatedText.trim() !== '') {
            return { translatedText: output.translatedText };
        }
        // Fallback if the output structure is not as expected or translation is empty
        return { translatedText: input.textToTranslate };
    } catch (error) {
        console.error(`Error during translation to ${targetLanguageName} for text "${input.textToTranslate.substring(0,50)}...":`, error);
        // On error, return original text to prevent data loss in the subtitle entry
        return { translatedText: input.textToTranslate };
    }
  }
);

// Exported wrapper function to be called from server-side logic in page.tsx
export async function translateSingleText(input: TranslateTextInput): Promise<TranslateTextOutput> {
    // This server action will invoke the Genkit flow.
    return translateTextFlow(input);
}
