let commentaryInterval;
let commentHistory = [];
let nextScreenshotTime = null;
let intervalSeconds = 10;  // Default interval
let isPaused = false;
let pausedTimeRemaining = 0;  // Store remaining time when paused
let debugInfo = {
  lastCapture: null,
  apiCalls: 0,
  errors: [],
  logs: [],
  status: 'idle',
  lastImageData: null
};

// Store page context for reuse
let pageContext = {
  title: '',
  description: '',
  platform: '',
  timestamp: '',
  url: ''
};

// Function to grab context from different platforms
function grabPageContext() {
  const hostname = window.location.hostname;
  pageContext.url = window.location.href;
  pageContext.timestamp = new Date().toISOString();
  pageContext.platform = hostname;  // Use hostname as platform name

  // Try to find video title and description using common selectors
  const titleSelectors = [
    'h1',                          // Common heading
    'title',                       // Page title
    '[class*="title"]',           // Classes containing "title"
    '[id*="title"]',              // IDs containing "title"
    'meta[property="og:title"]',   // OpenGraph title
    'meta[name="title"]'          // Meta title
  ];

  const descriptionSelectors = [
    'meta[name="description"]',    // Meta description
    'meta[property="og:description"]', // OpenGraph description
    '[class*="description"]',      // Classes containing "description"
    '[id*="description"]',         // IDs containing "description"
    '[class*="synopsis"]',         // Classes containing "synopsis"
    '[class*="summary"]'           // Classes containing "summary"
  ];

  // Try each selector until we find something
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      pageContext.title = element.textContent?.trim() || 
                         element.getAttribute('content')?.trim() || '';
      if (pageContext.title) break;
    }
  }

  for (const selector of descriptionSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      pageContext.description = element.textContent?.trim() || 
                                element.getAttribute('content')?.trim() || '';
      if (pageContext.description) break;
    }
  }

  // Fallback to page title if no title found
  if (!pageContext.title) {
    pageContext.title = document.title;
  }

  debugInfo.logs.push(`Grabbed page context: ${JSON.stringify(pageContext)}`);
  updateDebugDisplay();
}

// Create overlay for comments
const overlay = document.createElement('div');
overlay.style.cssText = `
  position: fixed;
  top: 20px;
  right: 0;
  width: 300px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0;
  border-radius: 8px 0 0 8px;
  z-index: 9999999;
  height: 500px;
  overflow: hidden;
  font-size: 16px;
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
  height: calc(100% - 40px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 15px;
  padding-top: 55px;
  scrollbar-width: thin;
  scrollbar-color: #666 #333;
`;

// Add toolbar
const toolbar = document.createElement('div');
toolbar.style.cssText = `
  direction: ltr;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: rgba(0, 0, 0, 0.9);
  border-bottom: 1px solid #444;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 10px;
  z-index: 2;
  cursor: move;
  user-select: none;
`;

// Countdown display
const countdownDisplay = document.createElement('div');
countdownDisplay.style.cssText = `
  color: #888;
  font-size: 14px;
  flex: 1;
  user-select: none;
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

// Pause button
const pauseBtn = document.createElement('button');
pauseBtn.innerHTML = '⏸️';
pauseBtn.style.cssText = `
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  opacity: 0.7;
  transition: opacity 0.2s;
`;
pauseBtn.title = "Pause/Resume Screenshots";
pauseBtn.onmouseover = () => pauseBtn.style.opacity = '1';
pauseBtn.onmouseout = () => pauseBtn.style.opacity = '0.7';
pauseBtn.onclick = () => {
  isPaused = !isPaused;
  pauseBtn.innerHTML = isPaused ? '▶️' : '⏸️';
  pauseBtn.title = isPaused ? "Resume Screenshots" : "Pause Screenshots";
  debugInfo.status = isPaused ? 'paused' : 'running';
  if (isPaused) {
    // Store remaining time when pausing
    pausedTimeRemaining = Math.max(0, nextScreenshotTime - Date.now());
  } else {
    // When resuming, use the stored remaining time
    nextScreenshotTime = Date.now() + pausedTimeRemaining;
  }
  updateDebugDisplay();
};
toolbar.insertBefore(pauseBtn, screenshotBtn);  // Insert before screenshot button

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

// Add elements in correct order
overlay.appendChild(toolbar);
overlay.appendChild(overlayContent);

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
    // Scroll to bottom after resize
    overlayContent.scrollTo({ 
      top: overlayContent.scrollHeight, 
      behavior: 'smooth' 
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
  display: block;  // Show by default
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
  /* Handle fullscreen mode */
  *:fullscreen #movie_player,
  *:-webkit-full-screen #movie_player,
  *:-moz-full-screen #movie_player {
    z-index: auto !important;
  }
  /* Ensure our overlay shows in fullscreen */
  *:fullscreen ~ div,
  *:-webkit-full-screen ~ div,
  *:-moz-full-screen ~ div {
    z-index: 9999999 !important;
  }
`;
document.head.appendChild(youtubeStyles);

