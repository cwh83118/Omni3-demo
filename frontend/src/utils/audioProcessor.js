/**
 * 音頻處理工具
 * 負責音頻降採樣、格式轉換等
 */

/**
 * 創建音頻處理器，將麥克風音頻降採樣到 16kHz PCM16
 * @param {MediaStream} stream - 麥克風音頻流
 * @param {Function} onAudioData - 音頻數據回調 (接收 ArrayBuffer)
 * @returns {Object} - { audioContext, sourceNode, stop }
 */
export function createAudioProcessor(stream, onAudioData) {
  // 創建 AudioContext（通常是 48kHz）
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 48000
  });

  const sourceNode = audioContext.createMediaStreamSource(stream);

  // 創建 ScriptProcessor 進行降採樣
  // bufferSize: 4096 samples 約 85ms @ 48kHz
  const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);

  // 降採樣參數
  const inputSampleRate = audioContext.sampleRate; // 48000
  const outputSampleRate = 16000; // Qwen API 要求
  const ratio = inputSampleRate / outputSampleRate; // 3

  let buffer = [];

  scriptNode.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);

    // 降採樣：每 ratio 個樣本取 1 個
    const outputLength = Math.floor(inputData.length / ratio);
    const outputData = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      outputData[i] = inputData[Math.floor(i * ratio)];
    }

    // 轉換為 PCM16 (Int16Array)
    const pcm16 = float32ToPCM16(outputData);

    // 發送數據
    if (onAudioData) {
      onAudioData(pcm16.buffer);
    }
  };

  // 連接節點
  sourceNode.connect(scriptNode);
  scriptNode.connect(audioContext.destination);

  // 返回控制對象
  return {
    audioContext,
    sourceNode,
    scriptNode,
    stop: () => {
      scriptNode.disconnect();
      sourceNode.disconnect();
      audioContext.close();
    }
  };
}

/**
 * 將 Float32 音頻轉換為 PCM16 (Int16)
 * @param {Float32Array} float32Array - 範圍 [-1, 1]
 * @returns {Int16Array} - 範圍 [-32768, 32767]
 */
function float32ToPCM16(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);

  for (let i = 0; i < float32Array.length; i++) {
    // 限制範圍在 [-1, 1]
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    // 轉換到 Int16 範圍
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return pcm16;
}

/**
 * 將 ArrayBuffer 轉換為 Base64
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
