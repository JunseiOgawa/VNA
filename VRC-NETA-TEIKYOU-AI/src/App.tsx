import React from 'react'
import './App.css'
import { useAudioRecorder } from './components/Recording.tsx'

function App() {
  const { audioUrl, isRecording, startRecording, stopRecording } = useAudioRecorder()
  const [error, setError] = React.useState<string | null>(null)

  const handleStartRecording = async () => {
    setError(null) // エラー表示をリセット
    try {
      await startRecording()
    } catch (err) {
      console.error('録音開始に失敗しました:', err)
      setError('録音を開始できませんでした。マイクへのアクセス権限を確認してください。')
    }
  }

  const handleStopRecording = async () => {
    try {
      stopRecording()
    } catch (err) {
      console.error('録音停止に失敗しました:', err)
      setError('録音の停止中にエラーが発生しました。')
    }
  }

  return (
    <div className="app-container">
      <h1>会話録音ネタ提供AI</h1>
      
      <div className="recording-controls">
        {!isRecording ? (
          <button onClick={handleStartRecording} className="record-button">
            録音開始
          </button>
        ) : (
          <button onClick={handleStopRecording} className="stop-button">
            録音停止
          </button>
        )}
      </div>

      {error && (
        <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>
          {error}
        </div>
      )}

      {audioUrl && (
        <div className="audio-player">
          <h2>録音された音声</h2>
          <audio src={audioUrl} controls />
        </div>
      )}
    </div>
  )
}

export default App
