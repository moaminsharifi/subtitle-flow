
'use server';
/**
 * @fileOverview Initializes and configures the Genkit AI toolkit.
 * Exports the configured 'ai' instance for use in flows.
 * IMPORTANT: If 'genkit' or its plugins are not installed, a mock 'ai' object
 * will be exported to allow the application to build, but AI features will be non-functional.
 */

// NOTE: The static import for 'genkit' and its plugins are commented out or removed 
// to prevent build errors if these packages are not resolved (e.g., due to npm install issues).
// import {genkit, type GenkitMemoryStore, type GenkitTraceStore} from 'genkit';
// import {googleAI} from '@genkit-ai/google-ai'; // Temporarily removed
// import {openai as openaiPlugin} from '@genkit-ai/openai'; // Temporarily removed

// Mock AI object, used if genkit is not installed or its import fails.
const mockAi = {
  defineFlow: (config: any, fn: any) => {
    const flowName = config?.name || 'unnamedFlow';
    console.warn(`Genkit CORE MODULE NOT FOUND. Mocking defineFlow for '${flowName}'. AI features will be DISABLED. Please ensure 'genkit' is installed correctly.`);
    return async (...args: any[]) => {
      console.warn(`Mocked AI flow '${flowName}' called. Genkit is not installed or not properly initialized.`);
      // Provide a specific mock response based on flowName if needed for other flows
      if (flowName === 'transcribeAudioSegmentFlow') {
        // This flow expects an object: { transcribedText: string }
        return { transcribedText: "[AI transcription is DISABLED because Genkit core module is not installed. Please run 'npm install'.]" };
      }
      // Default error for other flows
      throw new Error(`Genkit core module is not installed. AI flow '${flowName}' cannot execute.`);
    };
  },
  generate: async (params: any) => {
    const modelName = params?.model || 'unknown model';
    console.warn(`Genkit CORE MODULE NOT FOUND. Mocking 'generate' for model '${modelName}'. AI features will be DISABLED. Please ensure 'genkit' is installed correctly.`);
    // This mock should align with the expected structure from ai.generate calls
    // For Whisper, it's often { text: "transcription" } or similar.
    return { text: "[AI generation is DISABLED because Genkit core module is not installed. Please run 'npm install'.]" };
  },
  definePrompt: (config: any) => {
    const promptName = config?.name || 'unnamedPrompt';
    console.warn(`Genkit CORE MODULE NOT FOUND. Mocking definePrompt for '${promptName}'. AI features will be DISABLED. Please ensure 'genkit' is installed correctly.`);
    return async (input: any) => {
       console.warn(`Mocked AI prompt '${promptName}' called. Genkit is not installed or not properly initialized.`);
       // Prompts usually return an object like { output: ZodOutputType }
       return { output: null }; // Default mock for prompt output
    };
  },
  // Add other Genkit AI methods that might be used if necessary
  // e.g., defineTool, defineAction, etc.
};

// To resolve the "Module not found" build error for 'genkit', we directly export the mock.
// This ensures the application can build and run, albeit with AI features disabled.
// The user MUST fix their 'npm install' process for 'genkit' and its plugins
// for any actual AI functionality to be restored.
export const ai = mockAi;

console.warn(
  "IMPORTANT: Exporting a MOCK 'ai' object from 'src/ai/genkit.ts' because the 'genkit' core module (and potentially its plugins) could not be resolved at build time. " +
  "This means AI-powered features (like transcription regeneration) WILL BE DISABLED or non-functional. " +
  "To enable AI features, please ensure 'genkit' and its related packages (e.g., '@genkit-ai/openai') are correctly installed by successfully running 'npm install'."
);

// The original Firebase store logic and Genkit initialization are effectively bypassed
// when 'genkit' itself cannot be imported. If 'genkit' were available, this is where
// it would be configured:
/*
const isFirebase = !!process.env.FUNCTIONS_EMULATOR || !!process.env.K_SERVICE;
let traceStore: GenkitTraceStore | undefined = undefined;
let flowStateStore: GenkitMemoryStore | undefined = undefined;

if (isFirebase) {
  // Dynamically import Firebase stores
  Promise.all([
    import('genkitx-firebase/state'),
    import('genkitx-firebase/trace'),
  ])
    .then(([stateModule, traceModule]) => {
      // This assumes 'genkit' is available to create these stores
      // flowStateStore = stateModule.firebaseStateStore(); 
      // traceStore = traceModule.firebaseTraceStore();
      console.log('Firebase stores would be configured if Genkit was loaded.');
    })
    .catch(err =>
      console.error('Failed to load Firebase Genkit stores (Genkit itself might not be loaded):', err)
    );
}

// Original Genkit initialization (requires 'genkit' to be imported)
// export const ai = genkit({
//   plugins: [
//     // googleAI(),
//     // openaiPlugin(),
//   ],
//   flowStateStore: flowStateStore,
//   traceStore: traceStore,
//   enableTracingAndStateLogging: true,
//   logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
// });
*/
