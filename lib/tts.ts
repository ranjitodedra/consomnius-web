/**
 * Google Cloud Text-to-Speech wrapper
 * For MVP, we'll use a simpler approach with the REST API
 */

/**
 * Generates TTS audio using Google Cloud TTS API
 * Returns base64 encoded audio data
 */
export async function generateTTS(
  text: string,
  apiKey: string
): Promise<{ audioContent: string; mimeType: string }> {
  if (!apiKey) {
    throw new Error('Google Cloud TTS API key is required');
  }

  // For MVP, we'll use the REST API directly
  // This requires the API key to be set up properly
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Standard-C',
        },
        audioConfig: {
          audioEncoding: 'MP3',
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid Google Cloud TTS API key');
      }
      if (response.status === 429) {
        throw new Error('Google Cloud TTS API rate limit exceeded');
      }
      const errorText = await response.text();
      throw new Error(`TTS API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return {
      audioContent: data.audioContent,
      mimeType: 'audio/mpeg',
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate TTS audio');
  }
}

/**
 * Converts base64 audio to data URL for use in HTML audio element
 */
export function base64ToDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

