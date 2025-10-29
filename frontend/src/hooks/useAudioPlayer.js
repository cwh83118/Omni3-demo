/**
 * 音頻播放 Hook
 * 使用 Web Audio API 播放實時音頻流
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isProcessingRef = useRef(false);

  // 初始化 AudioContext
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000 // Qwen API 輸出 24kHz
    });

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 播放音頻緩衝區
  const playAudioBuffer = useCallback(async (audioBuffer) => {
    if (!audioContextRef.current) return;

    try {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();

      setIsPlaying(true);

      source.onended = () => {
        setIsPlaying(false);
        // 播放下一個
        processQueue();
      };
    } catch (error) {
      console.error('播放音頻失敗:', error);
      setIsPlaying(false);
    }
  }, []);

  // 處理隊列
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const audioData = audioQueueRef.current.shift();

    if (audioData) {
      const audioBuffer = await base64ToPCM24AudioBuffer(
        audioData,
        audioContextRef.current
      );
      await playAudioBuffer(audioBuffer);
    }

    isProcessingRef.current = false;
  }, [playAudioBuffer]);

  // 添加音頻到播放隊列
  const playAudio = useCallback((base64Data) => {
    audioQueueRef.current.push(base64Data);
    processQueue();
  }, [processQueue]);

  // 清空隊列
  const clearQueue = useCallback(() => {
    audioQueueRef.current = [];
  }, []);

  return {
    playAudio,
    clearQueue,
    isPlaying
  };
}

/**
 * 將 base64 編碼的 PCM24 數據轉換為 AudioBuffer
 * @param {string} base64Data
 * @param {AudioContext} audioContext
 * @returns {Promise<AudioBuffer>}
 */
async function base64ToPCM24AudioBuffer(base64Data, audioContext) {
  // 解碼 base64
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // PCM24 是 16-bit samples at 24kHz
  const samples = new Int16Array(bytes.buffer);

  // 創建 AudioBuffer
  const audioBuffer = audioContext.createBuffer(
    1, // 單聲道
    samples.length,
    24000 // 24kHz
  );

  // 填充數據（轉換 Int16 到 Float32，範圍 [-1, 1]）
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    channelData[i] = samples[i] / 32768.0;
  }

  return audioBuffer;
}
