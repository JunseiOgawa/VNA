// 音声認識と録音のためのJavaScriptコード

// UI関連のコード
const VNAUI = (function() {
  // キャッシュされたDOM要素
  let elements = {};
  let timerInterval = null;
  let topicSuggestions = [];
  let isTopicModeActive = false;
  let isFixedMode = false;
  let isFillerRemovalEnabled = false;
  
  return {
    // 初期化
    init: function() {
      // DOM要素をキャッシュ
      elements = {
        recordButton: document.getElementById('recordButton'),
        stopButton: document.getElementById('stopButton'),
        downloadButton: document.getElementById('downloadButton'),
        audioPlayer: document.getElementById('audioPlayer'),
        audioPlaybackDiv: document.getElementById('audioPlayback'),
        errorMessagesDiv: document.getElementById('errorMessages'),
        recordingStatus: document.getElementById('recordingStatus'),
        timerDisplay: document.getElementById('timer'),
        statusContainer: document.querySelector('.status-container'),
        transcriptContainer: document.getElementById('transcriptContainer'),
        transcriptDiv: document.getElementById('transcript'),
        topicSuggestionsList: document.getElementById('topicSuggestionsList'),
        topicError: document.getElementById('topicError'),
        conversationHistoryDiv: document.getElementById('conversationHistory'),
        clearHistoryButton: document.getElementById('clearHistoryButton'),
        topicModal: document.getElementById('topicModal'),
        topicModalList: document.getElementById('topicModalList'),
        closeTopicModal: document.getElementById('closeTopicModal'),
        topicModeToggle: document.getElementById('topicModeToggle'),
        historyTopicModal: document.getElementById('historyTopicModal'),
        historyTopicContent: document.getElementById('historyTopicContent'),
        closeHistoryModal: document.getElementById('closeHistoryModal'),
        viewHistoryTopics: document.getElementById('viewHistoryTopics'),
        fillerRemovalToggle: document.getElementById('fillerRemovalToggle')
      };
      
      // モーダル関連のイベントリスナーを設定
      this.setupModalListeners();
      
      // ローカルストレージから設定を取得
      VNAStorage.getUiSettings(settings => {
        isTopicModeActive = settings.isTopicModeActive || false;
        isFixedMode = settings.isFixedMode || false;
        
        // トグルスイッチの初期状態を設定
        if (elements.topicModeToggle) {
          elements.topicModeToggle.checked = isTopicModeActive;
        }
        
        if (elements.toggleFixedMode) {
          elements.toggleFixedMode.checked = isFixedMode;
        }
      });
      
      // 文字起こし設定を取得
      VNAStorage.getTranscriptSettings(settings => {
        isFillerRemovalEnabled = settings.isFillerRemovalEnabled || false;
        
        // トグルスイッチの初期状態を設定
        if (elements.fillerRemovalToggle) {
          elements.fillerRemovalToggle.checked = isFillerRemovalEnabled;
        }
      });
      
      // フィラー除去トグルのイベントリスナー設定
      if (elements.fillerRemovalToggle) {
        elements.fillerRemovalToggle.addEventListener('change', () => {
          const isEnabled = elements.fillerRemovalToggle.checked;
          VNARecorder.toggleFillerRemoval(isEnabled);
        });
      }
      
      return this;
    },
    
    // エラーメッセージを表示
    showError: function(message) {
      if (elements.errorMessagesDiv) {
        elements.errorMessagesDiv.textContent = message;
      }
    },
    
    // エラーメッセージをクリア
    clearErrors: function() {
      if (elements.errorMessagesDiv) {
        elements.errorMessagesDiv.textContent = '';
      }
      if (elements.topicError) {
        elements.topicError.textContent = '';
      }
    },
    
    // 録音開始時のUI更新
    updateForRecordingStart: function() {
      elements.recordButton.disabled = true;
      elements.stopButton.disabled = false;
      elements.downloadButton.disabled = true;
      elements.recordingStatus.textContent = '録音中... (文字起こしも行っています)';
      elements.statusContainer.classList.add('recording');
      
      const transcriptStatus = document.getElementById('transcriptStatus');
      if (transcriptStatus) {
        transcriptStatus.textContent = '音声を認識中です...';
        transcriptStatus.style.color = '#007bff';
      }
    },
    
    // 録音停止時のUI更新
    updateForRecordingStop: function() {
      elements.recordButton.disabled = false;
      elements.stopButton.disabled = true;
      elements.downloadButton.disabled = false;
      elements.recordingStatus.textContent = '録音完了';
      elements.statusContainer.classList.remove('recording');
      
      const transcriptStatus = document.getElementById('transcriptStatus');
      if (transcriptStatus) {
        transcriptStatus.textContent = '音声認識完了';
        transcriptStatus.style.color = '#28a745';
      }
    },
    
    // タイマーを開始
    startTimer: function(startTime) {
      const updateTimer = () => {
        const currentTime = Date.now();
        const diff = currentTime - startTime;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        elements.timerDisplay.textContent = `${pad(minutes)}:${pad(seconds)}`;
      };
      
      timerInterval = setInterval(updateTimer, 1000);
      updateTimer();
    },
    
    // タイマーを停止
    stopTimer: function() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    },
    
    // 録音された音声を表示
    showAudioPlayer: function(audioUrl) {
      elements.audioPlayer.src = audioUrl;
      elements.audioPlaybackDiv.style.display = 'block';
    },
    
    // 文字起こしテキストの追加
    appendTranscript: function(text) {
      const oldContent = elements.transcriptDiv.textContent || '';
      elements.transcriptDiv.textContent = oldContent + text;
      elements.transcriptContainer.style.display = 'block';
    },
    
    // 文字起こしテキストの取得
    getCurrentTranscript: function() {
      return elements.transcriptDiv ? elements.transcriptDiv.textContent.trim() : '';
    },
    
    // 文字起こしテキストのクリア
    clearTranscript: function() {
      if (elements.transcriptDiv) {
        elements.transcriptDiv.textContent = '';
        
        // 中間結果もクリア
        const interimElement = document.getElementById('interimResult');
        if (interimElement) {
          interimElement.textContent = '';
        }
      }
    },
    
    // 中間文字起こし結果の更新
    updateInterimTranscript: function(text) {
      let interimElement = document.getElementById('interimResult');
      if (!interimElement && text) {
        interimElement = document.createElement('div');
        interimElement.id = 'interimResult';
        interimElement.style.fontStyle = 'italic';
        interimElement.style.color = '#666';
        elements.transcriptDiv.parentNode.appendChild(interimElement);
      }
      
      if (interimElement) {
        interimElement.textContent = text;
      }
    },
    
    // 話題提案の読み込み中表示
    showTopicLoading: function() {
      if (elements.topicSuggestionsList) {
        elements.topicSuggestionsList.innerHTML = '<li class="loading">話題を生成中...</li>';
      }
    },
    
    // 話題提案のエラー表示
    showTopicError: function(message) {
      if (elements.topicError) {
        elements.topicError.textContent = message;
        elements.topicError.style.display = 'block';
      }
    },
    
    // 話題提案なしの表示
    showNoTopics: function() {
      if (elements.topicSuggestionsList) {
        elements.topicSuggestionsList.innerHTML = '<li class="no-topics">提案できる話題がありません</li>';
      }
    },
      // 話題提案の更新
    updateTopicSuggestions: function(suggestions, fullTopicInfo = []) {
      if (!elements.topicSuggestionsList) return;
      
      elements.topicSuggestionsList.innerHTML = '';
      topicSuggestions = suggestions;
      
      // モーダル用リストもクリア
      if (elements.topicModalList) {
        elements.topicModalList.innerHTML = '';
      }
      
      suggestions.forEach((suggestion, index) => {
        // サイドバー用
        const li = document.createElement('li');
        li.textContent = suggestion;
        
        // 深掘り情報がある場合はツールチップを追加
        if (fullTopicInfo && fullTopicInfo[index]) {
          const deepDiveInfo = fullTopicInfo[index].match(/\(深掘り:.*?\)/i);
          if (deepDiveInfo) {
            li.setAttribute('title', deepDiveInfo[0].replace(/\(深掘り:/i, '').replace(/\)$/, '').trim());
            li.classList.add('has-deepdive');
          }
        }
        
        elements.topicSuggestionsList.appendChild(li);
        
        // モーダル用
        if (elements.topicModalList) {
          const modalLi = document.createElement('li');
          modalLi.textContent = suggestion;
          
          // モーダル表示では深掘り情報も表示
          if (fullTopicInfo && fullTopicInfo[index]) {
            const deepDiveInfo = fullTopicInfo[index].match(/\(深掘り:.*?\)/i);
            if (deepDiveInfo) {
              const deepDiveSpan = document.createElement('div');
              deepDiveSpan.className = 'deepdive-info';
              deepDiveSpan.textContent = deepDiveInfo[0];
              modalLi.appendChild(deepDiveSpan);
            }
          }
          
          elements.topicModalList.appendChild(modalLi);
        }
      });
      
      // 話題モードがアクティブならモーダルを表示
      if (isTopicModeActive) {
        this.showTopicModal();
      }
    },
    
    // 話題モーダルの表示
    showTopicModal: function() {
      if (!elements.topicModal || topicSuggestions.length === 0) return;
      
      // 固定モードに応じたクラスの切り替え
      if (isFixedMode) {
        elements.topicModal.classList.add('fixed-mode');
        elements.topicModal.classList.remove('float-mode');
      } else {
        elements.topicModal.classList.add('float-mode');
        elements.topicModal.classList.remove('fixed-mode');
      }
      
      elements.topicModal.classList.add('active');
    },
    
    // 話題モーダルの非表示
    hideTopicModal: function() {
      if (!elements.topicModal) return;
      elements.topicModal.classList.remove('active');
    },
    
    // 固定表示モードの切り替え
    toggleFixedDisplayMode: function() {
      isFixedMode = !isFixedMode;
      
      // 状態を保存
      VNAStorage.saveUiSetting('isFixedMode', isFixedMode);
      
      // モーダルが表示中なら更新
      if (elements.topicModal && elements.topicModal.classList.contains('active')) {
        if (isFixedMode) {
          elements.topicModal.classList.add('fixed-mode');
          elements.topicModal.classList.remove('float-mode');
        } else {
          elements.topicModal.classList.add('float-mode');
          elements.topicModal.classList.remove('fixed-mode');
        }
      }
      
      // ボタンのスタイルも更新
      if (elements.toggleFixedMode) {
        elements.toggleFixedMode.checked = isFixedMode;
      }
    },
    
    // 過去の話題モーダルの表示
    showHistoryModal: function() {
      if (!elements.historyTopicModal) return;
      VNAStorage.displayHistoryTopics(elements.historyTopicContent);
      elements.historyTopicModal.classList.add('active');
    },
    
    // 過去の話題モーダルの非表示
    hideHistoryModal: function() {
      if (!elements.historyTopicModal) return;
      elements.historyTopicModal.classList.remove('active');
    },
    
    // モーダル関連のイベントリスナー設定
    setupModalListeners: function() {
      // 話題モーダルの閉じるボタン
      if (elements.closeTopicModal) {
        elements.closeTopicModal.addEventListener('click', () => this.hideTopicModal());
      }
      
      // 履歴モーダルの閉じるボタン
      if (elements.closeHistoryModal) {
        elements.closeHistoryModal.addEventListener('click', () => this.hideHistoryModal());
      }
      
      // 履歴表示ボタン
      if (elements.viewHistoryTopics) {
        elements.viewHistoryTopics.addEventListener('click', () => this.showHistoryModal());
      }
      
      // 話題モードトグル
      if (elements.topicModeToggle) {
        elements.topicModeToggle.addEventListener('change', () => {
          isTopicModeActive = elements.topicModeToggle.checked;
          VNAStorage.saveUiSetting('isTopicModeActive', isTopicModeActive);
          
          if (isTopicModeActive && topicSuggestions.length > 0) {
            this.showTopicModal();
          } else {
            this.hideTopicModal();
          }
        });
      }
      
      // モーダル外クリックで閉じる
      elements.topicModal?.addEventListener('click', (e) => {
        if (e.target === elements.topicModal) {
          this.hideTopicModal();
        }
      });
      
      elements.historyTopicModal?.addEventListener('click', (e) => {
        if (e.target === elements.historyTopicModal) {
          this.hideHistoryModal();
        }
      });
      
      // キーボードショートカット
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.hideTopicModal();
          this.hideHistoryModal();
        }
      });
    }
  };
})();

