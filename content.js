let commentaryInterval;
let commentHistory = [];
let nextScreenshotTime = null;
let intervalSeconds = 10;  // Default interval
let debugInfo = {
  lastCapture: null,
  apiCalls: 0,
  errors: [],
  logs: [],
  status: 'idle',
  lastImageData: null
};

// Create overlay for comments
const overlay = document.createElement('div');
overlay.style.cssText = `
  position: fixed;
  top: 20px;
  right: 0;
  width: 300px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 15px;
  border-radius: 8px 0 0 8px;
  z-index: 9999999;
  height: 500px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #666 #333;
  font-size: 16px;
  scroll-behavior: smooth;
  resize: both;
  min-width: 200px;
  min-height: 300px;
  border: 1px solid #444;
  transform-origin: top right;
  direction: rtl;
`;

// Add a container inside overlay for correct text direction
const overlayContent = document.createElement('div');
overlayContent.style.cssText = `
  direction: ltr;
  margin-top: 40px;  // Space for toolbar
  overflow-y: auto;
  height: calc(100% - 40px);
`;
overlay.appendChild(overlayContent);

// Add toolbar
const toolbar = document.createElement('div');
toolbar.style.cssText = `
  direction: ltr;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid #444;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 10px;
  z-index: 1;  // Ensure toolbar stays above content
`;

// Countdown display
const countdownDisplay = document.createElement('div');
countdownDisplay.style.cssText = `
  color: #888;
  font-size: 14px;
  flex: 1;
`;
toolbar.appendChild(countdownDisplay);

// Screenshot button
const screenshotBtn = document.createElement('button');
screenshotBtn.innerHTML = '📸';
screenshotBtn.style.cssText = `
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  opacity: 0.7;
  transition: opacity 0.2s;
`;
screenshotBtn.title = "Take Screenshot Now";
screenshotBtn.onmouseover = () => screenshotBtn.style.opacity = '1';
screenshotBtn.onmouseout = () => screenshotBtn.style.opacity = '0.7';
screenshotBtn.onclick = () => generateCommentary();
toolbar.appendChild(screenshotBtn);

// Clear button
const clearBtn = document.createElement('button');
clearBtn.innerHTML = '🗑️';
clearBtn.style.cssText = `
  background: none;
  border: none;
  color: #ff6666;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  opacity: 0.7;
  transition: opacity 0.2s;
`;
clearBtn.title = "Clear All Comments";
clearBtn.onmouseover = () => clearBtn.style.opacity = '1';
clearBtn.onmouseout = () => clearBtn.style.opacity = '0.7';
clearBtn.onclick = () => {
  overlayContent.innerHTML = '';
  commentHistory = [];
};
toolbar.appendChild(clearBtn);

// Debug toggle button
const debugBtn = document.createElement('button');
debugBtn.innerHTML = '🔧';
debugBtn.style.cssText = `
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  opacity: 0.7;
  transition: opacity 0.2s;
`;
debugBtn.title = "Toggle Debug Info";
let debugVisible = false;
debugBtn.onclick = () => {
  debugVisible = !debugVisible;
  debugOverlay.style.display = debugVisible ? 'block' : 'none';
  debugBtn.style.color = debugVisible ? '#00ff00' : '#888';
};
debugBtn.onmouseover = () => debugBtn.style.opacity = '1';
debugBtn.onmouseout = () => debugBtn.style.opacity = '0.7';
toolbar.appendChild(debugBtn);

overlay.appendChild(toolbar);

// Load saved size
chrome.storage.local.get(['overlayWidth', 'overlayHeight'], (result) => {
  if (result.overlayWidth) overlay.style.width = result.overlayWidth + 'px';
  if (result.overlayHeight) overlay.style.height = result.overlayHeight + 'px';
});

// Save size when resized
let resizeTimeout;
overlay.addEventListener('mouseup', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    chrome.storage.local.set({
      overlayWidth: overlay.offsetWidth,
      overlayHeight: overlay.offsetHeight
    });
  }, 500);
});

document.body.appendChild(overlay);

