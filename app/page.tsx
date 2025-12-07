'use client';

import { useState } from 'react';
import { Paragraph } from '@/lib/types';
import TextInput from './components/TextInput';
import ParagraphReader from './components/ParagraphReader';

export default function Home() {
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessText = async (text: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/process-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process text');
      }

      const data = await response.json();
      setParagraphs(data.paragraphs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setParagraphs([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setParagraphs([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Visual Reading Companion
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Transform text into a visual and audio reading experience
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {paragraphs.length === 0 ? (
          <div className="space-y-6">
            <div className="max-w-4xl mx-auto p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Getting Started</h3>
              <p className="text-blue-800 text-sm mb-2">
                For the best experience, configure API keys in <code className="bg-blue-100 px-1 rounded">.env.local</code>:
              </p>
              <ul className="text-blue-800 text-sm list-disc list-inside space-y-1">
                <li><strong>Google Cloud TTS</strong> - For high-quality text-to-speech (or use browser TTS fallback)</li>
                <li><strong>Giphy API</strong> - For animated GIFs</li>
                <li><strong>Unsplash API</strong> - For relevant images</li>
              </ul>
              <p className="text-blue-700 text-xs mt-2">
                The app will work without API keys using browser TTS, but visuals won't be available.
              </p>
            </div>
            <TextInput onProcess={handleProcessText} isLoading={isProcessing} />
            {error && (
              <div className="max-w-4xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Reading Mode
              </h2>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Process New Text
              </button>
            </div>
            <ParagraphReader paragraphs={paragraphs} />
          </div>
        )}
      </main>
    </div>
  );
}
