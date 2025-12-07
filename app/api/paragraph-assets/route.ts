import { NextRequest, NextResponse } from 'next/server';
import { extractKeywords } from '@/lib/keywordExtractor';
import { generateTTS, base64ToDataUrl } from '@/lib/tts';
import { fetchGiphyGifs } from '@/lib/giphy';
import { fetchUnsplashImages } from '@/lib/unsplash';
import { ParagraphAssetsRequest, ParagraphAssetsResponse, VisualAsset } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: ParagraphAssetsRequest = await request.json();
    const { paragraphText, paragraphId } = body;

    if (!paragraphText || typeof paragraphText !== 'string') {
      return NextResponse.json(
        { error: 'Paragraph text is required' },
        { status: 400 }
      );
    }

    // Extract keywords
    const keywords = extractKeywords(paragraphText);

    // Get API keys from environment
    const giphyApiKey = process.env.GIPHY_API_KEY;
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    const ttsApiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;

    const visuals: VisualAsset[] = [];
    let audioUrl: string | null = null;
    const errors: { tts?: string; giphy?: string; unsplash?: string } = {};

    // Fetch TTS audio (with timeout and error handling)
    if (ttsApiKey) {
      try {
        const ttsPromise = generateTTS(paragraphText, ttsApiKey);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TTS timeout')), 10000)
        );

        const ttsResult = await Promise.race([ttsPromise, timeoutPromise]) as {
          audioContent: string;
          mimeType: string;
        };
        audioUrl = base64ToDataUrl(ttsResult.audioContent, ttsResult.mimeType);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('TTS generation failed:', errorMessage);
        errors.tts = errorMessage;
        // Continue without audio
      }
    } else {
      errors.tts = 'TTS API key not configured';
    }

    // Fetch visuals from Giphy (with timeout and error handling)
    if (giphyApiKey) {
      try {
        const giphyPromise = fetchGiphyGifs(keywords, giphyApiKey, 2);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Giphy timeout')), 10000)
        );

        const gifs = await Promise.race([giphyPromise, timeoutPromise]) as Array<{
          url: string;
          alt: string;
        }>;

        visuals.push(
          ...gifs.map((gif) => ({
            url: gif.url,
            type: 'gif' as const,
            source: 'giphy' as const,
            alt: gif.alt,
          }))
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Giphy fetch failed:', errorMessage);
        errors.giphy = errorMessage;
        // Continue without Giphy visuals
      }
    } else {
      errors.giphy = 'Giphy API key not configured';
    }

    // Fetch visuals from Unsplash (with timeout and error handling)
    if (unsplashAccessKey) {
      try {
        const unsplashPromise = fetchUnsplashImages(keywords, unsplashAccessKey, 1);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Unsplash timeout')), 10000)
        );

        const images = await Promise.race([unsplashPromise, timeoutPromise]) as Array<{
          url: string;
          alt: string;
        }>;

        visuals.push(
          ...images.map((img) => ({
            url: img.url,
            type: 'image' as const,
            source: 'unsplash' as const,
            alt: img.alt,
          }))
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Unsplash fetch failed:', errorMessage);
        errors.unsplash = errorMessage;
        // Continue without Unsplash visuals
      }
    } else {
      errors.unsplash = 'Unsplash API key not configured';
    }

    const response: ParagraphAssetsResponse = {
      assets: {
        paragraphId,
        audioUrl,
        visuals: visuals.slice(0, 3), // Limit to 3 visuals max
        keywords,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching paragraph assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paragraph assets' },
      { status: 500 }
    );
  }
}

