
// REMOVED 'use server'; for static export compatibility.
// Server Actions are not supported with output: 'export'.

/**
 * @fileOverview Provides server-side utilities for Genkit, utilizing the shared 'ai' instance.
 *
 * This file originally contained Server Actions. For static export, these have been refactored or disabled.
 * The core 'ai' instance is imported from 'genkit-instance.ts'.
 */

import { ai } from './genkit-instance'; // Import the shared ai instance
import type {GenerateOptions, GenerateResult, ModelReference} from 'genkit';
import { gemini15Pro, gemini15Flash} from '@genkit-ai/googleai';
import { openAI as genkitOpenAI } from 'genkitx-openai';
import { groq as genkitGroq } from 'genkitx-groq';
import type { CandidateData } from 'genkit/generate';
import type {
  OpenAIModelType, GroqModelType, GoogleAILLMModelType,
  AvalAIOpenAIBasedWhisperModels,
  AvalAIOpenAIBasedGPTModels,
  AvalAIGeminiBasedModels,
} from '@/lib/types';


// NOTE: performGoogleAIGeneration was a Server Action.
// Server Actions are not compatible with Next.js static exports (`output: 'export'`).
// This function is commented out to allow the build to succeed.
// Features relying on this for Google AI (Gemini) API calls from the client
// will need to be re-implemented using a direct client-side SDK if available and CORS-permissive,
// or through a separate serverless function backend if a server is used post-export.
/*
export async function performGoogleAIGeneration(options: GenerateOptions): Promise<GenerateResult> {
  // This function can no longer be a Server Action for static export.
  // If Genkit is used at build time or in a serverful environment, this can be re-enabled.
  console.warn("performGoogleAIGeneration is disabled in static export mode.");
  throw new Error("Google AI generation via Server Action is not available in static export mode.");
  // return ai.generate(options); // Original call
}
*/


// Helper to get a specific Google AI model reference
// Model names should align with what's available in the `googleAI` plugin and types.ts
export async function getGoogleAIModel(modelName: string): Promise<ModelReference<any, CandidateData, any>> {
  switch (modelName as GoogleAILLMModelType | AvalAIGeminiBasedModels) { // AvalAI Gemini models are also Google AI models
    case 'gemini-1.5-pro-latest':
      return gemini15Pro;
    case 'gemini-1.5-flash-latest':
      return gemini15Flash;
    case 'gemini-2.5-pro-preview-06-05':
        // Assuming gemini15Pro or a more specific reference if available for 2.5 from @genkit-ai/googleai
        return gemini15Pro; // Or map to the correct Genkit model reference
    case 'gemini-2.5-flash-preview-05-20':
        // Assuming gemini15Flash or a more specific reference if available for 2.5 from @genkit-ai/googleai
        return gemini15Flash; // Or map to the correct Genkit model reference
    default:
      console.warn(`Unsupported Google AI/AvalAI Gemini model: ${modelName}, defaulting to gemini-1.5-flash-latest.`);
      return gemini15Flash; // Fallback to a default model
  }
}

// Placeholder for getting OpenAI/AvalAI model references if Genkit flows were to use them server-side
// For client-side, SDKs are used directly. This shows how one might structure it for Genkit.
export async function getOpenAIModel(modelName: OpenAIModelType | AvalAIOpenAIBasedWhisperModels | AvalAIOpenAIBasedGPTModels): Promise<ModelReference<any, any, any>> {
  const modelId = `openai/${modelName}`;
  // @ts-ignore - Assuming 'openAI' refers to the imported plugin function
  return genkitOpenAI(modelId as any) as ModelReference<any, any, any>;
}

// Helper to get Groq model reference
export async function getGroqModel(modelName: GroqModelType): Promise<ModelReference<any, any, any>> {
  const modelId = `groq/${modelName}`;
  // @ts-ignore - Assuming 'groq' refers to the imported plugin function
  return genkitGroq(modelId as any) as ModelReference<any, any, any>;
}

