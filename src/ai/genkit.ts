
'use server';
/**
 * @fileOverview Provides server actions for Genkit, utilizing the shared 'ai' instance.
 *
 * This file sets up server-callable functions that interact with Genkit.
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


// Exported async function to perform generation using Google AI models via Genkit
export async function performGoogleAIGeneration(options: GenerateOptions): Promise<GenerateResult> {
  // The 'ai.generate' call is now encapsulated within a server action.
  return ai.generate(options);
}


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
