// Content script to extract YouTube video timestamp

function extractVideoId(url: string): string | null {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

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
  const videoId = extractVideoId(videoUrl);

  if (!videoId) return null;

  return {
    timestamp,
    currentTime,
    videoTitle: videoTitle.trim(),
    videoUrl,
    videoId,
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

// Visual markers functionality
function createMarker(timestampSeconds: number, videoDuration: number, label: string): HTMLElement {
  const marker = document.createElement('div');
  marker.className = 'timestamp-marker';
  
  // Calculate position as percentage
  const position = (timestampSeconds / videoDuration) * 100;
  
  // Style the marker
  marker.style.cssText = `
    position: absolute;
    left: ${position}%;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: #ff4444;
    z-index: 100;
    pointer-events: auto;
    transform: translateX(-50%);
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 1px;
  `;
  
  // Add hover effect
  marker.addEventListener('mouseenter', () => {
    marker.style.width = '5px';
    marker.style.backgroundColor = '#ff0000';
  });
  
  marker.addEventListener('mouseleave', () => {
    marker.style.width = '3px';
    marker.style.backgroundColor = '#ff4444';
  });
  
  // Add click handler to seek to timestamp
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    seekToTime(timestampSeconds);
  });
  
  // Add tooltip
  marker.title = label || `Saved at ${formatTime(timestampSeconds)}`;
  
  return marker;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

function injectMarkers(timestamps: Array<{time: number, label: string}>) {
  const progressBarContainer = document.querySelector('.ytp-progress-bar-container');
  const video = document.querySelector('#movie_player video') as HTMLVideoElement;
  
  console.log('injectMarkers called with', timestamps.length, 'timestamps');
  console.log('Progress bar container found:', !!progressBarContainer);
  console.log('Video element found:', !!video);
  console.log('Video duration:', video?.duration);
  
  if (!progressBarContainer || !video || !video.duration) {
    console.log('Cannot inject markers - missing elements or video duration');
    return;
  }
  
  // Clear existing markers
  const existingMarkers = progressBarContainer.querySelectorAll('.timestamp-marker');
  console.log('Removing', existingMarkers.length, 'existing markers');
  existingMarkers.forEach(marker => marker.remove());
  
  // Add new markers
  timestamps.forEach((timestamp, index) => {
    console.log(`Creating marker ${index + 1}:`, timestamp);
    const marker = createMarker(timestamp.time, video.duration, timestamp.label);
    progressBarContainer.appendChild(marker);
  });
  
  console.log('Finished injecting', timestamps.length, 'markers');
}

function getCurrentVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function loadAndDisplayMarkers() {
  const videoId = getCurrentVideoId();
  if (!videoId) {
    console.log('No video ID found, skipping marker load');
    return;
  }
  
  console.log('Loading markers for video:', videoId);
  
  // Get saved timestamps from storage
  chrome.storage.local.get(['savedTimestamps'], (result) => {
    const savedTimestamps = result.savedTimestamps || [];
    
    console.log('Total saved timestamps:', savedTimestamps.length);
    console.log('Current video ID:', videoId);
    
    // Filter timestamps for current video using videoId
    const videoTimestamps = savedTimestamps
      .filter((ts: {videoId?: string, videoUrl?: string}) => {
        // Support both new videoId and old videoUrl for backward compatibility
        if (ts.videoId) {
          return ts.videoId === videoId;
        } else if (ts.videoUrl) {
          // Fallback to old URL matching for legacy data
          const legacyVideoId = extractVideoId(ts.videoUrl);
          return legacyVideoId === videoId;
        }
        return false;
      })
      .map((ts: {timestamp: string}) => ({
        time: parseTimestamp(ts.timestamp),
        label: `Saved: ${ts.timestamp}`
      }));
    
    console.log('Video timestamps for current video:', videoTimestamps.length);
    
    if (videoTimestamps.length > 0) {
      injectMarkers(videoTimestamps);
    } else {
      // Clear existing markers if no timestamps for this video
      const progressBarContainer = document.querySelector('.ytp-progress-bar-container');
      if (progressBarContainer) {
        progressBarContainer.querySelectorAll('.timestamp-marker').forEach(marker => marker.remove());
      }
    }
  });
}

function waitForVideoMetadata(callback: (video: HTMLVideoElement) => void) {
  const video = document.querySelector('#movie_player video') as HTMLVideoElement;
  if (video && video.duration) {
    callback(video);
  } else {
    setTimeout(() => waitForVideoMetadata(callback), 100);
  }
}

// Monitor for video changes and navigation
let currentVideoId: string | null = null;
let observer: MutationObserver | null = null;

function initializeMarkerSystem() {
  // Clean up existing observer
  if (observer) {
    observer.disconnect();
  }
  
  observer = new MutationObserver(() => {
    const videoId = getCurrentVideoId();
    if (videoId && videoId !== currentVideoId) {
      currentVideoId = videoId;
      waitForVideoMetadata(() => {
        setTimeout(() => {
          loadAndDisplayMarkers();
        }, 500); // Give YouTube time to fully load the player
      });
    }
  });
  
  // Start observing
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Initial load
  const initialVideoId = getCurrentVideoId();
  if (initialVideoId) {
    currentVideoId = initialVideoId;
    waitForVideoMetadata(() => {
      setTimeout(() => {
        loadAndDisplayMarkers();
      }, 500);
    });
  }
}

// Listen for storage changes to automatically refresh markers
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.savedTimestamps) {
    console.log('Storage changed, refreshing markers');
    // Add a small delay to ensure the page is ready
    setTimeout(() => {
      loadAndDisplayMarkers();
    }, 200);
  }
});

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMarkerSystem);
} else {
  initializeMarkerSystem();
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request: {action: string, timestamp?: string}, _sender: chrome.runtime.MessageSender, sendResponse: (response: {timestamp?: string | null, videoInfo?: unknown, success?: boolean}) => void) => {
  if (request.action === 'getTimestamp') {
    const timestamp = getCurrentTimestamp();
    sendResponse({ timestamp });
  } else if (request.action === 'getVideoInfo') {
    const videoInfo = getCurrentVideoInfo();
    sendResponse({ videoInfo });
  } else if (request.action === 'seekToTime' && request.timestamp) {
    const timeInSeconds = parseTimestamp(request.timestamp);
    const success = seekToTime(timeInSeconds);
    sendResponse({ success });
  } else if (request.action === 'refreshMarkers') {
    console.log('Received refreshMarkers message');
    // Refresh markers when timestamps are updated
    loadAndDisplayMarkers();
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
});