
/**
 * @fileOverview Genkit development server entry point.
 * This file is used to run the Genkit development UI and test flows locally.
 * It imports all defined flows so they are discoverable by the Genkit tools.
 */

import { getFlows } from 'genkit-tools';
// Import your flows here to make them discoverable by the dev server
import './flows/transcribe-segment-flow'; // Example: Import your transcription flow

export default {
  getFlows,
};
