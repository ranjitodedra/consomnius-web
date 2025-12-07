import { NextRequest, NextResponse } from 'next/server';
import { planVisualsForParagraph } from '@/lib/visualPlanner';
import { VisualPlanRequest, VisualPlanResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: VisualPlanRequest = await request.json();
    const { paragraph } = body;

    // Validate input
    if (!paragraph || typeof paragraph !== 'string') {
      return NextResponse.json(
        { error: 'Paragraph is required and must be a string' },
        { status: 400 }
      );
    }

    if (paragraph.trim().length === 0) {
      return NextResponse.json(
        { error: 'Paragraph cannot be empty' },
        { status: 400 }
      );
    }

    // Call visual planner
    const sentencePlans = await planVisualsForParagraph(paragraph);

    const response: VisualPlanResponse = {
      sentencePlans,
    };

    return NextResponse.json(response);
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      // Missing API key
      if (error.message.includes('GEMINI_API_KEY') || error.message.includes('not configured')) {
        return NextResponse.json(
          {
            error: 'Gemini API key not configured',
            details: 'Add GEMINI_API_KEY to your .env.local file',
          },
          { status: 500 }
        );
      }

      // Rate limit or quota errors
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json(
          {
            error: 'Gemini API rate limit exceeded',
            details: error.message,
          },
          { status: 429 }
        );
      }

      // Timeout errors
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'Request timeout',
            details: 'Gemini API call took too long',
          },
          { status: 504 }
        );
      }

      // Validation errors (sentence mismatch, invalid format, etc.)
      if (
        error.message.includes('mismatch') ||
        error.message.includes('invalid') ||
        error.message.includes('missing') ||
        error.message.includes('parse')
      ) {
        return NextResponse.json(
          {
            error: 'Invalid response from Gemini',
            details: error.message,
          },
          { status: 500 }
        );
      }

      // Generic error
      console.error('Error in visual-plan endpoint:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate visual plan',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Unknown error
    console.error('Unknown error in visual-plan endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate visual plan',
        details: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

