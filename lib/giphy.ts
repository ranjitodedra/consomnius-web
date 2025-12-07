/**
 * Giphy API client for fetching GIFs
 */

const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';

export interface GiphyResponse {
  data: Array<{
    images: {
      fixed_height: {
        url: string;
      };
      original: {
        url: string;
      };
    };
    title: string;
  }>;
}

/**
 * Fetches GIFs from Giphy based on keywords
 * Returns 1-2 GIFs
 */
export async function fetchGiphyGifs(
  keywords: string[],
  apiKey: string,
  limit: number = 2
): Promise<Array<{ url: string; alt: string }>> {
  if (!apiKey) {
    throw new Error('Giphy API key is required');
  }

  // Combine keywords into a search query
  const query = keywords.slice(0, 3).join(' ');

  try {
    const response = await fetch(
      `${GIPHY_API_BASE}/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Giphy API rate limit exceeded');
      }
      throw new Error(`Giphy API error: ${response.statusText}`);
    }

    const data: GiphyResponse = await response.json();

    return data.data.slice(0, limit).map((gif) => ({
      url: gif.images.fixed_height.url || gif.images.original.url,
      alt: gif.title || 'GIF',
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch GIFs from Giphy');
  }
}

