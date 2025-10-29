/**
 * 視頻顯示組件
 * 顯示攝像頭畫面
 */
import React from 'react';
import './VideoDisplay.css';

export function VideoDisplay({ videoRef, isActive }) {
  return (
    <div className="video-display">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`video-element ${isActive ? 'active' : ''}`}
      />
      {!isActive && (
        <div className="video-placeholder">
          <div className="placeholder-icon">📹</div>
          <div>Camera Not Active</div>
        </div>
      )}
    </div>
  );
}
