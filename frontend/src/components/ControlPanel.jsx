/**
 * 控制面板組件
 * 提供開始/停止按鈕和狀態顯示
 */
import React from 'react';
import './ControlPanel.css';

export function ControlPanel({
  isRunning,
  isConnected,
  onStart,
  onStop,
  serverMessage,
  transcript,
  error
}) {
  return (
    <div className="control-panel">
      <div className="status-section">
        <div className="status-item">
          <span className="status-label">連接狀態:</span>
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '✓ 已連接' : '✗ 未連接'}
          </span>
        </div>

        {serverMessage && (
          <div className="server-message">
            {serverMessage}
          </div>
        )}

        {error && (
          <div className="error-message">
            ⚠ {error}
          </div>
        )}
      </div>

      <div className="transcript-section">
        <div className="transcript-label">AI 回應:</div>
        <div className="transcript-content">
          {transcript || '等待對話...'}
        </div>
      </div>

      <div className="button-section">
        {!isRunning ? (
          <button className="control-button start" onClick={onStart}>
            🎤 開始對話
          </button>
        ) : (
          <button className="control-button stop" onClick={onStop}>
            ⏹ 停止對話
          </button>
        )}
      </div>

      <div className="info-section">
        <div className="info-item">ℹ Server-side VAD 已啟用</div>
        <div className="info-item">AI 會自動檢測你的語音並回應</div>
      </div>
    </div>
  );
}
