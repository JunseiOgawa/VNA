/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!********************************!*\
  !*** ./src/contentRecorder.ts ***!
  \********************************/

// Content script for audio recording via getUserMedia
// filepath: d:/programmstage/VNA/src/contentRecorder.ts
let mediaRecorder;
let audioChunks = [];
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start-record') {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });
            audioChunks = [];
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0)
                    audioChunks.push(event.data);
            };
            mediaRecorder.start();
            sendResponse({ status: 'started' });
        })
            .catch(error => {
            console.error('Content script start-record error:', error);
            sendResponse({ status: 'error', error: error.message });
        });
        return true; // keep message channel open
    }
    if (request.action === 'stop-record') {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                // Release stream
                (mediaRecorder.stream.getTracks() || []).forEach(t => t.stop());
                // Send the recorded data to extension
                chrome.runtime.sendMessage({ action: 'recording-data', blob: blob });
                sendResponse({ status: 'stopped' });
            };
            mediaRecorder.stop();
        }
        else {
            sendResponse({ status: 'error', error: 'Recorder not active' });
        }
        return true;
    }
});

/******/ })()
;
//# sourceMappingURL=contentRecorder.js.map