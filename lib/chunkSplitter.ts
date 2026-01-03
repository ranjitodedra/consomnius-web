/**
 * Chunk splitting utility
 * Splits text into short spoken chunks (5-9 words) based on natural speech and meaning
 * 
 * This is a DETERMINISTIC heuristic splitter - same input always produces same output.
 * Gemini handles the semantic analysis (scene planning, labels) separately.
 */

const MIN_CHUNK_WORDS = 5;
const MAX_CHUNK_WORDS = 9;
const IDEAL_CHUNK_WORDS = 7;

/**
 * Natural pause punctuation that suggests chunk boundaries
 */
const PAUSE_PUNCTUATION = [',', ';', ':', '—', '–', '.', '!', '?'];

/**
 * Conjunctions that can indicate chunk boundaries
 */
const CHUNK_BOUNDARY_WORDS = new Set([
  // Coordinating conjunctions
  'and', 'or', 'but', 'so', 'yet', 'for', 'nor',
  // Subordinating conjunctions
  'because', 'although', 'while', 'when', 'if', 'since', 'until', 'unless',
  'after', 'before', 'once', 'whereas', 'wherever', 'whether',
  // Conjunctive adverbs
  'however', 'therefore', 'moreover', 'furthermore', 'nevertheless',
  'meanwhile', 'otherwise', 'consequently', 'instead', 'thus',
  // Relative pronouns (can start new clauses)
  'which', 'that', 'who', 'whom', 'whose', 'where',
]);

/**
 * Words that often start new ideas/phrases
 */
const IDEA_STARTERS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'he', 'she', 'it', 'they', 'we', 'i', 'you',
  'there', 'here', 'now', 'then',
]);

/**
 * Splits a paragraph into short spoken chunks (5-9 words)
 * Based on natural speech patterns and semantic boundaries
 * @param paragraph - The paragraph text to split
 * @returns Array of chunk strings
 */
export function splitIntoChunks(paragraph: string): string[] {
  if (!paragraph || paragraph.trim().length === 0) {
    return [];
  }

  // Normalize whitespace
  const text = paragraph.replace(/\s+/g, ' ').trim();
  
  // First, split into sentences
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const sentenceChunks = splitSentenceIntoChunks(sentence);
    chunks.push(...sentenceChunks);
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Splits a sentence into chunks of 5-9 words
 */
function splitSentenceIntoChunks(sentence: string): string[] {
  const words = sentence.trim().split(/\s+/);
  
  if (words.length <= MAX_CHUNK_WORDS) {
    // Sentence is short enough to be a single chunk
    return [sentence.trim()];
  }

  const chunks: string[] = [];
  let currentChunk: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isLastWord = i === words.length - 1;
    const nextWord = i + 1 < words.length ? words[i + 1] : '';
    
    // Check if this word ends with pause punctuation
    const hasPausePunctuation = PAUSE_PUNCTUATION.some(p => word.endsWith(p));
    
    // Check if next word is a boundary word (conjunction, etc.)
    const nextIsBoundaryWord = CHUNK_BOUNDARY_WORDS.has(nextWord.toLowerCase().replace(/[^\w]/g, ''));
    
    // Check if next word starts a new idea
    const nextStartsIdea = IDEA_STARTERS.has(nextWord.toLowerCase().replace(/[^\w]/g, ''));

    currentChunk.push(word);
    const currentWordCount = currentChunk.length;

    // Decide if we should end the chunk here
    let shouldEndChunk = false;

    if (isLastWord) {
      // Always end on last word
      shouldEndChunk = true;
    } else if (currentWordCount >= MAX_CHUNK_WORDS) {
      // Must end - reached max size
      shouldEndChunk = true;
    } else if (currentWordCount >= IDEAL_CHUNK_WORDS && hasPausePunctuation) {
      // Good size and natural pause
      shouldEndChunk = true;
    } else if (currentWordCount >= MIN_CHUNK_WORDS && hasPausePunctuation && nextIsBoundaryWord) {
      // Minimum size, pause, and next word is a boundary
      shouldEndChunk = true;
    } else if (currentWordCount >= MIN_CHUNK_WORDS && hasPausePunctuation && nextStartsIdea) {
      // Minimum size, pause, and next word starts new idea
      shouldEndChunk = true;
    }

    if (shouldEndChunk) {
      const chunkText = currentChunk.join(' ').trim();
      if (chunkText.length > 0) {
        chunks.push(chunkText);
      }
      currentChunk = [];
    }
  }

  // Handle any remaining words
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ').trim();
    if (chunkText.length > 0) {
      // If remaining chunk is too short, merge with previous if possible
      if (chunks.length > 0 && currentChunk.length < MIN_CHUNK_WORDS) {
        chunks[chunks.length - 1] = chunks[chunks.length - 1] + ' ' + chunkText;
      } else {
        chunks.push(chunkText);
      }
    }
  }

  return chunks;
}

/**
 * Helper function to split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = '';
  let i = 0;

  while (i < text.length) {
    current += text[i];

    // Check for sentence-ending punctuation
    if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
      const nextChar = i + 1 < text.length ? text[i + 1] : '';
      const nextNextChar = i + 2 < text.length ? text[i + 2] : '';

      // Check if this is likely end of sentence:
      // - End of string
      // - Followed by space and capital letter
      // - Followed by quote then space/capital
      const isEndOfSentence = 
        i === text.length - 1 ||
        (nextChar === ' ' && /[A-Z]/.test(nextNextChar)) ||
        (nextChar === '"' || nextChar === "'") ||
        (nextChar === ' ' && nextNextChar === '"');

      // Don't end on common abbreviations
      const lastWord = current.split(/\s+/).pop()?.toLowerCase() || '';
      const isAbbreviation = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'inc', 'ltd', 'e.g', 'i.e'].some(
        abbr => lastWord.startsWith(abbr)
      );

      if (isEndOfSentence && !isAbbreviation) {
        const sentence = current.trim();
        if (sentence.length > 0) {
          sentences.push(sentence);
        }
        current = '';
      }
    }

    i++;
  }

  // Add remaining text as a sentence
  if (current.trim().length > 0) {
    sentences.push(current.trim());
  }

  return sentences.length > 0 ? sentences : [text];
}

/**
 * Validates that chunks reconstruct to original text
 */
export function validateChunks(original: string, chunks: string[]): boolean {
  const reconstructed = chunks.join(' ').replace(/\s+/g, ' ').trim();
  const normalized = original.replace(/\s+/g, ' ').trim();
  return reconstructed === normalized;
}

