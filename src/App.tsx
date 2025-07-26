import { useState, useEffect, useCallback } from 'react'
import './App.css'

interface SavedTimestamp {
  id: string
  timestamp: string
  videoTitle: string
  videoUrl: string
  savedAt: string
}

function App() {
  const [timestamp, setTimestamp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savedTimestamps, setSavedTimestamps] = useState<SavedTimestamp[]>([])
  const [currentVideoTimestamps, setCurrentVideoTimestamps] = useState<SavedTimestamp[]>([])
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null)
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string | null>(null)

  const saveCurrentTimestamp = useCallback(async () => {
    setLoading(true)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.id) {
        setTimestamp('No active tab found')
        return
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' })
      
      if (response && response.videoInfo) {
        const newTimestamp: SavedTimestamp = {
          id: Date.now().toString(),
          ...response.videoInfo
        }
        
        const updatedTimestamps = [newTimestamp, ...savedTimestamps]
        setSavedTimestamps(updatedTimestamps)
        
        await chrome.storage.local.set({ savedTimestamps: updatedTimestamps })
        setTimestamp(`Saved: ${newTimestamp.timestamp}`)
        
        // Update current video info in case it wasn't set
        setCurrentVideoUrl(newTimestamp.videoUrl)
        setCurrentVideoTitle(newTimestamp.videoTitle)
        
        // Refresh markers on the page
        try {
          console.log('About to send refreshMarkers message to tab:', tab.id)
          // Add a small delay to ensure storage is fully updated
          setTimeout(async () => {
            try {
              console.log('Sending refreshMarkers message now')
              const response = await chrome.tabs.sendMessage(tab.id!, { action: 'refreshMarkers' })
              console.log('refreshMarkers response:', response)
            } catch (error) {
              console.error('Error refreshing markers:', error)
            }
          }, 100)
        } catch (error) {
          console.error('Error setting up marker refresh:', error)
        }
      } else {
        setTimestamp('No YouTube video found or not playing')
      }
    } catch (error) {
      setTimestamp('Error: Make sure you\'re on a YouTube page')
    } finally {
      setLoading(false)
    }
  }, [savedTimestamps])

  useEffect(() => {
    loadSavedTimestamps()
    getCurrentVideoInfo()
    
    // Listen for keyboard shortcuts
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 's' || event.key === 'S') {
        event.preventDefault()
        if (!loading && currentVideoUrl) {
          saveCurrentTimestamp()
        }
      }
    }
    
    // Listen for Chrome extension commands
    const handleCommand = (command: string) => {
      if (command === 'save-timestamp') {
        if (!loading && currentVideoUrl) {
          saveCurrentTimestamp()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    
    // Chrome extension command listener
    if (chrome.commands && chrome.commands.onCommand) {
      chrome.commands.onCommand.addListener(handleCommand)
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      if (chrome.commands && chrome.commands.onCommand) {
        chrome.commands.onCommand.removeListener(handleCommand)
      }
    }
  }, [loading, currentVideoUrl, saveCurrentTimestamp])

  const getCurrentVideoInfo = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.id || !tab.url?.includes('youtube.com/watch')) {
        setCurrentVideoUrl(null)
        setCurrentVideoTitle(null)
        setCurrentVideoTimestamps([])
        return
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' })
      
      if (response && response.videoInfo) {
        setCurrentVideoUrl(response.videoInfo.videoUrl)
        setCurrentVideoTitle(response.videoInfo.videoTitle)
      }
    } catch (error) {
      console.error('Error getting current video info:', error)
      setCurrentVideoUrl(null)
      setCurrentVideoTitle(null)
    }
  }

  const loadSavedTimestamps = async () => {
    try {
      const result = await chrome.storage.local.get(['savedTimestamps'])
      setSavedTimestamps(result.savedTimestamps || [])
    } catch (error) {
      console.error('Error loading timestamps:', error)
    }
  }

  useEffect(() => {
    if (currentVideoUrl && savedTimestamps.length > 0) {
      const filteredTimestamps = savedTimestamps.filter(
        timestamp => timestamp.videoUrl === currentVideoUrl
      )
      setCurrentVideoTimestamps(filteredTimestamps)
    } else {
      setCurrentVideoTimestamps([])
    }
  }, [currentVideoUrl, savedTimestamps])


  const navigateToTimestamp = async (savedTimestamp: SavedTimestamp) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.id) {
        alert('No active tab found')
        return
      }

      // Since we're only showing current video timestamps, we can directly seek
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'seekToTime', 
        timestamp: savedTimestamp.timestamp 
      })
      
      if (response && response.success) {
        setTimestamp(`Navigated to: ${savedTimestamp.timestamp}`)
      } else {
        alert('Could not navigate to timestamp')
      }
    } catch (error) {
      alert('Error navigating to timestamp')
    }
  }

  const deleteTimestamp = async (id: string) => {
    const updatedTimestamps = savedTimestamps.filter(t => t.id !== id)
    setSavedTimestamps(updatedTimestamps)
    await chrome.storage.local.set({ savedTimestamps: updatedTimestamps })
    
    // Refresh markers on the page
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      console.log('Delete: About to send refreshMarkers message to tab:', tab.id)
      if (tab.id) {
        // Add a small delay to ensure storage is fully updated
        setTimeout(async () => {
          try {
            console.log('Delete: Sending refreshMarkers message now')
            const response = await chrome.tabs.sendMessage(tab.id!, { action: 'refreshMarkers' })
            console.log('Delete: refreshMarkers response:', response)
          } catch (error) {
            console.error('Delete: Error refreshing markers:', error)
          }
        }, 100)
      }
    } catch (error) {
      console.error('Delete: Error setting up marker refresh:', error)
    }
  }

  return (
    <div style={{ width: '400px', padding: '20px' }}>
      <h1>YouTube Timestamps</h1>
      
      {currentVideoTitle && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
            Current Video:
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {currentVideoTitle}
          </div>
        </div>
      )}
      
      <div className="card">
        <button 
          onClick={saveCurrentTimestamp} 
          disabled={loading || !currentVideoUrl}
          style={{ 
            width: '100%', 
            padding: '12px', 
            fontSize: '16px', 
            marginBottom: '10px' 
          }}
        >
          {loading ? 'Saving...' : 'Save Current Timestamp'}
        </button>
        
        {timestamp && (
          <p style={{ marginTop: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            {timestamp}
          </p>
        )}
        
        <p style={{ fontSize: '12px', color: '#666' }}>
          {currentVideoUrl ? 'Click to save the current video timestamp' : 'Open a YouTube video to start'}
        </p>
      </div>

      {currentVideoTimestamps.length > 0 ? (
        <div style={{ marginTop: '20px' }}>
          <h3>Saved Timestamps ({currentVideoTimestamps.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {currentVideoTimestamps.map((saved) => (
              <div 
                key={saved.id} 
                style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '5px', 
                  padding: '10px', 
                  marginBottom: '10px',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div 
                      style={{ 
                        fontWeight: 'bold', 
                        fontSize: '14px', 
                        marginBottom: '5px',
                        cursor: 'pointer',
                        color: '#1976d2'
                      }}
                      onClick={() => navigateToTimestamp(saved)}
                      title="Click to navigate to this timestamp"
                    >
                      {saved.timestamp}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Saved: {saved.savedAt}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteTimestamp(saved.id)}
                    style={{ 
                      background: '#ff4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '3px', 
                      padding: '5px 8px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : currentVideoUrl ? (
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
          <p>No timestamps saved for this video yet.</p>
        </div>
      ) : null}
    </div>
  )
}

export default App
