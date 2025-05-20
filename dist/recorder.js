document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const recordButton = document.getElementById('recordButton');
    const stopButton = document.getElementById('stopButton');
    const downloadButton = document.getElementById('downloadButton');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioPlaybackDiv = document.getElementById('audioPlayback');
    const errorMessagesDiv = document.getElementById('errorMessages');
    const recordingStatus = document.getElementById('recordingStatus');
    const timerDisplay = document.getElementById('timer');
    const statusContainer = document.querySelector('.status-container');
    const transcriptContainer = document.getElementById('transcriptContainer');
    const transcriptDiv = document.getElementById('transcript');
    const topicSuggestionsList = document.getElementById('topicSuggestionsList');
    const topicError = document.getElementById('topicError');
    const conversationHistoryContainer = document.getElementById('conversationHistoryContainer');
    const conversationHistoryDiv = document.getElementById('conversationHistory');
    const clearHistoryButton = document.getElementById('clearHistoryButton');

    // モーダル関連の要素
    const topicModal = document.getElementById('topicModal');
    const topicModalList = document.getElementById('topicModalList');
    const closeTopicModal = document.getElementById('closeTopicModal');
    const toggleFixedMode = document.getElementById('toggleFixedMode'); // 固定表示モード切り替えボタン
    const topicModeToggle = document.getElementById('topicModeToggle');
    const historyTopicModal = document.getElementById('historyTopicModal');
    const historyTopicContent = document.getElementById('historyTopicContent');
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    const viewHistoryTopics = document.getElementById('viewHistoryTopics');

    // 録音関連の変数
    let mediaRecorder = null;
    let audioChunks = [];
    let audioBlob = null;
    let timerInterval = null;
    let startTime = 0;
    let recognition = null;
    let segments = []; // セグメント化された文字起こしの配列
    let silenceStart = null; // 無音開始時間
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let silenceCheckInterval = null;
    let topicSuggestionInterval = null; // 話題提案のインターバルID
    let isTopicModeActive = false; // 話題モードの状態
    let topicSuggestions = []; // 現在の話題提案
    let isFixedMode = false; // 固定モード状態

    console.log('録音スクリプトが初期化されました');

    // マイクアクセスとメディアレコーダーの互換性をチェック
    function checkCompatibility() {
        console.log('互換性チェック中...');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            errorMessagesDiv.textContent = 'お使いのブラウザはマイクにアクセスするための機能をサポートしていません。';
            recordButton.disabled = true;
            return false;
        }
        if (!window.MediaRecorder) {
            errorMessagesDiv.textContent = 'お使いのブラウザはMedia Recorder APIをサポートしていません。';
            recordButton.disabled = true;
            return false;
        }
        console.log('互換性チェック完了: OK');
        return true;
    }

    // SpeechRecognition のセットアップ
    function setupRecognition() {
        console.log('SpeechRecognition をセットアップしています...');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('このブラウザはSpeechRecognitionをサポートしていません');
            errorMessagesDiv.textContent += '文字起こし機能はこのブラウザでサポートされていません。';
            if (topicError) topicError.textContent = '文字起こし機能が利用できないため、話題提案も利用できません。';
            return;
        }
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 3;
        const recognitionTimeout = 10000;
        recognition.grammars = new (window.SpeechGrammarList || window.webkitSpeechGrammarList)();

        recognition.onresult = (ev) => {
            console.log('SpeechRecognition onresult イベント発生:', ev.results.length, '個の結果');
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = ev.resultIndex; i < ev.results.length; i++) {
                const transcript = ev.results[i][0].transcript;
                if (ev.results[i].isFinal) {
                    console.log('最終認識結果:', transcript);
                    finalTranscript += transcript + '\n';
                } else {
                    interimTranscript += transcript;
                    console.log('中間認識結果:', transcript);
                }
            }

            if (finalTranscript) {
                const oldContent = transcriptDiv.textContent || '';
                transcriptDiv.textContent = oldContent + finalTranscript;
            }
            
            let interimElement = document.getElementById('interimResult');
            if (!interimElement && interimTranscript) {
                interimElement = document.createElement('div');
                interimElement.id = 'interimResult';
                interimElement.style.color = '#666';
                interimElement.style.fontStyle = 'italic';
                transcriptDiv.parentNode.appendChild(interimElement);
            }
            
            if (interimElement) {
                interimElement.textContent = interimTranscript;
            }
            
            transcriptContainer.style.display = 'block';
        };
        recognition.onerror = (ev) => {
            console.error('SpeechRecognition エラー:', ev.error);
            
            let errorMessage = '';
            switch(ev.error) {
                case 'network':
                    errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
                    setTimeout(() => {
                        if (mediaRecorder && mediaRecorder.state === 'recording') {
                            try {
                                console.log('ネットワークエラー後に文字起こしを再開します...');
                                recognition.start();
                            } catch (e) {
                                console.error('文字起こし再開エラー:', e);
                            }
                        }
                    }, 3000); 
                    break;
                case 'not-allowed':
                    errorMessage = 'マイク使用の許可が得られませんでした。';
                    break;
                case 'aborted':
                    errorMessage = '音声認識が中断されました。';
                    break;
                case 'audio-capture':
                    errorMessage = 'マイクからの音声取得に失敗しました。';
                    break;
                case 'no-speech':
                    errorMessage = '音声が検出されませんでした。';
                    break;
                case 'service-not-allowed':
                    errorMessage = '音声認識サービスの使用が許可されていません。';
                    break;
                default:
                    errorMessage = `文字起こし中にエラーが発生しました: ${ev.error}`;
            }
            
            console.warn('SpeechRecognition エラーメッセージ:', errorMessage);
            errorMessagesDiv.textContent += errorMessage;
            
            const transcriptStatus = document.getElementById('transcriptStatus');
            if (transcriptStatus) {
                transcriptStatus.textContent = 'エラーが発生しました: ' + ev.error;
                transcriptStatus.style.color = '#dc3545';
            }
            if (topicError) topicError.textContent = `話題提案エラー: ${errorMessage}`;
        };
        recognition.onend = () => {
            console.log('SpeechRecognition が終了しました');
            const interimElement = document.getElementById('interimResult');
            if (interimElement) {
                interimElement.textContent = '';
            }
            if (transcriptDiv.textContent && transcriptDiv.textContent.trim() !== '') {
                transcriptContainer.style.display = 'block';
            } else {
                if (!errorMessagesDiv.textContent.includes('エラー')) {
                    // transcriptDiv.textContent = '音声を検出できませんでした。'; // 無音区間との兼ね合いでコメントアウト
                    // transcriptContainer.style.display = 'block';
                }
            }
        };
        console.log('SpeechRecognition のセットアップが完了しました');
    }

    // Gemini APIを使用して話題を提案する関数
    async function getTopicSuggestions() {
        if (!topicSuggestionsList || !topicError) {
            console.warn('話題提案のUI要素が見つかりません。');
            return;
        }
        topicError.textContent = ''; // 前のエラーをクリア
        topicSuggestionsList.innerHTML = ''; // 前の提案をクリア

        // モーダル用のリストも初期化
        if (topicModalList) {
            topicModalList.innerHTML = '';
        }

        chrome.storage.sync.get(['apiKey', 'customPrompt'], async (items) => {
            const apiKey = items.apiKey;
            if (!apiKey) {
                topicError.textContent = 'APIキーが設定されていません。オプションページで設定してください。';
                return;
            }            const currentTranscript = transcriptDiv.textContent.trim();
            if (!currentTranscript && segments.length === 0) {
                return;
            }

            // 最新の2つのセグメントだけを使用
            const recentSegments = segments.slice(-2); // 最新の2つのセグメントを取得
            const fullConversation = recentSegments.join('\n') + (currentTranscript ? '\n' + currentTranscript : '');
            console.log('Geminiに送信する会話セグメント数:', recentSegments.length, '+ 現在の文字起こし');
            
            // カスタムプロンプトをストレージから読み込む
            let prompt = `以下の会話内容を踏まえて、次に盛り上がりそうな会話の話題を3つ提案してください。提案は短いフレーズで、箇条書きでお願いします。\n\n会話:\n${fullConversation}`;
            
            if (items.customPrompt) {
                prompt = items.customPrompt.replace('${fullConversation}', fullConversation);
                console.log('カスタムプロンプトを使用します');
            } else {
                console.log('デフォルトプロンプトを使用します');
            }
            
            try {
                topicSuggestionsList.innerHTML = '<li>提案を生成中...</li>';
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 1,
                            topP: 1,
                            maxOutputTokens: 200,
                        }
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Gemini APIエラーレスポンス:', errorData);
                    let errorMessage = `話題提案の取得に失敗しました (HTTP ${response.status})。`;
                    if (errorData && errorData.error && errorData.error.message) {
                        errorMessage += ` ${errorData.error.message}`;
                    }
                    if (response.status === 400) {
                        errorMessage += ' APIキーが無効か、リクエスト形式が間違っている可能性があります。';
                    } else if (response.status === 429) {
                        errorMessage += ' APIの利用制限に達した可能性があります。';
                    }
                    topicError.textContent = errorMessage;
                    topicSuggestionsList.innerHTML = '';
                    return;
                }                const data = await response.json();
                console.log('Gemini APIからの応答:', data);

                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                    const suggestionsText = data.candidates[0].content.parts[0].text;
                    const suggestions = suggestionsText.split('\n').map(s => s.trim()).filter(s => s && (s.startsWith('-') || s.startsWith('*') || /^\d+\./.test(s)) );
                    
                    topicSuggestionsList.innerHTML = ''; // ローディング表示をクリア
                    
                    // 話題提案を保存
                    topicSuggestions = suggestions.map(s => s.replace(/^[-*]\s*|^\d+\.\s*/, '').trim());
                    
                    if (suggestions.length > 0) {
                        suggestions.forEach(suggestion => {
                            const li = document.createElement('li');
                            li.textContent = suggestion.replace(/^[-*]\s*|^\d+\.\s*/, ''); // 先頭の記号を削除
                            topicSuggestionsList.appendChild(li);                            // モーダル用リストに追加
                            if (topicModalList) {
                                const modalItem = document.createElement('li');
                                modalItem.className = 'speech-bubble';
                                modalItem.textContent = suggestion.replace(/^[-*]\s*|^\d+\.\s*/, '').trim();
                                topicModalList.appendChild(modalItem);
                            }
                        });

                        // 話題モードがアクティブならモーダルを表示
                        if (isTopicModeActive) {
                            showTopicModal();
                        }

                        // 会話履歴に話題提案を保存
                        saveSuggestedTopics(suggestions);
                    } else {
                        topicSuggestionsList.innerHTML = '<li>提案が見つかりませんでした。</li>';
                    }
                } else {
                    topicSuggestionsList.innerHTML = '<li>提案が見つかりませんでした。</li>';
                    console.warn('Gemini APIからの提案が期待した形式ではありません:', data);
                }
            } catch (error) {
                console.error('話題提案の取得中にエラー:', error);
                topicError.textContent = `話題提案の取得中にエラーが発生しました: ${error.message}`;
                topicSuggestionsList.innerHTML = '';
            }
        });
    }

    // 提案された話題を保存
    function saveSuggestedTopics(topics) {
        if (!topics || topics.length === 0) return;
        
        const topicData = {
            timestamp: Date.now(),
            topics: topics.map(topic => topic.replace(/^[-•]|\d+\.\s*/, '').trim())
        };
        
        chrome.storage.local.get({ suggestedTopics: [] }, (result) => {
            const updatedTopics = [topicData, ...result.suggestedTopics];
            // 最大20セッション分を保存
            if (updatedTopics.length > 20) {
                updatedTopics.length = 20;
            }
            chrome.storage.local.set({ suggestedTopics: updatedTopics });
        });
    }

    // 過去の話題提案を表示
    function displayHistoryTopics() {
        if (!historyTopicContent) return;
        
        historyTopicContent.innerHTML = '';
        
        chrome.storage.local.get({ suggestedTopics: [] }, (result) => {
            const topics = result.suggestedTopics;
            
            if (topics.length === 0) {
                const emptyMessage = document.createElement('p');
                emptyMessage.className = 'text-gray-500 text-center py-4';
                emptyMessage.textContent = '過去の話題提案はありません';
                historyTopicContent.appendChild(emptyMessage);
                return;
            }
            
            topics.forEach((topicSet, index) => {
                const topicContainer = document.createElement('div');
                topicContainer.className = 'bg-white p-3 rounded-lg shadow-sm';
                
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
                historyTopicContent.appendChild(topicContainer);
            });
        });
    }

    // 話題モーダルを表示
    function showTopicModal() {
        if (!topicModal || topicSuggestions.length === 0) return;
        
        // 固定モードに応じたクラスの切り替え
        if (isFixedMode) {
            topicModal.classList.add('fixed-corner');
            topicModal.classList.add('mini-mode');
        } else {
            topicModal.classList.remove('fixed-corner');
            topicModal.classList.remove('mini-mode');
        }
        
        topicModal.classList.add('active');
    }
    
    // 話題モーダルを非表示
    function hideTopicModal() {
        if (!topicModal) return;
        topicModal.classList.remove('active');
    }
    
    // 固定表示モードの切り替え
    function toggleFixedDisplayMode() {
        isFixedMode = !isFixedMode;
        
        // 状態を保存
        chrome.storage.local.set({ isFixedMode });
        
        // モーダルが表示中なら更新
        if (topicModal && topicModal.classList.contains('active')) {
            if (isFixedMode) {
                topicModal.classList.add('fixed-corner');
                topicModal.classList.add('mini-mode');
            } else {
                topicModal.classList.remove('fixed-corner');
                topicModal.classList.remove('mini-mode');
            }
        }
        
        // ボタンのスタイルも更新
        if (toggleFixedMode) {
            toggleFixedMode.classList.toggle('bg-blue-100', isFixedMode);
            toggleFixedMode.classList.toggle('text-blue-600', isFixedMode);
        }
    }

    // 過去の話題モーダルを表示
    function showHistoryModal() {
        if (!historyTopicModal) return;
        displayHistoryTopics();
        historyTopicModal.classList.add('active');
    }
    
    // 過去の話題モーダルを非表示
    function hideHistoryModal() {
        if (!historyTopicModal) return;
        historyTopicModal.classList.remove('active');
    }

    // 録音の開始
    async function startRecording() {
        console.log('録音開始が要求されました');
        errorMessagesDiv.textContent = '';
        segments = []; // 新しい録音開始時にセグメントをリセット
        transcriptDiv.textContent = ''; // 文字起こし表示もリセット
        if (topicSuggestionsList) topicSuggestionsList.innerHTML = ''; // 話題提案もリセット
        if (topicError) topicError.textContent = '';

        try {
            if (!checkCompatibility()) return;
            console.log('マイクへのアクセスを要求中...');
            const constraints = { audio: true };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('マイクへのアクセスが許可されました');

            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sourceNode = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            sourceNode.connect(analyser);
            dataArray = new Uint8Array(analyser.fftSize);
            silenceStart = null;
            const silenceThreshold = 10;
            silenceCheckInterval = setInterval(() => {
                analyser.getByteTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const v = dataArray[i] - 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / dataArray.length);
                if (rms < silenceThreshold) {
                    if (!silenceStart) {
                        silenceStart = Date.now();
                    } else if (Date.now() - silenceStart > 2000) {
                        handleSilenceSegment();
                        silenceStart = Date.now(); // 無音区間をリセットして再度計測
                    }
                } else {
                    silenceStart = null;
                }
            }, 200);

            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            }
            mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                console.log('録音停止処理を実行中...');
                audioBlob = new Blob(audioChunks, { type: mimeType });
                const audioUrl = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioUrl;
                audioPlaybackDiv.style.display = 'block';
                stopTimer();
                updateUIAfterStop();
                stream.getTracks().forEach(track => track.stop());
                if (topicSuggestionInterval) {
                    clearInterval(topicSuggestionInterval);
                    topicSuggestionInterval = null;
                }
                handleSilenceSegment(); // 残っている文字起こしをセグメントに
                getTopicSuggestions();
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder エラー:', event);
                errorMessagesDiv.textContent = `録音中にエラーが発生しました: ${event.error}`;
                stopRecording();
            };

            mediaRecorder.start(1000);
            audioChunks = [];
            console.log('録音を開始しました');
            updateUIForRecording();
            startTimer();

            if (!recognition) {
                setupRecognition();
            }
            if (recognition) { // setupRecognitionが成功した場合のみ
                transcriptDiv.textContent = '';
                errorMessagesDiv.textContent = '';
                transcriptContainer.style.display = 'none';
                if (topicSuggestionsList) topicSuggestionsList.innerHTML = '';
                if (topicError) topicError.textContent = '';                setTimeout(() => {
                    try {
                        recognition.start();
                        console.log('文字起こしを開始しました');
                        const transcriptStatus = document.getElementById('transcriptStatus');
                        if (transcriptStatus) {
                            transcriptStatus.textContent = '音声を認識中です...';
                            transcriptStatus.style.color = '#007bff';
                        }
                        // 定期的な話題提案は無音区間検出に任せるため、インターバルは設定しない
                    } catch (err) {
                        console.error('文字起こし開始エラー:', err);
                        errorMessagesDiv.textContent += `文字起こし開始に失敗しました: ${err.message}`;
                        if (topicError) topicError.textContent = `話題提案エラー: 文字起こしを開始できませんでした。`;
                    }
                }, 1000);
            } else {
                if (topicError) topicError.textContent = '文字起こし機能が利用できないため、話題提案も利用できません。';
            }

        } catch (error) {
            console.error('マイクへのアクセスエラー:', error);
            let errorMsg = 'マイクへのアクセスに失敗しました。';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMsg = 'マイクへのアクセス許可が拒否されました。';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMsg = 'マイクが見つかりませんでした。';
            }
            errorMessagesDiv.textContent = `${errorMsg} (${error.name})`;
            if (topicError) topicError.textContent = `話題提案エラー: ${errorMsg}`;
        }
    }

    // 録音の停止
    function stopRecording() {
        console.log('録音の停止が要求されました');
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
        if (topicSuggestionInterval) {
            clearInterval(topicSuggestionInterval);
            topicSuggestionInterval = null;
        }

        if (recognition) {
            try {
                recognition.stop();
                console.log('文字起こしを停止しました');
            } catch (err) {
                console.error('文字起こし停止エラー:', err);
            }
        }
        handleSilenceSegment();
        getTopicSuggestions();
    }    // 無音検知時に文字起こしをセグメント化して保存し、話題提案を更新
    function handleSilenceSegment() {
        const text = transcriptDiv.textContent.trim();
        if (text) {
            segments.push(text);
            console.log('セグメント追加:', text);
            
            // 新しいセグメントが追加されたら話題提案も更新
            if (segments.length > 0) {
                getTopicSuggestions();
                console.log('無音区間検出により話題提案を更新');
            }
        }
        transcriptDiv.textContent = ''; // 現在の文字起こし表示をクリアして次のセグメントに備える
    }

    // 会話を chrome.storage に保存
    function saveConversation() {
        handleSilenceSegment(); // 保存前に残っている文字起こしをセグメントに
        if (segments.length === 0) return;
        const conv = { timestamp: Date.now(), segments };
        chrome.storage.local.get({ conversations: [] }, (result) => {
            const convs = result.conversations;
            convs.push(conv);
            chrome.storage.local.set({ conversations: convs }, () => {
                console.log('会話を保存しました:', conv);
                segments = []; // 保存後はセグメントをクリア
            });
        });
    }

    window.addEventListener('beforeunload', saveConversation);

    function downloadRecording() {
        console.log('録音データのダウンロードが要求されました');
        if (audioBlob) {
            const now = new Date();
            const fileName = `録音_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.webm`;
            
            console.log(`ファイル名: ${fileName}`);
            
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
                console.log('ダウンロード完了');
            }, 100);
        } else {
            console.log('ダウンロードできる録音データがありません');
            errorMessagesDiv.textContent = "ダウンロードできる録音データがありません";
        }
    }

    function updateUIForRecording() {
        recordButton.disabled = true;
        stopButton.disabled = false;
        downloadButton.disabled = true;
        recordingStatus.textContent = '録音中... (文字起こしも行っています)';
        statusContainer.classList.add('recording');
        
        const transcriptStatus = document.getElementById('transcriptStatus');
        if (transcriptStatus) {
            transcriptStatus.textContent = '音声を認識中です...';
            transcriptStatus.style.color = '#007bff';
        }
    }

    function updateUIAfterStop() {
        recordButton.disabled = false;
        stopButton.disabled = true;
        downloadButton.disabled = false;
        recordingStatus.textContent = '録音完了';
        statusContainer.classList.remove('recording');
        
        const transcriptStatus = document.getElementById('transcriptStatus');
        if (transcriptStatus) {
            transcriptStatus.textContent = '文字起こしが完了しました';
            transcriptStatus.style.color = '#28a745';
        }
        
        console.log('transcriptContainer の表示状態:', 
                    transcriptContainer.style.display,
                    '中身の長さ:', 
                    transcriptDiv ? (transcriptDiv.textContent ? transcriptDiv.textContent.length : 0) : 'null');
    }

    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer(); 
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimer() {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        timerDisplay.textContent = `${pad(minutes)}:${pad(seconds)}`;
    }

    function pad(number) {
        return number.toString().padStart(2, '0');
    }

    setupRecognition();
    recordButton.addEventListener('click', startRecording);
    stopButton.addEventListener('click', stopRecording);
    downloadButton.addEventListener('click', downloadRecording);
    checkCompatibility();

    const SpeechRecognitionExists = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionExists) {
        console.log('このブラウザはSpeechRecognitionをサポートしています');
    } else {
        console.warn('このブラウザはSpeechRecognitionをサポートしていません');
        errorMessagesDiv.textContent = '注意: このブラウザは音声認識機能（文字起こし）をサポートしていません。';
        if (topicError) topicError.textContent = '文字起こし機能が利用できないため、話題提案も利用できません。';
    }

    if (chrome.permissions) {
        chrome.permissions.contains({ permissions: ['audioCapture'] }, function(result) {
            console.log('audioCapture権限: ', result ? '許可済み' : '未許可');
            if (!result) {
                errorMessagesDiv.textContent += ' マイク使用権限が必要です。';
            }
        });
    }    function checkNetworkStatus() {
        const isOnline = navigator.onLine;
        console.log('ネットワーク接続状態:', isOnline ? 'オンライン' : 'オフライン');
        
        const networkStatusDiv = document.getElementById('networkStatus');
        if (networkStatusDiv) {
            if (isOnline) {
                networkStatusDiv.textContent = 'ネットワーク接続: オンライン ✓';
                networkStatusDiv.style.color = '#28a745';
            } else {
                networkStatusDiv.textContent = 'ネットワーク接続: オフライン ✗ (音声認識には接続が必要です)';
                networkStatusDiv.style.color = '#dc3545';
            }
        }
        
        if (!isOnline) {
            errorMessagesDiv.textContent = 'ネットワーク接続がありません。音声認識機能にはインターネット接続が必要です。';
            if (topicError) topicError.textContent = 'ネットワーク接続がないため、話題提案は利用できません。';
        } else {
            if (topicError && topicError.textContent === 'ネットワーク接続がないため、話題提案は利用できません。') {
                topicError.textContent = ''; // オンラインになったらエラー解除
            }
        }
    }

    // 会話履歴を表示する関数
    function displayConversationHistory() {
        if (!conversationHistoryDiv) return;
        
        chrome.storage.local.get({ conversations: [] }, (result) => {
            const conversations = result.conversations;
            if (conversations.length === 0) {
                conversationHistoryDiv.textContent = '会話履歴はありません。';
                return;
            }
            
            // 少なくとも最後の2つのセッションを表示（あれば）
            const recentConversations = conversations.slice(-2);
            conversationHistoryDiv.innerHTML = '';
            
            recentConversations.forEach((conv, index) => {
                const date = new Date(conv.timestamp);
                const dateStr = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
                
                const convDiv = document.createElement('div');
                convDiv.className = 'conversation-entry';
                convDiv.innerHTML = `
                    <h3>会話 ${index + 1} - ${dateStr}</h3>
                    <div class="conversation-content">
                        ${conv.segments.map(s => `<p>${s}</p>`).join('')}
                    </div>
                `;
                conversationHistoryDiv.appendChild(convDiv);
            });
        });
    }    // 履歴をクリア
    function clearConversationHistory() {
        if (confirm('会話履歴をすべて削除しますか？\nこの操作は元に戻せません。')) {
            chrome.storage.local.set({ conversations: [] }, () => {
                console.log('会話履歴をクリアしました');
                displayConversationHistory();
            });
        }
    }

    // 会話保存後に履歴を更新
    function saveConversation() {
        handleSilenceSegment(); // 保存前に残っている文字起こしをセグメントに
        if (segments.length === 0) return;
        
        const conv = { timestamp: Date.now(), segments };
        chrome.storage.local.get({ conversations: [] }, (result) => {
            const convs = result.conversations;
            convs.push(conv);
            chrome.storage.local.set({ conversations: convs }, () => {
                console.log('会話を保存しました:', conv);
                segments = []; // 保存後はセグメントをクリア
                displayConversationHistory(); // 履歴表示を更新
            });
        });
    }

    checkNetworkStatus();
    window.addEventListener('online', () => {
        console.log('オンラインになりました');
        checkNetworkStatus();
        if (mediaRecorder && mediaRecorder.state === 'recording' && recognition) {
            try {
                setTimeout(() => {
                    if (recognition.readyState !== 'listening') { // 既にリッスン中でなければ開始
                        recognition.start();
                        console.log('ネットワーク接続回復により文字起こしを再開');
                    }
                }, 1000);
            } catch (err) {
                console.error('文字起こし再開エラー:', err);
            }
        }
    });
    window.addEventListener('offline', () => {
        console.log('オフラインになりました');
        checkNetworkStatus();
    });

    // 履歴表示の初期化とイベントリスナーの設定
    displayConversationHistory();
    if (clearHistoryButton) {
        clearHistoryButton.addEventListener('click', clearConversationHistory);
    }

    // モーダル関連のイベントリスナー
    if (closeTopicModal) {
        closeTopicModal.addEventListener('click', hideTopicModal);
    }
    
    if (toggleFixedMode) {
        // 初期状態を取得
        chrome.storage.local.get({ isFixedMode: false }, (result) => {
            isFixedMode = result.isFixedMode;
            if (isFixedMode) {
                toggleFixedMode.classList.add('bg-blue-100');
                toggleFixedMode.classList.add('text-blue-600');
            }
        });
        
        toggleFixedMode.addEventListener('click', (e) => {
            e.stopPropagation(); // モーダル自体のクリックイベントを防止
            toggleFixedDisplayMode();
        });
    }
    
    if (closeHistoryModal) {
        closeHistoryModal.addEventListener('click', hideHistoryModal);
    }
    
    if (topicModeToggle) {
        // 初期状態を取得
        chrome.storage.local.get({ isTopicModeActive: false }, (result) => {
            isTopicModeActive = result.isTopicModeActive;
            topicModeToggle.checked = isTopicModeActive;
        });
        
        topicModeToggle.addEventListener('change', () => {
            isTopicModeActive = topicModeToggle.checked;
            
            // 状態を保存
            chrome.storage.local.set({ isTopicModeActive });
            
            // トグルがオンで話題提案があれば表示
            if (isTopicModeActive && topicSuggestions.length > 0) {
                showTopicModal();
            } else {
                hideTopicModal();
            }
        });
    }
    
    if (viewHistoryTopics) {
        viewHistoryTopics.addEventListener('click', showHistoryModal);
    }
    
    if (toggleFixedMode) {
        // 初期状態を取得
        chrome.storage.local.get({ isFixedMode: false }, (result) => {
            isFixedMode = result.isFixedMode;
            toggleFixedMode.classList.toggle('bg-blue-100', isFixedMode);
            toggleFixedMode.classList.toggle('text-blue-600', isFixedMode);
        });
        
        toggleFixedMode.addEventListener('click', toggleFixedDisplayMode);
    }
    
    // モーダル外をクリックすると閉じる
    topicModal?.addEventListener('click', (e) => {
        if (e.target === topicModal) {
            hideTopicModal();
        }
    });
    
    historyTopicModal?.addEventListener('click', (e) => {
        if (e.target === historyTopicModal) {
            hideHistoryModal();
        }
    });

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
        // Alt+T で話題モーダルの表示/非表示切り替え
        if (e.altKey && e.key === 't') {
            if (topicModal.classList.contains('active')) {
                hideTopicModal();
            } else if (topicSuggestions.length > 0) {
                showTopicModal();
            }
        }
    });

    console.log('イベントリスナーが設定され、準備完了');
});
