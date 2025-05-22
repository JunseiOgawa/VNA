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
  console.log('バックグラウンドスクリプトがメッセージを受信しました:', message);
  
  // popupReady アクションのみを処理し、他の不要な処理を削除
  if (message.action === 'popupReady') {
    console.log('ポップアップの準備ができました');
    sendResponse({ success: true });
  }
  
  return true; // 非同期応答を行うため true を返す
});
