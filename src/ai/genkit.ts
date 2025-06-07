'use server';
/**
 * @fileOverview Initializes Genkit with the Google AI plugin.
 *
 * This file sets up a global `ai` object configured to use Google AI models.
 * API keys for Google AI should be set via the GOOGLE_API_KEY environment variable.
 * Other Genkit plugins like `genkitx-openai` and `genkitx-groq` are included
 * in package.json but are typically instantiated directly in client-side tasks
 * with API keys from localStorage, rather than being globally configured here,
 * to support dynamic, user-provided keys in a client-rendered application.
 */

import {genkit, type ModelReference} from 'genkit';
import {googleAI, geminiPro, gemini15Pro, gemini15Flash} from '@genkit-ai/googleai';
import {type CandidateData} from 'genkit/generate';

// Initialize Genkit with the Google AI plugin.
// The Google AI plugin will typically look for the GOOGLE_API_KEY environment variable.
// In a Next.js `output: 'export'` setup, "environment variables" for server actions
// might need to be managed carefully or passed through. For client-side rendering,
// API keys from localStorage are usually passed directly to SDKs or client-side Genkit calls if supported.
// Here, we initialize it simply. The `runTranscriptionTask` will handle API keys for Google AI if needed
// or rely on this global initialization if it correctly picks up a key from the execution environment.
export const ai = genkit({
  plugins: [
    googleAI(), // GOOGLE_API_KEY should be available in the environment where this code runs
    // `genkitx-openai` and `genkitx-groq` are not initialized globally here
    // as their API keys come from localStorage and are used for direct SDK instantiation
    // in client-side tasks like `runTranscriptionTask`.
  ],
  logLevel: 'debug', // Set to 'info' or 'warn' for production
  enableTracing: true,
});


// Helper to get a specific Google AI model reference
// Model names should align with what's available in the `googleAI` plugin and types.ts
export function getGoogleAIModel(modelName: string): ModelReference<any, CandidateData, any> {
  switch (modelName) {
    case 'gemini-1.5-pro-latest':
      return gemini15Pro;
    case 'gemini-1.5-flash-latest':
      return gemini15Flash;
    // Add other Google AI models as needed
    default:
      console.warn(`Unsupported Google AI model: ${modelName}, defaulting to gemini-1.5-flash-latest.`);
      return gemini15Flash; // Fallback to a default model
  }
}

// Note: Specific model references for OpenAI (genkitx-openai) or Groq (genkitx-groq)
// are not exposed here because those services will be called via their direct SDKs
// in `runTranscriptionTask.ts` using API keys from `localStorage`.
