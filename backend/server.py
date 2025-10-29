"""
FastAPI WebSocket 服務器
作為前端和 Qwen API 之間的橋樑
"""
import asyncio
import base64
import json
import logging
import os
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from qwen_client import QwenRealtimeClient

# 加載環境變數
load_dotenv()

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 創建 FastAPI 應用
app = FastAPI(title="Omni3 Demo Backend")

# 配置 CORS（允許前端跨域訪問）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite 和 CRA 默認端口
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 存儲活躍的連接
active_connections: Dict[str, tuple] = {}


class ConnectionManager:
    """WebSocket 連接管理器"""

    def __init__(self):
        self.active_connections: Dict[WebSocket, QwenRealtimeClient] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        """接受新的 WebSocket 連接"""
        await websocket.accept()
        logger.info(f"客戶端 {client_id} 已連接")

        # 創建 Qwen API 客戶端
        api_key = os.getenv("DASHSCOPE_API_KEY")
        model = os.getenv("MODEL_NAME", "qwen3-omni-flash-realtime")

        if not api_key:
            await websocket.send_json({
                "type": "error",
                "message": "服務器未配置 DASHSCOPE_API_KEY"
            })
            await websocket.close()
            return

        # 創建回調函數，將 Qwen API 的響應轉發到前端
        async def on_audio_data(audio_delta: bytes):
            """接收到音頻數據時，轉發到前端"""
            try:
                # 將音頻編碼為 base64
                audio_b64 = base64.b64encode(audio_delta).decode('utf-8')
                await websocket.send_json({
                    "type": "audio_delta",
                    "data": audio_b64
                })
            except Exception as e:
                logger.error(f"發送音頻失敗: {e}")

        async def on_text_data(text_delta: str):
            """接收到文本數據時，轉發到前端"""
            try:
                await websocket.send_json({
                    "type": "text_delta",
                    "data": text_delta
                })
            except Exception as e:
                logger.error(f"發送文本失敗: {e}")

        # 創建並連接 Qwen 客戶端
        qwen_client = QwenRealtimeClient(
            api_key=api_key,
            model=model,
            on_audio_data=on_audio_data,
            on_text_data=on_text_data
        )

        try:
            await qwen_client.connect()
            self.active_connections[websocket] = qwen_client

            # 通知前端連接成功
            await websocket.send_json({
                "type": "connected",
                "message": "已連接到 Qwen API，server-side VAD 已啟用"
            })

        except Exception as e:
            logger.error(f"連接 Qwen API 失敗: {e}")
            await websocket.send_json({
                "type": "error",
                "message": f"連接 Qwen API 失敗: {str(e)}"
            })
            await websocket.close()

    async def disconnect(self, websocket: WebSocket):
        """斷開連接"""
        if websocket in self.active_connections:
            qwen_client = self.active_connections[websocket]
            await qwen_client.disconnect()
            del self.active_connections[websocket]
            logger.info("客戶端已斷開連接")

    async def handle_message(self, websocket: WebSocket, message: dict):
        """處理前端發來的消息"""
        if websocket not in self.active_connections:
            logger.warning("收到未連接客戶端的消息")
            return

        qwen_client = self.active_connections[websocket]
        msg_type = message.get("type")

        try:
            if msg_type == "audio":
                # 接收音頻數據（base64 編碼的 PCM16）
                audio_b64 = message.get("data")
                if audio_b64:
                    audio_bytes = base64.b64decode(audio_b64)
                    await qwen_client.send_audio(audio_bytes)

            elif msg_type == "image":
                # 接收圖片數據（base64 編碼的 JPEG）
                image_b64 = message.get("data")
                if image_b64:
                    await qwen_client.send_image(image_b64)
                    logger.debug("已轉發圖片到 Qwen API")

            else:
                logger.warning(f"未知消息類型: {msg_type}")

        except Exception as e:
            logger.error(f"處理消息失敗: {e}")
            await websocket.send_json({
                "type": "error",
                "message": f"處理消息失敗: {str(e)}"
            })


# 創建連接管理器實例
manager = ConnectionManager()


@app.get("/")
async def root():
    """健康檢查端點"""
    return {
        "status": "ok",
        "service": "Omni3 Demo Backend",
        "api_configured": bool(os.getenv("DASHSCOPE_API_KEY"))
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 端點"""
    client_id = f"{websocket.client.host}:{websocket.client.port}"

    await manager.connect(websocket, client_id)

    try:
        while True:
            # 接收前端消息（JSON 格式）
            data = await websocket.receive_text()
            message = json.loads(data)
            await manager.handle_message(websocket, message)

    except WebSocketDisconnect:
        logger.info(f"客戶端 {client_id} 主動斷開連接")
        await manager.disconnect(websocket)

    except Exception as e:
        logger.error(f"WebSocket 錯誤: {e}")
        await manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn

    # 檢查 API Key
    if not os.getenv("DASHSCOPE_API_KEY"):
        logger.warning("=" * 60)
        logger.warning("警告: 未設置 DASHSCOPE_API_KEY 環境變數")
        logger.warning("請創建 .env 文件並設置你的 API Key")
        logger.warning("=" * 60)

    # 啟動服務器
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