// Create debug overlay
const debugOverlay = document.createElement('div');
debugOverlay.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 300px;
  background: rgba(0, 0, 0, 0.9);
  color: #00ff00;
  padding: 15px;
  border-radius: 8px;
  z-index: 9999999;
  font-family: monospace;
  font-size: 12px;
  max-height: calc(100vh - 400px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #666 #333;
  display: none;  // Hidden by default
`;
document.body.appendChild(debugOverlay);

// Add custom scrollbar styles for webkit browsers (Chrome, Safari)
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #333;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb {
    background: #666;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #888;
  }
`;
document.head.appendChild(styleSheet);

// Add styles to ensure our overlays stay on top of YouTube elements
const youtubeStyles = document.createElement('style');
youtubeStyles.textContent = `
  /* Force our overlays above YouTube's player and controls */
  #movie_player,
  .ytp-chrome-top,
  .ytp-chrome-bottom {
    z-index: auto !important;
  }
`;
document.head.appendChild(youtubeStyles);

async function captureVideoFrame() {
  // Try different selectors for various platforms
  const video = document.querySelector([
    'video',                    // Generic video
    '.html5-main-video',       // YouTube main video
    '.bilibili-player-video video', // Bilibili video
    '#player_html5_api',       // Some other video players
    '.video-stream'            // YouTube stream
  ].join(','));
  
  debugInfo.status = 'capturing frame';
  updateDebugDisplay();
  
  if (!video) {
    debugInfo.errors.push('No video element found. Supported platforms: YouTube, Bilibili');
    updateDebugDisplay();
    return null;
  }
  
  // Wait for video to be ready
  if (!video.videoWidth || !video.videoHeight) {
    debugInfo.errors.push('Video not ready yet, waiting for video to load');
    updateDebugDisplay();
    return null;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  debugInfo.lastCapture = new Date().toISOString();
  debugInfo.lastImageData = canvas.toDataURL('image/jpeg', 0.8);
  updateDebugDisplay();
  return debugInfo.lastImageData;
}

async function getCommentaryFromLLM(imageData) {
  const apiKey = window.API_KEY;
  const base64Image = imageData.split(',')[1];
  
  debugInfo.status = 'calling API';
  updateDebugDisplay();
  
  try {
    const requestBody = {
      contents: [{
        parts: [
          { text: window.PROMPTS.default },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 100
      }
    };
    
    debugInfo.logs.push(`Request: ${JSON.stringify({
      ...requestBody,
      contents: [{
        ...requestBody.contents[0],
        parts: [
          requestBody.contents[0].parts[0],
          { inline_data: { mime_type: "image/jpeg", data: "..." } }
        ]
      }]
    }, null, 2)}`);
    updateDebugDisplay();
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    debugInfo.logs.push(`Response: ${data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'}`);
    updateDebugDisplay();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error(`Invalid API response: ${JSON.stringify(data)}`);
    }
    
    debugInfo.apiCalls++;
    debugInfo.status = 'received response';
    updateDebugDisplay();
    return data.candidates[0].content.parts[0].text || 'No commentary generated';
  } catch (error) {
    debugInfo.errors.push(`API Error: ${error.message}`);
    updateDebugDisplay();
    return `Error generating commentary: ${error.message}`;
  }
}

function updateDebugDisplay() {
  // Calculate time remaining if nextScreenshotTime exists
  let timeRemaining = '';
  if (nextScreenshotTime) {
    const remaining = Math.max(0, nextScreenshotTime - Date.now());
    const seconds = Math.floor(remaining / 1000);
    timeRemaining = `Next screenshot in: ${seconds}s`;
    countdownDisplay.textContent = timeRemaining;
  } else {
    countdownDisplay.textContent = 'Stopped';
  }
  
  // Prepare debug info as a text string
  const debugText = `
Debug Info:
Status: ${debugInfo.status}
Time: ${timeRemaining}
Last Capture: ${debugInfo.lastCapture || 'none'}
API Calls: ${debugInfo.apiCalls}
Active Interval: ${commentaryInterval ? 'yes' : 'no'}
History Size: ${commentHistory.length}
Errors: ${debugInfo.errors.length ? debugInfo.errors.join('\n') : 'none'}
Comments History:
${commentHistory.join('\n')}
`.trim();
  
  debugOverlay.innerHTML = `
    <div style="margin-bottom: 10px; color: #ff0">Debug Info:</div>
    ${debugInfo.lastImageData ? `
      <div style="margin-bottom: 10px;">
        <img 
          src="${debugInfo.lastImageData}" 
          style="
            width: 100%; 
            height: 150px; 
            object-fit: contain; 
            background: #222;
            border: 1px solid #444;
          "
        />
      </div>
    ` : ''}
    <div>Status: ${debugInfo.status}</div>
    <div>Last Capture: ${debugInfo.lastCapture || 'none'}</div>
    <div>API Calls: ${debugInfo.apiCalls}</div>
    <div>Active Interval: ${commentaryInterval ? 'yes' : 'no'}</div>
    <div>History Size: ${commentHistory.length}</div>
    <div style="color: #888888; margin-top: 5px; font-size: 11px">
      ${debugInfo.logs.slice(-1).join('<br>')}
    </div>
    <div style="color: ${debugInfo.errors.length ? '#ff0000' : '#00ff00'}">
      Errors: ${debugInfo.errors.length ? debugInfo.errors.slice(-2).join('<br>') : 'none'}
    </div>
    <div style="text-align: right; margin-top: 10px;">
      <button 
        style="
          padding: 4px 8px;
          background: none;
          color: #ff6666;
          border: none;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.7;
          transition: opacity 0.2s;
        "
        onmouseover="this.style.opacity=1"
        onmouseout="this.style.opacity=0.7"
        onclick="window.clearDebugHistory()"
        title="Clear History">
        🗑️
      </button>
    </div>
  `;
}

function displayComment(comment) {
  const commentElement = document.createElement('div');
  const timestamp = new Date().toLocaleTimeString();
  commentElement.innerHTML = `
    <div style="color: #888; font-size: 14px; margin-bottom: 4px;">${timestamp}</div>
    <div style="white-space: pre-line; font-size: 18px; line-height: 1.4;">${comment}</div>
  `;
  commentElement.style.marginBottom = '15px';
  overlayContent.appendChild(commentElement);
  
  // Smooth scroll to bottom with a delay
  setTimeout(() => {
    overlayContent.scrollTo({ 
      top: overlay.scrollHeight, 
      behavior: 'smooth' 
    });
  }, 100);
  
  // Keep only last 5 comments
  while (overlayContent.children.length > 5) {
    overlayContent.removeChild(overlayContent.firstChild);
  }
}

async function generateCommentary() {
  const imageData = await captureVideoFrame();
  if (!imageData) return;
  
  debugInfo.status = 'starting commentary generation';
  updateDebugDisplay();
  
  try {
    const comment = await getCommentaryFromLLM(imageData);
    const timestamp = new Date().toLocaleTimeString();
    commentHistory.push(`[${timestamp}] ${comment}`);
    
    // Keep history limited to last 5 comments
    if (commentHistory.length > 5) {
      commentHistory.shift();
    }
    
    displayComment(comment);
    debugInfo.status = 'idle';
    updateDebugDisplay();
  } catch (error) {
    debugInfo.status = 'error';
    debugInfo.errors.push(`Generation Error: ${error.message}`);
    updateDebugDisplay();
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCommentary') {
    debugInfo.status = 'starting interval';
    debugInfo.errors = []; // Clear previous errors
    
    // Do first screenshot immediately
    generateCommentary();
    
    // Set initial next screenshot time
    nextScreenshotTime = Date.now() + (intervalSeconds * 1000);
    
    commentaryInterval = setInterval(() => {
      // Update next screenshot time before generating commentary
      nextScreenshotTime = Date.now() + (intervalSeconds * 1000);
      generateCommentary();
    }, intervalSeconds * 1000);
    
    // Start updating the countdown every second
    setInterval(() => {
      updateDebugDisplay();
    }, 1000);
    
    updateDebugDisplay();
  } else if (request.action === 'setInterval') {
    intervalSeconds = request.seconds;
    if (commentaryInterval) {
      // Restart interval with new timing if already running
      clearInterval(commentaryInterval);
      nextScreenshotTime = Date.now() + (intervalSeconds * 1000);
      commentaryInterval = setInterval(() => {
        nextScreenshotTime = Date.now() + (intervalSeconds * 1000);
        generateCommentary();
      }, intervalSeconds * 1000);
    }
  } else if (request.action === 'stopCommentary') {
    debugInfo.status = 'stopped';
    clearInterval(commentaryInterval);
    nextScreenshotTime = null;
    updateDebugDisplay();
  } else if (request.action === 'takeScreenshot') {
    debugInfo.status = 'manual screenshot';
    debugInfo.errors = []; // Clear previous errors
    updateDebugDisplay();
    generateCommentary();
  }
}); 

// Add the clear history function to the window object so it can be called from the button
window.clearDebugHistory = () => {
  commentHistory = [];
  debugInfo.errors = [];
  debugInfo.logs = [];
  debugInfo.apiCalls = 0;
  debugInfo.lastImageData = null;
  debugInfo.lastCapture = null;
  overlay.innerHTML = ''; // Clear the comments overlay
  updateDebugDisplay();
}; 

// Save debug visibility state
chrome.storage.local.get('debugVisible', (result) => {
  if (result.debugVisible) {
    debugVisible = true;
    debugOverlay.style.display = 'block';
    debugBtn.style.color = '#00ff00';
  }
});

// Update debug visibility state when toggled
const saveDebugState = () => {
  chrome.storage.local.set({ debugVisible });
}; 