// Move overlay to body when entering/exiting fullscreen
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    document.fullscreenElement.appendChild(overlay);
    document.fullscreenElement.appendChild(debugOverlay);
  } else {
    document.body.appendChild(overlay);
    document.body.appendChild(debugOverlay);
  }
});

// Store Netflix stream for reuse
let netflixStream = null;
// Store Disney+ stream for reuse
let disneyStream = null;
// Store SafeShare stream for reuse
let safeshareStream = null;
// Store NSFWYoutube stream for reuse
let nsfwytStream = null;

async function captureVideoFrame() {
  // For Safeshare.tv and NSFWYoutube in iframe
  if (window.location.hostname.includes('safeshare.tv') || 
      window.location.hostname.includes('nsfwyoutube.com')) {
    const isNSFW = window.location.hostname.includes('nsfwyoutube.com');
    let streamRef = isNSFW ? nsfwytStream : safeshareStream;

    try {
      // Reuse existing stream if available
      if (!streamRef) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "browser",
            cursor: "never"
          },
          audio: false,
          selfBrowserSurface: "include",
          surfaceSwitching: "include",
          systemAudio: "exclude"
        });
        streamRef = stream;
        if (isNSFW) {
          nsfwytStream = stream;
        } else {
          safeshareStream = stream;
        }
      }
      
      // Create video element to capture the stream
      const videoEl = document.createElement('video');
      videoEl.srcObject = streamRef;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(resolve);
        };
      });
      
      // Create canvas with the same dimensions
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      
      // Draw the current frame
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      
      // Clean up video element but keep the stream
      videoEl.srcObject = null;
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      debugInfo.lastCapture = new Date().toISOString();
      debugInfo.lastImageData = dataUrl;
      updateDebugDisplay();
      return dataUrl;
    } catch (error) {
      // Clear stored stream on error
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
        if (isNSFW) {
          nsfwytStream = null;
        } else {
          safeshareStream = null;
        }
      }
      debugInfo.errors.push(`${isNSFW ? 'NSFWYoutube' : 'Safeshare'} capture error: ${error.message}`);
      updateDebugDisplay();
      return null;
    }
  }

  // For Netflix and Disney+, capture the whole tab
  if (window.location.hostname.includes('netflix.com') || 
      window.location.hostname.includes('disneyplus.com')) {
    // Choose which stream to use
    const isNetflix = window.location.hostname.includes('netflix.com');
    let streamRef = isNetflix ? netflixStream : disneyStream;

    try {
      // Reuse existing stream if available
      if (!streamRef) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "browser",
            cursor: "never"
          },
          audio: false,
          selfBrowserSurface: "include",
          surfaceSwitching: "include",
          systemAudio: "exclude"
        });
        streamRef = stream;
        if (isNetflix) {
          netflixStream = stream;
        } else {
          disneyStream = stream;
        }
      }

      // Create video element to capture the stream
      const videoEl = document.createElement('video');
      videoEl.srcObject = streamRef;
      
      // Return a promise that resolves when the video can play
      await new Promise((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(resolve);
        };
      });
      
      // Create canvas with the same dimensions
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      
      // Draw the current frame
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      
      // Clean up video element but keep the stream
      videoEl.srcObject = null;
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      debugInfo.lastCapture = new Date().toISOString();
      debugInfo.lastImageData = dataUrl;
      updateDebugDisplay();
      return dataUrl;
    } catch (error) {
      // Clear stored stream on error
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
        if (isNetflix) {
          netflixStream = null;
        } else {
          disneyStream = null;
        }
      }
      debugInfo.errors.push(`${isNetflix ? 'Netflix' : 'Disney+'} capture error: ${error.message}`);
      updateDebugDisplay();
      return null;
    }
  }

  // For non-Netflix platforms, use the video element capture method
  const video = document.querySelector([
    'video',                    // Generic video
    'video[src]',              // Video with src attribute
    'video source',            // Video with source element
    '.html5-main-video',       // YouTube main video
    '.bilibili-player-video video', // Bilibili video
    '#player_html5_api',       // Some other video players
    '.video-stream',           // YouTube stream
    '#safeshare_video',        // Safeshare.tv main video
    '#safeshare-player video', // Safeshare.tv alternate
    'iframe[src*="safeshare.tv"] video', // Safeshare.tv embedded
    'video[class*="player"]',   // Generic player classes
    'video[id*="player"]',      // Generic player IDs
    'video[class*="video"]',    // Generic video classes
    'video[id*="video"]'        // Generic video IDs
  ].join(','));
  
  debugInfo.status = 'capturing frame';
  updateDebugDisplay();
  
  if (!video) {
    debugInfo.errors.push('No video element found on this page. Try playing a video first.');
    updateDebugDisplay();
    return null;
  }
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    debugInfo.lastCapture = new Date().toISOString();
    debugInfo.lastImageData = canvas.toDataURL('image/jpeg', 0.8);
    updateDebugDisplay();
    return debugInfo.lastImageData;
  } catch (error) {
    debugInfo.errors.push(`Capture Error: ${error.message}`);
    updateDebugDisplay();
    return null;
  }
}

