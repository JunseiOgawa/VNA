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
      
      const conv = { 
        timestamp: Date.now(), 
        segments 
      };
      
      chrome.storage.local.get({ conversations: [] }, (result) => {
        const convs = result.conversations;
        convs.push(conv);
        chrome.storage.local.set({ conversations: convs }, () => {
          console.log('会話を保存しました');
        });
      });
    },
    
    // 会話履歴のクリア
    clearConversationHistory: function(callback) {
      if (confirm('会話履歴をすべて削除しますか？\nこの操作は元に戻せません。')) {
        chrome.storage.local.set({ conversations: [] }, () => {
          console.log('会話履歴をクリアしました');
          if (callback) callback();
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
        
        // 最新の2つを表示
        const recentConversations = conversations.slice(-2);
        container.innerHTML = '';
        
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
    }
  };
})();

// ヘルパー関数
function pad(number) {
  return number.toString().padStart(2, '0');
}