/**
 * Unsplash API client for fetching images
 */

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

export interface UnsplashResponse {
  results: Array<{
    urls: {
      regular: string;
      small: string;
    };
    alt_description: string | null;
    description: string | null;
  }>;
}

/**
 * Fetches images from Unsplash based on keywords
 * Returns 1 image
 */
export async function fetchUnsplashImages(
  keywords: string[],
  accessKey: string,
  limit: number = 1
): Promise<Array<{ url: string; alt: string }>> {
  if (!accessKey) {
    throw new Error('Unsplash access key is required');
  }

  // Combine keywords into a search query
  const query = keywords.slice(0, 3).join(' ');

  try {
    const response = await fetch(
      `${UNSPLASH_API_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}&client_id=${accessKey}`
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Unsplash API rate limit exceeded');
      }
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    const data: UnsplashResponse = await response.json();

    return data.results.slice(0, limit).map((photo) => ({
      url: photo.urls.regular || photo.urls.small,
      alt: photo.alt_description || photo.description || 'Image',
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch images from Unsplash');
  }
}

