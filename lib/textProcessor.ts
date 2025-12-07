import { Paragraph } from './types';
import { v4 as uuidv4 } from 'uuid';

const MAX_PARAGRAPHS = 50;
const MAX_CHARACTERS = 10000;

/**
 * Splits text into paragraphs
 * - First tries splitting by double newlines (\n\n)
 * - If no double newlines, splits by single newlines and groups short lines
 * - Filters empty paragraphs
 * - Enforces max limits
 */
export function processText(text: string): Paragraph[] {
  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  if (text.length > MAX_CHARACTERS) {
    throw new Error(`Text exceeds maximum length of ${MAX_CHARACTERS} characters`);
  }

  let paragraphs: string[] = [];

  // Try splitting by double newlines first
  if (text.includes('\n\n')) {
    paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  } else if (text.includes('\n')) {
    // Split by single newlines and group short lines
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    paragraphs = groupLinesIntoParagraphs(lines);
  } else {
    // Single paragraph
    paragraphs = [text.trim()];
  }

  // Enforce max paragraphs limit
  if (paragraphs.length > MAX_PARAGRAPHS) {
    paragraphs = paragraphs.slice(0, MAX_PARAGRAPHS);
  }

  // Convert to Paragraph objects
  return paragraphs.map((text, index) => ({
    id: uuidv4(),
    text,
    index,
    total: paragraphs.length,
  }));
}

/**
 * Groups lines into paragraphs by combining short lines
 * Lines shorter than 100 characters are grouped with the next line
 */
function groupLinesIntoParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let currentParagraph = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.length < 100 && currentParagraph) {
      // Short line - append to current paragraph
      currentParagraph += ' ' + line;
    } else {
      // Long line or new paragraph
      if (currentParagraph) {
        paragraphs.push(currentParagraph.trim());
      }
      currentParagraph = line;
    }
  }

  // Add the last paragraph
  if (currentParagraph) {
    paragraphs.push(currentParagraph.trim());
  }

  return paragraphs;
}

