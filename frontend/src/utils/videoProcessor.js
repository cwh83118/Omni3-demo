/**
 * 視頻處理工具
 * 負責從視頻流擷取幀並轉換為 JPEG
 */

/**
 * 從視頻元素擷取當前幀為 JPEG base64
 * @param {HTMLVideoElement} videoElement
 * @param {number} quality - JPEG 質量 (0-1)
 * @returns {string|null} - Base64 編碼的 JPEG 數據（不含 data:image/jpeg;base64, 前綴）
 */
export function captureVideoFrame(videoElement, quality = 0.8) {
  if (!videoElement || videoElement.readyState < 2) {
    return null;
  }

  try {
    // 創建 canvas
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    // 繪製當前幀
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // 轉換為 JPEG base64
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    // 移除 "data:image/jpeg;base64," 前綴
    const base64 = dataUrl.split(',')[1];

    return base64;
  } catch (error) {
    console.error('擷取視頻幀失敗:', error);
    return null;
  }
}

/**
 * 創建定時視頻幀擷取器
 * @param {HTMLVideoElement} videoElement
 * @param {Function} onFrame - 幀回調函數，接收 base64 字符串
 * @param {number} intervalMs - 擷取間隔（毫秒）
 * @returns {Object} - { start, stop }
 */
export function createFrameCapture(videoElement, onFrame, intervalMs = 500) {
  let intervalId = null;
  let isCapturing = false;

  const start = () => {
    if (isCapturing) return;

    isCapturing = true;
    intervalId = setInterval(() => {
      const frame = captureVideoFrame(videoElement);
      if (frame && onFrame) {
        onFrame(frame);
      }
    }, intervalMs);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isCapturing = false;
  };

  return { start, stop };
}
