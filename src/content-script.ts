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