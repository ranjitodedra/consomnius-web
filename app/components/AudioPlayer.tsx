'use client';

import { useRef, useEffect, useState } from 'react';

interface AudioPlayerProps {
  audioUrl: string | null;
  text?: string; // Text for sentence-level playback (browser TTS)
  playbackRate?: number;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onSentenceEnd?: () => void; // Callback when sentence audio ends
  errorMessage?: string; // Error message to display
  autoPlay?: boolean; // Auto-start playback
}

export default function AudioPlayer({
  audioUrl,
  text,
  playbackRate = 1.0,
  onPlayStateChange,
  onSentenceEnd,
  errorMessage,
  autoPlay = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useBrowserTTS, setUseBrowserTTS] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackRate;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
      // Trigger sentence end callback for auto-advance
      onSentenceEnd?.();
    };

    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [playbackRate, onPlayStateChange, onSentenceEnd]);

  useEffect(() => {
    // Reset error state when audio URL changes
    setHasError(false);
    setIsPlaying(false);
    setUseBrowserTTS(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [audioUrl]);

  // Handle text changes - don't reset isPlaying if we're in continuous playback
  useEffect(() => {
    // Only cancel speech if we're not in auto-play mode (continuous playback)
    // If autoPlay is true, we want to continue playing the new text
    if (!autoPlay && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [text, autoPlay]);

  // Auto-play when autoPlay is true and we have text
  // This should trigger both when autoPlay first becomes true AND when text changes during continuous playback
  useEffect(() => {
    if (autoPlay && text && !audioUrl && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Stop any existing speech first to avoid overlap
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        speechSynthesisRef.current = null;
      }
      // Small delay to ensure component is ready and previous speech is fully stopped
      const timer = setTimeout(() => {
        // Always play when autoPlay is true and text is available
        // The previous speech has been cancelled, so we can safely start new playback
        playBrowserTTS();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text, audioUrl]);

  useEffect(() => {
    // Update playback rate for browser TTS
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.rate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlayPause = () => {
    // If we have audio URL, use it
    if (audioUrl && !useBrowserTTS) {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch((error) => {
          console.error('Error playing audio:', error);
          setHasError(true);
          // Fallback to browser TTS if audio fails
          if (text) {
            setUseBrowserTTS(true);
            playBrowserTTS();
          }
        });
      }
      return;
    }

    // Use browser TTS fallback
    if (text) {
      if (isPlaying) {
        stopBrowserTTS();
      } else {
        playBrowserTTS();
      }
    }
  };

  const playBrowserTTS = () => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setHasError(true);
      return;
    }

    // Stop any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackRate;
    utterance.onstart = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };
    utterance.onend = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
      speechSynthesisRef.current = null;
      // Trigger sentence end callback for auto-advance
      // Use setTimeout to ensure state updates are processed first
      setTimeout(() => {
        onSentenceEnd?.();
      }, 0);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setHasError(true);
      onPlayStateChange?.(false);
      speechSynthesisRef.current = null;
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopBrowserTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      onPlayStateChange?.(false);
      speechSynthesisRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBrowserTTS();
    };
  }, []);

  // Show browser TTS option if no audio URL but we have text
  if (!audioUrl && text) {
    const hasBrowserTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;
    
    return (
      <div className="flex flex-col items-center gap-2">
        {hasBrowserTTS ? (
          <>
            <button
              onClick={togglePlayPause}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors touch-manipulation"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="text-xs text-gray-500">Using browser TTS</span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm text-center">
              {errorMessage || 'Audio unavailable'}
            </span>
            {errorMessage && (
              <div className="text-xs text-gray-400 text-center max-w-xs space-y-1">
                <p>Browser TTS is being used instead.</p>
                <p>
                  For cloud TTS, add{' '}
                  <code className="bg-gray-100 px-1 rounded">GOOGLE_CLOUD_TTS_API_KEY</code>{' '}
                  to <code className="bg-gray-100 px-1 rounded">.env.local</code>
                </p>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline block mt-1"
                >
                  Get Google Cloud TTS key →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="text-sm">{errorMessage || 'Audio unavailable'}</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm">Audio playback error</span>
      </div>
    );
  }

  return (
    <>
      <audio ref={audioRef} src={audioUrl} preload="auto" />
      <button
        onClick={togglePlayPause}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors touch-manipulation"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </>
  );
}

