import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [timestamp, setTimestamp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>YouTube Timestamp</h1>
      <div className="card">
        <button onClick={getYouTubeTimestamp} disabled={loading}>
          {loading ? 'Getting timestamp...' : 'Get Current Timestamp'}
        </button>
        {timestamp && (
          <p style={{ marginTop: '10px', fontSize: '18px', fontWeight: 'bold' }}>
            Current time: {timestamp}
          </p>
        )}
        <p>
          Click the button while on a YouTube video page
        </p>
      </div>
    </>
  )
}

export default App
