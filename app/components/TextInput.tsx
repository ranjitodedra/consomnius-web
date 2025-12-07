'use client';

import { useState } from 'react';

interface TextInputProps {
  onProcess: (text: string) => void;
  isLoading?: boolean;
}

const MAX_CHARACTERS = 10000;

export default function TextInput({ onProcess, isLoading }: TextInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length > 0) {
      onProcess(text);
    }
  };

  const characterCount = text.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text here..."
          className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          disabled={isLoading}
        />
        <div className="mt-2 flex justify-between items-center text-sm">
          <span className={isOverLimit ? 'text-red-500' : 'text-gray-500'}>
            {characterCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} characters
          </span>
          {isOverLimit && (
            <span className="text-red-500 font-medium">
              Text exceeds maximum length
            </span>
          )}
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading || text.trim().length === 0 || isOverLimit}
        className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Processing...' : 'Process Text'}
      </button>
    </form>
  );
}