// データの保存と取得を担当
const VNAStorage = (function() {
  return {
    // APIキーの取得
    getApiKey: function(callback) {
      chrome.storage.sync.get(['apiKey'], (items) => {
        callback(items.apiKey || null);
      });
    },
    
    // UI設定の取得
    getUiSettings: function(callback) {
      chrome.storage.local.get(
        ['isTopicModeActive', 'isFixedMode'], 
        (settings) => callback(settings)
      );
    },
    
    // UI設定の保存
    saveUiSetting: function(key, value) {
      const setting = {};
      setting[key] = value;
      chrome.storage.local.set(setting);
    },
    
    // 文字起こし設定の取得
    getTranscriptSettings: function(callback) {
      chrome.storage.local.get(
        ['isFillerRemovalEnabled'],
        (settings) => callback(settings)
      );
    },
    
    // 文字起こし設定の保存
    saveTranscriptSetting: function(key, value) {
      const setting = {};
      setting[key] = value;
      chrome.storage.local.set(setting);
    },
    
    // 提案された話題を保存
    saveSuggestedTopics: function(topics) {
      if (!topics || topics.length === 0) return;
      
      const topicData = {
        timestamp: Date.now(),
        topics: topics
      };
      
      chrome.storage.local.get({ suggestedTopics: [] }, (result) => {
        const updatedTopics = [topicData, ...result.suggestedTopics];
        // 最大20セッション分を保存
        if (updatedTopics.length > 20) {
          updatedTopics.length = 20;
        }
        chrome.storage.local.set({ suggestedTopics: updatedTopics });
      });
    },
      // 会話を保存
    saveConversation: function(segments) {
      if (!segments || segments.length === 0) return;
      
      const timestamp = Date.now();
      
      chrome.storage.local.get({ conversations: [] }, (result) => {
        let convs = result.conversations;
        
        // セグメントを個別のエントリとして保存
        segments.forEach(segment => {
          const conv = { 
            timestamp: timestamp, 
            segments: [segment] 
          };
          convs.push(conv);
        });
        
        // 保存を実行
        chrome.storage.local.set({ conversations: convs }, () => {
          console.log(`${segments.length}件の会話を保存しました`);
          // 会話履歴の表示を更新
          const conversationHistory = document.getElementById('conversationHistory');
          if (conversationHistory) {
            this.displayConversationHistory(conversationHistory);
          }
        });
      });
    },
    
    // 会話履歴のクリア
    clearConversationHistory: function(callback) {
      if (confirm('会話履歴をすべて削除しますか？\nこの操作は元に戻せません。')) {
        chrome.storage.local.set({ conversations: [] }, () => {
          console.log('会話履歴をクリアしました');
          if (callback) callback();
          
          // 会話履歴の表示を更新
          const conversationHistory = document.getElementById('conversationHistory');
          if (conversationHistory) {
            this.displayConversationHistory(conversationHistory);
          }
        });
      }
    },
      // 会話履歴の表示
    displayConversationHistory: function(container) {
      if (!container) return;
      
      chrome.storage.local.get({ conversations: [] }, (result) => {
        const conversations = result.conversations;
        if (conversations.length === 0) {
          container.textContent = '会話履歴はありません。';
          return;
        }
        
        // 表示用に最新10件を逆順で取得（新しいものが上に表示）
        const recentConversations = conversations.slice(-10).reverse();
        container.innerHTML = '';
        
        // ヘッダーコントロール（エクスポートボタンとカウンター）
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex justify-between items-center mb-3';
        
        // エクスポートボタン
        const exportBtn = document.createElement('button');
        exportBtn.className = 'secondary-button small-button';
        exportBtn.textContent = 'テキストでエクスポート';
        exportBtn.addEventListener('click', () => this.exportConversationsAsText(conversations));
        headerDiv.appendChild(exportBtn);
        
        // 会話数カウンター
        const counterSpan = document.createElement('span');
        counterSpan.className = 'text-xs text-gray-500';
        counterSpan.textContent = `全 ${conversations.length} 件の会話`;
        headerDiv.appendChild(counterSpan);
        
        container.appendChild(headerDiv);
        
        // 会話履歴表示
        recentConversations.forEach((conv, index) => {
          const date = new Date(conv.timestamp);
          const formattedDate = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
          
          const convDiv = document.createElement('div');
          convDiv.className = 'conversation-entry';
          
          const title = document.createElement('h3');
          title.textContent = `会話記録 ${formattedDate}`;
          convDiv.appendChild(title);
          
          const content = document.createElement('div');
          content.className = 'conversation-content';
          
          // セグメントごとに段落を作成
          conv.segments.forEach(segment => {
            const p = document.createElement('p');
            p.textContent = segment;
            content.appendChild(p);
          });
          
          convDiv.appendChild(content);
          container.appendChild(convDiv);
        });
      });
    },
    
    // 過去の話題提案を表示
    displayHistoryTopics: function(container) {
      if (!container) return;
      
      container.innerHTML = '';
      
      chrome.storage.local.get({ suggestedTopics: [] }, (result) => {
        const topics = result.suggestedTopics;
        
        if (topics.length === 0) {
          const emptyMessage = document.createElement('p');
          emptyMessage.className = 'text-gray-500 text-center py-4';
          emptyMessage.textContent = '過去の話題提案はありません';
          container.appendChild(emptyMessage);
          return;
        }
        
        topics.forEach((topicSet) => {
          const topicContainer = document.createElement('div');
          topicContainer.className = 'bg-white p-3 rounded-lg shadow-sm mb-3';
          
          // 日付のヘッダー
          const date = new Date(topicSet.timestamp);
          const dateHeader = document.createElement('h3');
          dateHeader.className = 'text-sm font-medium text-gray-500 mb-2';
          dateHeader.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
          topicContainer.appendChild(dateHeader);
          
          // トピックのリスト
          const topicList = document.createElement('ul');
          topicList.className = 'space-y-1';
          
          topicSet.topics.forEach(topic => {
            const topicItem = document.createElement('li');
            topicItem.className = 'text-blue-800 pl-2 border-l-2 border-blue-300';
            topicItem.textContent = topic;
            topicList.appendChild(topicItem);
          });
          
          topicContainer.appendChild(topicList);
          container.appendChild(topicContainer);
        });
      });
    },
    
    // テキスト形式で会話履歴をエクスポート
    exportConversationsAsText: function(conversations) {
      if (!conversations || conversations.length === 0) {
        alert('エクスポートする会話データがありません。');
        return;
      }
      
      let textContent = "===== 会話履歴エクスポート =====\n\n";
      
      conversations.forEach((conv, index) => {
        const date = new Date(conv.timestamp);
        const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        
        textContent += `■ 会話 ${index + 1} - ${dateStr}\n`;
        
        if (conv.segments && conv.segments.length > 0) {
          conv.segments.forEach((segment, segIndex) => {
            textContent += `${segment}\n`;
            if (segIndex < conv.segments.length - 1) {
              textContent += "---\n";
            }
          });
        } else {
          textContent += "(内容なし)\n";
        }
        
        textContent += "\n====================\n\n";
      });
      
      // テキストファイルとしてダウンロード
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const filename = `会話履歴_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    }
  };
})();

// メインの録音機能とロジック
const VNARecorder = (function() {
  // プライベート変数
  let mediaRecorder = null;
  let audioChunks = [];
  let audioBlob = null;
  let recognition = null;
  let startTime = 0;
  let segments = [];
  let silenceCheckInterval = null;
  let analyser = null;
  let audioContext = null;
  let dataArray = null;
  let silenceStart = null;  // 無音開始時間を追跡する変数を追加
  let minRecordingDuration = 30000;  // 最低録音時間 (30秒)
  let isFillerRemovalEnabled = false; // フィラー除去の有効/無効フラグ
  const fillerPatterns = [
    /\s*(あー|うーん|えー|えっと|あのー|その|まぁ|ま|えっとー|んー|あのぉ)\s*/g
  ];
  
  // 公開API
  return {
    // 初期化
    init: function() {
      console.log('録音スクリプトが初期化されました');
      this.checkCompatibility();
      this.setupRecognition();
      
      // フィラー除去設定を取得
      VNAStorage.getTranscriptSettings(settings => {
        isFillerRemovalEnabled = settings.isFillerRemovalEnabled || false;
        console.log('フィラー除去設定:', isFillerRemovalEnabled ? '有効' : '無効');
      });
      
      return this;
    },

    // 互換性チェック
    checkCompatibility: function() {
      console.log('互換性チェック中...');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        VNAUI.showError('マイクにアクセスする機能がサポートされていません');
        return false;
      }
      if (!window.MediaRecorder) {
        VNAUI.showError('Media Recorder APIがサポートされていません');
        return false;
      }
      return true;
    },

    // 音声認識のセットアップ
    setupRecognition: function() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('SpeechRecognitionがサポートされていません');
        VNAUI.showError('文字起こし機能がサポートされていません');
        return null;
      }

      recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 3;

      recognition.onresult = this.handleRecognitionResult;
      recognition.onerror = this.handleRecognitionError;
      recognition.onend = this.handleRecognitionEnd;
      
      return recognition;
    },

    // 録音開始
    startRecording: async function() {
      console.log('録音開始が要求されました');
      VNAUI.clearErrors();
      segments = [];
      VNAUI.clearTranscript();
      
      try {
        if (!this.checkCompatibility()) return;
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('マイクアクセス許可済み');

        // 無音検出セットアップ
        this.setupSilenceDetection(stream);
        
        // 録音セットアップ
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        }
        
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = this.handleRecordingStop;
        mediaRecorder.onerror = this.handleRecordingError;
        
        // 録音開始
        mediaRecorder.start(1000);
        audioChunks = [];
        VNAUI.updateForRecordingStart();
        startTime = Date.now();
        VNAUI.startTimer(startTime);
        
        // 音声認識開始
        setTimeout(() => {
          try {
            if (recognition) {
              recognition.start();
            }
          } catch (e) {
            console.error('SpeechRecognition 開始エラー:', e);
          }
        }, 1000);
        
      } catch (error) {
        console.error('マイクアクセスエラー:', error);
        VNAUI.showError(`マイクアクセス失敗: ${error.name}`);
      }
    },
    
    // 録音停止
    stopRecording: function() {
      console.log('録音停止が要求されました');
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      
      if (silenceCheckInterval) {
        clearInterval(silenceCheckInterval);
        silenceCheckInterval = null;
      }
      
      if (audioContext) {
        audioContext.close().catch(e => console.warn("AudioContext close error:", e));
        audioContext = null;
      }
      
      if (recognition) {
        try {
          recognition.stop();
        } catch (err) {
          console.warn('SpeechRecognition停止エラー:', err);
        }
      }
      
      this.handleSilenceSegment();
      this.getTopicSuggestions();
    },      // トピック提案取得
    getTopicSuggestions: async function() {
      const currentTranscript = VNAUI.getCurrentTranscript();
      if (!currentTranscript && segments.length === 0) return;
      
      // 注意: AIへのプロンプトには直近2件のみ送信する
      const recentSegments = segments.slice(-2);
      const fullConversation = recentSegments.join('\n') + 
                              (currentTranscript ? '\n' + currentTranscript : '');
      
      // APIキー取得とカスタムプロンプト取得
      chrome.storage.sync.get(['apiKey', 'customPrompt'], (items) => {
        const apiKey = items.apiKey;
        if (!apiKey) {
          VNAUI.showTopicError('APIキーが設定されていません');
          return;
        }
        
        // カスタムプロンプトがあれば利用、なければデフォルト
        let promptTemplate = items.customPrompt;
        if (!promptTemplate) {
          promptTemplate = `会話相手に話題を提供するAIとして、以下の情報を元に会話の活性化を目的とした話題を提供してください。

会話履歴:
${fullConversation}

あなたのタスク:
1. 会話内容の予測と話題提供:
   * 上記の会話履歴から、現在の会話内容に沿った話題を1つ提案してください。（「関連話題:」と明記）
   * 現在の会話内容とは全く関係のない、一般的な興味を引く話題を3つ提案してください。（「新しい話題:」と明記）

2. 話題の深掘り:
   * 各話題について、それが採用された場合に深掘りできるような質問や情報を1つずつ、小さなテキストで添えてください。

出力形式:
* 話題提案は箇条書き（- または・）で分かりやすく記述してください。
* 深掘りの部分は各話題の下に「(深掘り: ○○)」の形式で小さく記載してください。
* すべての提案は簡潔で、日常会話で使いやすいものにしてください。`;
        }
          // プロンプト内の変数を置換
        const formattedPrompt = promptTemplate.replace(/\${fullConversation}/g, fullConversation);
        
        VNAUI.showTopicLoading();
          // リクエスト送信
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: formattedPrompt
              }] 
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300,
            }
          }),
        })
        .then(response => response.json())        .then(data => {
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text;
              // 箇条書きを抽出 - 関連話題と新しい話題を両方抽出
            const topicLines = text.match(/[\-•*]\s*([^\n]+)/g) || [];
            
            // 箇条書きの内容だけを取得して各話題から深掘り部分を除く
            const cleanTopics = topicLines.map(t => {
              let topic = t.replace(/^[\-•*]\s*/, '').trim();
              // 深掘りの部分があれば除去（UI表示用）
              topic = topic.replace(/\s*\(深掘り:.+\)/, '');
              return topic;
            });
            
            // 深掘り情報を含む完全な情報
            const fullTopicInfo = [];
            
            // 箇条書き行とその次の行（深掘り情報）を関連付ける
            const responseLines = text.split('\n');
            let inTopic = false;
            let currentTopic = '';
            
            responseLines.forEach(line => {
              // 箇条書き行を検出
              if (line.match(/^[\-•*]\s+/)) {
                inTopic = true;
                currentTopic = line;
              } 
              // 深掘り情報を検出（カッコ内）
              else if (inTopic && line.match(/\(深掘り:.*\)/i)) {
                fullTopicInfo.push(currentTopic + '\n' + line);
                inTopic = false;
              }
              // 空行で区切りをリセット
              else if (line.trim() === '') {
                inTopic = false;
              }
            });
            
            if (cleanTopics.length > 0) {
              // オリジナルの内容も保存（深掘り情報を含む）
              VNAStorage.saveSuggestedTopics(cleanTopics);
              // 深掘り情報も含めて表示用に保存
              chrome.storage.local.set({ fullTopicInfo: fullTopicInfo });
              VNAUI.updateTopicSuggestions(cleanTopics, fullTopicInfo);
            } else {
              VNAUI.showNoTopics();
            }
          } else {
            VNAUI.showTopicError('話題の生成に失敗しました');
          }
        })
        .catch(error => {
          console.error('話題取得エラー:', error);
          VNAUI.showTopicError('話題の生成中にエラーが発生しました');
        });
      });
    },
      // 無音区間検出による文字起こしセグメント化
    handleSilenceSegment: function() {
      const text = VNAUI.getCurrentTranscript();
      const currentTime = Date.now();
      const recordingDuration = currentTime - startTime;
      
      // 録音時間が30秒以上経過している場合のみセグメント処理を行う
      if (text && recordingDuration >= minRecordingDuration) {
        segments.push(text);
        console.log(`セグメント追加 (録音経過: ${Math.floor(recordingDuration/1000)}秒):`, text);
        
        // 各セグメントごとに会話履歴を保存
        VNAStorage.saveConversation([text]);
        
        this.getTopicSuggestions();
        VNAUI.clearTranscript();
      }
    },
    
    // フィラー除去設定の切り替え
    toggleFillerRemoval: function(enabled) {
      isFillerRemovalEnabled = enabled;
      VNAStorage.saveTranscriptSetting('isFillerRemovalEnabled', enabled);
      console.log('フィラー除去設定を変更しました:', enabled ? '有効' : '無効');
    },
    
    // フィラーを除去する関数
    removeFillers: function(text) {
      if (!isFillerRemovalEnabled || !text) return text;
      
      let result = text;
      fillerPatterns.forEach(pattern => {
        result = result.replace(pattern, ' ');
      });
      
      // 複数のスペースを一つに置換
      result = result.replace(/\s+/g, ' ').trim();
      
      return result;
    },
    
    // 音声認識結果ハンドラ
    handleRecognitionResult: function(event) {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += VNARecorder.removeFillers(transcript) + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        VNAUI.appendTranscript(finalTranscript);
      }
      
      VNAUI.updateInterimTranscript(interimTranscript);
    },
    
    // 音声認識エラーハンドラ
    handleRecognitionError: function(event) {
      console.error('SpeechRecognition エラー:', event.error);
      VNAUI.showError(`文字起こしエラー: ${event.error}`);
    },
    
    // 音声認識終了ハンドラ
    handleRecognitionEnd: function() {
      console.log('音声認識が終了しました');
    },
    
    // 録音終了ハンドラ
    handleRecordingStop: function() {
      audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      VNAUI.showAudioPlayer(URL.createObjectURL(audioBlob));
      VNAUI.stopTimer();
      VNAUI.updateForRecordingStop();
    },
    
    // 録音エラーハンドラ
    handleRecordingError: function(event) {
      console.error('録音エラー:', event);
      VNAUI.showError(`録音エラー: ${event.name}`);
    },
    
    // 無音検出セットアップ
    setupSilenceDetection: function(stream) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      sourceNode.connect(analyser);
      dataArray = new Uint8Array(analyser.fftSize);
      
      silenceCheckInterval = setInterval(() => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        
        // 音量レベルの計算
        for (let i = 0; i < dataArray.length; i++) {
          sum += Math.abs(dataArray[i] - 128);
        }
        
        const average = sum / dataArray.length;
        const isSilence = average < 5; // 音量閾値（調整可能）
        
        if (isSilence) {
          // 無音状態の開始
          if (silenceStart === null) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > 3000) { // 3秒間の無音検出
            console.log('3秒以上の無音を検出: 話題提案を実行');
            this.handleSilenceSegment();
            silenceStart = null; // リセット
          }
        } else {
          silenceStart = null;
        }
      }, 200);
    },
    
    // 録音データダウンロード
    downloadRecording: function() {
      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        const now = new Date();
        const filename = `recording_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.webm`;
        
        a.href = url;
        a.download = filename;
        a.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      } else {
        VNAUI.showError('ダウンロードする録音データがありません');
      }
    }
  };
})();

// recorder.html の初期化スクリプト
document.addEventListener('DOMContentLoaded', function() {
    // モジュールの初期化
    VNAUI.init();
    VNARecorder.init();
    
    // 録音開始ボタンのイベントリスナー
    document.getElementById('recordButton').addEventListener('click', function() {
        VNARecorder.startRecording();
    });
    
    // 録音停止ボタンのイベントリスナー
    document.getElementById('stopButton').addEventListener('click', function() {
        VNARecorder.stopRecording();
    });
    
    // ダウンロードボタンのイベントリスナー
    document.getElementById('downloadButton').addEventListener('click', function() {
        VNARecorder.downloadRecording();
    });
    
    // 会話履歴クリアボタンのイベントリスナー
    const clearHistoryButton = document.getElementById('clearHistoryButton');
    if (clearHistoryButton) {
        clearHistoryButton.addEventListener('click', function() {
            VNAStorage.clearConversationHistory();
        });
    }

    // 会話履歴の初期表示
    const conversationHistory = document.getElementById('conversationHistory');
    if (conversationHistory) {
        VNAStorage.displayConversationHistory(conversationHistory);
    }
    
    console.log('Recorder page initialized successfully.');
});

// ヘルパー関数
function pad(number) {
  return number.toString().padStart(2, '0');
}