# API Keys Setup Guide

This guide will help you set up the API keys needed for the Visual Reading Companion.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your API keys (see instructions below)

3. Restart your development server:
   ```bash
   npm run dev
   ```

## Getting API Keys

### 1. Google Cloud Text-to-Speech API

**Required for:** High-quality text-to-speech audio

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Text-to-Speech API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Text-to-Speech API"
   - Click "Enable"
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
5. (Optional) Restrict the API key to Text-to-Speech API for security
6. Paste the key in `.env.local` as `GOOGLE_CLOUD_TTS_API_KEY`

**Note:** Google Cloud offers a free tier with $300 credit for new users. Text-to-Speech pricing is pay-as-you-go.

**Alternative:** If you don't want to set up Google Cloud TTS, the app will automatically use your browser's built-in text-to-speech (works without any API key).

---

### 2. Giphy API Key

**Required for:** Animated GIFs

**Steps:**
1. Go to [Giphy Developers](https://developers.giphy.com/dashboard/)
2. Sign up or log in
3. Click **"Create an App"**
4. Select **"SDK"** as the app type
5. Fill in the app name (e.g., "Visual Reading Companion")
6. Copy the **API Key** shown
7. Paste it in `.env.local` as `GIPHY_API_KEY`

**Free Tier Limits:**
- 42 requests per day
- Perfect for testing and personal use

---

### 3. Unsplash Access Key

**Required for:** High-quality images

**Steps:**
1. Go to [Unsplash Developers](https://unsplash.com/developers)
2. Sign up or log in (use your Unsplash account or create one)
3. Click **"New Application"**
4. Fill in the application details:
   - Application name: "Visual Reading Companion"
   - Description: "Web app for visual reading experience"
   - Accept the API Use and Access Agreement
5. Copy the **Access Key** (not the Secret Key)
6. Paste it in `.env.local` as `UNSPLASH_ACCESS_KEY`

**Free Tier Limits:**
- 50 requests per hour
- More than enough for personal use

---

## Minimal Setup (Browser TTS Only)

If you want to test the app without setting up any API keys:

1. The app will automatically use **browser TTS** (no setup needed)
2. Visuals won't be available, but you can still read the text
3. Just start the app: `npm run dev`

To get visuals, you'll need at least one of the visual API keys (Giphy or Unsplash).

---

## Verifying Your Setup

After adding your API keys:

1. Restart the development server
2. Process some text
3. Check the browser console for any errors
4. If you see "API key not configured" messages, double-check:
   - The keys are in `.env.local` (not `.env.local.example`)
   - There are no extra spaces or quotes around the keys
   - You've restarted the server after adding keys

---

## Troubleshooting

### "API key not configured"
- Make sure `.env.local` exists in the project root
- Verify the variable names match exactly (case-sensitive)
- Restart the development server after adding keys

### "Invalid API key" or "401/403 errors"
- Check that you copied the full key without extra spaces
- For Google Cloud: Make sure the Text-to-Speech API is enabled
- For Giphy: Make sure you're using the API key, not the App ID
- For Unsplash: Make sure you're using the Access Key, not the Secret Key

### "Rate limit exceeded"
- You've hit the free tier limits
- Wait for the rate limit to reset (daily for Giphy, hourly for Unsplash)
- Or upgrade to a paid plan

### Visuals not showing even with API keys
- Check the browser console for specific error messages
- Verify the API keys are correct
- Make sure the keywords extracted from your text are searchable (some very technical terms might not have results)

---

## Security Notes

- **Never commit `.env.local` to git** (it's already in `.gitignore`)
- Don't share your API keys publicly
- For production, use environment variables provided by your hosting platform (Vercel, Netlify, etc.)

---

## Need Help?

- Check the [README.md](./README.md) for general information
- Review the error messages in the app - they often tell you exactly what's wrong
- For API-specific issues, check the official documentation:
  - [Google Cloud TTS](https://cloud.google.com/text-to-speech/docs)
  - [Giphy API](https://developers.giphy.com/docs/)
  - [Unsplash API](https://unsplash.com/documentation)

