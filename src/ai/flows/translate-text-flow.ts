
'use server';
/**
 * @fileOverview A flow to translate a single text string to a target language
 * using a dynamically specified model.
 */

import {ai} from '@/ai/genkit-instance';
import {z} from 'genkit';
import { LANGUAGE_OPTIONS } from '@/lib/types';
import { gemini15Flash } from '@genkit-ai/googleai'; // For fallback

const TranslateTextInputSchema = z.object({
  textToTranslate: z.string().describe('The text to be translated.'),
  targetLanguageCode: z.string().describe('The BCP-47 code of the target language (e.g., "es", "fr").'),
  modelId: z.string().optional().describe('Optional Genkit model Uid to use for translation, e.g., "googleai/gemini-1.5-flash-latest", "openai/gpt-4o".')
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    const targetLanguage = LANGUAGE_OPTIONS.find(lang => lang.value === input.targetLanguageCode);
    const targetLanguageName = targetLanguage ? targetLanguage.label.split(" (")[0] : input.targetLanguageCode;

    const textToTranslateTrimmed = input.textToTranslate.trim();
    if (textToTranslateTrimmed.length < 2 || textToTranslateTrimmed === "..." || textToTranslateTrimmed.toLowerCase() === "new subtitle text..." || textToTranslateTrimmed.toLowerCase() === "null") {
        return { translatedText: input.textToTranslate };
    }

    // Construct the prompt string
    const promptString = `Translate the following text into ${targetLanguageName}.
Respond *only* with the translated text. Do not add any extra explanations, apologies, or conversational filler.
If the input text is a common placeholder like "New subtitle text...", "...", "null", or appears to be already in ${targetLanguageName}, please return the original text unchanged.
Do not translate proper nouns or entities that should remain in their original language unless contextually appropriate for ${targetLanguageName}.

Original text:
'''
${input.textToTranslate}
'''`;

    const modelToUse = input.modelId ? ai.getModel(input.modelId) : gemini15Flash; // Fallback to gemini15Flash

    try {
        const {output} = await ai.generate({
            model: modelToUse,
            prompt: promptString,
            output: { schema: TranslateTextOutputSchema },
            config: { temperature: 0.2 },
        });
        
        if (output && typeof output.translatedText === 'string' && output.translatedText.trim() !== '') {
            return { translatedText: output.translatedText };
        }
        return { translatedText: input.textToTranslate };
    } catch (error) {
        console.error(`Error during translation to ${targetLanguageName} using model ${input.modelId || 'default (gemini15Flash)'} for text "${input.textToTranslate.substring(0,50)}...":`, error);
        return { translatedText: input.textToTranslate };
    }
  }
);

export async function translateSingleText(input: TranslateTextInput): Promise<TranslateTextOutput> {
    return translateTextFlow(input);
}

    