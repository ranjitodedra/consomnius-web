/**
 * Gemini API Client
 * Wraps @google/generative-ai SDK for visual planning
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_NAME = 'gemini-1.5-flash';

/**
 * Calls Gemini API with a prompt and returns the text response
 */
export async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    return text;
  } catch (error) {
    if (error instanceof Error) {
      // Provide more context for common errors
      if (error.message.includes('API_KEY')) {
        throw new Error('Invalid or missing GEMINI_API_KEY');
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('Gemini API rate limit exceeded');
      }
      throw error;
    }
    throw new Error('Failed to call Gemini API');
  }
}

