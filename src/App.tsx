import { useState, useEffect } from 'react'
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSavedTimestamps()
  }, [])

  const loadSavedTimestamps = async () => {
    try {
      const result = await chrome.storage.local.get(['savedTimestamps'])
      setSavedTimestamps(result.savedTimestamps || [])
    } catch (error) {
      console.error('Error loading timestamps:', error)
    }
  }

  const getYouTubeTimestamp = async () => {
    setLoading(true)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.id) {
        setTimestamp('No active tab found')
        return
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getTimestamp' })
      
      if (response && response.timestamp) {
        setTimestamp(response.timestamp)
      } else {
        setTimestamp('No YouTube video found or not playing')
      }
    } catch (error) {
      setTimestamp('Error: Make sure you\'re on a YouTube page')
    } finally {
      setLoading(false)
    }
  }

  const saveCurrentTimestamp = async () => {
    setSaving(true)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.id) {
        alert('No active tab found')
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
      } else {
        alert('No YouTube video found or not playing')
      }
    } catch (error) {
      alert('Error: Make sure you\'re on a YouTube page')
    } finally {
      setSaving(false)
    }
  }

  const navigateToTimestamp = async (savedTimestamp: SavedTimestamp) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.id) {
        alert('No active tab found')
        return
      }

      // Check if we're on the same video
      if (tab.url !== savedTimestamp.videoUrl) {
        // Navigate to the video URL first
        await chrome.tabs.update(tab.id, { url: savedTimestamp.videoUrl })
        // Wait a bit for the page to load
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id!, { 
              action: 'seekToTime', 
              timestamp: savedTimestamp.timestamp 
            })
          } catch (error) {
            console.error('Error seeking after navigation:', error)
          }
        }, 2000)
      } else {
        // Same video, just seek to the timestamp
        const response = await chrome.tabs.sendMessage(tab.id, { 
          action: 'seekToTime', 
          timestamp: savedTimestamp.timestamp 
        })
        
        if (response && response.success) {
          setTimestamp(`Navigated to: ${savedTimestamp.timestamp}`)
        } else {
          alert('Could not navigate to timestamp')
        }
      }
    } catch (error) {
      alert('Error navigating to timestamp')
    }
  }

  const deleteTimestamp = async (id: string) => {
    const updatedTimestamps = savedTimestamps.filter(t => t.id !== id)
    setSavedTimestamps(updatedTimestamps)
    await chrome.storage.local.set({ savedTimestamps: updatedTimestamps })
  }

  return (
    <div style={{ width: '400px', padding: '20px' }}>
      <h1>YouTube Timestamps</h1>
      
      <div className="card">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button onClick={getYouTubeTimestamp} disabled={loading}>
            {loading ? 'Getting...' : 'Get Current Time'}
          </button>
          <button onClick={saveCurrentTimestamp} disabled={saving}>
            {saving ? 'Saving...' : 'Save Timestamp'}
          </button>
        </div>
        
        {timestamp && (
          <p style={{ marginTop: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            {timestamp}
          </p>
        )}
        
        <p style={{ fontSize: '12px', color: '#666' }}>
          Use on YouTube video pages
        </p>
      </div>

      {savedTimestamps.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Saved Timestamps ({savedTimestamps.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {savedTimestamps.map((saved) => (
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
                      {saved.timestamp} - {saved.videoTitle}
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
      )}
    </div>
  )
}

export default App
