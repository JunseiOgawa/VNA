document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('saveButton');
  const apiKeyInput = document.getElementById('apiKey');
  const statusMessage = document.getElementById('statusMessage');
  const customPromptTextarea = document.getElementById('customPrompt');
  const exportPromptButton = document.getElementById('exportPromptButton');
  const importPromptButton = document.getElementById('importPromptButton');
  const importFileInput = document.getElementById('importFileInput');
  const gotoRecorderButton = document.getElementById('gotoRecorderButton');

  // 保存されている設定を読み込む
  chrome.storage.sync.get(['apiKey', 'audioQuality', 'saveAudio', 'customPrompt'], (items) => {
    if (items.apiKey) {
      apiKeyInput.value = items.apiKey;
    }
    if (items.audioQuality) {
      document.getElementById('audioQuality').value = items.audioQuality;
    }
    if (typeof items.saveAudio !== 'undefined') {
      document.getElementById('saveAudio').checked = items.saveAudio;
    }
    if (items.customPrompt) {
      customPromptTextarea.value = items.customPrompt;
    } else {
      // デフォルトのプロンプト
      customPromptTextarea.value = '以下の会話内容を踏まえて、次に盛り上がりそうな会話の話題を3つ提案してください。提案は短いフレーズで、箇条書きでお願いします。\n\n会話:\n${fullConversation}';
    }
  });

  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const audioQuality = document.getElementById('audioQuality').value;
    const saveAudio = document.getElementById('saveAudio').checked;
    const customPrompt = customPromptTextarea.value.trim();

    if (apiKey) {
      chrome.storage.sync.set(
        { 
          apiKey: apiKey,
          audioQuality: audioQuality,
          saveAudio: saveAudio,
          customPrompt: customPrompt
        },
        () => {
          statusMessage.textContent = '設定を保存しました。';
          setTimeout(() => {
            statusMessage.textContent = '';
          }, 3000);
        }
      );
    } else {
      statusMessage.textContent = 'APIキーを入力してください。';
      statusMessage.style.color = 'red';
      setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.style.color = ''; // デフォルトの色に戻す
      }, 3000);
    }
  });

  // プロンプトをJSONファイルにエクスポート
  exportPromptButton.addEventListener('click', () => {
    const customPrompt = customPromptTextarea.value.trim();
    if (!customPrompt) {
      statusMessage.textContent = 'エクスポートするプロンプトが入力されていません。';
      statusMessage.style.color = 'red';
      setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.style.color = '';
      }, 3000);
      return;
    }

    const promptData = {
      prompt: customPrompt,
      createdAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(promptData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_prompt_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    statusMessage.textContent = 'プロンプトをエクスポートしました。';
    statusMessage.style.color = 'green';
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.style.color = '';
    }, 3000);
  });

  // インポートボタンを押したらファイル選択ダイアログを表示
  importPromptButton.addEventListener('click', () => {
    importFileInput.click();
  });

  // ファイルが選択されたらJSONファイルを読み込み
  importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data && data.prompt) {
          customPromptTextarea.value = data.prompt;
          
          statusMessage.textContent = 'プロンプトをインポートしました。保存ボタンを押して保存してください。';
          statusMessage.style.color = 'green';
          setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.style.color = '';
          }, 5000);
        } else {
          throw new Error('プロンプトデータが見つかりません');
        }
      } catch (error) {
        statusMessage.textContent = `インポートエラー: ${error.message}`;
        statusMessage.style.color = 'red';
        setTimeout(() => {
          statusMessage.textContent = '';
          statusMessage.style.color = '';
        }, 3000);
      }
    };
    reader.readAsText(file);
    // ファイル選択をリセット
    event.target.value = '';
  });

  // 録音画面へ移動するボタン
  gotoRecorderButton.addEventListener('click', () => {
    chrome.tabs.getCurrent((tab) => {
      chrome.tabs.update(tab.id, { url: 'recorder.html' });
    });
  });
});
