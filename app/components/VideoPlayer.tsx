'use client';

import { useState, useEffect, useCallback } from 'react';
import { Paragraph, ParagraphAssets, SentencePlan, VisualAsset, SceneVisualMap } from '@/lib/types';
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
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [assetsMap, setAssetsMap] = useState<Map<string, ParagraphAssets>>(new Map());
  const [loadingAssets, setLoadingAssets] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const currentParagraph = paragraphs[currentParagraphIndex];
  const currentAssets = currentParagraph
    ? assetsMap.get(currentParagraph.id)
    : null;

  // Get all sentences for current paragraph
  const allSentences: SentencePlan[] = currentAssets?.sentencePlans || [];
  const currentSentence = allSentences[currentSentenceIndex];
  const currentSceneId = currentSentence?.sceneId ?? -1;
  // sceneVisuals is an object (SceneVisualMap), not a Map
  const sceneVisuals = currentAssets?.sceneVisuals || {};
  const currentVisual = sceneVisuals[currentSceneId]?.[0] || null;

  // Dynamic GIF positioning - alternate between positions for visual interest
  const getGifPosition = (): 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' => {
    const positions: Array<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'> = [
      'top-right',
      'top-left',
      'bottom-right',
      'bottom-left',
    ];
    // Use sentence index to determine position (cycles through positions)
    return positions[currentSentenceIndex % positions.length];
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

  // Calculate duration for a sentence based on pace and text length
  const getSentenceDuration = useCallback((sentence: SentencePlan | undefined): number => {
    if (!sentence) return 3000;

    const baseDuration = Math.max(2000, sentence.subtitleText.length * 100);
    const paceMultiplier = {
      slow: 1.5,
      normal: 1.0,
      fast: 0.7,
    }[sentence.pace];

    return baseDuration * paceMultiplier / playbackRate;
  }, [playbackRate]);

  // Handle sentence end - auto-advance to next sentence
  const handleSentenceEnd = useCallback(() => {
    if (currentSentenceIndex < allSentences.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
    } else if (currentParagraphIndex < paragraphs.length - 1) {
      // Move to next paragraph
      setCurrentParagraphIndex(currentParagraphIndex + 1);
      setCurrentSentenceIndex(0);
    } else {
      // End of content
      setIsPlaying(false);
    }
  }, [currentSentenceIndex, allSentences.length, currentParagraphIndex, paragraphs.length]);

  // Reset sentence index when paragraph changes
  useEffect(() => {
    setCurrentSentenceIndex(0);
  }, [currentParagraphIndex]);

  // Auto-play next sentence when sentence index changes and we're playing
  // The AudioPlayer component will handle auto-play via the autoPlay prop

  // Calculate total duration up to a specific sentence index
  const getTotalDurationUpTo = useCallback((paraIndex: number, sentenceIndex: number): number => {
    let total = 0;
    for (let p = 0; p <= paraIndex; p++) {
      const para = paragraphs[p];
      if (!para) continue;
      const assets = assetsMap.get(para.id);
      const sentences = assets?.sentencePlans || [];
      const maxSentence = p === paraIndex ? sentenceIndex : sentences.length - 1;
      
      for (let s = 0; s <= maxSentence; s++) {
        const sentence = sentences[s];
        if (sentence) {
          total += getSentenceDuration(sentence);
        }
      }
    }
    return total;
  }, [paragraphs, assetsMap, getSentenceDuration]);

  // Rewind 10 seconds
  const rewind10s = useCallback(() => {
    const currentTime = getTotalDurationUpTo(currentParagraphIndex, currentSentenceIndex);
    const targetTime = Math.max(0, currentTime - 10000);
    
    // Find the sentence at target time
    let accumulated = 0;
    for (let p = 0; p < paragraphs.length; p++) {
      const para = paragraphs[p];
      if (!para) continue;
      const assets = assetsMap.get(para.id);
      const sentences = assets?.sentencePlans || [];
      
      for (let s = 0; s < sentences.length; s++) {
        const sentence = sentences[s];
        const duration = getSentenceDuration(sentence);
        
        if (accumulated + duration >= targetTime) {
          setCurrentParagraphIndex(p);
          setCurrentSentenceIndex(s);
          return;
        }
        accumulated += duration;
      }
    }
    
    // If we get here, go to start
    setCurrentParagraphIndex(0);
    setCurrentSentenceIndex(0);
  }, [currentParagraphIndex, currentSentenceIndex, paragraphs, assetsMap, getTotalDurationUpTo, getSentenceDuration]);

  // Skip forward 10 seconds
  const skip10s = useCallback(() => {
    const currentTime = getTotalDurationUpTo(currentParagraphIndex, currentSentenceIndex);
    const targetTime = currentTime + 10000;
    
    // Find the sentence at target time
    let accumulated = 0;
    for (let p = 0; p < paragraphs.length; p++) {
      const para = paragraphs[p];
      if (!para) continue;
      const assets = assetsMap.get(para.id);
      const sentences = assets?.sentencePlans || [];
      
      for (let s = 0; s < sentences.length; s++) {
        const sentence = sentences[s];
        const duration = getSentenceDuration(sentence);
        
        if (accumulated + duration >= targetTime) {
          setCurrentParagraphIndex(p);
          setCurrentSentenceIndex(s);
          return;
        }
        accumulated += duration;
      }
    }
    
    // If we get here, go to end
    const lastPara = paragraphs.length - 1;
    const lastParaAssets = assetsMap.get(paragraphs[lastPara]?.id);
    const lastSentences = lastParaAssets?.sentencePlans || [];
    setCurrentParagraphIndex(lastPara);
    setCurrentSentenceIndex(Math.max(0, lastSentences.length - 1));
  }, [currentParagraphIndex, currentSentenceIndex, paragraphs, assetsMap, getTotalDurationUpTo, getSentenceDuration]);

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
  const totalSentences = allSentences.length;
  const currentSentenceNumber = currentSentenceIndex + 1;

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-4 text-center text-gray-600">
        <div className="text-sm">
          Paragraph {currentParagraphIndex + 1} of {paragraphs.length}
          {totalSentences > 0 && (
            <> • Sentence {currentSentenceNumber} of {totalSentences}</>
          )}
        </div>
        {totalSentences > 0 && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentSentenceNumber / totalSentences) * 100}%` }}
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

            {/* Visual display as overlay */}
            <VisualDisplay
              visual={currentVisual}
              displayStyle={currentSentence?.displayStyle || 'visual'}
              isLoading={false}
              position={getGifPosition()}
            />

            {/* Large centered text - Fireship style */}
            <div className="absolute inset-0 flex items-center justify-center p-8 md:p-12 z-20">
              <div className="text-center max-w-5xl">
                <p 
                  className="text-white text-4xl md:text-5xl lg:text-6xl font-bold leading-tight transition-opacity duration-300"
                  style={{
                    textShadow: '0 4px 12px rgba(0, 0, 0, 0.9), 0 2px 4px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {currentSentence?.subtitleText || currentParagraph.text}
                </p>
              </div>
            </div>
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

        {/* Audio player for sentence-level playback */}
        <div className="flex justify-center">
          <AudioPlayer
            audioUrl={null}
            text={currentSentence?.subtitleText || currentParagraph.text}
            playbackRate={playbackRate}
            onSentenceEnd={handleSentenceEnd}
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

