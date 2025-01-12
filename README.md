# Video Commentary Assistant

A Chrome extension that uses Gemini AI to generate real-time commentary for videos.

## Features
- Automatically captures video frames at customizable intervals
- Generates AI commentary using Google's Gemini Vision API
- Works with Netflix, Disney+, SafeShare.tv, and other video platforms
- Adjustable capture interval (5-60 seconds)
- Debug mode for troubleshooting
- Resizable overlay window

## Platform Support
- ✅ Netflix (requires tab sharing permission once per session)
- ✅ Disney+ (requires tab sharing permission once per session)
- ✅ SafeShare.tv (requires tab sharing permission once per session)
- ✅ NSFWYoutube.com (requires tab sharing permission once per session)
- ❌ YouTube (due to platform restrictions - please use SafeShare.tv instead)
- ✅ Other video platforms

## Using with YouTube Videos
Due to YouTube's platform restrictions, direct YouTube support is not available. However, you can:
1. Copy your YouTube video URL
2. Use one of these alternatives:
   - Go to [SafeShare.tv](https://safeshare.tv) and paste the URL
   - Go to [NSFWYoutube.com](https://nsfwyoutube.com) and paste the URL
3. Use the extension with the converted version

## Setup
1. Clone this repository
2. Add your Gemini API key to `api_key.js`
3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

## Configuration
- Edit `api_key.js` to set your API key
- Edit `prompts.js` to customize the AI prompts

## Usage
1. Navigate to any video page
2. Click the extension icon
3. Set your desired interval
4. Click "Start Commentary" 