import { NextRequest, NextResponse } from 'next/server';
import { extractKeywords } from '@/lib/keywordExtractor';
import { generateTTS, base64ToDataUrl } from '@/lib/tts';
import { fetchGiphyGifs } from '@/lib/giphy';
import { fetchUnsplashImages } from '@/lib/unsplash';
import { planVisualsForParagraph } from '@/lib/visualPlanner';
import { ParagraphAssetsRequest, ParagraphAssetsResponse, VisualAsset, SceneVisualMap } from '@/lib/types';

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

    // Extract keywords (for backward compatibility)
    const keywords = extractKeywords(paragraphText);

    // Get API keys from environment
    const giphyApiKey = process.env.GIPHY_API_KEY;
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    const ttsApiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    const visuals: VisualAsset[] = []; // Legacy visuals array
    const sceneVisuals: SceneVisualMap = {}; // New scene-based visuals
    let audioUrl: string | null = null;
    let sentencePlans: any[] = [];
    const errors: { tts?: string; giphy?: string; unsplash?: string; visualPlan?: string } = {};

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

    // Step 1: Get visual plan from Gemini (if available)
    if (geminiApiKey) {
      try {
        const planPromise = planVisualsForParagraph(paragraphText);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Visual plan timeout')), 30000)
        );

        sentencePlans = await Promise.race([planPromise, timeoutPromise]) as any[];

        // Step 2: Fetch visuals for each unique scene
        const uniqueScenes = new Map<number, { visualType: 'gif' | 'image'; queries: string[] }>();
        
        for (const plan of sentencePlans) {
          if (plan.displayStyle === 'visual' && plan.visualType && plan.visualQueries.length > 0) {
            if (!uniqueScenes.has(plan.sceneId)) {
              uniqueScenes.set(plan.sceneId, {
                visualType: plan.visualType,
                queries: plan.visualQueries,
              });
            }
          }
        }

        // Step 3: Fetch visuals for each scene
        for (const [sceneId, sceneInfo] of uniqueScenes.entries()) {
          const sceneAssets: VisualAsset[] = [];

          if (sceneInfo.visualType === 'gif' && giphyApiKey) {
            try {
              // Try each query until we get results
              for (const query of sceneInfo.queries.slice(0, 2)) {
                try {
                  // Split query into words for the API
                  const queryWords = query.split(/\s+/).filter(w => w.length > 0);
                  const giphyPromise = fetchGiphyGifs(queryWords, giphyApiKey, 1);
                  const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Giphy timeout')), 10000)
                  );

                  const gifs = await Promise.race([giphyPromise, timeoutPromise]) as Array<{
                    url: string;
                    alt: string;
                  }>;

                  if (gifs.length > 0) {
                    sceneAssets.push({
                      url: gifs[0].url,
                      type: 'gif' as const,
                      source: 'giphy' as const,
                      alt: gifs[0].alt,
                    });
                    break; // Got a result, move to next scene
                  }
                } catch (err) {
                  // Try next query
                  continue;
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch GIF for scene ${sceneId}:`, error);
            }
          } else if (sceneInfo.visualType === 'image' && unsplashAccessKey) {
            try {
              // Try each query until we get results
              for (const query of sceneInfo.queries.slice(0, 2)) {
                try {
                  // Split query into words for the API
                  const queryWords = query.split(/\s+/).filter(w => w.length > 0);
                  const unsplashPromise = fetchUnsplashImages(queryWords, unsplashAccessKey, 1);
                  const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Unsplash timeout')), 10000)
                  );

                  const images = await Promise.race([unsplashPromise, timeoutPromise]) as Array<{
                    url: string;
                    alt: string;
                  }>;

                  if (images.length > 0) {
                    sceneAssets.push({
                      url: images[0].url,
                      type: 'image' as const,
                      source: 'unsplash' as const,
                      alt: images[0].alt,
                    });
                    break; // Got a result, move to next scene
                  }
                } catch (err) {
                  // Try next query
                  continue;
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch image for scene ${sceneId}:`, error);
            }
          }

          if (sceneAssets.length > 0) {
            sceneVisuals[sceneId] = sceneAssets;
            // Also add to legacy visuals array for backward compatibility
            visuals.push(...sceneAssets.slice(0, 1));
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Visual planning failed:', errorMessage);
        errors.visualPlan = errorMessage;
        // Fall back to keyword-based visuals
      }
    } else {
      errors.visualPlan = 'Gemini API key not configured';
    }

    // Fallback: Fetch visuals from Giphy using keywords (if visual plan failed)
    if (Object.keys(sceneVisuals).length === 0 && giphyApiKey) {
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
        if (!errors.giphy) {
          errors.giphy = errorMessage;
        }
      }
    } else if (!giphyApiKey && Object.keys(sceneVisuals).length === 0) {
      errors.giphy = 'Giphy API key not configured';
    }

    // Fallback: Fetch visuals from Unsplash using keywords (if visual plan failed)
    if (Object.keys(sceneVisuals).length === 0 && unsplashAccessKey) {
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
        if (!errors.unsplash) {
          errors.unsplash = errorMessage;
        }
      }
    } else if (!unsplashAccessKey && Object.keys(sceneVisuals).length === 0) {
      errors.unsplash = 'Unsplash API key not configured';
    }

    const response: ParagraphAssetsResponse = {
      assets: {
        paragraphId,
        audioUrl,
        visuals: visuals.slice(0, 3), // Legacy: Limit to 3 visuals max
        keywords, // Legacy
        sentencePlans: sentencePlans.length > 0 ? sentencePlans : [],
        sceneVisuals: sceneVisuals,
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

