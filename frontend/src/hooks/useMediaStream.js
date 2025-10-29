/**
 * 媒體流管理 Hook
 * 管理攝像頭和麥克風訪問
 */
import { useState, useCallback, useRef } from 'react';

export function useMediaStream() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef(null);

  // 啟動媒體流
  const startMedia = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        }
      });

      setStream(mediaStream);
      setIsActive(true);
      setError(null);

      console.log('媒體流已啟動');

      // 如果有 videoRef，自動綁定
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      return mediaStream;
    } catch (err) {
      console.error('啟動媒體流失敗:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // 停止媒體流
  const stopMedia = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
      setIsActive(false);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      console.log('媒體流已停止');
    }
  }, [stream]);

  // 綁定 video 元素
  const bindVideoElement = useCallback((element) => {
    videoRef.current = element;
    if (element && stream) {
      element.srcObject = stream;
    }
  }, [stream]);

  return {
    stream,
    isActive,
    error,
    startMedia,
    stopMedia,
    bindVideoElement,
    videoRef
  };
}
