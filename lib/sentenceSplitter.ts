/**
 * Sentence splitting utility
 * Splits paragraphs into sentences with proper handling of edge cases
 */

/**
 * Common abbreviations that shouldn't end sentences
 */
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'inc', 'ltd',
  'co', 'corp', 'st', 'ave', 'blvd', 'rd', 'u.s', 'u.s.a', 'e.g', 'i.e',
  'a.m', 'p.m', 'am', 'pm', 'no', 'vol', 'pp', 'ed', 'est', 'approx',
  'min', 'max', 'fig', 'ref', 'ex', 'al', 'cf', 'ca', 'vs', 'viz'
]);

/**
 * Splits a paragraph into sentences
 * Handles abbreviations, decimal numbers, quotes, and ellipses
 */
export function splitIntoSentences(paragraph: string): string[] {
  if (!paragraph || paragraph.trim().length === 0) {
    return [];
  }

  // Normalize whitespace
  let text = paragraph.replace(/\s+/g, ' ').trim();

  // Handle ellipses
  text = text.replace(/\.{3,}/g, '…');

  const sentences: string[] = [];
  let currentSentence = '';
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    currentSentence += char;

    // Check for sentence-ending punctuation
    if (char === '.' || char === '!' || char === '?') {
      // Check if this is actually the end of a sentence
      const nextChar = i + 1 < text.length ? text[i + 1] : '';
      const nextNextChar = i + 2 < text.length ? text[i + 2] : '';

      // Skip if followed by a digit (decimal number)
      if (/\d/.test(nextChar)) {
        i++;
        continue;
      }

      // Skip if followed by a quote and then a space or capital
      if (nextChar === '"' || nextChar === "'") {
        if (nextNextChar === ' ' || /[A-Z]/.test(nextNextChar)) {
          // This is likely the end of a sentence
        } else {
          i++;
          continue;
        }
      }

      // Check if this might be an abbreviation
      if (char === '.') {
        const wordBefore = getWordBefore(currentSentence, i);
        if (wordBefore && isAbbreviation(wordBefore)) {
          i++;
          continue;
        }
      }

      // Check if next character is uppercase (likely new sentence)
      // or if we're at the end
      if (i === text.length - 1 || 
          nextChar === ' ' && /[A-Z]/.test(nextNextChar) ||
          nextChar === '\n' ||
          (nextChar === ' ' && i + 2 < text.length && /[A-Z]/.test(text[i + 2]))) {
        // End of sentence
        const sentence = currentSentence.trim();
        if (sentence.length > 0) {
          sentences.push(sentence);
        }
        currentSentence = '';
        i++;
        continue;
      }
    }

    i++;
  }

  // Add remaining text as a sentence if any
  if (currentSentence.trim().length > 0) {
    sentences.push(currentSentence.trim());
  }

  // Filter out empty sentences and clean up
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Gets the word before the current position
 */
function getWordBefore(text: string, position: number): string | null {
  // Look backwards for word boundary
  let start = position - 1;
  while (start >= 0 && /[a-zA-Z]/.test(text[start])) {
    start--;
  }
  start++;

  if (start < position) {
    return text.substring(start, position).toLowerCase();
  }
  return null;
}

/**
 * Checks if a word is a common abbreviation
 */
function isAbbreviation(word: string): boolean {
  // Remove trailing period if present
  const cleanWord = word.replace(/\.$/, '').toLowerCase();
  return ABBREVIATIONS.has(cleanWord);
}

