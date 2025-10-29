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
          <span className="status-label">Connection Status:</span>
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '✓ Connected' : '✗ Disconnected'}
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
        <div className="transcript-label">AI Response:</div>
        <div className="transcript-content">
          {transcript || 'Waiting for conversation...'}
        </div>
      </div>

      <div className="button-section">
        {!isRunning ? (
          <button className="control-button start" onClick={onStart}>
            🎤 Start Conversation
          </button>
        ) : (
          <button className="control-button stop" onClick={onStop}>
            ⏹ Stop Conversation
          </button>
        )}
      </div>

      <div className="info-section">
        <div className="info-item">ℹ Server-side VAD Enabled</div>
        <div className="info-item">AI will automatically detect your voice and respond</div>
      </div>
    </div>
  );
}
