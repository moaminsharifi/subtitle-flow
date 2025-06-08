
/**
 * @fileOverview Initializes the Genkit global `ai` instance.
 * This file does NOT use the 'use server' directive, as it exports the 'ai' object directly.
 * Other server-side modules (like flows or server actions in genkit.ts) will import 'ai' from here.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { openAI as genkitOpenAI } from 'genkitx-openai';
import { groq as genkitGroq } from 'genkitx-groq';

// Initialize Genkit with plugins
// This 'ai' object is exported for use by Genkit flows, prompts, and other server-side Genkit components.
export const ai = genkit({
  plugins: [
    googleAI(), // GOOGLE_API_KEY from environment
    genkitOpenAI(), // For direct OpenAI and AvalAI (OpenAI compatible)
    genkitGroq(),   // For Groq
  ],
  logLevel: 'debug',
  enableTracing: false, // Disabled for static export compatibility
});

