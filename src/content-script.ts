// Content script to extract YouTube video timestamp

function getCurrentTimestamp(): string | null {
  // Try to find the video element
  const video = document.querySelector('video') as HTMLVideoElement;
  
  if (!video) {
    return null;
  }

  const currentTime = video.currentTime;
  
  // Convert seconds to MM:SS or HH:MM:SS format
  const hours = Math.floor(currentTime / 3600);
  const minutes = Math.floor((currentTime % 3600) / 60);
  const seconds = Math.floor(currentTime % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

function getCurrentVideoInfo() {
  const video = document.querySelector('video') as HTMLVideoElement;
  if (!video) return null;

  const currentTime = video.currentTime;
  const timestamp = getCurrentTimestamp();
  const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || 
                    document.querySelector('#title h1')?.textContent || 'Unknown Video';
  const videoUrl = window.location.href;

  return {
    timestamp,
    currentTime,
    videoTitle: videoTitle.trim(),
    videoUrl,
    savedAt: new Date().toLocaleString()
  };
}

function seekToTime(timeInSeconds: number): boolean {
  const video = document.querySelector('video') as HTMLVideoElement;
  if (!video) return false;

  video.currentTime = timeInSeconds;
  return true;
}

function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(part => parseInt(part, 10));
  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

// Listen for 'S' key to save timestamp globally on YouTube
document.addEventListener('keydown', (event: KeyboardEvent) => {
  // Only trigger if S is pressed and not in an input field
  if ((event.key === 's' || event.key === 'S') && 
      !isInputFocused() && 
      !event.ctrlKey && 
      !event.metaKey && 
      !event.altKey) {
    
    event.preventDefault();
    
    const videoInfo = getCurrentVideoInfo();
    if (videoInfo && videoInfo.timestamp) {
      // Send message to background script to save timestamp
      chrome.runtime.sendMessage({
        action: 'saveTimestamp',
        videoInfo: videoInfo
      });
      
      // Show a brief visual confirmation
      showSaveConfirmation(videoInfo.timestamp);
    }
  }
});

function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  return tagName === 'input' || 
         tagName === 'textarea' || 
         activeElement.getAttribute('contenteditable') === 'true' ||
         activeElement.closest('[contenteditable="true"]') !== null;
}

function showSaveConfirmation(timestamp: string) {
  // Create a temporary notification
  const notification = document.createElement('div');
  notification.textContent = `Timestamp saved: ${timestamp}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: opacity 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 2 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (request.action === 'getTimestamp') {
    const timestamp = getCurrentTimestamp();
    sendResponse({ timestamp });
  } else if (request.action === 'getVideoInfo') {
    const videoInfo = getCurrentVideoInfo();
    sendResponse({ videoInfo });
  } else if (request.action === 'seekToTime') {
    const timeInSeconds = parseTimestamp(request.timestamp);
    const success = seekToTime(timeInSeconds);
    sendResponse({ success });
  }
  return true; // Keep the message channel open for async response
});