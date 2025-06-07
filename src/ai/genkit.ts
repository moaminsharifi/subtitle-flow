'use server';
/**
 * @fileOverview Initializes Genkit with specified plugins and provides model utility functions.
 *
 * This file sets up a global `ai` object for internal use and exports async functions
 * to interact with Genkit features, suitable for use as Server Actions.
 * For OpenAI, AvalAI, and Groq, primary interaction from client-side tasks
 * will be through direct SDK instantiation, not these Genkit model getters,
 * as API keys are managed client-side. The Google AI interactions will go through
 * exported server actions from this file.
 */

import {GenerateOptions, GenerateResult, genkit, type ModelReference} from 'genkit';
import {googleAI, gemini15Pro, gemini15Flash} from '@genkit-ai/googleai';
import {openAI as genkitOpenAI} from 'genkitx-openai';
import {groq as genkitGroq} from 'genkitx-groq';
import {type CandidateData} from 'genkit/generate';
import type {
  OpenAIModelType, GroqModelType, GoogleAILLMModelType,
  AvalAIModelType
} from '@/lib/types';

// Initialize Genkit with plugins
// This 'ai' object is NOT exported directly to avoid "use server" issues with non-async exports.
// It's used internally by the async functions exported from this module.
const ai = genkit({
  plugins: [
    googleAI(), // GOOGLE_API_KEY from environment
    // genkitOpenAI(), // Not configured globally if keys are client-side for direct SDK use.
    // genkitGroq(),   // Not configured globally if keys are client-side for direct SDK use.
  ],
  logLevel: 'debug',
  enableTracing: true,
});

// Exported async function to perform generation using Google AI models via Genkit
export async function performGoogleAIGeneration(options: GenerateOptions): Promise<GenerateResult> {
  // The 'ai.generate' call is now encapsulated within a server action.
  return ai.generate(options);
}


// Helper to get a specific Google AI model reference
// Model names should align with what's available in the `googleAI` plugin and types.ts
export async function getGoogleAIModel(modelName: string): Promise<ModelReference<any, CandidateData, any>> {
  switch (modelName as GoogleAILLMModelType) {
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

// Placeholder for getting OpenAI/AvalAI model references if Genkit flows were to use them server-side
// For client-side, SDKs are used directly. This shows how one might structure it for Genkit.
export async function getOpenAIModel(modelName: OpenAIModelType | AvalAIModelType): Promise<ModelReference<any, any, any>> {
  const modelId = `openai/${modelName}`;
  // @ts-ignore - Assuming 'openAI' refers to the imported plugin function
  return genkitOpenAI(modelId as any) as ModelReference<any, any, any>;
}

// Placeholder for getting Groq model references
export async function getGroqModel(modelName: GroqModelType): Promise<ModelReference<any, any, any>> {
  const modelId = `groq/${modelName}`;
  // @ts-ignore - Assuming 'groq' refers to the imported plugin function
  return genkitGroq(modelId as any) as ModelReference<any, any, any>;
}
