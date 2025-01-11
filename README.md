# Video Commentary Assistant

A Chrome extension that uses Gemini AI to generate real-time commentary for videos.

## Features
- Automatically captures video frames at customizable intervals
- Generates AI commentary using Google's Gemini Vision API
- Works with YouTube, Bilibili, and other video platforms
- Adjustable capture interval (5-60 seconds)
- Debug mode for troubleshooting
- Resizable overlay window

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