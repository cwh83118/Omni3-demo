# Omni3-demo

基於 Qwen-Omni-Realtime API 的實時音視頻對話 Demo

## 功能特性

- 實時音頻對話（使用 server-side VAD 自動斷句）
- 視頻輸入支持（攝像頭畫面）
- 低延遲實時響應
- 音頻波形可視化

## 技術棧

- **前端**: React + Vite + Web Audio API + MediaStream API
- **後端**: Python + FastAPI + WebSocket + DashScope SDK
- **AI**: Qwen-Omni-Realtime API

## 快速開始

### 1. 環境準備

確保已安裝：
- Node.js >= 18
- Python >= 3.9
- 阿里雲百煉 API Key

### 2. 後端設置

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# 編輯 .env 文件，填入你的 DASHSCOPE_API_KEY
python server.py
```

### 3. 前端設置

```bash
cd frontend
npm install
npm run dev
```

### 4. 訪問應用

打開瀏覽器訪問 `http://localhost:5173`（Vite 默認端口）

## 項目結構

```
Omni3-demo/
├── frontend/          # React 前端
├── backend/           # Python WebSocket 服務器
└── README.md
```

## 獲取 API Key

訪問 [阿里雲百煉平台](https://bailian.console.aliyun.com/) 獲取你的 API Key
