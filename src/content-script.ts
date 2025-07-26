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

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request: { action: string }, _sender: chrome.runtime.MessageSender, sendResponse: (response: { timestamp: string | null }) => void) => {
  if (request.action === 'getTimestamp') {
    const timestamp = getCurrentTimestamp();
    sendResponse({ timestamp });
  }
  return true; // Keep the message channel open for async response
});