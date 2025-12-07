/**
 * Simple keyword extraction from text
 * Removes stop words and extracts meaningful keywords
 */

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
  'had', 'what', 'said', 'each', 'which', 'their', 'time', 'if', 'up',
  'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would',
  'make', 'like', 'into', 'him', 'has', 'two', 'more', 'very', 'after',
  'words', 'long', 'than', 'first', 'been', 'call', 'who', 'oil', 'sit',
  'now', 'find', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'
]);

/**
 * Extracts keywords from paragraph text
 * Returns top 3-5 meaningful keywords
 */
export function extractKeywords(text: string): string[] {
  // Convert to lowercase and remove punctuation
  const cleaned = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words
  const words = cleaned.split(' ').filter(word => word.length > 2);

  // Count word frequencies (excluding stop words)
  const wordFreq: Record<string, number> = {};
  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  // Sort by frequency and get top keywords
  const sorted = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // If we don't have enough keywords, include some from the original text
  if (sorted.length < 3) {
    const additionalWords = words
      .filter(w => !STOP_WORDS.has(w) && !sorted.includes(w))
      .slice(0, 3 - sorted.length);
    sorted.push(...additionalWords);
  }

  return sorted.slice(0, 5);
}

