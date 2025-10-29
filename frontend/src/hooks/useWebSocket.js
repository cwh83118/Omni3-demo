/**
 * WebSocket 連接管理 Hook
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:8000/ws';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [serverMessage, setServerMessage] = useState('');

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const onAudioDataRef = useRef(null);
  const onTextDataRef = useRef(null);

  // 連接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket 已連接');
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket 已連接到服務器');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              setServerMessage(message.message);
              console.log('服務器消息:', message.message);
              break;

            case 'audio_delta':
              // 接收音頻流數據
              if (onAudioDataRef.current) {
                onAudioDataRef.current(message.data);
              }
              break;

            case 'text_delta':
              // 接收文本數據
              if (onTextDataRef.current) {
                onTextDataRef.current(message.data);
              }
              break;

            case 'error':
              console.error('服務器錯誤:', message.message);
              setError(message.message);
              break;

            default:
              console.log('未知消息類型:', message.type);
          }
        } catch (err) {
          console.error('解析消息失敗:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket 錯誤:', event);
        setError('WebSocket 連接錯誤');
      };

      ws.onclose = () => {
        console.log('WebSocket 已斷開');
        setIsConnected(false);

        // 自動重連（5秒後）
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('嘗試重新連接...');
          connect();
        }, 5000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('創建 WebSocket 失敗:', err);
      setError(err.message);
    }
  }, []);

  // 斷開連接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // 發送音頻數據
  const sendAudio = useCallback((audioData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'audio',
        data: audioData // base64 字符串
      }));
    }
  }, []);

  // 發送圖片數據
  const sendImage = useCallback((imageData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'image',
        data: imageData // base64 字符串
      }));
    }
  }, []);

  // 設置回調函數
  const setOnAudioData = useCallback((callback) => {
    onAudioDataRef.current = callback;
  }, []);

  const setOnTextData = useCallback((callback) => {
    onTextDataRef.current = callback;
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    error,
    serverMessage,
    connect,
    disconnect,
    sendAudio,
    sendImage,
    setOnAudioData,
    setOnTextData
  };
}
