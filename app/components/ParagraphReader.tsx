'use client';

import { useState, useEffect } from 'react';
import { Paragraph, ParagraphAssets } from '@/lib/types';
import { extractKeywords } from '@/lib/keywordExtractor';
import VisualGrid from './VisualGrid';
import AudioPlayer from './AudioPlayer';

interface ParagraphReaderProps {
  paragraphs: Paragraph[];
  onAssetsLoaded?: (paragraphId: string, assets: ParagraphAssets) => void;
}

export default function ParagraphReader({
  paragraphs,
  onAssetsLoaded,
}: ParagraphReaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assetsMap, setAssetsMap] = useState<Map<string, ParagraphAssets>>(new Map());
  const [loadingAssets, setLoadingAssets] = useState<Set<string>>(new Set());
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const currentParagraph = paragraphs[currentIndex];
  const currentAssets = currentParagraph
    ? assetsMap.get(currentParagraph.id)
    : null;

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
        // Set empty assets on error (graceful degradation)
        setAssetsMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(currentParagraph.id, {
            paragraphId: currentParagraph.id,
            audioUrl: null,
            visuals: [],
            keywords: extractKeywords(currentParagraph.text),
            sentencePlans: [],
            chunkPlans: [],
            sceneVisuals: {},
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
    if (currentIndex < paragraphs.length - 1) {
      const nextParagraph = paragraphs[currentIndex + 1];
      if (nextParagraph && !assetsMap.has(nextParagraph.id) && !loadingAssets.has(nextParagraph.id)) {
        // Preload in background
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
  }, [currentIndex, paragraphs, assetsMap, loadingAssets]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < paragraphs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, paragraphs.length]);

  if (!currentParagraph) {
    return null;
  }

  const isLoading = loadingAssets.has(currentParagraph.id);

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-4 text-center text-gray-600">
        Paragraph {currentIndex + 1} of {paragraphs.length}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6">
        {/* Left panel - Text */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-lg md:text-xl leading-relaxed text-gray-800">
              {currentParagraph.text}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors touch-manipulation"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-4">
              <AudioPlayer
                audioUrl={currentAssets?.audioUrl || null}
                text={currentParagraph.text}
                playbackRate={playbackRate}
                errorMessage={currentAssets?.errors?.tts}
              />
            </div>

            <button
              onClick={goToNext}
              disabled={currentIndex === paragraphs.length - 1}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors touch-manipulation"
            >
              Next →
            </button>
          </div>

          {/* Reading speed control */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Speed:</span>
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-3 py-1.5 text-sm rounded touch-manipulation ${
                  playbackRate === rate
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Right panel - Visuals */}
        <div className="space-y-2">
          <VisualGrid
            visuals={currentAssets?.visuals || []}
            isLoading={isLoading}
          />
          {(currentAssets?.errors?.giphy || currentAssets?.errors?.unsplash) && (
            <div className="text-xs text-gray-600 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-semibold text-yellow-900 mb-2">Visual API Setup Needed</p>
              <div className="space-y-1 mb-2">
                {currentAssets.errors.giphy && (
                  <p className="text-yellow-800">
                    • <strong>Giphy:</strong> {currentAssets.errors.giphy}
                    <a
                      href="https://developers.giphy.com/dashboard/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-blue-600 hover:underline"
                    >
                      Get API key →
                    </a>
                  </p>
                )}
                {currentAssets.errors.unsplash && (
                  <p className="text-yellow-800">
                    • <strong>Unsplash:</strong> {currentAssets.errors.unsplash}
                    <a
                      href="https://unsplash.com/developers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-blue-600 hover:underline"
                    >
                      Get API key →
                    </a>
                  </p>
                )}
              </div>
              <p className="text-yellow-700 text-xs mt-2 pt-2 border-t border-yellow-300">
                💡 Add API keys to <code className="bg-yellow-100 px-1 rounded">.env.local</code> and restart the server.
                See <code className="bg-yellow-100 px-1 rounded">SETUP.md</code> for detailed instructions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

