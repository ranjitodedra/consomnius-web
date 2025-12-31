// TypeScript interfaces for the Visual Reading Companion

export interface Paragraph {
  id: string; // UUID or index-based
  text: string;
  index: number; // 0-based
  total: number;
}

export interface VisualAsset {
  url: string;
  type: 'gif' | 'image';
  source: 'giphy' | 'unsplash';
  alt: string; // Description for accessibility
}

// Scene visual mapping (for serialization)
export interface SceneVisualMap {
  [sceneId: number]: VisualAsset[];
}

export interface ParagraphAssets {
  paragraphId: string;
  audioUrl: string | null; // URL to TTS audio or null if failed
  visuals: VisualAsset[]; // Array of 1-3 visuals (legacy, for backward compatibility)
  keywords: string[]; // Extracted keywords used for search (legacy)
  sentencePlans: SentencePlan[]; // Sentence-level visual plans
  sceneVisuals: SceneVisualMap; // Map of sceneId to visuals (object for JSON serialization)
  errors?: {
    tts?: string;
    giphy?: string;
    unsplash?: string;
    visualPlan?: string;
  };
}

// API Request/Response Types
export interface ProcessTextRequest {
  text: string;
}

export interface ProcessTextResponse {
  paragraphs: Paragraph[];
}

export interface ParagraphAssetsRequest {
  paragraphText: string;
  paragraphId: string;
}

export interface ParagraphAssetsResponse {
  assets: ParagraphAssets;
}

// Visual Planning Types (Gemini LLM)
export type SentencePlan = {
  index: number; // 0-based index into sentences array
  subtitleText: string; // MUST match sentences[index] exactly (trimmed)
  sceneId: number; // Sentences with same sceneId share the same visual scene
  displayStyle: "visual" | "text_only"; // Show visuals+subtitles or text only
  visualType: "gif" | "image" | null; // null if displayStyle is "text_only"
  visualQueries: string[]; // 1-3 short, concrete search queries (3-10 words each)
  pace: "slow" | "normal" | "fast"; // Controls reading speed/timing
};

export interface VisualPlanRequest {
  paragraph: string;
}

export interface VisualPlanResponse {
  sentencePlans: SentencePlan[];
}

