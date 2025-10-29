#!/bin/bash

# Omni3 Demo 啟動腳本

echo "=================================="
echo "  Omni3 Demo 啟動腳本"
echo "=================================="

# 檢查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python3，請先安裝"
    exit 1
fi

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，請先安裝"
    exit 1
fi

# 檢查 API Key
if [ -z "$DASHSCOPE_API_KEY" ]; then
    echo "⚠️  警告: DASHSCOPE_API_KEY 環境變數未設置"
    echo "請先設置: export DASHSCOPE_API_KEY=your_key_here"
    exit 1
fi

echo ""
echo "✓ Python3: $(python3 --version)"
echo "✓ Node.js: $(node --version)"
echo "✓ API Key: 已設置"
echo ""

# 安裝後端依賴
echo "📦 安裝後端依賴..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
echo "✓ 後端依賴安裝完成"

# 安裝前端依賴
echo "📦 安裝前端依賴..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "✓ 前端依賴安裝完成"

cd ..

echo ""
echo "=================================="
echo "  啟動服務"
echo "=================================="
echo ""

# 啟動後端（背景執行）
echo "🚀 啟動後端服務器 (port 8000)..."
cd backend
source venv/bin/activate
python server.py &
BACKEND_PID=$!
cd ..

# 等待後端啟動
sleep 3

# 啟動前端
echo "🚀 啟動前端服務器 (port 5173)..."
cd frontend
npm run dev

# 清理：當前端停止時，也停止後端
kill $BACKEND_PID 2>/dev/null
