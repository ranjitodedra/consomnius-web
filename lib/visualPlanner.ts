/**
 * Visual Planner Service
 * Uses Gemini LLM to plan visual presentation for paragraphs
 */

import { splitIntoSentences } from './sentenceSplitter';
import { callGemini } from './geminiClient';
import { SentencePlan } from './types';

const SYSTEM_PROMPT = `You are a visual scene planner for a reading app.

The app reads a paragraph aloud and shows visuals (images/GIFs) behind it.

At the bottom of the screen, the user sees subtitles, one sentence or short chunk at a time,
aligned with the read-aloud text.

INPUT YOU RECEIVE:
- An ordered list of sentences from a single paragraph that will be read in that exact order.
- Each sentence string is the exact text that will be spoken and shown as subtitles.

YOUR JOB:
- For each sentence, decide:
  1) Whether it should share a visual "scene" with neighboring sentences or start a new scene.
  2) Whether this part should be visual ("visual") or only text ("text_only").
  3) If visual, whether to use a GIF or an image.
  4) 1–3 short, concrete visual search queries that can be sent to GIF/image APIs
     (e.g. Giphy, Unsplash) to retrieve relevant visuals.

CONSTRAINTS:
- You MUST NOT rewrite or invent any new script. You do NOT change the words being read.
- You must not summarize or omit sentences.
- You ONLY plan visuals and scene grouping.
- Sentences that describe the same idea/theme should usually share the same sceneId so that
  the visual remains on screen while subtitles advance.
- When the idea or focus clearly changes, you should start a new sceneId with a new visual.
- Use "text_only" for very abstract or generic lines where a visual would be confusing.
- For "visual" segments, choose:
    - "gif" for dynamic, emotional, or action-heavy content.
    - "image" for historical facts, objects, places, or calm explanations.

JSON OUTPUT FORMAT (and nothing else):
- You MUST return an array with one object per sentence index i.
[
  {
    "index": <integer, 0-based index into the input sentence list>,
    "subtitleText": "<exact sentence text from input>",
    "sceneId": <integer, same number means same visual scene>,
    "displayStyle": "visual" | "text_only",
    "visualType": "gif" | "image" | null,
    "visualQueries": ["<short visual search query 1>", "<query 2>"],
    "pace": "slow" | "normal" | "fast"
  },
  ...
]

Rules:
- There must be exactly one object per input sentence, with matching index.
- subtitleText MUST be identical to the sentence at that index (ignoring leading/trailing spaces).
- visualQueries must be 3–10 words and describe a concrete scene (people, objects, setting).
- Output valid JSON only. No markdown, no comments, no extra text.`;

/**
 * Plans visuals for a paragraph using Gemini LLM
 * @param paragraph - The paragraph text to plan visuals for
 * @returns Array of SentencePlan objects
 */
export async function planVisualsForParagraph(paragraph: string): Promise<SentencePlan[]> {
  if (!paragraph || paragraph.trim().length === 0) {
    throw new Error('Paragraph cannot be empty');
  }

  // Step 1: Split paragraph into sentences
  const sentences = splitIntoSentences(paragraph);

  if (sentences.length === 0) {
    throw new Error('No sentences found in paragraph');
  }

  // Step 2: Construct prompt with sentences
  const sentencesList = sentences
    .map((sentence, index) => `[${index}] ${sentence}`)
    .join('\n');

  const fullPrompt = `${SYSTEM_PROMPT}

SENTENCES:

${sentencesList}

Now return the JSON array of SentencePlan objects as specified above.`;

  // Step 3: Call Gemini API with timeout
  let responseText: string;
  try {
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000)
    );

    responseText = await Promise.race([
      callGemini(fullPrompt),
      timeoutPromise,
    ]);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get response from Gemini: ${error.message}`);
    }
    throw new Error('Failed to get response from Gemini');
  }

  // Step 4: Parse JSON response
  let sentencePlans: SentencePlan[];
  try {
    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    sentencePlans = JSON.parse(cleanedResponse);
  } catch (error) {
    throw new Error(`Failed to parse Gemini response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Step 5: Validate response
  if (!Array.isArray(sentencePlans)) {
    throw new Error('Gemini response is not an array');
  }

  if (sentencePlans.length !== sentences.length) {
    throw new Error(
      `Sentence plan count (${sentencePlans.length}) does not match sentence count (${sentences.length})`
    );
  }

  // Step 6: Validate each sentence plan
  const validatedPlans: SentencePlan[] = [];

  for (let i = 0; i < sentencePlans.length; i++) {
    const plan = sentencePlans[i];
    const originalSentence = sentences[i].trim();

    // Validate required fields
    if (typeof plan.index !== 'number') {
      throw new Error(`Sentence plan at position ${i} is missing or has invalid index`);
    }

    if (plan.index !== i) {
      throw new Error(`Sentence plan index mismatch: expected ${i}, got ${plan.index}`);
    }

    if (typeof plan.subtitleText !== 'string') {
      throw new Error(`Sentence plan at index ${i} is missing subtitleText`);
    }

    // Validate subtitleText matches original sentence (allowing whitespace differences)
    const planSubtitle = plan.subtitleText.trim();
    if (planSubtitle !== originalSentence) {
      // Allow only whitespace differences, not semantic changes
      const normalizedPlan = planSubtitle.replace(/\s+/g, ' ');
      const normalizedOriginal = originalSentence.replace(/\s+/g, ' ');
      
      if (normalizedPlan !== normalizedOriginal) {
        throw new Error(
          `Sentence plan at index ${i} has subtitleText mismatch.\n` +
          `Expected: "${originalSentence}"\n` +
          `Got: "${planSubtitle}"`
        );
      }
      
      // Fix whitespace differences
      plan.subtitleText = originalSentence;
    }

    // Validate other required fields
    if (typeof plan.sceneId !== 'number') {
      throw new Error(`Sentence plan at index ${i} is missing sceneId`);
    }

    if (plan.displayStyle !== 'visual' && plan.displayStyle !== 'text_only') {
      throw new Error(`Sentence plan at index ${i} has invalid displayStyle: ${plan.displayStyle}`);
    }

    if (plan.displayStyle === 'visual') {
      if (plan.visualType !== 'gif' && plan.visualType !== 'image') {
        throw new Error(`Sentence plan at index ${i} has invalid visualType for visual display: ${plan.visualType}`);
      }
      if (!Array.isArray(plan.visualQueries) || plan.visualQueries.length === 0 || plan.visualQueries.length > 3) {
        throw new Error(`Sentence plan at index ${i} must have 1-3 visualQueries`);
      }
    } else {
      // text_only should have null visualType
      if (plan.visualType !== null) {
        plan.visualType = null;
      }
      if (!Array.isArray(plan.visualQueries) || plan.visualQueries.length > 0) {
        plan.visualQueries = [];
      }
    }

    if (plan.pace !== 'slow' && plan.pace !== 'normal' && plan.pace !== 'fast') {
      throw new Error(`Sentence plan at index ${i} has invalid pace: ${plan.pace}`);
    }

    // Validate visualQueries are strings
    if (Array.isArray(plan.visualQueries)) {
      for (let j = 0; j < plan.visualQueries.length; j++) {
        if (typeof plan.visualQueries[j] !== 'string') {
          throw new Error(`Sentence plan at index ${i}, visualQuery ${j} is not a string`);
        }
      }
    }

    validatedPlans.push(plan as SentencePlan);
  }

  return validatedPlans;
}

