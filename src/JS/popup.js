document.addEventListener('DOMContentLoaded', function() {
    // ボタン要素を取得
    const openRecorderButton = document.getElementById('openRecorderButton');
    const openSettingsButton = document.getElementById('openSettingsButton');
    
    // 録音画面を開くボタンのイベントリスナー
    openRecorderButton.addEventListener('click', function() {
        chrome.tabs.create({ url: 'recorder.html' });
        window.close(); // ポップアップを閉じる
    });
    
    // 設定画面を開くボタンのイベントリスナー
    openSettingsButton.addEventListener('click', function() {
        chrome.tabs.create({ url: 'options.html' });
        window.close(); // ポップアップを閉じる
    });
    
    console.log('ポップアップスクリプトが初期化されました');
});
