import { useState, useRef } from 'react'

export function useAudioRecorder() {
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [isRecording, setIsRecording] = useState<boolean>(false)
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    // 録音開始
    const startRecording = async () => {
        try {
            if (isRecording) {
                console.warn('すでに録音中です');
                return;
            }

            console.log('録音を開始します...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true, 
                    autoGainControl: true 
                } 
            });
            
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.start(100);
            setIsRecording(true);
            
            // バックグラウンドにも通知（必要に応じて）
            chrome.runtime.sendMessage({ action: 'recordingStarted' });
            
        } catch (error) {
            console.error('録音開始時にエラーが発生しました:', error);
        }
    }

    // 録音停止
    const stopRecording = () => {
        try {
            if (!isRecording || !mediaRecorderRef.current) {
                console.warn('録音が開始されていません');
                return;
            }

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                setAudioBlob(audioBlob);
                setAudioUrl(audioUrl);
                setIsRecording(false);
                
                // ストリームのクリーンアップ
                if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                }
                
                // バックグラウンドにデータ送信（必要に応じて）
                chrome.runtime.sendMessage({ 
                    action: 'recordingStopped', 
                    // blobはそのまま送れないので、必要なら別の方法で共有
                    data: { timestamp: new Date().toISOString() } 
                });
            };
            
            mediaRecorderRef.current.stop();
            
        } catch (error) {
            console.error('録音停止時にエラーが発生しました:', error);
            setIsRecording(false);
        }
    }

    return {
        audioBlob,
        audioUrl,
        isRecording,
        startRecording,
        stopRecording,
    }
}