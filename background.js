// background.js - シンプルなバックグラウンドスクリプト

console.log('バックグラウンドスクリプトが起動しました');

// 拡張機能のインストール/アップデート時に実行されるイベント
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('拡張機能がインストールされました');
    
    // 利用可能な権限を確認
    if (chrome.permissions) {
      chrome.permissions.getAll((permissions) => {
        console.log('利用可能な権限:', permissions);
      });
    }
  } else if (details.reason === 'update') {
    console.log(`拡張機能が更新されました`);
  }
});

// オプションで、メッセージリスナーを追加
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('バックグラウンドスクリプトでメッセージを受信:', message);
  
  // 必要に応じて処理を行う
  
  // 非同期レスポンスの場合はtrueを返す
  return true;
});
