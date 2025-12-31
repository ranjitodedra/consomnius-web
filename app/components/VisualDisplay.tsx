'use client';

import { VisualAsset } from '@/lib/types';
import { useState, useEffect } from 'react';

interface VisualDisplayProps {
  visual: VisualAsset | null;
  displayStyle: 'visual' | 'text_only';
  isLoading?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

export default function VisualDisplay({
  visual,
  displayStyle,
  isLoading = false,
  position = 'top-right',
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

  // Position classes for GIF overlay
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  if (isLoading) {
    return null; // Don't show loading state, just return nothing
  }

  if (displayStyle === 'text_only' || !visual) {
    return null; // No visual overlay for text-only
  }

  return (
    <div
      className={`absolute ${positionClasses[position]} w-48 md:w-64 lg:w-72 aspect-square z-10 transition-all duration-500 ${
        imageLoaded && fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse rounded-lg" />
      )}
      <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 bg-black/20 backdrop-blur-sm">
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

