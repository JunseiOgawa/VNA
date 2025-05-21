const VNAUI = (function() {
  // キャッシュされたDOM要素
  let elements = {};
  let timerInterval = null;
  let topicSuggestions = [];
  let isTopicModeActive = false;
  let isFixedMode = false;
  
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
        viewHistoryTopics: document.getElementById('viewHistoryTopics')
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
          elements.toggleFixedMode.classList.toggle('bg-blue-100', isFixedMode);
          elements.toggleFixedMode.classList.toggle('text-blue-600', isFixedMode);
        }
      });
      
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
        transcriptStatus.textContent = '文字起こしが完了しました';
        transcriptStatus.style.color = '#28a745';
      }
    },
    
    // タイマーを開始
    startTimer: function(startTime) {
      const updateTimer = () => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
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
      }
    },
    
    // 中間文字起こし結果の更新
    updateInterimTranscript: function(text) {
      let interimElement = document.getElementById('interimResult');
      if (!interimElement && text) {
        interimElement = document.createElement('div');
        interimElement.id = 'interimResult';
        interimElement.style.color = '#666';
        interimElement.style.fontStyle = 'italic';
        elements.transcriptDiv.parentNode.appendChild(interimElement);
      }
      
      if (interimElement) {
        interimElement.textContent = text;
      }
    },
    
    // 話題提案の読み込み中表示
    showTopicLoading: function() {
      if (elements.topicSuggestionsList) {
        elements.topicSuggestionsList.innerHTML = '<li>提案を生成中...</li>';
      }
    },
    
    // 話題提案のエラー表示
    showTopicError: function(message) {
      if (elements.topicError) {
        elements.topicError.textContent = message;
      }
    },
    
    // 話題提案なしの表示
    showNoTopics: function() {
      if (elements.topicSuggestionsList) {
        elements.topicSuggestionsList.innerHTML = '<li>提案が見つかりませんでした。</li>';
      }
    },
    
    // 話題提案の更新
    updateTopicSuggestions: function(suggestions) {
      if (!elements.topicSuggestionsList) return;
      
      elements.topicSuggestionsList.innerHTML = '';
      topicSuggestions = suggestions;
      
      // モーダル用リストもクリア
      if (elements.topicModalList) {
        elements.topicModalList.innerHTML = '';
      }
      
      suggestions.forEach(suggestion => {
        // メイン表示用
        const li = document.createElement('li');
        li.textContent = suggestion;
        elements.topicSuggestionsList.appendChild(li);
        
        // モーダル用
        if (elements.topicModalList) {
          const modalItem = document.createElement('li');
          modalItem.className = 'speech-bubble';
          modalItem.textContent = suggestion;
          elements.topicModalList.appendChild(modalItem);
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
        elements.topicModal.classList.add('fixed-corner');
        elements.topicModal.classList.add('mini-mode');
      } else {
        elements.topicModal.classList.remove('fixed-corner');
        elements.topicModal.classList.remove('mini-mode');
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
          elements.topicModal.classList.add('fixed-corner');
          elements.topicModal.classList.add('mini-mode');
        } else {
          elements.topicModal.classList.remove('fixed-corner');
          elements.topicModal.classList.remove('mini-mode');
        }
      }
      
      // ボタンのスタイルも更新
      if (elements.toggleFixedMode) {
        elements.toggleFixedMode.classList.toggle('bg-blue-100', isFixedMode);
        elements.toggleFixedMode.classList.toggle('text-blue-600', isFixedMode);
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
        // Alt+T で話題モーダル表示切替
        if (e.altKey && e.key === 't') {
          if (elements.topicModal.classList.contains('active')) {
            this.hideTopicModal();
          } else if (topicSuggestions.length > 0) {
            this.showTopicModal();
          }
        }
      });
    }
  };
})();

// ヘルパー関数
function pad(number) {
  return number.toString().padStart(2, '0');
}