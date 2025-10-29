/**
 * 音頻播放 Hook
 * 使用 Web Audio API 播放實時音頻流
 * 支持連續播放多個音頻片段而不重疊
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const nextStartTimeRef = useRef(0); // 追蹤下一個音頻片段應該開始的時間
  const activeSources = useRef([]); // 追蹤活躍的音頻源

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

  // 播放音頻片段（使用時間軸安排連續播放）
  const playAudio = useCallback(async (base64Data) => {
    if (!audioContextRef.current) return;

    try {
      const audioBuffer = await base64ToPCM24AudioBuffer(
        base64Data,
        audioContextRef.current
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      // 計算開始時間
      const currentTime = audioContextRef.current.currentTime;

      // 如果 nextStartTime 還沒初始化或已經過去，從現在開始
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      // 安排在正確的時間播放
      source.start(nextStartTimeRef.current);

      // 更新下一個片段的開始時間（當前時間 + 這個片段的持續時間）
      nextStartTimeRef.current += audioBuffer.duration;

      // 追蹤音頻源
      activeSources.current.push(source);
      setIsPlaying(true);

      // 當播放結束時清理
      source.onended = () => {
        activeSources.current = activeSources.current.filter(s => s !== source);
        if (activeSources.current.length === 0) {
          setIsPlaying(false);
        }
      };

    } catch (error) {
      console.error('播放音頻失敗:', error);
    }
  }, []);

  // 清空並停止所有播放
  const clearQueue = useCallback(() => {
    // 停止所有活躍的音頻源
    activeSources.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // 忽略已經停止的源
      }
    });
    activeSources.current = [];
    nextStartTimeRef.current = 0;
    setIsPlaying(false);
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
