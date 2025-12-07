# Visual Reading Companion

A web application that helps visual and audio-oriented learners consume text by converting it into a multimedia reading experience with text-to-speech audio and relevant visuals.

## Features

- **Text Processing**: Paste text and automatically split into readable paragraphs
- **Text-to-Speech**: Listen to paragraphs with high-quality TTS audio
- **Visual Enhancement**: Automatically fetch relevant GIFs and images for each paragraph
- **Navigation**: Easy paragraph navigation with keyboard shortcuts (arrow keys)
- **Preloading**: Next paragraph assets are preloaded for smooth transitions
- **Reading Speed Control**: Adjust playback speed (0.75x, 1x, 1.25x, 1.5x)
- **Mobile Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Next.js 14** (App Router) - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Cloud Text-to-Speech** - TTS generation
- **Giphy API** - GIF fetching
- **Unsplash API** - Image fetching

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys for:
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
GOOGLE_CLOUD_TTS_API_KEY=your_key_here
GIPHY_API_KEY=your_key_here
UNSPLASH_ACCESS_KEY=your_key_here
```

### Getting API Keys

1. **Google Cloud TTS**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Text-to-Speech API
   - Create credentials (API key)
   - Add the key to `.env.local`

2. **Giphy**:
   - Sign up at [Giphy Developers](https://developers.giphy.com/)
   - Create an app to get your API key
   - Free tier: 42 requests/day

3. **Unsplash**:
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
3. **Read**: Navigate through paragraphs using Previous/Next buttons or arrow keys
4. **Listen**: Click the play button to hear the paragraph read aloud
5. **Adjust Speed**: Use the speed controls (0.75x, 1x, 1.25x, 1.5x)
6. **View Visuals**: See relevant GIFs and images on the right side

## Project Structure

```
consomnius-web/
├── app/
│   ├── api/
│   │   ├── process-text/        # Text processing endpoint
│   │   └── paragraph-assets/    # Assets fetching endpoint
│   ├── components/
│   │   ├── TextInput.tsx        # Text input component
│   │   ├── ParagraphReader.tsx  # Main reader component
│   │   ├── VisualGrid.tsx       # Visuals display
│   │   ├── AudioPlayer.tsx      # TTS controls
│   │   ├── ErrorBoundary.tsx    # Error handling
│   │   └── Toast.tsx            # Toast notifications
│   ├── page.tsx                 # Main page
│   └── layout.tsx               # Root layout
├── lib/
│   ├── types.ts                 # TypeScript interfaces
│   ├── textProcessor.ts         # Paragraph splitting
│   ├── keywordExtractor.ts      # Keyword extraction
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
- **Visual Relevance**: Visuals are based on keyword extraction, may not always be perfectly relevant

## Future Enhancements

- PDF upload support
- URL/article fetching
- LLM chat mode with visual+audio responses
- Custom voice selection
- Export functionality
- User preferences/settings panel

## License

MIT
