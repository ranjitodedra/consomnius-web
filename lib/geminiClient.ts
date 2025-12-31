/**
 * Gemini API Client
 * Wraps @google/genai SDK for visual planning
 */

import { GoogleGenAI } from '@google/genai';

// Try these models in order - gemini-2.5-flash is recommended by official documentation
const MODEL_NAMES = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-pro',
];

/**
 * Calls Gemini API with a prompt and returns the text response
 */
export async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  // The client automatically gets the API key from the environment variable GEMINI_API_KEY
  const ai = new GoogleGenAI({});
  let lastError: Error | null = null;

  // Try each model until one works
  for (const modelName of MODEL_NAMES) {
    try {
      console.log(`[Gemini Client] Trying model: ${modelName}`);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini API');
      }

      console.log(`[Gemini Client] Successfully using model: ${modelName}`);
      return response.text;
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message || String(error);
        lastError = error;
        
        // If it's a model not found error, try next model
        if (errorMessage.includes('not found') || errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          console.warn(`[Gemini Client] Model ${modelName} not available, trying next...`);
          continue;
        }
        
        // For other errors, throw immediately
        if (errorMessage.includes('API_KEY') || errorMessage.includes('401') || errorMessage.includes('403')) {
          throw new Error('Invalid or missing GEMINI_API_KEY');
        }
        if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          throw new Error('Gemini API rate limit exceeded');
        }
        throw error;
      }
    }
  }

  // If all models failed, throw the last error
  throw new Error(
    `Failed to call Gemini API with any available model. ` +
    `Please verify: 1) Your API key is correct, 2) The Generative Language API is enabled, ` +
    `3) Your API key has access to Gemini models. Get a new key from https://makersuite.google.com/app/apikey. ` +
    `Last error: ${lastError?.message || 'Unknown error'}`
  );
}

