/**
 * Visual Planner Service
 * 
 * HYBRID APPROACH:
 * 1. Heuristic chunking (deterministic, reliable) - always produces consistent results
 * 2. Gemini for semantic analysis only (scene detection, labels, confidence)
 * 
 * This ensures text is ALWAYS split correctly, while Gemini handles the "smart" parts.
 */

import { callGemini } from './geminiClient';
import { splitIntoChunks, validateChunks } from './chunkSplitter';
import { ChunkPlan, SemanticLabel } from './types';

// Valid semantic labels that Gemini can return
const VALID_SEMANTIC_LABELS: SemanticLabel[] = [
  "counting",
  "explaining",
  "arguing",
  "questioning",
  "emphasizing",
  "comparing",
  "listing",
  "storytelling",
  "describing",
  "concluding",
  "transitioning",
  "emotional_positive",
  "emotional_negative",
  "neutral",
  "dramatic",
  "humorous",
  "warning",
  "instructing"
];

const SYSTEM_PROMPT = `You are a visual scene planner for a reading app that creates a video-like experience.

You will receive a list of TEXT CHUNKS (already split). Your job is to analyze each chunk and decide:

1. SCENE ASSIGNMENT (sceneId):
   - Chunks with the same sceneId share the same visual
   - Start a NEW scene (different sceneId) when:
     • Different actor/subject appears
     • Action clearly changes
     • Emotion/tone shifts dramatically
     • Setting/location changes
     • Topic/idea changes
   - CONTINUE the scene (same sceneId) when:
     • Same actor continuing action
     • Elaborating same idea
     • Describing same scene from different angle
   - When uncertain: PREFER continuing current scene

2. IS NEW SCENE (isNewScene):
   - true: This chunk starts a new mental scene
   - false: This chunk continues the previous scene
   - First chunk is ALWAYS isNewScene: true

3. SEMANTIC LABEL (semanticLabel):
   Choose ONE: counting, explaining, arguing, questioning, emphasizing, comparing,
   listing, storytelling, describing, concluding, transitioning, emotional_positive,
   emotional_negative, neutral, dramatic, humorous, warning, instructing

4. VISUAL CHANGE CONFIDENCE (visualChangeConfidence):
   - 0.9-1.0: Definite scene change needed
   - 0.6-0.8: Likely scene change
   - 0.3-0.5: Uncertain
   - 0.0-0.2: Almost certainly same scene

5. DISPLAY STYLE (displayStyle):
   - "visual": Show visual + text (most content)
   - "text_only": Only text, no visual (very abstract concepts)

6. VISUAL TYPE (visualType):
   - "gif": For action, emotion, dynamic content
   - "image": For facts, objects, places, calm content
   - null: If displayStyle is "text_only"

7. VISUAL QUERIES (visualQueries):
   - 1-3 search queries (3-10 words each) for GIF/image APIs
   - ONLY provide for chunks where isNewScene is true
   - Empty array [] for chunks continuing a scene

8. PACE:
   - "slow": Important, emotional, complex content
   - "normal": Regular content
   - "fast": Quick facts, lists, transitions

OUTPUT FORMAT - JSON array with one object per chunk:
[
  {
    "index": 0,
    "sceneId": 1,
    "isNewScene": true,
    "semanticLabel": "explaining",
    "visualChangeConfidence": 0.95,
    "displayStyle": "visual",
    "visualType": "gif",
    "visualQueries": ["teacher explaining concept", "person at whiteboard"],
    "pace": "normal"
  },
  {
    "index": 1,
    "sceneId": 1,
    "isNewScene": false,
    "semanticLabel": "explaining",
    "visualChangeConfidence": 0.1,
    "displayStyle": "visual",
    "visualType": "gif",
    "visualQueries": [],
    "pace": "normal"
  }
]

RULES:
- Return EXACTLY one object per input chunk
- Index must match the chunk's position (0, 1, 2, ...)
- DO NOT include chunkText in output - we already have it
- Output valid JSON only. No markdown, no comments.`;

/**
 * Plans visuals for a paragraph using hybrid approach:
 * 1. Split text into chunks (deterministic heuristic)
 * 2. Send chunks to Gemini for semantic analysis
 * 
 * @param paragraph - The raw paragraph text to process
 * @returns Array of ChunkPlan objects
 */
