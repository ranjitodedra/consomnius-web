'use client';

import { VisualAsset } from '@/lib/types';
import { useState, useEffect } from 'react';

interface VisualDisplayProps {
  visual: VisualAsset | null;
  displayStyle: 'visual' | 'text_only';
  isLoading?: boolean;
}

export default function VisualDisplay({
  visual,
  displayStyle,
  isLoading = false,
}: VisualDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (visual) {
      setImageLoaded(false);
      setFadeIn(false);
    }
  }, [visual?.url]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    // Trigger fade-in after a brief delay
    setTimeout(() => setFadeIn(true), 50);
  };

  if (isLoading) {
    return null; // Don't show loading state, just return nothing
  }

  if (displayStyle === 'text_only' || !visual) {
    return null; // No visual overlay for text-only
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div
        className={`relative w-[80vw] h-[80vh] overflow-hidden shadow-2xl border-2 border-white/20 bg-black/30 backdrop-blur-sm transition-all duration-500 ${
          imageLoaded && fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse" />
        )}
        <img
          src={visual.url}
          alt={visual.alt}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          loading="eager"
        />
      </div>
    </div>
  );
}

