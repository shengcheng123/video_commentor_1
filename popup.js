// Load saved interval
chrome.storage.local.get('intervalSeconds', (result) => {
  if (result.intervalSeconds) {
    document.getElementById('intervalInput').value = result.intervalSeconds;
  }
});

// Handle interval changes
document.getElementById('intervalInput').addEventListener('change', (e) => {
  const seconds = parseInt(e.target.value);
  if (seconds >= 5 && seconds <= 60) {
    chrome.storage.local.set({ intervalSeconds: seconds });
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'setInterval',
        seconds: seconds
      }).catch(err => {
        console.error('Failed to update interval:', err);
      });
    });
  }
});

document.getElementById('startBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    // First inject the content script if not already present
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['api_key.js', 'prompts.js', 'content.js']
    }).then(() => {
      // Send saved interval first
      const interval = parseInt(document.getElementById('intervalInput').value);
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'setInterval',
        seconds: interval
      });
      // Then send the message
      chrome.tabs.sendMessage(tabs[0].id, {action: 'startCommentary'});
    }).catch(err => {
      console.error('Failed to inject content script:', err);
    });
  });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'stopCommentary'}).catch(err => {
      console.error('Failed to send stop message:', err);
    });
  });
});

document.getElementById('screenshotBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    // First inject the content script if not already present
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['prompts.js', 'content.js']
    }).then(() => {
      // Then send the message to take a screenshot
      chrome.tabs.sendMessage(tabs[0].id, {action: 'takeScreenshot'});
    }).catch(err => {
      console.error('Failed to inject content script:', err);
    });
  });
}); 