async function getCommentaryFromLLM(imageData) {
  const apiKey = window.API_KEY;
  const base64Image = imageData.split(',')[1];
  
  debugInfo.status = 'calling API';
  updateDebugDisplay();
  
  // Format recent comments for context
  const recentComments = commentHistory
    .slice(-100)  // Get last 100 comments
    .map(comment => comment.replace(/^\[\d{1,2}:\d{1,2}:\d{1,2}\s[AP]M\]\s/, ''))  // Remove timestamps
    .join('\n- ');
  
  try {
    const requestBody = {
      contents: [{
        parts: [
          { 
            text: `${window.PROMPTS.default}\n\n` +
                  `Note: This is a ${pageContext.platform} video titled "${pageContext.title}". ` +
                  `Focus on describing what's happening in the current frame.\n\n` +
                  `Recent comments (for context, avoid repeating unless important):\n` +
                  `- ${recentComments}`
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        // Increase max tokens to account for longer context
        maxOutputTokens: 150,
        // Add parameters to encourage novelty
        topP: 0.9,
        topK: 40
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
  let timeRemaining = '';
  if (nextScreenshotTime) {
    const remaining = isPaused ? pausedTimeRemaining : Math.max(0, nextScreenshotTime - Date.now());
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
            display: block;
          "
          alt="Latest screenshot"
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

  // Send debug info to popup
  chrome.runtime.sendMessage({
    action: 'debugUpdate',
    debug: {
      status: debugInfo.status,
      lastCapture: debugInfo.lastCapture,
      apiCalls: debugInfo.apiCalls,
      errors: debugInfo.errors,
      lastImageData: debugInfo.lastImageData
    }
  });
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
  
  // Improved scroll behavior
  requestAnimationFrame(() => {
    const scrollTarget = overlayContent.scrollHeight - overlayContent.clientHeight;
    overlayContent.scrollTo({
      top: scrollTarget,
      behavior: 'smooth'
    });
  });
  
  // Keep only last 5 comments
  while (overlayContent.children.length > 5) {
    overlayContent.removeChild(overlayContent.firstChild);
  }
}

async function generateCommentary() {
  // Grab latest context in case video changed
  grabPageContext();
  
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
    isPaused = false;
    pauseBtn.innerHTML = '⏸️';
    
    // Do first screenshot immediately
    generateCommentary();
    
    // Set initial next screenshot time
    nextScreenshotTime = Date.now() + (intervalSeconds * 1000);
    
    commentaryInterval = setInterval(() => {
      if (!isPaused) {
        // Update next screenshot time before generating commentary
        nextScreenshotTime = Date.now() + (intervalSeconds * 1000);
        generateCommentary();
      }
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
    isPaused = false;
    pauseBtn.innerHTML = '⏸️';
    // Clean up streams
    if (netflixStream) {
      netflixStream.getTracks().forEach(track => track.stop());
      netflixStream = null;
    }
    if (disneyStream) {
      disneyStream.getTracks().forEach(track => track.stop());
      disneyStream = null;
    }
    if (safeshareStream) {
      safeshareStream.getTracks().forEach(track => track.stop());
      safeshareStream = null;
    }
    if (nsfwytStream) {
      nsfwytStream.getTracks().forEach(track => track.stop());
      nsfwytStream = null;
    }
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

// Add drag functionality
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

toolbar.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

function dragStart(e) {
  if (e.target === toolbar || e.target === countdownDisplay) {  // Allow dragging from toolbar and countdown
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    isDragging = true;
    toolbar.style.cursor = 'grabbing';
  }
}

function drag(e) {
  if (isDragging) {
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    xOffset = currentX;
    yOffset = currentY;
    
    overlay.style.transform = `translate(${currentX}px, ${currentY}px)`;
    savePosition();  // Save position while dragging
  }
}

function dragEnd(e) {
  initialX = currentX;
  initialY = currentY;
  isDragging = false;
  toolbar.style.cursor = 'move';
  savePosition();  // Save final position
}

// Save position when window is moved
let moveTimeout;
function savePosition() {
  clearTimeout(moveTimeout);
  moveTimeout = setTimeout(() => {
    chrome.storage.local.set({
      overlayX: xOffset,
      overlayY: yOffset
    });
  }, 500);
}

// Load saved position
chrome.storage.local.get(['overlayX', 'overlayY'], (result) => {
  if (result.overlayX !== undefined && result.overlayY !== undefined) {
    xOffset = result.overlayX;
    yOffset = result.overlayY;
    overlay.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
  }
}); 