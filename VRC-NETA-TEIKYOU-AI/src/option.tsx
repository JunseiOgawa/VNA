import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useState, useEffect } from 'react'
import './option.css'

const OptionsPage = () => {
  // 設定の状態管理
  const [apiKey, setApiKey] = useState('')
  const [recordingSelf, setRecordingSelf] = useState(true)
  const [autoTranscription, setAutoTranscription] = useState(true)
  const [retentionPeriod, setRetentionPeriod] = useState(30) // 日数での保存期間
  const [topics, setTopics] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState('')
  
  // 設定の読み込み
  useEffect(() => {
    chrome.storage.sync.get([
      'apiKey',
      'recordingSelf',
      'autoTranscription',
      'retentionPeriod',
      'topics'
    ], (result) => {
      if (result.apiKey) setApiKey(result.apiKey)
      if (result.recordingSelf !== undefined) setRecordingSelf(result.recordingSelf)
      if (result.autoTranscription !== undefined) setAutoTranscription(result.autoTranscription)
      if (result.retentionPeriod) setRetentionPeriod(result.retentionPeriod)
      if (result.topics) setTopics(result.topics)
    })
  }, [])

  // 設定の保存
  const saveSettings = () => {
    chrome.storage.sync.set({
      apiKey,
      recordingSelf,
      autoTranscription,
      retentionPeriod,
      topics
    }, () => {
      showSavedMessage()
    })
  }

  // 保存メッセージの表示
  const [showSaved, setShowSaved] = useState(false)
  const showSavedMessage = () => {
    setShowSaved(true)
    setTimeout(() => {
      setShowSaved(false)
    }, 2000)
  }

  // トピックの追加
  const addTopic = () => {
    if (newTopic.trim() !== '' && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()])
      setNewTopic('')
    }
  }

  // トピックの削除
  const removeTopic = (index: number) => {
    const newTopics = [...topics]
    newTopics.splice(index, 1)
    setTopics(newTopics)
  }

  return (
    <div className="options-container">
      <h1>VRC ネタ提供 AI 設定</h1>
      
      <section className="option-section">
        <h2>基本設定</h2>
        
        <div className="option-item">
          <label htmlFor="api-key">API キー:</label>
          <input 
            type="password" 
            id="api-key" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            placeholder="API キーを入力してください" 
          />
        </div>
        
        <div className="option-item">
          <label>
            <input 
              type="checkbox" 
              checked={recordingSelf} 
              onChange={() => setRecordingSelf(!recordingSelf)} 
            />
            自分の音声も録音する
          </label>
        </div>
        
        <div className="option-item">
          <label>
            <input 
              type="checkbox" 
              checked={autoTranscription} 
              onChange={() => setAutoTranscription(!autoTranscription)} 
            />
            自動で文字起こしを開始する
          </label>
        </div>
        
        <div className="option-item">
          <label htmlFor="retention-period">データ保存期間 (日):</label>
          <input 
            type="number" 
            id="retention-period" 
            min="1" 
            max="365" 
            value={retentionPeriod} 
            onChange={(e) => setRetentionPeriod(parseInt(e.target.value) || 30)} 
          />
        </div>
      </section>
      
      <section className="option-section">
        <h2>興味のあるトピック</h2>
        <div className="topic-input-container">
          <input 
            type="text" 
            value={newTopic} 
            onChange={(e) => setNewTopic(e.target.value)} 
            placeholder="新しいトピックを追加" 
            onKeyPress={(e) => e.key === 'Enter' && addTopic()}
          />
          <button onClick={addTopic}>追加</button>
        </div>
        
        <div className="topics-list">
          {topics.length > 0 ? (
            topics.map((topic, index) => (
              <div key={index} className="topic-item">
                <span>{topic}</span>
                <button onClick={() => removeTopic(index)}>削除</button>
              </div>
            ))
          ) : (
            <p className="no-topics">トピックが登録されていません</p>
          )}
        </div>
      </section>
      
      <div className="buttons-container">
        <button className="save-button" onClick={saveSettings}>設定を保存</button>
        {showSaved && <span className="saved-message">設定を保存しました！</span>}
      </div>
    </div>
  )
}

// DOMにレンダリング
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <OptionsPage />
    </StrictMode>
  )
}
