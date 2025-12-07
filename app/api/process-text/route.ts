import { NextRequest, NextResponse } from 'next/server';
import { processText } from '@/lib/textProcessor';
import { ProcessTextRequest, ProcessTextResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: ProcessTextRequest = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    const paragraphs = processText(text);
    const response: ProcessTextResponse = { paragraphs };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('empty') || error.message.includes('exceeds')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    console.error('Error processing text:', error);
    return NextResponse.json(
      { error: 'Failed to process text' },
      { status: 500 }
    );
  }
}

