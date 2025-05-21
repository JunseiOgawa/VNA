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
  
  // 公開API
  return {
    // 初期化
    init: function() {
      console.log('録音スクリプトが初期化されました');
      this.checkCompatibility();
      this.setupRecognition();
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
          if (event.data.size > 0) audioChunks.push(event.data);
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
            recognition.start();
            console.log('文字起こし開始');
          } catch (err) {
            console.error('文字起こし開始エラー:', err);
            VNAUI.showError(`文字起こし開始に失敗: ${err.message}`);
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
          console.log('文字起こし停止');
        } catch (err) {
          console.error('文字起こし停止エラー:', err);
        }
      }
      
      this.handleSilenceSegment();
      this.getTopicSuggestions();
    },
    
    // トピック提案取得
    getTopicSuggestions: async function() {
      const currentTranscript = VNAUI.getCurrentTranscript();
      if (!currentTranscript && segments.length === 0) return;
      
      const recentSegments = segments.slice(-2);
      const fullConversation = recentSegments.join('\n') + 
                              (currentTranscript ? '\n' + currentTranscript : '');
      
      // APIキー取得
      VNAStorage.getApiKey(apiKey => {
        if (!apiKey) {
          VNAUI.showTopicError('APIキーが設定されていません');
          return;
        }
        
        VNAUI.showTopicLoading();
        
        // リクエスト送信
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `以下の会話内容を踏まえて、次に盛り上がりそうな会話の話題を3つ提案してください。
                提案は短いフレーズで、箇条書きでお願いします。\n\n会話:\n${fullConversation}`
              }] 
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 200,
            }
          }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.candidates && data.candidates.length > 0) {
            const suggestionsText = data.candidates[0].content.parts[0].text;
            const suggestions = suggestionsText.split('\n')
                               .map(s => s.trim())
                               .filter(s => s && (s.startsWith('-') || s.startsWith('*') || /^\d+\./.test(s)))
                               .map(s => s.replace(/^[-*]\s*|^\d+\.\s*/, '').trim());
                               
            if (suggestions.length > 0) {
              VNAUI.updateTopicSuggestions(suggestions);
              VNAStorage.saveSuggestedTopics(suggestions);
            } else {
              VNAUI.showNoTopics();
            }
          }
        })
        .catch(error => {
          console.error('話題提案エラー:', error);
          VNAUI.showTopicError(`取得エラー: ${error.message}`);
        });
      });
    },
    
    // 無音区間検出による文字起こしセグメント化
    handleSilenceSegment: function() {
      const text = VNAUI.getCurrentTranscript();
      if (text) {
        segments.push(text);
        console.log('セグメント追加:', text);
        this.getTopicSuggestions();
      }
      VNAUI.clearTranscript();
    },
    
    // 音声認識結果ハンドラ
    handleRecognitionResult: function(event) {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + '\n';
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
    
    // 録音終了ハンドラ
    handleRecordingStop: function() {
      audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      VNAUI.showAudioPlayer(URL.createObjectURL(audioBlob));
      VNAUI.stopTimer();
      VNAUI.updateForRecordingStop();
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
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] - 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        if (rms < 10) { // 無音閾値
          if (!silenceStart) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > 2000) { // 2秒以上無音
            this.handleSilenceSegment();
            silenceStart = Date.now();
          }
        } else {
          silenceStart = null;
        }
      }, 200);
    },
    
    // 録音データダウンロード
    downloadRecording: function() {
      if (audioBlob) {
        const now = new Date();
        const fileName = `録音_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.webm`;
        
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } else {
        VNAUI.showError("ダウンロードできる録音データがありません");
      }
    }
  };
})();

// ヘルパー関数
function pad(number) {
  return number.toString().padStart(2, '0');
}