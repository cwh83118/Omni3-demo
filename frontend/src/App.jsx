/**
 * 主應用組件
 * 整合所有功能模塊
 */
import React, { useState, useRef, useEffect } from 'react';
import { VideoDisplay } from './components/VideoDisplay';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ControlPanel } from './components/ControlPanel';
import { useMediaStream } from './hooks/useMediaStream';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { createAudioProcessor, arrayBufferToBase64 } from './utils/audioProcessor';
import { createFrameCapture } from './utils/videoProcessor';
import './App.css';

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Refs
  const audioProcessorRef = useRef(null);
  const frameCaptureRef = useRef(null);

  // Hooks
  const mediaStream = useMediaStream();
  const webSocket = useWebSocket();
  const audioPlayer = useAudioPlayer();

  // 設置 WebSocket 回調
  useEffect(() => {
    // 接收音頻數據並播放
    webSocket.setOnAudioData((audioData) => {
      audioPlayer.playAudio(audioData);
    });

    // 接收文本數據並顯示
    webSocket.setOnTextData((textDelta) => {
      setTranscript((prev) => prev + textDelta);
    });
  }, [webSocket, audioPlayer]);

  // 開始對話
  const handleStart = async () => {
    try {
      // 1. 連接 WebSocket
      webSocket.connect();

      // 等待連接成功
      await new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (webSocket.isConnected) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });

      // 2. 啟動媒體流
      const stream = await mediaStream.startMedia();

      // 3. 綁定視頻元素
      if (mediaStream.videoRef.current) {
        mediaStream.videoRef.current.srcObject = stream;
      }

      // 4. 創建音頻處理器（降採樣並發送）
      audioProcessorRef.current = createAudioProcessor(stream, (audioData) => {
        const base64Audio = arrayBufferToBase64(audioData);
        webSocket.sendAudio(base64Audio);
      });

      // 5. 創建視頻幀擷取器（定期發送幀）
      if (mediaStream.videoRef.current) {
        frameCaptureRef.current = createFrameCapture(
          mediaStream.videoRef.current,
          (frameData) => {
            webSocket.sendImage(frameData);
          },
          500 // 每 500ms 發送一幀
        );

        // 等待視頻準備好
        mediaStream.videoRef.current.onloadedmetadata = () => {
          frameCaptureRef.current.start();
        };
      }

      setIsRunning(true);
      setTranscript('');
      console.log('對話已開始');
    } catch (error) {
      console.error('啟動失敗:', error);
      alert(`啟動失敗: ${error.message}`);
    }
  };

  // 停止對話
  const handleStop = () => {
    // 停止音頻處理
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }

    // 停止視頻擷取
    if (frameCaptureRef.current) {
      frameCaptureRef.current.stop();
      frameCaptureRef.current = null;
    }

    // 停止媒體流
    mediaStream.stopMedia();

    // 斷開 WebSocket
    webSocket.disconnect();

    // 清空音頻播放隊列
    audioPlayer.clearQueue();

    setIsRunning(false);
    console.log('對話已停止');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎙 Omni3 Demo</h1>
        <p>基於 Qwen-Omni-Realtime 的實時音視頻對話</p>
      </header>

      <main className="app-main">
        <div className="media-section">
          <VideoDisplay
            videoRef={mediaStream.bindVideoElement}
            isActive={mediaStream.isActive}
          />

          <AudioVisualizer
            stream={mediaStream.stream}
            isActive={mediaStream.isActive}
          />
        </div>

        <ControlPanel
          isRunning={isRunning}
          isConnected={webSocket.isConnected}
          onStart={handleStart}
          onStop={handleStop}
          serverMessage={webSocket.serverMessage}
          transcript={transcript}
          error={webSocket.error || mediaStream.error}
        />
      </main>

      <footer className="app-footer">
        <p>使用 Server-side VAD | 實時音視頻處理</p>
      </footer>
    </div>
  );
}

export default App;
