'use client';

import { useState, useEffect, useCallback } from 'react';
import { Paragraph, ParagraphAssets, ChunkPlan, VisualAsset, SceneVisualMap, SemanticLabel } from '@/lib/types';
import VisualDisplay from './VisualDisplay';
import AudioPlayer from './AudioPlayer';

interface VideoPlayerProps {
  paragraphs: Paragraph[];
  onAssetsLoaded?: (paragraphId: string, assets: ParagraphAssets) => void;
}

export default function VideoPlayer({
  paragraphs,
  onAssetsLoaded,
}: VideoPlayerProps) {
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [assetsMap, setAssetsMap] = useState<Map<string, ParagraphAssets>>(new Map());
  const [loadingAssets, setLoadingAssets] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const currentParagraph = paragraphs[currentParagraphIndex];
  const currentAssets = currentParagraph
    ? assetsMap.get(currentParagraph.id)
    : null;

  // Get all chunks for current paragraph (prefer chunkPlans, fallback to sentencePlans for backward compatibility)
  const allChunks: ChunkPlan[] = currentAssets?.chunkPlans || 
    (currentAssets?.sentencePlans?.map((sp, idx) => ({
      index: sp.index,
      chunkText: sp.subtitleText,
      sceneId: sp.sceneId,
      isNewScene: idx === 0 || sp.sceneId !== currentAssets?.sentencePlans?.[idx - 1]?.sceneId,
      semanticLabel: 'neutral' as SemanticLabel,
      visualChangeConfidence: idx === 0 ? 1.0 : 0.5,
      displayStyle: sp.displayStyle,
      visualType: sp.visualType,
      visualQueries: sp.visualQueries,
      pace: sp.pace,
    })) as ChunkPlan[]) || [];
  const currentChunk = allChunks[currentChunkIndex];
  const currentSceneId = currentChunk?.sceneId ?? -1;
  const currentSemanticLabel = currentChunk?.semanticLabel ?? 'neutral';
  // sceneVisuals is an object (SceneVisualMap), not a Map
  const sceneVisuals = currentAssets?.sceneVisuals || {};
  const currentVisual = sceneVisuals[currentSceneId]?.[0] || null;
  const hasVisual = !!currentVisual && currentChunk?.displayStyle !== 'text_only';

  // Get text color based on semantic label for visual emphasis
  const getTextColorClass = (label: SemanticLabel): string => {
    switch (label) {
      case 'emotional_positive':
        return 'text-green-200';
      case 'emotional_negative':
        return 'text-red-200';
      case 'dramatic':
        return 'text-yellow-200';
      case 'humorous':
        return 'text-pink-200';
      case 'warning':
        return 'text-orange-200';
      case 'emphasizing':
        return 'text-cyan-200';
      case 'questioning':
        return 'text-purple-200';
      default:
        return 'text-white';
    }
  };

  // Load assets for current paragraph
  useEffect(() => {
    if (!currentParagraph || assetsMap.has(currentParagraph.id)) {
      return;
    }

    const loadAssets = async () => {
      setLoadingAssets((prev) => new Set(prev).add(currentParagraph.id));

      try {
        const response = await fetch('/api/paragraph-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paragraphText: currentParagraph.text,
            paragraphId: currentParagraph.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to load assets');
        }

        const data = await response.json();
        const assets: ParagraphAssets = data.assets;

        setAssetsMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(currentParagraph.id, assets);
          return newMap;
        });

        onAssetsLoaded?.(currentParagraph.id, assets);
      } catch (error) {
        console.error('Error loading assets:', error);
        // Set empty assets on error
        setAssetsMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(currentParagraph.id, {
            paragraphId: currentParagraph.id,
            audioUrl: null,
            visuals: [],
            keywords: [],
            sentencePlans: [],
            chunkPlans: [],
            sceneVisuals: {},
            errors: {
              visualPlan: error instanceof Error ? error.message : 'Failed to load assets',
            },
          });
          return newMap;
        });
      } finally {
        setLoadingAssets((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentParagraph.id);
          return newSet;
        });
      }
    };

    loadAssets();
  }, [currentParagraph, assetsMap, onAssetsLoaded]);

  // Preload next paragraph
  useEffect(() => {
    if (currentParagraphIndex < paragraphs.length - 1) {
      const nextParagraph = paragraphs[currentParagraphIndex + 1];
      if (nextParagraph && !assetsMap.has(nextParagraph.id) && !loadingAssets.has(nextParagraph.id)) {
        fetch('/api/paragraph-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paragraphText: nextParagraph.text,
            paragraphId: nextParagraph.id,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            setAssetsMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(nextParagraph.id, data.assets);
              return newMap;
            });
          })
          .catch((error) => {
            console.warn('Preload failed:', error);
          });
      }
    }
  }, [currentParagraphIndex, paragraphs, assetsMap, loadingAssets]);

  // Calculate duration for a chunk based on pace and word count
  const getChunkDuration = useCallback((chunk: ChunkPlan | undefined): number => {
    if (!chunk) return 3000;

    // Calculate based on word count (chunks are 5-9 words)
    const wordCount = chunk.chunkText.split(/\s+/).length;
    const baseDuration = Math.max(2000, wordCount * 200); // ~200ms per word
    const paceMultiplier = {
      slow: 1.5,
      normal: 1.0,
      fast: 0.7,
    }[chunk.pace];

    return baseDuration * paceMultiplier / playbackRate;
  }, [playbackRate]);

  // Handle chunk end - auto-advance to next chunk
  const handleChunkEnd = useCallback(() => {
    if (currentChunkIndex < allChunks.length - 1) {
      setCurrentChunkIndex(currentChunkIndex + 1);
    } else if (currentParagraphIndex < paragraphs.length - 1) {
      // Move to next paragraph
      setCurrentParagraphIndex(currentParagraphIndex + 1);
      setCurrentChunkIndex(0);
    } else {
      // End of content
      setIsPlaying(false);
    }
  }, [currentChunkIndex, allChunks.length, currentParagraphIndex, paragraphs.length]);

  // Reset chunk index when paragraph changes
  useEffect(() => {
    setCurrentChunkIndex(0);
  }, [currentParagraphIndex]);

  // Auto-play next sentence when sentence index changes and we're playing
  // The AudioPlayer component will handle auto-play via the autoPlay prop

  // Calculate total duration up to a specific chunk index
  const getTotalDurationUpTo = useCallback((paraIndex: number, chunkIndex: number): number => {
    let total = 0;
    for (let p = 0; p <= paraIndex; p++) {
      const para = paragraphs[p];
      if (!para) continue;
      const assets = assetsMap.get(para.id);
      const chunks = assets?.chunkPlans || 
        (assets?.sentencePlans?.map(sp => ({
          index: sp.index,
          chunkText: sp.subtitleText,
          sceneId: sp.sceneId,
          displayStyle: sp.displayStyle,
          visualType: sp.visualType,
          visualQueries: sp.visualQueries,
          pace: sp.pace,
        })) as ChunkPlan[]) || [];
      const maxChunk = p === paraIndex ? chunkIndex : chunks.length - 1;
      
      for (let c = 0; c <= maxChunk; c++) {
        const chunk = chunks[c];
        if (chunk) {
          total += getChunkDuration(chunk);
        }
      }
    }
    return total;
  }, [paragraphs, assetsMap, getChunkDuration]);

  // Rewind 10 seconds
  const rewind10s = useCallback(() => {
    const currentTime = getTotalDurationUpTo(currentParagraphIndex, currentChunkIndex);
    const targetTime = Math.max(0, currentTime - 10000);
    
    // Find the chunk at target time
    let accumulated = 0;
    for (let p = 0; p < paragraphs.length; p++) {
      const para = paragraphs[p];
      if (!para) continue;
      const assets = assetsMap.get(para.id);
      const chunks = assets?.chunkPlans || 
        (assets?.sentencePlans?.map(sp => ({
          index: sp.index,
          chunkText: sp.subtitleText,
          sceneId: sp.sceneId,
          displayStyle: sp.displayStyle,
          visualType: sp.visualType,
          visualQueries: sp.visualQueries,
          pace: sp.pace,
        })) as ChunkPlan[]) || [];
      
      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c];
        const duration = getChunkDuration(chunk);
        
        if (accumulated + duration >= targetTime) {
          setCurrentParagraphIndex(p);
          setCurrentChunkIndex(c);
          return;
        }
        accumulated += duration;
      }
    }
    
    // If we get here, go to start
    setCurrentParagraphIndex(0);
    setCurrentChunkIndex(0);
  }, [currentParagraphIndex, currentChunkIndex, paragraphs, assetsMap, getTotalDurationUpTo, getChunkDuration]);

  // Skip forward 10 seconds
  const skip10s = useCallback(() => {
    const currentTime = getTotalDurationUpTo(currentParagraphIndex, currentChunkIndex);
    const targetTime = currentTime + 10000;
    
    // Find the chunk at target time
    let accumulated = 0;
    for (let p = 0; p < paragraphs.length; p++) {
      const para = paragraphs[p];
      if (!para) continue;
      const assets = assetsMap.get(para.id);
      const chunks = assets?.chunkPlans || 
        (assets?.sentencePlans?.map(sp => ({
          index: sp.index,
          chunkText: sp.subtitleText,
          sceneId: sp.sceneId,
          displayStyle: sp.displayStyle,
          visualType: sp.visualType,
          visualQueries: sp.visualQueries,
          pace: sp.pace,
        })) as ChunkPlan[]) || [];
      
      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c];
        const duration = getChunkDuration(chunk);
        
        if (accumulated + duration >= targetTime) {
          setCurrentParagraphIndex(p);
          setCurrentChunkIndex(c);
          return;
        }
        accumulated += duration;
      }
    }
    
    // If we get here, go to end
    const lastPara = paragraphs.length - 1;
    const lastParaAssets = assetsMap.get(paragraphs[lastPara]?.id);
    const lastChunks = lastParaAssets?.chunkPlans || 
      (lastParaAssets?.sentencePlans?.map(sp => ({
        index: sp.index,
        chunkText: sp.subtitleText,
        sceneId: sp.sceneId,
        displayStyle: sp.displayStyle,
        visualType: sp.visualType,
        visualQueries: sp.visualQueries,
        pace: sp.pace,
      })) as ChunkPlan[]) || [];
    setCurrentParagraphIndex(lastPara);
    setCurrentChunkIndex(Math.max(0, lastChunks.length - 1));
  }, [currentParagraphIndex, currentChunkIndex, paragraphs, assetsMap, getTotalDurationUpTo, getChunkDuration]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Keyboard navigation - only spacebar for play/pause
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause]);

  if (!currentParagraph) {
    return null;
  }

  const isLoading = loadingAssets.has(currentParagraph.id);
  const totalChunks = allChunks.length;
  const currentChunkNumber = currentChunkIndex + 1;

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-4 text-center text-gray-600">
        <div className="text-sm">
          Paragraph {currentParagraphIndex + 1} of {paragraphs.length}
          {totalChunks > 0 && (
            <> • Chunk {currentChunkNumber} of {totalChunks}</>
          )}
        </div>
        {totalChunks > 0 && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentChunkNumber / totalChunks) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Main video area - Fireship style */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-2xl">Loading...</div>
          </div>
        ) : (
          <>
            {/* Pure black background */}
            <div className="absolute inset-0 bg-black" />

            {/* Visual display as centered overlay */}
            <VisualDisplay
              visual={currentVisual}
              displayStyle={currentChunk?.displayStyle || 'visual'}
              isLoading={false}
            />

            {/* Caption / text layout */}
            {hasVisual ? (
              // Small YouTube-style caption at bottom center
              <div className="absolute inset-x-0 bottom-6 flex justify-center px-4 z-30">
                <div className="bg-black/80 text-white text-lg md:text-xl px-4 py-2 rounded-lg shadow-lg border border-white/10 max-w-4xl w-full text-center">
                  <span className="font-semibold">{currentChunk?.chunkText || currentParagraph.text}</span>
                </div>
              </div>
            ) : (
              // Large centered text when no visual
              <div className="absolute inset-0 flex items-center justify-center p-8 md:p-12 z-20">
                <div className="text-center max-w-5xl relative">
                  <p 
                    className={`${getTextColorClass(currentSemanticLabel)} text-4xl md:text-5xl lg:text-6xl font-bold leading-tight transition-all duration-300`}
                    style={{
                      textShadow: '0 4px 12px rgba(0, 0, 0, 0.9), 0 2px 4px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    {currentChunk?.chunkText || currentParagraph.text}
                  </p>
                  {/* Scene change indicator */}
                  {currentChunk?.isNewScene && currentChunkIndex > 0 && (
                    <div className="absolute top-4 left-4 text-xs text-gray-400 opacity-50">
                      Scene {currentSceneId}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Playback controls - Video-like */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Rewind 10s */}
          <button
            onClick={rewind10s}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            title="Rewind 10 seconds"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
            <span>10s</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {isPlaying ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                <span>Pause</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Play</span>
              </>
            )}
          </button>

          {/* Skip 10s */}
          <button
            onClick={skip10s}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            title="Skip forward 10 seconds"
          >
            <span>10s</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            </svg>
          </button>
        </div>

        {/* Audio player for chunk-level playback */}
        <div className="flex justify-center">
          <AudioPlayer
            audioUrl={null}
            text={currentChunk?.chunkText || currentParagraph.text}
            playbackRate={playbackRate}
            onSentenceEnd={handleChunkEnd}
            autoPlay={isPlaying}
            errorMessage={currentAssets?.errors?.tts}
          />
        </div>

        {/* Reading speed control */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Speed:</span>
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => setPlaybackRate(rate)}
              className={`px-3 py-1.5 text-sm rounded ${
                playbackRate === rate
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } transition-colors`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Error messages */}
        {currentAssets?.errors && (
          <div className="text-xs text-gray-600 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            {(currentAssets.errors.giphy || currentAssets.errors.unsplash || currentAssets.errors.visualPlan) && (
              <div className="space-y-1 mb-2">
                {currentAssets.errors.visualPlan && (
                  <p className="text-yellow-800">
                    • <strong>Visual Planning:</strong> {currentAssets.errors.visualPlan}
                  </p>
                )}
                {currentAssets.errors.giphy && (
                  <p className="text-yellow-800">
                    • <strong>Giphy:</strong> {currentAssets.errors.giphy}
                  </p>
                )}
                {currentAssets.errors.unsplash && (
                  <p className="text-yellow-800">
                    • <strong>Unsplash:</strong> {currentAssets.errors.unsplash}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

