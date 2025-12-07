'use client';

import { VisualAsset } from '@/lib/types';
import { useState } from 'react';

interface VisualGridProps {
  visuals: VisualAsset[];
  isLoading?: boolean;
}

export default function VisualGrid({ visuals, isLoading }: VisualGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-video bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (visuals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No visuals available for this paragraph</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {visuals.map((visual, index) => (
        <div key={index} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          {!loadedImages.has(index) && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={visual.url}
            alt={visual.alt}
            className={`w-full h-full object-cover ${
              loadedImages.has(index) ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-300`}
            onLoad={() => setLoadedImages((prev) => new Set(prev).add(index))}
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

