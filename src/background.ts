// Background script to handle timestamp saving

interface SavedTimestamp {
  id: string
  timestamp: string
  videoTitle: string
  videoUrl: string
  savedAt: string
}

interface VideoInfo {
  timestamp: string
  videoTitle: string
  videoUrl: string
  savedAt: string
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request: {action: string, videoInfo?: VideoInfo}) => {
  if (request.action === 'saveTimestamp' && request.videoInfo) {
    saveTimestamp(request.videoInfo);
  }
  return true;
});

async function saveTimestamp(videoInfo: VideoInfo) {
  try {
    // Get existing timestamps
    const result = await chrome.storage.local.get(['savedTimestamps']);
    const savedTimestamps: SavedTimestamp[] = result.savedTimestamps || [];
    
    // Create new timestamp
    const newTimestamp: SavedTimestamp = {
      id: Date.now().toString(),
      timestamp: videoInfo.timestamp,
      videoTitle: videoInfo.videoTitle,
      videoUrl: videoInfo.videoUrl,
      savedAt: videoInfo.savedAt
    };
    
    // Add to beginning of array
    const updatedTimestamps = [newTimestamp, ...savedTimestamps];
    
    // Save to storage
    await chrome.storage.local.set({ savedTimestamps: updatedTimestamps });
    
    console.log('Timestamp saved:', newTimestamp.timestamp);
  } catch (error) {
    console.error('Error saving timestamp:', error);
  }
}