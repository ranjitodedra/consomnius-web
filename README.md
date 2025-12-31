# Visual Reading Companion

A web application that helps visual and audio-oriented learners consume text by converting it into a multimedia reading experience with text-to-speech audio and relevant visuals.

## Features

- **Text Processing**: Paste text and automatically split into readable paragraphs
- **Text-to-Speech**: Listen to paragraphs with high-quality TTS audio
- **AI-Powered Visual Planning**: Uses Gemini AI to intelligently plan visuals for each sentence
- **Video-like Experience**: Line-by-line subtitles synchronized with visuals that change per sentence
- **Visual Enhancement**: Automatically fetch relevant GIFs and images based on AI-generated queries
- **Navigation**: Easy navigation with keyboard shortcuts (arrow keys, spacebar for play/pause)
- **Auto-advance**: Automatic progression through sentences with timing based on content pace
- **Preloading**: Next paragraph assets are preloaded for smooth transitions
- **Reading Speed Control**: Adjust playback speed (0.75x, 1x, 1.25x, 1.5x)
- **Mobile Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Next.js 14** (App Router) - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Gemini AI** - Intelligent visual planning
- **Google Cloud Text-to-Speech** - TTS generation
- **Giphy API** - GIF fetching
- **Unsplash API** - Image fetching

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys for:
  - Google Gemini AI (required for visual planning)
  - Google Cloud Text-to-Speech
  - Giphy
  - Unsplash

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd consomnius-web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` and add your API keys:
```env
GEMINI_API_KEY=your_key_here
GOOGLE_CLOUD_TTS_API_KEY=your_key_here
GIPHY_API_KEY=your_key_here
UNSPLASH_ACCESS_KEY=your_key_here
```

### Getting API Keys

1. **Google Gemini AI** (Required for visual planning):
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the API key
   - Add it to `.env.local` as `GEMINI_API_KEY`
   - Free tier: Generous free tier with rate limits

2. **Google Cloud TTS**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Text-to-Speech API
   - Create credentials (API key)
   - Add the key to `.env.local`

3. **Giphy**:
   - Sign up at [Giphy Developers](https://developers.giphy.com/)
   - Create an app to get your API key
   - Free tier: 42 requests/day

4. **Unsplash**:
   - Sign up at [Unsplash Developers](https://unsplash.com/developers)
   - Create a new application
   - Get your Access Key
   - Free tier: 50 requests/hour

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Paste your text and click "Process Text"

## Usage

1. **Input Text**: Paste your text into the textarea (max 10,000 characters or 50 paragraphs)
2. **Process**: Click "Process Text" to split into paragraphs
3. **Watch**: Experience text as a video with synchronized subtitles and visuals
4. **Navigate**: Use Previous/Next buttons, arrow keys, or spacebar to play/pause
5. **Listen**: Click the play button to hear the text read aloud
6. **Adjust Speed**: Use the speed controls (0.75x, 1x, 1.25x, 1.5x)
7. **Auto-advance**: Click Play to automatically progress through sentences

## Project Structure

```
consomnius-web/
├── app/
│   ├── api/
│   │   ├── process-text/        # Text processing endpoint
│   │   ├── paragraph-assets/    # Assets fetching endpoint
│   │   └── visual-plan/         # Visual planning endpoint
│   ├── components/
│   │   ├── TextInput.tsx        # Text input component
│   │   ├── VideoPlayer.tsx      # Main video-like player component
│   │   ├── VisualDisplay.tsx    # Scene-based visual display
│   │   ├── VisualGrid.tsx       # Visuals display (legacy)
│   │   ├── AudioPlayer.tsx      # TTS controls
│   │   ├── ErrorBoundary.tsx    # Error handling
│   │   └── Toast.tsx            # Toast notifications
│   ├── page.tsx                 # Main page
│   └── layout.tsx               # Root layout
├── lib/
│   ├── types.ts                 # TypeScript interfaces
│   ├── textProcessor.ts         # Paragraph splitting
│   ├── sentenceSplitter.ts      # Sentence splitting
│   ├── keywordExtractor.ts      # Keyword extraction
│   ├── visualPlanner.ts         # AI visual planning
│   ├── geminiClient.ts          # Gemini API client
│   ├── tts.ts                   # TTS wrapper
│   ├── giphy.ts                 # Giphy API client
│   └── unsplash.ts              # Unsplash API client
└── .env.local.example           # Environment variables template
```

## Error Handling

The application includes comprehensive error handling:

- **TTS Failures**: Falls back to text-only reading
- **Visual API Failures**: Shows text-only if visuals fail to load
- **Rate Limiting**: Shows user-friendly messages
- **Timeouts**: 10-second timeout per API call with graceful degradation
- **Network Errors**: Displays error messages to users

## Limitations

- **Text Limit**: Maximum 10,000 characters or 50 paragraphs
- **API Rate Limits**: Subject to free tier limits of external APIs
- **TTS Quality**: Depends on Google Cloud TTS API availability
- **Visual Relevance**: Visuals are AI-planned per sentence, but may not always be perfectly relevant
- **Gemini API**: Required for intelligent visual planning; app falls back to keyword-based visuals if unavailable

## Future Enhancements

- PDF upload support
- URL/article fetching
- LLM chat mode with visual+audio responses
- Custom voice selection
- Export functionality
- User preferences/settings panel

## License

MIT