export async function planVisualsForParagraph(paragraph: string): Promise<ChunkPlan[]> {
  if (!paragraph || paragraph.trim().length === 0) {
    throw new Error('Paragraph cannot be empty');
  }

  const normalizedParagraph = paragraph.replace(/\s+/g, ' ').trim();

  // STEP 1: Split into chunks using deterministic heuristic
  const chunks = splitIntoChunks(normalizedParagraph);
  
  if (chunks.length === 0) {
    throw new Error('No chunks produced from paragraph');
  }

  // Validate chunks reconstruct to original
  if (!validateChunks(normalizedParagraph, chunks)) {
    console.warn('Warning: Chunks do not perfectly reconstruct original text');
    console.warn('Original:', normalizedParagraph);
    console.warn('Reconstructed:', chunks.join(' '));
  }

  // STEP 2: Send chunks to Gemini for semantic analysis
  const chunksList = chunks
    .map((chunk, index) => `[${index}] "${chunk}"`)
    .join('\n');

  const fullPrompt = `${SYSTEM_PROMPT}

TEXT CHUNKS TO ANALYZE:

${chunksList}

Return JSON array with semantic analysis for each chunk (index 0 to ${chunks.length - 1}).`;

  let geminiPlans: any[] | null = null;

  try {
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000)
    );

    const responseText = await Promise.race([
      callGemini(fullPrompt),
      timeoutPromise,
    ]);

    // Parse JSON response
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    geminiPlans = JSON.parse(cleanedResponse);

    if (!Array.isArray(geminiPlans)) {
      console.warn('Gemini response is not an array, using defaults');
      geminiPlans = null;
    } else if (geminiPlans.length !== chunks.length) {
      console.warn(`Gemini returned ${geminiPlans.length} plans for ${chunks.length} chunks, using defaults for missing`);
    }
  } catch (error) {
    console.warn('Gemini semantic analysis failed:', error instanceof Error ? error.message : 'Unknown error');
    console.warn('Using default semantic values');
    geminiPlans = null;
  }

  // STEP 3: Build ChunkPlan array - chunks are guaranteed, semantic analysis is best-effort
  const chunkPlans: ChunkPlan[] = [];
  let lastSceneId = 0;
  const seenSceneIds = new Set<number>();

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const geminiPlan = geminiPlans?.[i];

    // Get Gemini values or use smart defaults
    let sceneId: number;
    let isNewScene: boolean;
    let semanticLabel: SemanticLabel;
    let visualChangeConfidence: number;
    let displayStyle: 'visual' | 'text_only';
    let visualType: 'gif' | 'image' | null;
    let visualQueries: string[];
    let pace: 'slow' | 'normal' | 'fast';

    if (geminiPlan && typeof geminiPlan === 'object') {
      // Use Gemini values with validation
      sceneId = typeof geminiPlan.sceneId === 'number' ? geminiPlan.sceneId : (i === 0 ? 1 : lastSceneId);
      isNewScene = typeof geminiPlan.isNewScene === 'boolean' ? geminiPlan.isNewScene : !seenSceneIds.has(sceneId);
      
      semanticLabel = VALID_SEMANTIC_LABELS.includes(geminiPlan.semanticLabel) 
        ? geminiPlan.semanticLabel 
        : 'neutral';
      
      visualChangeConfidence = typeof geminiPlan.visualChangeConfidence === 'number' &&
        geminiPlan.visualChangeConfidence >= 0 && geminiPlan.visualChangeConfidence <= 1
        ? geminiPlan.visualChangeConfidence
        : (isNewScene ? 0.8 : 0.2);
      
      displayStyle = geminiPlan.displayStyle === 'text_only' ? 'text_only' : 'visual';
      
      visualType = displayStyle === 'visual' 
        ? (geminiPlan.visualType === 'image' ? 'image' : 'gif')
        : null;
      
      visualQueries = Array.isArray(geminiPlan.visualQueries) 
        ? geminiPlan.visualQueries.filter((q: any) => typeof q === 'string').slice(0, 3)
        : [];
      
      pace = ['slow', 'normal', 'fast'].includes(geminiPlan.pace) ? geminiPlan.pace : 'normal';
    } else {
      // Use smart defaults when Gemini fails
      sceneId = i === 0 ? 1 : lastSceneId;
      isNewScene = i === 0;
      semanticLabel = 'neutral';
      visualChangeConfidence = i === 0 ? 1.0 : 0.2;
      displayStyle = 'visual';
      visualType = 'gif';
      visualQueries = [];
      pace = 'normal';
    }

    // First chunk is always a new scene
    if (i === 0) {
      isNewScene = true;
      sceneId = 1;
    }

    // Ensure isNewScene and sceneId are consistent
    if (isNewScene && sceneId === lastSceneId && i > 0) {
      sceneId = lastSceneId + 1;
    }
    if (!isNewScene && sceneId !== lastSceneId) {
      sceneId = lastSceneId;
    }

    // New scenes need visual queries
    if (isNewScene && displayStyle === 'visual' && visualQueries.length === 0) {
      // Generate default query from chunk text
      const words = chunkText.split(/\s+/).slice(0, 5).join(' ');
      visualQueries = [words];
    }

    // Continuing scenes shouldn't have queries
    if (!isNewScene) {
      visualQueries = [];
    }

    seenSceneIds.add(sceneId);
    lastSceneId = sceneId;

    chunkPlans.push({
      index: i,
      chunkText,
      sceneId,
      isNewScene,
      semanticLabel,
      visualChangeConfidence,
      displayStyle,
      visualType,
      visualQueries,
      pace,
    });
  }

  return chunkPlans;
}
